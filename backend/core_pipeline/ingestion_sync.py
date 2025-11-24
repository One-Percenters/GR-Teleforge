# ingestion_sync.py (Phase I - Step 1)
# Data Ingestion & Automated Synchronization

import pandas as pd
import numpy as np
import glob
import os
import json

# --- Configuration ---
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW_DATA_PATH = os.path.abspath(os.path.join(REPO_ROOT, '..', 'Raw Folders'))
OUTPUT_DIR = os.path.join(REPO_ROOT, 'data_processed')
DRIVER_PROFILES_FILE = os.path.join(OUTPUT_DIR, 'driver_profiles.json')

# Processing Constants
CHUNK_SIZE = 500_000
RESAMPLE_RATE = '50ms'  # 20Hz

print(f"Output directory: {OUTPUT_DIR}")
print(f"Raw data source: {RAW_DATA_PATH}")


def setup_directories():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def resample_vehicle_data(vehicle_df, vehicle_id, track, race):
    """
    Resample a single vehicle's data to 20Hz.
    Only resamples within continuous data segments (gaps > 1 second create new segments).
    """
    if vehicle_df.empty:
        return pd.DataFrame()
    
    vehicle_df = vehicle_df.sort_index()
    
    # Get numeric columns only
    numeric_cols = vehicle_df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        return pd.DataFrame()
    
    # Find gaps > 1 second to split into segments
    time_diffs = vehicle_df.index.to_series().diff()
    gap_threshold = pd.Timedelta(seconds=1)
    
    # Identify segment boundaries
    segment_starts = [0] + list(np.where(time_diffs > gap_threshold)[0])
    segment_ends = segment_starts[1:] + [len(vehicle_df)]
    
    resampled_segments = []
    
    for start_idx, end_idx in zip(segment_starts, segment_ends):
        segment = vehicle_df.iloc[start_idx:end_idx][numeric_cols]
        
        if len(segment) < 2:
            continue
        
        # Only resample if segment duration is reasonable (< 2 hours)
        segment_duration = (segment.index.max() - segment.index.min()).total_seconds()
        if segment_duration > 7200:  # Skip segments > 2 hours (likely bad data)
            continue
        
        # Resample this segment to 20Hz
        try:
            resampled = segment.resample(RESAMPLE_RATE).mean()
            # Forward fill then backward fill to handle edges
            resampled = resampled.ffill().bfill()
            
            # Add metadata
            resampled['Vehicle_ID'] = vehicle_id
            resampled['Track'] = track
            resampled['Race_Number'] = race
            
            resampled_segments.append(resampled)
        except Exception as e:
            continue
    
    if resampled_segments:
        return pd.concat(resampled_segments)
    return pd.DataFrame()


def ingest_and_synchronize_data():
    """
    Main ingestion function: reads raw CSV files, pivots from long to wide format,
    resamples to 20Hz, and creates the Master Timeline.
    """
    setup_directories()
    print(f"\n--- Starting Data Ingestion ---")
    
    all_races_list = []
    driver_profiles = {}
    
    # Search for telemetry files
    search_pattern = os.path.join(RAW_DATA_PATH, '*/*telemetry*.csv')
    telemetry_files = glob.glob(search_pattern)

    if not telemetry_files:
        print(f"ERROR: No telemetry files found: {search_pattern}")
        return None

    total_files = len(telemetry_files)
    
    for file_index, file_path in enumerate(telemetry_files):
        race_folder = os.path.basename(os.path.dirname(file_path))
        parts = race_folder.split('_')
        track_name = parts[0] if parts else 'Unknown'
        race_number = parts[1] if len(parts) > 1 else 'R0'
        file_name = os.path.basename(file_path)
        
        print(f"\n[{file_index + 1}/{total_files}] {track_name}_{race_number}")
        
        try:
            # Read and pivot all chunks
            pivoted_chunks = []
            
            for chunk_idx, chunk in enumerate(pd.read_csv(file_path, chunksize=CHUNK_SIZE)):
                print(f"  Chunk {chunk_idx + 1}", end='', flush=True)
                
                # Parse time
                if 'meta_time' not in chunk.columns:
                    print(" - No meta_time!")
                    continue
                
                chunk['Time'] = pd.to_datetime(chunk['meta_time'], errors='coerce', utc=True)
                chunk = chunk.dropna(subset=['Time'])
                
                if chunk.empty:
                    continue
                
                # Check if long format (has telemetry_name)
                if 'telemetry_name' in chunk.columns and 'telemetry_value' in chunk.columns:
                    # Pivot from long to wide
                    vehicle_col = 'vehicle_id' if 'vehicle_id' in chunk.columns else None
                    
                    if vehicle_col:
                        pivoted = chunk.pivot_table(
                            index=['Time', vehicle_col],
                            columns='telemetry_name',
                            values='telemetry_value',
                            aggfunc='first'
                        ).reset_index()
                        pivoted.columns.name = None
                    else:
                        pivoted = chunk.pivot_table(
                            index='Time',
                            columns='telemetry_name',
                            values='telemetry_value',
                            aggfunc='first'
                        ).reset_index()
                        pivoted.columns.name = None
                    
                    if chunk_idx == 0:
                        cols = [c for c in pivoted.columns if c not in ['Time', 'vehicle_id']]
                        print(f" -> {len(cols)} telemetry columns")
                    
                    chunk = pivoted
                else:
                    if chunk_idx == 0:
                        print(" -> Wide format")
                
                # Standardize vehicle_id column name
                if 'vehicle_id' in chunk.columns:
                    chunk['Vehicle_ID'] = chunk['vehicle_id']
                    chunk = chunk.drop(columns=['vehicle_id'])
                
                pivoted_chunks.append(chunk)
            
            print()  # Newline
            
            if not pivoted_chunks:
                print(f"  WARNING: No valid chunks")
                continue
            
            # Combine chunks
            df_race = pd.concat(pivoted_chunks, ignore_index=True)
            print(f"  Combined: {len(df_race):,} rows")
            
            # Convert numeric columns
            exclude_cols = ['Time', 'Track', 'Race_Number', 'Vehicle_ID']
            for col in df_race.columns:
                if col not in exclude_cols:
                    df_race[col] = pd.to_numeric(df_race[col], errors='coerce')
            
            # Resample per vehicle
            if 'Vehicle_ID' in df_race.columns:
                vehicles = df_race['Vehicle_ID'].unique()
                print(f"  Resampling {len(vehicles)} vehicles to 20Hz...")
                
                resampled_list = []
                for vid in vehicles:
                    vehicle_data = df_race[df_race['Vehicle_ID'] == vid].copy()
                    vehicle_data = vehicle_data.set_index('Time').sort_index()
                    
                    resampled = resample_vehicle_data(vehicle_data, vid, track_name, race_number)
                    if not resampled.empty:
                        resampled_list.append(resampled)
                
                if resampled_list:
                    df_synced = pd.concat(resampled_list)
                else:
                    df_synced = pd.DataFrame()
            else:
                # No vehicle_id - resample entire dataset
                df_race = df_race.set_index('Time').sort_index()
                df_synced = resample_vehicle_data(df_race, 'Unknown', track_name, race_number)
            
            if not df_synced.empty:
                # Drop any remaining metadata columns
                drop_cols = ['meta_source', 'meta_time', 'meta_event', 'meta_session', 
                           'timestamp', 'outing', 'lap', 'value', 'expire_at', 
                           'original_vehicle_id', 'vehicle_number']
                for col in drop_cols:
                    if col in df_synced.columns:
                        df_synced = df_synced.drop(columns=[col])
                
                print(f"  Resampled: {len(df_synced):,} rows")
                all_races_list.append(df_synced)
                
                # Update driver profiles
                if 'Vehicle_ID' in df_synced.columns:
                    for vid in df_synced['Vehicle_ID'].unique():
                        if vid not in driver_profiles:
                            driver_profiles[vid] = {
                                'Vehicle_ID': str(vid),
                                'Races': [],
                            }
                        driver_profiles[vid]['Races'].append(f"{track_name}_{race_number}")
            else:
                print(f"  WARNING: Empty after resampling")
                
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Combine all races
    if all_races_list:
        print(f"\n--- Combining {len(all_races_list)} races ---")
        master_timeline = pd.concat(all_races_list)
        master_timeline = master_timeline.sort_index()
        
        # Report
        print(f"Master Timeline: {len(master_timeline):,} rows")
        print(f"Columns: {list(master_timeline.columns)}")
        
        if 'Track' in master_timeline.columns:
            print("\nRows per track:")
            print(master_timeline.groupby('Track').size())
        
        # Check for key columns
        key_cols = ['speed', 'pbrake_f', 'Steering_Angle', 'gear', 'VBOX_Lat_Min', 'VBOX_Long_Minutes']
        found = [c for c in key_cols if c in master_timeline.columns]
        missing = [c for c in key_cols if c not in master_timeline.columns]
        print(f"\nKey columns found: {found}")
        if missing:
            print(f"Key columns missing: {missing}")
        
        # Check nulls
        null_pct = master_timeline.isnull().mean() * 100
        high_null = null_pct[null_pct > 50]
        if len(high_null) > 0:
            print(f"\nColumns with >50% nulls: {list(high_null.index)}")
        
        # Save
        parquet_path = os.path.join(OUTPUT_DIR, 'master_timeline.parquet')
        master_timeline.to_parquet(parquet_path)
        file_size = os.path.getsize(parquet_path) / 1024 / 1024
        print(f"\nSaved: {parquet_path}")
        print(f"Size: {file_size:.1f} MB")
    else:
        print("\nERROR: No race data processed!")
        return None
    
    # Save driver profiles
    with open(DRIVER_PROFILES_FILE, 'w') as f:
        json.dump(driver_profiles, f, indent=2)
    print(f"Saved: {DRIVER_PROFILES_FILE}")
    
    return master_timeline


if __name__ == '__main__':
    ingest_and_synchronize_data()

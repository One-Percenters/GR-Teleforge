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

print(f"Output directory confirmed: {OUTPUT_DIR}")
print(f"Raw Data Source: {RAW_DATA_PATH}")


def setup_directories():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def ingest_and_synchronize_data():
    """
    Main ingestion function: reads raw CSV files, pivots from long to wide format,
    resamples to 20Hz, and creates the Master Timeline.
    """
    setup_directories()
    print(f"--- Starting Data Ingestion ---")
    
    # Initialize list to accumulate all race dataframes
    all_races_list = []
    driver_profiles = {}
    
    # Search for files
    search_pattern = os.path.join(RAW_DATA_PATH, '*/*telemetry*.csv')
    telemetry_files = glob.glob(search_pattern)

    if not telemetry_files:
        print(f"ERROR: No telemetry files found matching: {search_pattern}")
        return None

    total_files = len(telemetry_files)
    
    for file_index, file_path in enumerate(telemetry_files):
        race_folder = os.path.basename(os.path.dirname(file_path))
        track_name, race_number = race_folder.split('_') if '_' in race_folder else ('Unknown', 'R0')
        file_name = os.path.basename(file_path)
        
        print(f"\n[{file_index + 1}/{total_files}] Processing: {track_name}_{race_number} ({file_name})")
        
        try:
            # Read all chunks for this file
            chunk_list = []
            
            for chunk_index, chunk in enumerate(pd.read_csv(file_path, chunksize=CHUNK_SIZE)):
                print(f"  -> Chunk {chunk_index + 1}", end='', flush=True)
                
                # Convert meta_time to datetime
                if 'meta_time' in chunk.columns:
                    chunk['Time'] = pd.to_datetime(chunk['meta_time'], errors='coerce')
                else:
                    print(" - ERROR: No meta_time column!")
                    continue
                
                # Drop rows with invalid time
                chunk = chunk.dropna(subset=['Time'])
                
                if chunk.empty:
                    continue
                
                # Pivot from long to wide format
                if 'telemetry_name' in chunk.columns and 'telemetry_value' in chunk.columns:
                    # Group by Time and vehicle_id, pivot telemetry_name to columns
                    vehicle_col = 'vehicle_id' if 'vehicle_id' in chunk.columns else None
                    
                    if vehicle_col:
                        # Pivot with vehicle_id
                        pivoted = chunk.pivot_table(
                            index=['Time', vehicle_col],
                            columns='telemetry_name',
                            values='telemetry_value',
                            aggfunc='first'
                        ).reset_index()
                    else:
                        # Pivot without vehicle_id
                        pivoted = chunk.pivot_table(
                            index='Time',
                            columns='telemetry_name',
                            values='telemetry_value',
                            aggfunc='first'
                        ).reset_index()
                    
                    # Flatten column names
                    pivoted.columns.name = None
                    
                    # Debug first chunk
                    if chunk_index == 0:
                        telemetry_cols = [c for c in pivoted.columns if c not in ['Time', 'vehicle_id', 'Vehicle_ID']]
                        print(f" - Pivoted to {len(telemetry_cols)} columns: {telemetry_cols[:5]}...")
                    
                    chunk = pivoted
                else:
                    print(" - Already in wide format")
                
                # Add track/race metadata
                chunk['Track'] = track_name
                chunk['Race_Number'] = race_number
                
                # Rename vehicle_id to Vehicle_ID for consistency
                if 'vehicle_id' in chunk.columns:
                    chunk['Vehicle_ID'] = chunk['vehicle_id']
                
                chunk_list.append(chunk)
            
            print()  # Newline after chunks
            
            if not chunk_list:
                print(f"  -> WARNING: No valid data chunks")
                continue
            
            # Combine all chunks for this race
            df_race = pd.concat(chunk_list, ignore_index=True)
            print(f"  -> Combined: {len(df_race):,} rows, {len(df_race.columns)} columns")
            
            # Convert numeric columns
            exclude_cols = ['Time', 'Track', 'Race_Number', 'Vehicle_ID', 'vehicle_id']
            for col in df_race.columns:
                if col not in exclude_cols:
                    df_race[col] = pd.to_numeric(df_race[col], errors='coerce')
            
            # Resample to 20Hz per vehicle
            if 'Vehicle_ID' in df_race.columns:
                resampled_list = []
                for vehicle_id in df_race['Vehicle_ID'].unique():
                    vehicle_data = df_race[df_race['Vehicle_ID'] == vehicle_id].copy()
                    vehicle_data = vehicle_data.set_index('Time').sort_index()
                    
                    # Get numeric columns only
                    numeric_cols = vehicle_data.select_dtypes(include=[np.number]).columns.tolist()
                    
                    if numeric_cols and not vehicle_data.empty:
                        # Resample numeric data
                        resampled = vehicle_data[numeric_cols].resample(RESAMPLE_RATE).mean()
                        resampled = resampled.interpolate(method='linear', limit_direction='both')
                        
                        # Add metadata back
                        resampled['Vehicle_ID'] = vehicle_id
                        resampled['Track'] = track_name
                        resampled['Race_Number'] = race_number
                        
                        resampled_list.append(resampled)
                
                if resampled_list:
                    df_synced = pd.concat(resampled_list)
                else:
                    df_synced = pd.DataFrame()
            else:
                # No vehicle_id - resample entire dataset
                df_race = df_race.set_index('Time').sort_index()
                numeric_cols = df_race.select_dtypes(include=[np.number]).columns.tolist()
                
                if numeric_cols:
                    df_synced = df_race[numeric_cols].resample(RESAMPLE_RATE).mean()
                    df_synced = df_synced.interpolate(method='linear', limit_direction='both')
                    df_synced['Track'] = track_name
                    df_synced['Race_Number'] = race_number
                else:
                    df_synced = pd.DataFrame()
            
            if not df_synced.empty:
                print(f"  -> Resampled to 20Hz: {len(df_synced):,} rows")
                all_races_list.append(df_synced)
                
                # Update driver profiles
                if 'Vehicle_ID' in df_synced.columns:
                    for vid in df_synced['Vehicle_ID'].unique():
                        if vid not in driver_profiles:
                            driver_profiles[vid] = {
                                'Vehicle_ID': str(vid),
                                'Races': [],
                                'Avg_Speed': 0
                            }
                        driver_profiles[vid]['Races'].append(f"{track_name}_{race_number}")
            else:
                print(f"  -> WARNING: Empty after resampling")
                
        except Exception as e:
            print(f"  -> ERROR: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Combine all races into Master Timeline
    if all_races_list:
        print(f"\nCombining {len(all_races_list)} races into Master Timeline...")
        master_timeline = pd.concat(all_races_list)
        master_timeline = master_timeline.sort_index()
        
        print(f"  -> Master Timeline: {len(master_timeline):,} rows, {len(master_timeline.columns)} columns")
        print(f"  -> Columns: {list(master_timeline.columns)}")
        
        # Check for expected columns
        expected = ['VBOX_Lat_Min', 'VBOX_Long_Minutes', 'speed', 'pbrake_f', 'Steering_Angle']
        found = [c for c in expected if c in master_timeline.columns]
        missing = [c for c in expected if c not in master_timeline.columns]
        print(f"  -> Found telemetry: {found}")
        if missing:
            print(f"  -> Missing: {missing}")
        
        # Save to Parquet
        parquet_path = os.path.join(OUTPUT_DIR, 'master_timeline.parquet')
        master_timeline.to_parquet(parquet_path)
        print(f"\nSaved Master Timeline to: {parquet_path}")
        print(f"File size: {os.path.getsize(parquet_path) / 1024 / 1024:.2f} MB")
    else:
        print("\nERROR: No race data was successfully processed!")
        return None
    
    # Save driver profiles
    with open(DRIVER_PROFILES_FILE, 'w') as f:
        json.dump(driver_profiles, f, indent=2)
    print(f"Saved driver profiles to: {DRIVER_PROFILES_FILE}")
    
    return master_timeline


if __name__ == '__main__':
    ingest_and_synchronize_data()

# ingestion_sync.py (Phase I - Steps 1 & 5) - Final Robust Version

import pandas as pd
import numpy as np
import glob
import os
import json
import sys

# --- Configuration ---
# 🚨 IMPORTANT: This absolute path MUST match the location you confirmed:
RAW_DATA_PATH = r"C:\Users\Hasnain Niazi\Documents\GRTeleforge\Raw Folders"

# The output directory for processed files is RELATIVE to your repo root.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTPUT_DIR = os.path.join(REPO_ROOT, 'data_processed')
DRIVER_PROFILES_FILE = os.path.join(OUTPUT_DIR, 'driver_profiles.json')

# Resampling rate for the Master Timeline: 50ms for a uniform 20Hz time grid
RESAMPLE_RATE = '50ms' 
CHUNK_SIZE = 500000 # Read 500,000 rows at a time for memory management

def setup_directories():
    """Ensures the output directory exists."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory confirmed: {OUTPUT_DIR}")
    print(f"Raw Data Source: {RAW_DATA_PATH}")

def ingest_and_synchronize_data():
    """Consolidates disparate CSV files into a single, synchronized Master Timeline."""
    setup_directories()
    print(f"--- Starting Data Ingestion ---")
    
    # Initialize list to accumulate all race dataframes (more robust than repeated concat)
    all_races_list = []
    driver_profiles = {}
    
    # Search for files
    search_pattern = os.path.join(RAW_DATA_PATH, '*/*telemetry*.csv')
    telemetry_files = glob.glob(search_pattern)

    if not telemetry_files:
        print(f"ERROR: No telemetry files found matching the pattern: {search_pattern}")
        return None

    total_files = len(telemetry_files)
    
    for file_index, file_path in enumerate(telemetry_files):
        
        race_folder = os.path.basename(os.path.dirname(file_path))
        track_name, race_number = race_folder.split('_') if '_' in race_folder else ('Unknown', 'R0')
        file_name = os.path.basename(file_path)
        
        print(f"\n[{file_index + 1}/{total_files}] Processing Race: {track_name}_{race_number} ({file_name})")
        
        try:
            chunk_list = []
            
            # Use the chunk iterator for memory management
            csv_iterator = pd.read_csv(
                file_path, 
                chunksize=CHUNK_SIZE, 
                index_col='meta_time'
            )

            for chunk_index, chunk in enumerate(csv_iterator):
                sys.stdout.write(f"\r  -> Syncing Chunk: {chunk_index + 1} (Status: Running)")
                sys.stdout.flush()

                # --- Temporal Synchronization Logic (Applied per chunk) ---
                # ROBUST FIX: Convert index to column, filter NaT, then set back as index
                # This approach is more reliable than relying on index.name which can be lost during chunking
                chunk = chunk.reset_index()
                
                # The index column (meta_time) is now the first column - rename it to 'Time'
                time_col_name = chunk.columns[0]  # This is the former index (meta_time)
                chunk = chunk.rename(columns={time_col_name: 'Time'})
                
                # CRITICAL FIX: Ensure the Time column is a DatetimeIndex
                if pd.api.types.is_numeric_dtype(chunk['Time']):
                    chunk['Time'] = pd.to_datetime(chunk['Time'], unit='s', errors='coerce')
                else:
                    chunk['Time'] = pd.to_datetime(chunk['Time'], errors='coerce')
                
                # ROBUST FIX: Filter NaT values using column name (more reliable than index.name)
                chunk = chunk[chunk['Time'].notna()]
                
                # Set Time as index
                chunk = chunk.set_index('Time')
                
                if not chunk.empty:
                    # CRITICAL: Pivot from long to wide format BEFORE resampling
                    # Check if data is in long format (has telemetry_name and value columns)
                    if 'telemetry_name' in chunk.columns and ('value' in chunk.columns or 'telemetry_value' in chunk.columns):
                        # Reset index temporarily for pivot
                        chunk = chunk.reset_index()
                        
                        # Identify value column
                        value_col = 'value' if 'value' in chunk.columns else 'telemetry_value'
                        
                        # Identify vehicle ID column
                        vehicle_id_col = None
                        for possible_id_col in ['Vehicle_ID', 'vehicle_id', 'vehicle_number', 'original_vehicle_id']:
                            if possible_id_col in chunk.columns:
                                vehicle_id_col = possible_id_col
                                break
                        
                        # Debug: Check unique telemetry names
                        if 'telemetry_name' in chunk.columns:
                            unique_names = chunk['telemetry_name'].dropna().unique()
                            if len(unique_names) > 0 and chunk_index == 0:  # Only print for first chunk
                                print(f"    Found {len(unique_names)} unique telemetry parameters to pivot")
                                # Show sample of telemetry names
                                sample_names = list(unique_names[:10])
                                print(f"    Sample parameters: {sample_names}")
                        
                        # Preserve other metadata columns that shouldn't be pivoted
                        metadata_cols = []
                        for col in ['meta_source', 'meta_event', 'meta_session', 'timestamp', 'outing', 'lap', 'expire_at']:
                            if col in chunk.columns:
                                metadata_cols.append(col)
                        
                        # Pivot: telemetry_name becomes columns, value becomes data
                        # CRITICAL: Don't include vehicle_id in pivot index - pivot per vehicle separately
                        # This ensures all telemetry data is preserved
                        pivot_index = ['Time'] + metadata_cols
                        
                        # If we have multiple vehicles, we need to handle them separately
                        if vehicle_id_col and chunk[vehicle_id_col].nunique() > 1:
                            # Multiple vehicles: pivot each separately then combine
                            vehicle_chunks = []
                            for vehicle_id_val in chunk[vehicle_id_col].unique():
                                vehicle_data = chunk[chunk[vehicle_id_col] == vehicle_id_val].copy()
                                
                                # Pivot this vehicle's data
                                vehicle_pivoted = vehicle_data.pivot_table(
                                    index=pivot_index,
                                    columns='telemetry_name',
                                    values=value_col,
                                    aggfunc='first'
                                )
                                
                                # Flatten column names
                                vehicle_pivoted.columns.name = None
                                vehicle_pivoted = vehicle_pivoted.reset_index()
                                
                                # Add vehicle_id back as a column
                                vehicle_pivoted[vehicle_id_col] = vehicle_id_val
                                
                                vehicle_chunks.append(vehicle_pivoted)
                            
                            # Combine all vehicles
                            chunk_pivoted = pd.concat(vehicle_chunks, ignore_index=True)
                        else:
                            # Single vehicle or no vehicle_id: simple pivot
                            chunk_pivoted = chunk.pivot_table(
                                index=pivot_index,
                                columns='telemetry_name',
                                values=value_col,
                                aggfunc='first'
                            )
                            
                            # Flatten column names
                            chunk_pivoted.columns.name = None
                            chunk_pivoted = chunk_pivoted.reset_index()
                            
                            # Add vehicle_id back if it exists
                            if vehicle_id_col and vehicle_id_col not in chunk_pivoted.columns:
                                if len(chunk[vehicle_id_col].unique()) == 1:
                                    chunk_pivoted[vehicle_id_col] = chunk[vehicle_id_col].iloc[0]
                        
                        # Set Time back as index
                        chunk = chunk_pivoted.set_index('Time')
                        
                        # Debug: Show what columns were created
                        if chunk_index == 0:
                            telemetry_cols = [c for c in chunk.columns if c not in pivot_index and c != 'Time']
                            print(f"    Created {len(telemetry_cols)} telemetry columns from pivot")
                            # Check for GPS columns
                            gps_cols = [c for c in telemetry_cols if 'lat' in c.lower() or 'long' in c.lower() or 'gps' in c.lower()]
                            if gps_cols:
                                print(f"    GPS columns found: {gps_cols[:5]}")
                    
                    # FIX: Explicitly convert all columns to numeric, coercing errors to NaN
                    # This resolves the 'agg function failed [how->mean,dtype->object]' error
                    # by handling cases where columns that should be numeric are read as strings
                    context_columns = ['Track', 'Race_Number', 'Vehicle_ID', 'vehicle_id', 'vehicle_number', 
                                     'original_vehicle_id', 'meta_source', 'meta_event', 'meta_session', 
                                     'timestamp', 'outing', 'lap', 'expire_at']
                    columns_to_convert = [col for col in chunk.columns if col not in context_columns]
                    
                    for col in columns_to_convert:
                        try:
                            # Only convert if column is not already numeric
                            if not pd.api.types.is_numeric_dtype(chunk[col]):
                                chunk[col] = pd.to_numeric(chunk[col], errors='coerce')
                        except (KeyError, TypeError, ValueError) as e:
                            # Skip columns that cause errors during conversion
                            # This can happen if column structure changes or column doesn't exist
                            continue
                    
                    # Separate numeric and non-numeric columns to handle resampling properly
                    # Preserve vehicle_id and metadata columns
                    preserve_cols = []
                    for col in ['vehicle_id', 'Vehicle_ID', 'vehicle_number', 'original_vehicle_id', 
                               'meta_source', 'meta_event', 'meta_session', 'timestamp', 'outing', 'lap', 'expire_at']:
                        if col in chunk.columns:
                            preserve_cols.append(col)
                    
                    numeric_cols = chunk.select_dtypes(include=[np.number]).columns.tolist()
                    # Remove preserve_cols from numeric_cols if they're numeric (we'll handle them separately)
                    numeric_cols = [c for c in numeric_cols if c not in preserve_cols]
                    
                    non_numeric_cols = chunk.select_dtypes(exclude=[np.number]).columns.tolist()
                    # Remove preserve_cols from non_numeric_cols
                    non_numeric_cols = [c for c in non_numeric_cols if c not in preserve_cols]
                    
                    # Create resampled index first (use numeric columns if available, otherwise use full chunk)
                    if len(numeric_cols) > 0:
                        resampled_index = chunk[numeric_cols].resample(RESAMPLE_RATE).mean().index
                    else:
                        resampled_index = chunk.resample(RESAMPLE_RATE).ffill().index
                    
                    # Resample numeric columns with mean and interpolate (telemetry data)
                    # Use interpolation to fill gaps and preserve all time points
                    if len(numeric_cols) > 0:
                        # Resample to uniform time grid, then interpolate to fill gaps
                        numeric_resampled = chunk[numeric_cols].resample(RESAMPLE_RATE).mean()
                        numeric_resampled = numeric_resampled.interpolate(method='linear', limit_direction='both')
                    else:
                        numeric_resampled = pd.DataFrame(index=resampled_index)
                    
                    # Resample non-numeric columns with forward fill (preserve last known value)
                    if len(non_numeric_cols) > 0:
                        non_numeric_resampled = chunk[non_numeric_cols].resample(RESAMPLE_RATE).ffill()
                    else:
                        non_numeric_resampled = pd.DataFrame(index=resampled_index)
                    
                    # Resample preserve columns (metadata) with forward fill
                    if len(preserve_cols) > 0:
                        preserve_resampled = chunk[preserve_cols].resample(RESAMPLE_RATE).ffill()
                    else:
                        preserve_resampled = pd.DataFrame(index=resampled_index)
                    
                    # Combine all columns back together
                    chunk_synced = pd.concat([numeric_resampled, non_numeric_resampled, preserve_resampled], axis=1)
                    chunk_list.append(chunk_synced)
            
            sys.stdout.write('\n')
            
            if not chunk_list:
                print(f"  -> Skipping {file_name}: No valid data found after chunking and cleaning.")
                continue

            df_synced = pd.concat(chunk_list)
            
            # Debug: Report data size after chunk concatenation
            print(f"  -> Combined {len(chunk_list)} chunks: {len(df_synced):,} rows, {len(df_synced.columns)} columns")
            
            # CRITICAL FIX: Ensure all numeric columns (especially VBOX and sensor data) are properly typed
            # This must happen AFTER pivot to ensure all new columns are numeric
            context_columns = ['Track', 'Race_Number', 'Vehicle_ID', 'vehicle_id', 'vehicle_number', 
                             'original_vehicle_id', 'lap', 'meta_event', 'meta_session', 'meta_source', 
                             'outing', 'timestamp', 'expire_at']
            for col in df_synced.columns:
                if col not in context_columns:
                    try:
                        # Force conversion to numeric for all sensor/VBOX columns
                        # This ensures VBOX_Lat_Min, VBOX_Long_Minutes, and all sensor data survive
                        if not pd.api.types.is_numeric_dtype(df_synced[col]):
                            df_synced[col] = pd.to_numeric(df_synced[col], errors='coerce')
                    except (KeyError, TypeError, ValueError):
                        # Skip columns that can't be converted
                        continue
            
            # Add context columns and identify the Vehicle_ID
            # Try multiple possible vehicle ID column names
            vehicle_id = 'Unknown_Car'
            for possible_id_col in ['Vehicle_ID', 'vehicle_id', 'vehicle_number', 'original_vehicle_id']:
                if possible_id_col in df_synced.columns:
                    vehicle_id = df_synced[possible_id_col].iloc[0] if len(df_synced) > 0 else 'Unknown_Car'
                    break
            
            df_synced['Vehicle_ID'] = vehicle_id
            df_synced['Track'] = track_name
            df_synced['Race_Number'] = race_number
            
            # Append to list instead of immediate concat (prevents data loss from repeated concat)
            all_races_list.append(df_synced)
            
            # --- Driver Database Build ---
            if vehicle_id not in driver_profiles:
                # Safely get average speed if Speed column exists
                avg_speed = df_synced['Speed'].mean() if 'Speed' in df_synced.columns else 0.0
                driver_profiles[vehicle_id] = {
                    "Vehicle_ID": vehicle_id,
                    "Finishing_Positions": [],
                    "Critical_Events_Involved": [],
                    "Aggregated_Stats": {
                        "Avg_Speed_kmh": avg_speed
                    }
                }
            
        except Exception as e:
            # Removed the problematic emoji from the print statement and handle encoding
            error_msg = f"--- FAILED processing {file_name}. Error: {e}"
            try:
                print(error_msg)
            except UnicodeEncodeError:
                print(error_msg.encode('utf-8', errors='replace').decode('utf-8'))

    # Final concatenation: Combine all race dataframes in a single operation
    if all_races_list:
        print(f"\nConcatenating {len(all_races_list)} race dataframes into Master Timeline...")
        
        # Debug: Show size of each race before concatenation
        total_rows_before = sum(len(df) for df in all_races_list)
        print(f"  -> Total rows before concatenation: {total_rows_before:,}")
        
        master_timeline = pd.concat(all_races_list, ignore_index=False)
        
        print(f"  -> Master Timeline after concatenation: {len(master_timeline):,} rows, {len(master_timeline.columns)} columns")
        
        # FINAL FIX: Ensure all numeric columns are properly typed after final concatenation
        # This catches any columns that may have been lost or corrupted during the merge
        print("Validating and cleaning data types in Master Timeline...")
        context_columns = ['Track', 'Race_Number', 'Vehicle_ID', 'vehicle_id', 'vehicle_number', 
                          'original_vehicle_id', 'meta_source', 'meta_event', 'meta_session', 
                          'timestamp', 'outing', 'lap', 'expire_at']
        columns_cleaned = 0
        
        # Check for expected telemetry columns
        expected_telemetry = ['VBOX_Lat_Min', 'VBOX_Long_Minutes', 'Laptrigger_lapdist_dls', 
                            'Speed', 'pbrake_f', 'ath', 'Gear', 'nmot', 'Steering_Angle']
        found_telemetry = [col for col in expected_telemetry if col in master_timeline.columns]
        missing_telemetry = [col for col in expected_telemetry if col not in master_timeline.columns]
        
        if found_telemetry:
            print(f"  -> Found {len(found_telemetry)} expected telemetry columns: {found_telemetry[:5]}...")
        if missing_telemetry:
            print(f"  -> WARNING: Missing {len(missing_telemetry)} expected columns: {missing_telemetry[:5]}...")
            print(f"  -> Available columns: {list(master_timeline.columns)[:20]}...")
        
        for col in master_timeline.columns:
            if col not in context_columns:
                try:
                    if not pd.api.types.is_numeric_dtype(master_timeline[col]):
                        master_timeline[col] = pd.to_numeric(master_timeline[col], errors='coerce')
                        columns_cleaned += 1
                except (KeyError, TypeError, ValueError):
                    continue
        if columns_cleaned > 0:
            print(f"  -> Cleaned {columns_cleaned} columns to ensure proper numeric types (VBOX, sensors, etc.)")
    else:
        print("WARNING: No race data was successfully processed.")
        return None

    # Final cleanup and saving of Master Timeline (Parquet)
    if not master_timeline.empty:
        master_timeline = master_timeline.sort_index()
        parquet_file = os.path.join(OUTPUT_DIR, 'master_timeline.parquet')
        master_timeline.to_parquet(parquet_file)
        print(f"\nMaster Timeline created and saved to {parquet_file}")
    
    # Save the Driver Profile Database (JSON)
    with open(DRIVER_PROFILES_FILE, 'w') as f:
        json.dump(driver_profiles, f, indent=4)
    print(f"Driver Profile Database saved to {DRIVER_PROFILES_FILE}")

    return master_timeline

if __name__ == '__main__':
    ingest_and_synchronize_data()
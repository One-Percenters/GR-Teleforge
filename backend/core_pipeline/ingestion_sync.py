# 01_ingestion_sync.py (Phase I - Steps 1 & 5)

import pandas as pd
import glob
import os
import json
from datetime import datetime

# --- Configuration ---
# 🚨 IMPORTANT: This absolute path MUST match the location of your raw data folders!
RAW_DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Raw Folders'))

# The output directory for processed files is RELATIVE to your repo root.
# This assumes the repo is named GR-Teleforge and the script is run from the backend/ directory.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTPUT_DIR = os.path.join(REPO_ROOT, 'data_processed')
DRIVER_PROFILES_FILE = os.path.join(OUTPUT_DIR, 'driver_profiles.json')

# [cite_start]We use 50ms resampling for a 20Hz time grid[cite: 34].
RESAMPLE_RATE = '50ms' 

def setup_directories():
    """Ensures the output directory exists."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory confirmed: {OUTPUT_DIR}")
    print(f"Raw Data Source: {RAW_DATA_PATH}")

def ingest_and_synchronize_data():
    """
    Consolidates disparate CSV files into a single Master Timeline.
    """
    setup_directories()
    print(f"--- Starting Data Ingestion ---")
    
    master_timeline = pd.DataFrame()
    driver_profiles = {}
    
    # Search for any telemetry file inside the standardized track folders (e.g., Barber_R1/R1_telemetry_data.csv)
    # The pattern relies on you having renamed the top-level folders (Manual Step 2 below!)
    search_pattern = os.path.join(RAW_DATA_PATH, '*/*telemetry*.csv')
    telemetry_files = glob.glob(search_pattern)

    if not telemetry_files:
        print(f"ERROR: No telemetry files found matching the pattern: {search_pattern}")
        print("ACTION: Ensure your raw data folders are standardized (e.g., 'COTA_R1') and contain files with 'telemetry' in the name.")
        return None

    for file_path in telemetry_files:
        # Extract context from the standardized path (e.g., Barber_R1)
        # This requires the manual rename step below!
        race_folder = os.path.basename(os.path.dirname(file_path))
        track_name, race_number = race_folder.split('_') if '_' in race_folder else ('Unknown', 'R0')
        
        print(f"\nProcessing Race: {track_name}_{race_number} - {os.path.basename(file_path)}")
        
        try:
            df = pd.read_csv(file_path)
            
            # --- Temporal Synchronization ---
            df = df.rename(columns={'meta_time': 'Time'})
            
            # [cite_start]Convert numeric 'meta_time' to synthetic datetime [cite: 32]
            if pd.api.types.is_numeric_dtype(df['Time']):
                df['Time'] = pd.to_datetime(df['Time'], unit='s')
                
            # [cite_start]Set 'Time' as the index [cite: 33]
            df = df.set_index('Time')
            
            # [cite_start]Resample and interpolate to align data to a uniform 20Hz time grid [cite: 34]
            df_synced = df.resample(RESAMPLE_RATE).mean().interpolate()
            
            # Add context columns and identify the Vehicle_ID (Assuming it's a column or must be inferred/added later)
            vehicle_id = df['Vehicle_ID'].iloc[0] if 'Vehicle_ID' in df.columns else 'Unknown_Car'
            
            df_synced['Vehicle_ID'] = vehicle_id
            df_synced['Track'] = track_name
            df_synced['Race_Number'] = race_number
            
            master_timeline = pd.concat([master_timeline, df_synced])
            
            # --- Driver Database Build ---
            if vehicle_id not in driver_profiles:
                driver_profiles[vehicle_id] = {
                    "Vehicle_ID": vehicle_id,
                    "Finishing_Positions": [],
                    "Critical_Events_Involved": [],
                    "Aggregated_Stats": {
                        "Avg_Speed_kmh": df['Speed'].mean()
                    }
                }
            
        except Exception as e:
            print(f"Failed to process {file_path}. Error: {e}")

    # [cite_start]Final cleanup and saving of Master Timeline (Parquet) [cite: 112]
    if not master_timeline.empty:
        master_timeline = master_timeline.sort_index()
        parquet_file = os.path.join(OUTPUT_DIR, 'master_timeline.parquet')
        master_timeline.to_parquet(parquet_file)
        print(f"\nMaster Timeline created and saved to {parquet_file}")
    
    # [cite_start]Save the Driver Profile Database (JSON) [cite: 114]
    with open(DRIVER_PROFILES_FILE, 'w') as f:
        json.dump(driver_profiles, f, indent=4)
    print(f"Driver Profile Database saved to {DRIVER_PROFILES_FILE}")

    return master_timeline

if __name__ == '__main__':
    ingest_and_synchronize_data()
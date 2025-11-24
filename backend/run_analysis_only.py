# run_analysis_only.py - Run analysis on existing Master Timeline
# Use this when you already have the parquet and just need to run analysis steps

import pandas as pd
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core_pipeline.event_detection import detect_critical_events
from backend.core_pipeline.causal_analysis import run_causal_analysis
from backend.core_pipeline.data_export import export_all_frontend_data

PARQUET_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                            'data_processed', 'master_timeline.parquet')

def run_analysis():
    print("=== Running Analysis on Existing Master Timeline ===\n")
    
    # Load existing parquet
    print("[LOAD] Loading Master Timeline...")
    df = pd.read_parquet(PARQUET_PATH)
    print(f"  Loaded: {len(df):,} rows")
    print(f"  Tracks: {df['Track'].unique().tolist()}")
    print(f"  Columns: {len(df.columns)}")
    
    # Check if sector discovery already ran
    has_sectors = 'Sector_ID' in df.columns
    print(f"  Sector_ID present: {has_sectors}")
    
    # Step 3: Event Detection
    print("\n[STEP 3] Running Event Detection...")
    event_list = detect_critical_events(df)
    event_count = len(event_list) if event_list else 0
    print(f"  Found {event_count} critical events")
    
    # Step 4: Causal Analysis
    if event_list:
        print("\n[STEP 4] Running Causal Analysis...")
        run_causal_analysis(df, event_list)
    else:
        print("\n[STEP 4] Skipping causal analysis - no events detected")
    
    # Step 5: Data Export
    print("\n[STEP 5] Exporting Frontend Data...")
    export_all_frontend_data()
    
    print("\n=== ANALYSIS COMPLETE ===")
    print("\nGenerated files:")
    print("  - data_processed/tracks/*.json")
    print("  - data_processed/sectors/*.json")
    print("  - data_processed/events/*.json")
    print("  - data_processed/timeline/*.json")
    print("  - data_processed/drivers/*.json")

if __name__ == '__main__':
    run_analysis()


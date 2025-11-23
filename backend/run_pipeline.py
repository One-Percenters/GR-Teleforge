# run_pipeline.py (Master Execution Script)

import os
import sys

# --- FIX: Using relative imports (the '.' prefix) to recognize modules within the 'backend' package ---

# Import the individual pipeline steps
from .core_pipeline.ingestion_sync import ingest_and_synchronize_data
from .core_pipeline.sector_discovery import automated_critical_sector_discovery

# Import future steps here: from .core_pipeline.event_detection import ...

def run_full_pipeline():
    print("--- 🏁 Starting GR Teleforge Data Pipeline 🏁 ---")
    
    # 1. Data Ingestion & Automated Sync
    print("\n[STEP 1/5] Running Data Ingestion & Synchronization...")
    master_df = ingest_and_synchronize_data()
    
    if master_df is None:
        print("Pipeline aborted due to ingestion failure or missing raw data.")
        return

    # 2. Automated Critical Sector Discovery (GPS Logic)
    print("\n[STEP 2/5] Running Automated Critical Sector Discovery...")
    enhanced_df = automated_critical_sector_discovery()

    # 3. Event Detection Logic (The Overtake Filter)
    # print("\n[STEP 3/5] Running Event Detection Logic...")
    # event_data = detect_critical_events(enhanced_df)
    
    print("\n--- ✅ Pipeline Complete! Processed data saved to data_processed/ ---")

if __name__ == '__main__':
    # To execute a script using relative imports (like those above), 
    # Python must be run using the '-m' flag from the parent directory (GR-Teleforge root).
    try:
        run_full_pipeline()
    except ImportError as e:
        print(f"Error during import: {e}")
        print("\nACTION REQUIRED: Please ensure you are running the script using the '-m' flag from the GR-Teleforge root directory:")
        print("    python -m backend.run_pipeline")
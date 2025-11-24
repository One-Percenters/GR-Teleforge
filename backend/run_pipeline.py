# run_pipeline.py (Master Execution Script)

import os
import subprocess
import sys

# Import the individual pipeline steps using relative imports
from .core_pipeline.ingestion_sync import ingest_and_synchronize_data
from .core_pipeline.sector_discovery import automated_critical_sector_discovery
from .core_pipeline.event_detection import detect_critical_events
from .core_pipeline.causal_analysis import run_causal_analysis

def run_full_pipeline():
    print("--- 🏁 Starting GR Teleforge Data Pipeline 🏁 ---")
    
    # STEP 1: Data Ingestion & Automated Sync
    print("\n[STEP 1/4] Running Data Ingestion & Synchronization...")
    master_df = ingest_and_synchronize_data()
    
    if master_df is None:
        print("Pipeline aborted due to ingestion failure or missing raw data.")
        return

    # STEP 2: Automated Critical Sector Discovery (GPS Logic)
    print("\n[STEP 2/4] Running Automated Critical Sector Discovery...")
    enhanced_df = automated_critical_sector_discovery()

    # STEP 3: Event Detection Logic (The Overtake Filter)
    print("\n[STEP 3/4] Running Event Detection Logic (Overtake Filter)...")
    event_list = detect_critical_events(enhanced_df)
    
    if not event_list:
        print("Pipeline finished, but no Critical Events (Overtakes) were confirmed.")
        return

    # STEP 4: Causal Analysis & Root Cause Determination
    print("\n[STEP 4/4] Running Causal Analysis & Root Cause Determination...")
    run_causal_analysis(enhanced_df, event_list)
    
    print("\n--- ✅ Pipeline Complete! Core logic phases executed. ---")

if __name__ == '__main__':
    # Execution: python -m backend.run_pipeline
    try:
        run_full_pipeline()
    except Exception as e:
        import traceback
        print(f"An unexpected error occurred during pipeline execution: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
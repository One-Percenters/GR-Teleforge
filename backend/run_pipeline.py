# run_pipeline.py (Master Execution Script)

import os
import subprocess
import sys

# Import the individual pipeline steps using relative imports
from .core_pipeline.ingestion_sync import ingest_and_synchronize_data
from .core_pipeline.sector_discovery import automated_critical_sector_discovery
from .core_pipeline.event_detection import detect_critical_events
from .core_pipeline.causal_analysis import run_causal_analysis
from .core_pipeline.data_export import export_all_frontend_data

def run_full_pipeline():
    print("--- Starting GR Teleforge Data Pipeline ---")
    
    # STEP 1: Data Ingestion & Automated Sync
    print("\n[STEP 1/5] Running Data Ingestion & Synchronization...")
    master_df = ingest_and_synchronize_data()
    
    if master_df is None:
        print("Pipeline aborted due to ingestion failure or missing raw data.")
        return

    # STEP 2: Automated Critical Sector Discovery (GPS Logic)
    print("\n[STEP 2/5] Running Automated Critical Sector Discovery...")
    enhanced_df = automated_critical_sector_discovery()
    
    if enhanced_df is None:
        print("Pipeline aborted: Sector discovery failed. Cannot proceed to event detection.")
        return

    # STEP 3: Event Detection Logic (The Overtake Filter)
    print("\n[STEP 3/5] Running Event Detection Logic (Overtake Filter)...")
    event_list = detect_critical_events(enhanced_df)
    
    if not event_list:
        print("Pipeline finished, but no Critical Events (Overtakes) were confirmed.")
        return

    # STEP 4: Causal Analysis & Root Cause Determination
    print("\n[STEP 4/5] Running Causal Analysis & Root Cause Determination...")
    run_causal_analysis(enhanced_df, event_list)
    
    # STEP 5: Frontend Data Export & Organization
    print("\n[STEP 5/5] Exporting Frontend Data & Creating Visualization Structures...")
    export_all_frontend_data()
    
    print("\n--- Pipeline Complete! All phases executed successfully. ---")

if __name__ == '__main__':
    # Execution: python -m backend.run_pipeline
    try:
        run_full_pipeline()
    except Exception as e:
        import traceback
        print(f"An unexpected error occurred during pipeline execution: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
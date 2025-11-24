# causal_analysis.py (Phase I - Step 4 & LLM Prep)

import pandas as pd
import numpy as np
import os
import json

# --- Configuration (Paths match ingestion_sync.py) ---
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROCESSED_DATA_PATH = os.path.join(REPO_ROOT, 'data_processed', 'master_timeline.parquet')
EVENT_METADATA_DIR = os.path.join(REPO_ROOT, 'data_processed', 'event_metadata')

# --- Causal Analysis Constants ---
BRAKE_START_THRESHOLD = 0.5 # 0.5 bar to detect Brake_Start_Dist

def find_brake_start_dist(df_car, event_timestamp):
    """Detects the lap distance when pbrake_f first exceeds the threshold near the event."""
    # Look back from the event timestamp for a braking spike
    pre_event_data = df_car[df_car.index < event_timestamp].iloc[::-1]
    
    # Find the first point where brake pressure exceeded the threshold
    brake_start_rows = pre_event_data[pre_event_data['pbrake_f'] > BRAKE_START_THRESHOLD]
    
    if not brake_start_rows.empty:
        # Get the timestamp of the first brake application above threshold
        return brake_start_rows.iloc[-1]['Laptrigger_lapdist_dls']
    return np.nan

def run_causal_analysis(df_master=None, event_list=None):
    """Quantifies the input delta between Winner and Loser to determine the root cause."""
    if df_master is None:
        try:
            df_master = pd.read_parquet(PROCESSED_DATA_PATH).set_index('Time')
        except FileNotFoundError:
            print("ERROR: Master Timeline not found. Cannot run causal analysis.")
            return

    if not event_list:
        print("No events provided for causal analysis.")
        return

    updated_events = []

    for event in event_list:
        winner_id = event['Winner_ID']
        loser_id = event['Loser_ID']
        event_time = pd.to_datetime(event['Timestamp'])
        
        # Define a window around the event for localized analysis (+/- 1 second is typical)
        analysis_window_start = event_time - pd.Timedelta(seconds=1.5)
        analysis_window_end = event_time + pd.Timedelta(seconds=1.5)
        
        # Slice data for the Winner and Loser in the analysis window
        winner_data = df_master[df_master['Vehicle_ID'] == winner_id].loc[analysis_window_start:analysis_window_end]
        loser_data = df_master[df_master['Vehicle_ID'] == loser_id].loc[analysis_window_start:analysis_window_end]

        if winner_data.empty or loser_data.empty:
            # Cannot compare inputs if data is missing
            event['Reason_Code'] = "Data_Missing"
            updated_events.append(event)
            continue
            
        # [cite_start]--- Comparative Math: Calculate Deltas using subtraction [cite: 110] ---
        deltas = {}

        # [cite_start]1. Brake Logic: Analyze Peak Pressure and Timing [cite: 112]
        winner_peak_pressure = winner_data['pbrake_f'].max()
        loser_peak_pressure = loser_data['pbrake_f'].max()
        # Positive delta means winner braked harder/later
        deltas['Brake_Pressure_Delta'] = winner_peak_pressure - loser_peak_pressure
        
        # Calculate Brake_Timing_Delta (Distance)
        winner_brake_dist = find_brake_start_dist(winner_data, event_time)
        loser_brake_dist = find_brake_start_dist(loser_data, event_time)
        # Positive delta means Winner started braking later (closer to corner)
        deltas['Brake_Timing_Delta'] = loser_brake_dist - winner_brake_dist 

        # [cite_start]2. Throttle Logic: Compare Throttle Commitment [cite: 114]
        winner_throttle_mean = winner_data['ath'].mean()
        loser_throttle_mean = loser_data['ath'].mean()
        deltas['Throttle_Commit_Delta'] = winner_throttle_mean - loser_throttle_mean

        # [cite_start]3. Gear Selection: Compare Modal Gear [cite: 115]
        winner_gear = winner_data['Gear'].mode().iloc[0] if not winner_data['Gear'].empty else 0
        loser_gear = loser_data['Gear'].mode().iloc[0] if not loser_data['Gear'].empty else 0
        deltas['Gear_Delta'] = winner_gear - loser_gear
        
        # [cite_start]--- Result: Assign primary "Reason Code" [cite: 116] ---
        
        # Determine the primary reason based on normalized magnitude
        # (This normalization is conceptual based on domain knowledge)
        magnitudes = {
            'Brake_Pressure_Delta': abs(deltas.get('Brake_Pressure_Delta', 0) * 10), 
            'Brake_Timing_Delta': abs(deltas.get('Brake_Timing_Delta', 0) * 0.5), # Meters of difference
            'Throttle_Commit_Delta': abs(deltas.get('Throttle_Commit_Delta', 0) * 0.1), 
            'Gear_Delta': abs(deltas.get('Gear_Delta', 0) * 5)
        }
        
        primary_reason = max(magnitudes, key=magnitudes.get)
        deviation_value = deltas.get(primary_reason, 0)
        
        event['Reason_Code'] = primary_reason
        event['Reason_Value'] = f"{deviation_value:.2f}"
        
        # [cite_start]Prepare for LLM Context Generation [cite: 121]
        event['LLM_Context_Input'] = {
            "Sector": event['Sector_ID'], 
            "Error": primary_reason, 
            "Value": event['Reason_Value'], 
            "Context": "Overtake"
        }
        
        updated_events.append(event)
    
    # Re-save the files, grouped by race, with the new Reason Codes
    if updated_events:
        print(f"Updated {len(updated_events)} events with Reason Codes.")
        for (track, race), group in pd.DataFrame(updated_events).groupby(['Track', 'Race_Number']):
            file_name = os.path.join(EVENT_METADATA_DIR, f"{track}_{race}_Events.json")
            with open(file_name, 'w') as f:
                json.dump(group.to_dict('records'), f, indent=4)
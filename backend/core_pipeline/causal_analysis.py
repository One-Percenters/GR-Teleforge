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
        winner_id = str(event['Winner_ID'])
        loser_id = str(event['Loser_ID'])
        event_time = pd.to_datetime(event['Timestamp'])
        sector_id = event.get('Sector_ID', '')
        
        # Contextual Mapping: Verify if the Event Timestamp falls within a defined Critical Sector boundaries
        # Check if event has a valid Critical Sector ID
        if not sector_id or not sector_id.startswith('S_'):
            event['Reason_Code'] = "Invalid_Sector"
            updated_events.append(event)
            continue
        
        # Define a window around the event for localized analysis (+/- 1.5 seconds)
        analysis_window_start = event_time - pd.Timedelta(seconds=1.5)
        analysis_window_end = event_time + pd.Timedelta(seconds=1.5)
        
        # Slice data for the Winner and Loser in the analysis window
        # Filter by Vehicle_ID and ensure we're in the same sector
        winner_data = df_master[
            (df_master['Vehicle_ID'].astype(str) == winner_id) &
            (df_master['Sector_ID'] == sector_id)
        ].loc[analysis_window_start:analysis_window_end]
        
        loser_data = df_master[
            (df_master['Vehicle_ID'].astype(str) == loser_id) &
            (df_master['Sector_ID'] == sector_id)
        ].loc[analysis_window_start:analysis_window_end]

        if winner_data.empty or loser_data.empty:
            # Cannot compare inputs if data is missing
            event['Reason_Code'] = "Data_Missing"
            updated_events.append(event)
            continue
            
        # --- Comparative Math: Calculate Deltas using subtraction ---
        deltas = {}

        # 1. Brake Logic: Analyze Peak Pressure and Timing
        if 'pbrake_f' in winner_data.columns and 'pbrake_f' in loser_data.columns:
            winner_peak_pressure = winner_data['pbrake_f'].max()
            loser_peak_pressure = loser_data['pbrake_f'].max()
            # Positive delta means winner braked harder
            deltas['Brake_Pressure_Delta'] = winner_peak_pressure - loser_peak_pressure
            
            # Calculate Brake_Timing_Delta (Distance)
            winner_brake_dist = find_brake_start_dist(winner_data, event_time)
            loser_brake_dist = find_brake_start_dist(loser_data, event_time)
            # Positive delta means Winner started braking later (closer to corner)
            if not pd.isna(winner_brake_dist) and not pd.isna(loser_brake_dist):
                deltas['Brake_Timing_Delta'] = loser_brake_dist - winner_brake_dist
            else:
                deltas['Brake_Timing_Delta'] = 0.0
        else:
            deltas['Brake_Pressure_Delta'] = 0.0
            deltas['Brake_Timing_Delta'] = 0.0

        # 2. Throttle Logic: Compare Throttle Commitment (Time to 100%)
        if 'ath' in winner_data.columns and 'ath' in loser_data.columns:
            # Find time to reach 100% throttle (or max throttle in window)
            winner_max_throttle = winner_data['ath'].max()
            loser_max_throttle = loser_data['ath'].max()
            
            # Time to 100%: Find first time when throttle reaches near-maximum (>=95%)
            winner_time_to_max = None
            loser_time_to_max = None
            
            winner_throttle_high = winner_data[winner_data['ath'] >= 95]
            if not winner_throttle_high.empty:
                winner_time_to_max = (winner_throttle_high.index[0] - analysis_window_start).total_seconds()
            
            loser_throttle_high = loser_data[loser_data['ath'] >= 95]
            if not loser_throttle_high.empty:
                loser_time_to_max = (loser_throttle_high.index[0] - analysis_window_start).total_seconds()
            
            # Compare time to 100% throttle (negative = winner reached 100% faster)
            if winner_time_to_max is not None and loser_time_to_max is not None:
                deltas['Throttle_Commit_Delta'] = loser_time_to_max - winner_time_to_max
            else:
                # Fallback to mean throttle comparison
                deltas['Throttle_Commit_Delta'] = winner_data['ath'].mean() - loser_data['ath'].mean()
        else:
            deltas['Throttle_Commit_Delta'] = 0.0

        # 3. Gear Selection: Compare Modal Gear at sector apex
        if 'Gear' in winner_data.columns and 'Gear' in loser_data.columns:
            winner_gear = winner_data['Gear'].mode().iloc[0] if not winner_data['Gear'].empty else 0
            loser_gear = loser_data['Gear'].mode().iloc[0] if not loser_data['Gear'].empty else 0
            deltas['Gear_Delta'] = winner_gear - loser_gear
        else:
            deltas['Gear_Delta'] = 0.0
        
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
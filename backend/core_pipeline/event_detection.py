# event_detection.py (Phase I - Step 3)

import pandas as pd
import numpy as np
import os
import json

# --- Configuration (Paths match ingestion_sync.py) ---
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROCESSED_DATA_PATH = os.path.join(REPO_ROOT, 'data_processed', 'master_timeline.parquet')
EVENT_METADATA_DIR = os.path.join(REPO_ROOT, 'data_processed', 'event_metadata')

# --- Event Detection Constants ---
# Spatial buffer to avoid flagging random GPS oscillations
HYSTERESIS_BUFFER_METERS = 2 
# The new position must be maintained for >0.3 seconds to be confirmed
PERSISTENCE_THRESHOLD_SECONDS = 0.3 
SAMPLING_RATE_HZ = 20 # 20Hz sampling from ingestion

def detect_critical_events(df=None):
    """Scans the Master Timeline for confirmed Overtake instances."""
    if df is None:
        try:
            df = pd.read_parquet(PROCESSED_DATA_PATH)
        except FileNotFoundError:
            print("ERROR: Master Timeline not found. Cannot run event detection.")
            return []
    
    print(f"Scanning {len(df):,} total data points for Critical Events...")
    os.makedirs(EVENT_METADATA_DIR, exist_ok=True)
    
    # Check if required columns exist
    required_cols = ['Laptrigger_lapdist_dls', 'Vehicle_ID', 'Sector_ID']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"ERROR: Missing required columns: {missing_cols}")
        print(f"Available columns: {list(df.columns)}")
        return []
    
    all_confirmed_events = []
    
    # Ensure data is sorted for positional and temporal analysis
    df = df.reset_index().sort_values(by=['Time', 'Laptrigger_lapdist_dls'], ascending=False)
    
    all_confirmed_events = []
    
    # Process each race separately
    for (track, race), group in df.groupby(['Track', 'Race_Number']):
        print(f"\n-- Processing {track}_{race} --")
        confirmed_events_race = []
        
        # Skip if no lap distance data for this track
        if 'Laptrigger_lapdist_dls' not in group.columns:
            print(f"  Skipping {track}_{race}: No lap distance data")
            continue
        
        # Filter out rows with missing lap distance
        group = group[group['Laptrigger_lapdist_dls'].notna()].copy()
        if len(group) < 100:
            print(f"  Skipping {track}_{race}: Insufficient lap distance data ({len(group)} rows)")
            continue
        
        # Estimate track length from max lap distance (handles lap rollover)
        track_length = group['Laptrigger_lapdist_dls'].max()
        if pd.isna(track_length) or track_length < 1000:
            print(f"  Skipping {track}_{race}: Invalid track length ({track_length})")
            continue
        
        # 1. Lap Distance Normalization
        group['LapDist_Normalized'] = group['Laptrigger_lapdist_dls'] % track_length
        
        # 2. Prepare for position tracking
        group = group.sort_values(by='Time')
        group['Time_Group'] = group['Time'].astype(str)
        
        # Calculate position - handle any remaining NaN by filling with 0
        group['LapDist_Normalized'] = group['LapDist_Normalized'].fillna(0)
        rank_result = group.groupby('Time_Group')['LapDist_Normalized'].rank(method='first', ascending=False)
        group['Current_Position'] = rank_result.fillna(1).astype(int)
        
        # Track previous position and distance per vehicle
        group['Prev_Position'] = group.groupby('Vehicle_ID')['Current_Position'].shift(1)
        group['Prev_LapDist'] = group.groupby('Vehicle_ID')['LapDist_Normalized'].shift(1)
        group['Delta_Dist'] = group['LapDist_Normalized'] - group['Prev_LapDist']
        
        # 3. Filter: Only check in Critical Sectors (where overtakes matter)
        critical_sector_data = group[group['Sector_ID'].str.startswith('S_', na=False)].copy()
        
        if critical_sector_data.empty:
            continue
        
        # 4. Identify potential position changes (position rank changed)
        position_changed = critical_sector_data['Current_Position'] != critical_sector_data['Prev_Position']
        potential_events = critical_sector_data[position_changed].copy()
        
        if potential_events.empty:
            continue
        
        # 5. Hysteresis Filtering: Apply spatial buffer to avoid flagging random GPS oscillations
        # Only flag if distance delta exceeds the hysteresis buffer
        potential_events['Dist_Delta_Abs'] = potential_events['Delta_Dist'].abs()
        potential_events = potential_events[potential_events['Dist_Delta_Abs'] > HYSTERESIS_BUFFER_METERS]
        
        if potential_events.empty:
            continue
        
        # 6. Group contiguous position changes to check for persistence
        potential_events = potential_events.sort_values(by='Time')
        potential_events['Position_Change'] = (potential_events['Current_Position'] < potential_events['Prev_Position']).astype(int)
        potential_events['Event_Group'] = (potential_events['Position_Change'].diff() != 0).cumsum()
        
        # 7. Check persistence: Position change must be maintained for >0.3 seconds
        for event_group_id, event_group in potential_events.groupby('Event_Group'):
            if len(event_group) < 2:  # Need at least 2 data points
                continue
                
            duration = (event_group['Time'].max() - event_group['Time'].min()).total_seconds()
            
            if duration >= PERSISTENCE_THRESHOLD_SECONDS:
                # Confirmed Overtake: Position swap maintained for sufficient time
                # Winner is the car that gained position (lower position number = better)
                event_group_sorted = event_group.sort_values(by='Current_Position')
                winner = event_group_sorted.iloc[0]  # Best position (lowest number)
                loser = event_group_sorted.iloc[-1]   # Worst position (highest number)
                
                # Calculate lap number from distance (approximate)
                lap_number = int(winner['Laptrigger_lapdist_dls'] // track_length) + 1
                
                event = {
                    "Timestamp": winner['Time'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                    "Winner_ID": str(winner['Vehicle_ID']),
                    "Loser_ID": str(loser['Vehicle_ID']),
                    "Sector_ID": winner['Sector_ID'],
                    "Track": track,
                    "Race_Number": race,
                    "Lap_Number": lap_number,
                }
                
                # Generate Critical_Event_ID following collision-proof schema
                event['Critical_Event_ID'] = f"{event['Sector_ID']}_L{event['Lap_Number']}_WIN{event['Winner_ID']}_LOS{event['Loser_ID']}"
                
                # Avoid duplicates
                if event['Critical_Event_ID'] not in [e['Critical_Event_ID'] for e in confirmed_events_race]:
                    confirmed_events_race.append(event)
        
        # Save batched JSON file for the race
        if confirmed_events_race:
            file_name = os.path.join(EVENT_METADATA_DIR, f"{track}_{race}_Events.json")
            with open(file_name, 'w') as f:
                json.dump(confirmed_events_race, f, indent=4)
            all_confirmed_events.extend(confirmed_events_race)
            print(f"  -> Confirmed {len(confirmed_events_race)} Critical Events for {track}_{race}.")
        else:
            print(f"  -> No confirmed events for {track}_{race}.")

    print(f"\nTotal confirmed events across all races: {len(all_confirmed_events)}")
    return all_confirmed_events
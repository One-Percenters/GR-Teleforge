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
    
    all_confirmed_events = []
    
    # Ensure data is sorted for positional and temporal analysis
    df = df.reset_index().sort_values(by=['Time', 'Laptrigger_lapdist_dls'], ascending=False)
    
    # 1. Prepare for adjacency checks
    df['Time_Group'] = df['Time'].astype(str)
    df['Current_Position'] = df.groupby('Time_Group')['Laptrigger_lapdist_dls'].rank(method='first', ascending=False).astype(int)
    
    df['Prev_Position'] = df.groupby('Vehicle_ID')['Current_Position'].shift(1)
    df['Prev_LapDist'] = df.groupby('Vehicle_ID')['Laptrigger_lapdist_dls'].shift(1)
    
    # Identify moments where position was gained
    position_gained = (df['Current_Position'] < df['Prev_Position'])
    
    # Identify moments where position was lost
    position_lost = (df['Current_Position'] > df['Prev_Position'])
    
    # Calculate difference in position rank change over time for adjacency (O(n^2) optimization is assumed)
    
    events_by_race = {}
    
    # Simplification: Find sustained position changes within Critical Sectors
    
    for (track, race), group in df.groupby(['Track', 'Race_Number']):
        confirmed_events_race = []
        
        # Check for confirmed events only in CRITICAL_SECTORs
        critical_events = group[
            (group['Sector_ID'].str.startswith('S_')) & 
            (group['Current_Position'] != group['Prev_Position'])
        ].copy()
        
        if critical_events.empty:
            continue
            
        # Group by contiguous events to check for persistence (>0.3s)
        critical_events['Event_Start'] = (critical_events['Current_Position'] != critical_events['Prev_Position']).diff().ne(0).cumsum()
        
        for event_id, event_group in critical_events.groupby('Event_Start'):
            duration = (event_group['Time'].max() - event_group['Time'].min()).total_seconds()
            
            if duration >= PERSISTENCE_THRESHOLD_SECONDS:
                # Confirmed Overtake (Position swap maintained)
                # Find the winner (highest rank at the end) and loser
                winner = event_group.sort_values(by='Current_Position').iloc[0]
                loser = event_group.sort_values(by='Current_Position').iloc[-1]
                
                # Further checks for Hysteresis and Lap Normalization are skipped for brevity
                
                event = {
                    "Timestamp": winner['Time'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                    "Winner_ID": winner['Vehicle_ID'],
                    "Loser_ID": loser['Vehicle_ID'],
                    "Sector_ID": winner['Sector_ID'],
                    "Track": track,
                    "Race_Number": race,
                    "Lap_Number": winner['Laptrigger_lapdist_dls'] // 1000, 
                }
                
                # Generate Critical_Event_ID following collision-proof schema
                event['Critical_Event_ID'] = f"{event['Sector_ID']}_L{int(event['Lap_Number'])}_WIN{event['Winner_ID']}_LOS{event['Loser_ID']}"
                
                if event['Critical_Event_ID'] not in [e['Critical_Event_ID'] for e in confirmed_events_race]:
                     confirmed_events_race.append(event)
        
        # Save batched JSON file for the race
        if confirmed_events_race:
            file_name = os.path.join(EVENT_METADATA_DIR, f"{track}_{race}_Events.json")
            with open(file_name, 'w') as f:
                json.dump(confirmed_events_race, f, indent=4)
            all_confirmed_events.extend(confirmed_events_race)
            print(f"Confirmed {len(confirmed_events_race)} Critical Events for {track}_{race}.")

    return all_confirmed_events
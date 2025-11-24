# timeline_query.py - Efficient Query Utilities for Master Timeline
# Provides fast, frontend-friendly data access patterns

import pandas as pd
import numpy as np
import os
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROCESSED_DATA_PATH = os.path.join(REPO_ROOT, 'data_processed', 'master_timeline.parquet')
TIMELINE_INDEX_PATH = os.path.join(REPO_ROOT, 'data_processed', 'timeline', 'timeline_index.json')

def get_race_timeline(track, race_number, start_time=None, end_time=None):
    """
    Get timeline data for a specific race.
    
    Args:
        track: Track name (e.g., 'Barber')
        race_number: Race number (e.g., 'R1')
        start_time: Optional start timestamp (ISO string or pd.Timestamp)
        end_time: Optional end timestamp (ISO string or pd.Timestamp)
    
    Returns:
        DataFrame with race data, indexed by Time
    """
    df = pd.read_parquet(PROCESSED_DATA_PATH)
    
    # Filter by track and race
    race_data = df[
        (df['Track'] == track) & 
        (df['Race_Number'] == race_number)
    ].copy()
    
    # Apply time filter if provided
    if start_time:
        if isinstance(start_time, str):
            start_time = pd.to_datetime(start_time)
        race_data = race_data[race_data.index >= start_time]
    
    if end_time:
        if isinstance(end_time, str):
            end_time = pd.to_datetime(end_time)
        race_data = race_data[race_data.index <= end_time]
    
    return race_data.sort_index()

def get_vehicle_timeline(track, race_number, vehicle_id, start_time=None, end_time=None):
    """
    Get timeline data for a specific vehicle in a race.
    
    Args:
        track: Track name
        race_number: Race number
        vehicle_id: Vehicle ID
        start_time: Optional start timestamp
        end_time: Optional end timestamp
    
    Returns:
        DataFrame with vehicle data
    """
    race_data = get_race_timeline(track, race_number, start_time, end_time)
    vehicle_data = race_data[race_data['Vehicle_ID'].astype(str) == str(vehicle_id)].copy()
    return vehicle_data.sort_index()

def get_events_at_time(track, race_number, timestamp):
    """
    Get all vehicle states at a specific timestamp.
    Useful for map rendering at a specific moment.
    
    Args:
        track: Track name
        race_number: Race number
        timestamp: ISO string or pd.Timestamp
    
    Returns:
        DataFrame with one row per vehicle at that timestamp
    """
    if isinstance(timestamp, str):
        timestamp = pd.to_datetime(timestamp)
    
    race_data = get_race_timeline(track, race_number)
    
    # Find closest timestamp (within 50ms tolerance for 20Hz data)
    time_diffs = (race_data.index - timestamp).abs()
    closest_idx = time_diffs.idxmin()
    
    if time_diffs.loc[closest_idx] > pd.Timedelta('100ms'):
        return pd.DataFrame()  # No data close enough
    
    # Get all vehicles at this timestamp
    at_time = race_data.loc[race_data.index == closest_idx]
    return at_time

def get_sector_data(track, sector_id):
    """
    Get all data points within a specific critical sector.
    
    Args:
        track: Track name
        sector_id: Sector ID (e.g., 'S_012')
    
    Returns:
        DataFrame with all data in that sector
    """
    df = pd.read_parquet(PROCESSED_DATA_PATH)
    sector_data = df[
        (df['Track'] == track) &
        (df['Sector_ID'] == sector_id)
    ].copy()
    return sector_data.sort_index()

def get_event_context(event_id):
    """
    Get timeline data around a specific critical event.
    
    Args:
        event_id: Critical_Event_ID
    
    Returns:
        Dictionary with event metadata and surrounding timeline data
    """
    # Load event data
    events_dir = os.path.join(REPO_ROOT, 'data_processed', 'events')
    all_events_file = os.path.join(events_dir, 'all_events.json')
    
    if not os.path.exists(all_events_file):
        return None
    
    with open(all_events_file, 'r') as f:
        events_data = json.load(f)
    
    # Find the event
    event = None
    for e in events_data.get('events', []):
        if e.get('Critical_Event_ID') == event_id:
            event = e
            break
    
    if not event:
        return None
    
    # Get timeline data around the event
    event_time = pd.to_datetime(event['Timestamp'])
    window_start = event_time - pd.Timedelta(seconds=5)
    window_end = event_time + pd.Timedelta(seconds=5)
    
    race_data = get_race_timeline(
        event['Track'],
        event['Race_Number'],
        window_start,
        window_end
    )
    
    return {
        'event': event,
        'timeline': race_data,
        'winner_data': get_vehicle_timeline(
            event['Track'],
            event['Race_Number'],
            event['Winner_ID'],
            window_start,
            window_end
        ),
        'loser_data': get_vehicle_timeline(
            event['Track'],
            event['Race_Number'],
            event['Loser_ID'],
            window_start,
            window_end
        )
    }

def get_track_summary(track):
    """
    Get summary statistics for a track across all races.
    
    Returns:
        Dictionary with track statistics
    """
    df = pd.read_parquet(PROCESSED_DATA_PATH)
    track_data = df[df['Track'] == track]
    
    return {
        'track': track,
        'races': track_data['Race_Number'].unique().tolist(),
        'total_data_points': len(track_data),
        'vehicles': track_data['Vehicle_ID'].nunique() if 'Vehicle_ID' in track_data.columns else 0,
        'time_range': {
            'start': str(track_data.index.min()),
            'end': str(track_data.index.max())
        },
        'sectors': track_data['Sector_ID'].unique().tolist() if 'Sector_ID' in track_data.columns else []
    }

if __name__ == '__main__':
    # Example usage
    print("Timeline Query Utilities")
    print("Use these functions to query the Master Timeline efficiently")


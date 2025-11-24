# data_export.py - Frontend-Friendly Data Export & Organization
# Creates standardized, easily-queryable data structures for map visualization

import pandas as pd
import numpy as np
import os
import json
from pathlib import Path

# --- Configuration ---
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROCESSED_DATA_PATH = os.path.join(REPO_ROOT, 'data_processed', 'master_timeline.parquet')
EVENT_METADATA_DIR = os.path.join(REPO_ROOT, 'data_processed', 'event_metadata')

# Organized output directories
OUTPUT_BASE = os.path.join(REPO_ROOT, 'data_processed')
TRACKS_DIR = os.path.join(OUTPUT_BASE, 'tracks')
SECTORS_DIR = os.path.join(OUTPUT_BASE, 'sectors')
EVENTS_DIR = os.path.join(OUTPUT_BASE, 'events')
TIMELINE_DIR = os.path.join(OUTPUT_BASE, 'timeline')
DRIVERS_DIR = os.path.join(OUTPUT_BASE, 'drivers')

def setup_export_directories():
    """Create organized directory structure for frontend data."""
    for directory in [TRACKS_DIR, SECTORS_DIR, EVENTS_DIR, TIMELINE_DIR, DRIVERS_DIR]:
        os.makedirs(directory, exist_ok=True)
    print(f"Data export directories initialized.")

def extract_track_boundaries(df_master):
    """Extract track boundaries (min/max GPS coordinates) for each track."""
    print("\nExtracting track boundaries...")
    
    # Detect GPS columns
    gps_lat_col = None
    gps_long_col = None
    
    for col in df_master.columns:
        col_lower = col.lower()
        if gps_lat_col is None and ('lat' in col_lower and 'lap' not in col_lower):
            gps_lat_col = col
        if gps_long_col is None and ('long' in col_lower and 'lap' not in col_lower):
            gps_long_col = col
    
    if not gps_lat_col or not gps_long_col:
        print("WARNING: GPS columns not found. Cannot extract track boundaries.")
        return {}
    
    track_boundaries = {}
    
    for track in df_master['Track'].unique():
        track_data = df_master[df_master['Track'] == track]
        valid_gps = track_data[gps_lat_col].notna() & track_data[gps_long_col].notna()
        
        if valid_gps.sum() > 0:
            track_boundaries[track] = {
                'lat_min': float(track_data[gps_lat_col].min()),
                'lat_max': float(track_data[gps_lat_col].max()),
                'long_min': float(track_data[gps_long_col].min()),
                'long_max': float(track_data[gps_long_col].max()),
                'center_lat': float(track_data[gps_lat_col].mean()),
                'center_long': float(track_data[gps_long_col].mean()),
            }
            
            # Save track boundary file
            track_file = os.path.join(TRACKS_DIR, f"{track}_boundaries.json")
            with open(track_file, 'w') as f:
                json.dump(track_boundaries[track], f, indent=2)
    
    # Save master track index
    tracks_index = {
        'tracks': list(track_boundaries.keys()),
        'boundaries': track_boundaries
    }
    with open(os.path.join(TRACKS_DIR, 'tracks_index.json'), 'w') as f:
        json.dump(tracks_index, f, indent=2)
    
    print(f"  -> Extracted boundaries for {len(track_boundaries)} tracks")
    return track_boundaries

def extract_sector_boundaries(df_master):
    """Extract sector boundaries (GPS coordinates) for visualization."""
    print("\nExtracting sector boundaries...")
    
    # Check if Sector_ID column exists
    if 'Sector_ID' not in df_master.columns:
        print("WARNING: Sector_ID column not found. Run sector discovery first.")
        return {}
    
    # Detect GPS columns
    gps_lat_col = None
    gps_long_col = None
    
    for col in df_master.columns:
        col_lower = col.lower()
        if gps_lat_col is None and ('lat' in col_lower and 'lap' not in col_lower):
            gps_lat_col = col
        if gps_long_col is None and ('long' in col_lower and 'lap' not in col_lower):
            gps_long_col = col
    
    if not gps_lat_col or not gps_long_col:
        print("WARNING: GPS columns not found. Cannot extract sector boundaries.")
        return {}
    
    sector_boundaries = {}
    
    for track in df_master['Track'].unique():
        track_data = df_master[df_master['Track'] == track].copy()
        
        # Get all critical sectors for this track (handle NaN values)
        critical_sectors = track_data[track_data['Sector_ID'].notna() & track_data['Sector_ID'].str.startswith('S_', na=False)]
        
        if critical_sectors.empty:
            continue
        
        track_sectors = {}
        
        for sector_id in critical_sectors['Sector_ID'].unique():
            sector_data = critical_sectors[critical_sectors['Sector_ID'] == sector_id]
            valid_gps = sector_data[gps_lat_col].notna() & sector_data[gps_long_col].notna()
            
            if valid_gps.sum() > 0:
                sector_gps = sector_data[valid_gps]
                
                track_sectors[sector_id] = {
                    'sector_id': sector_id,
                    'lat_min': float(sector_gps[gps_lat_col].min()),
                    'lat_max': float(sector_gps[gps_lat_col].max()),
                    'long_min': float(sector_gps[gps_long_col].min()),
                    'long_max': float(sector_gps[gps_long_col].max()),
                    'center_lat': float(sector_gps[gps_lat_col].mean()),
                    'center_long': float(sector_gps[gps_long_col].mean()),
                    # Store sample GPS points for path rendering
                    'sample_points': [
                        {
                            'lat': float(row[gps_lat_col]),
                            'long': float(row[gps_long_col])
                        }
                        for idx, row in sector_gps.iloc[::max(1, len(sector_gps)//20)].iterrows()
                    ]
                }
        
        if track_sectors:
            sector_boundaries[track] = track_sectors
            
            # Save sector boundaries for this track
            sector_file = os.path.join(SECTORS_DIR, f"{track}_sectors.json")
            with open(sector_file, 'w') as f:
                json.dump(track_sectors, f, indent=2)
    
    # Save master sector index
    sectors_index = {
        'tracks': list(sector_boundaries.keys()),
        'sectors': {track: list(sectors.keys()) for track, sectors in sector_boundaries.items()}
    }
    with open(os.path.join(SECTORS_DIR, 'sectors_index.json'), 'w') as f:
        json.dump(sectors_index, f, indent=2)
    
    print(f"  -> Extracted sectors for {len(sector_boundaries)} tracks")
    return sector_boundaries

def consolidate_event_data():
    """Consolidate all event JSON files into a single, queryable structure."""
    print("\nConsolidating event data...")
    
    all_events = []
    events_by_track = {}
    
    # Load all event files
    if os.path.exists(EVENT_METADATA_DIR):
        for event_file in Path(EVENT_METADATA_DIR).glob('*_Events.json'):
            with open(event_file, 'r') as f:
                events = json.load(f)
                all_events.extend(events)
                
                # Group by track
                for event in events:
                    track = event.get('Track', 'Unknown')
                    if track not in events_by_track:
                        events_by_track[track] = []
                    events_by_track[track].append(event)
    
    # Save consolidated events
    if all_events:
        # Master events file
        events_master = {
            'total_events': len(all_events),
            'events_by_track': {track: len(events) for track, events in events_by_track.items()},
            'events': all_events
        }
        
        master_file = os.path.join(EVENTS_DIR, 'all_events.json')
        with open(master_file, 'w') as f:
            json.dump(events_master, f, indent=2)
        
        # Per-track event files
        for track, events in events_by_track.items():
            track_file = os.path.join(EVENTS_DIR, f"{track}_events.json")
            with open(track_file, 'w') as f:
                json.dump(events, f, indent=2)
        
        print(f"  -> Consolidated {len(all_events)} events across {len(events_by_track)} tracks")
    
    return all_events

def create_timeline_index(df_master):
    """Create an index of available timeline data for quick frontend queries."""
    print("\nCreating timeline index...")
    
    timeline_index = {
        'total_rows': len(df_master),
        'tracks': {},
        'races': [],
        'time_range': {
            'start': str(df_master.index.min()) if not df_master.empty else None,
            'end': str(df_master.index.max()) if not df_master.empty else None
        }
    }
    
    # Index by track
    for track in df_master['Track'].unique():
        track_data = df_master[df_master['Track'] == track]
        races = track_data['Race_Number'].unique().tolist()
        
        timeline_index['tracks'][track] = {
            'races': races,
            'row_count': len(track_data),
            'vehicles': track_data['Vehicle_ID'].nunique() if 'Vehicle_ID' in track_data.columns else 0
        }
        
        # Add race entries
        for race in races:
            race_data = track_data[track_data['Race_Number'] == race]
            timeline_index['races'].append({
                'track': track,
                'race': race,
                'row_count': len(race_data),
                'vehicles': race_data['Vehicle_ID'].nunique() if 'Vehicle_ID' in race_data.columns else 0
            })
    
    # Save timeline index
    index_file = os.path.join(TIMELINE_DIR, 'timeline_index.json')
    with open(index_file, 'w') as f:
        json.dump(timeline_index, f, indent=2)
    
    print(f"  -> Created index for {len(timeline_index['tracks'])} tracks, {len(timeline_index['races'])} races")
    return timeline_index

def export_all_frontend_data():
    """Main export function - creates all frontend-friendly data structures."""
    print("\n=== Exporting Frontend Data ===")
    
    setup_export_directories()
    
    # Load master timeline
    try:
        df_master = pd.read_parquet(PROCESSED_DATA_PATH)
        print(f"Loaded Master Timeline: {len(df_master):,} rows")
    except FileNotFoundError:
        print("ERROR: Master Timeline not found. Run ingestion first.")
        return
    
    # Extract and save all data structures
    extract_track_boundaries(df_master)
    extract_sector_boundaries(df_master)
    consolidate_event_data()
    create_timeline_index(df_master)
    
    # Copy driver profiles to drivers directory
    driver_profiles_file = os.path.join(OUTPUT_BASE, 'driver_profiles.json')
    if os.path.exists(driver_profiles_file):
        import shutil
        shutil.copy(driver_profiles_file, os.path.join(DRIVERS_DIR, 'driver_profiles.json'))
        print(f"\n  -> Copied driver profiles to drivers directory")
    
    print("\n=== Frontend Data Export Complete ===")
    print(f"\nData structure:")
    print(f"  {TRACKS_DIR}/ - Track boundaries and metadata")
    print(f"  {SECTORS_DIR}/ - Sector boundaries for visualization")
    print(f"  {EVENTS_DIR}/ - Consolidated event data")
    print(f"  {TIMELINE_DIR}/ - Timeline index for queries")
    print(f"  {DRIVERS_DIR}/ - Driver profiles")

if __name__ == '__main__':
    export_all_frontend_data()


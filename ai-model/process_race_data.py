"""
Process race CSV data and generate RaceTimeline JSON for frontend.
This script reads telemetry and sector data from a folder and outputs
a complete race timeline with car positions, telemetry, and metadata.
"""
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any


def parse_time_to_seconds(time_str):
    """Convert time string (MM:SS.mmm or SS.mmm) to seconds."""
    if pd.isna(time_str):
        return np.nan
    
    try:
        time_str = str(time_str).strip()
        if ':' in time_str:
            parts = time_str.split(':')
            minutes = float(parts[0])
            seconds = float(parts[1])
            return minutes * 60 + seconds
        else:
            return float(time_str)
    except:
        return np.nan


def load_sector_data(folder_path: Path) -> pd.DataFrame:
    """Load sector/lap time data from analysis files."""
    sector_files = list(folder_path.glob('*23_Analysis*.csv'))
    
    if not sector_files:
        return pd.DataFrame()
    
    # Use the first analysis file found
    sector_df = pd.read_csv(sector_files[0], encoding='latin1', sep=';')
    return sector_df


def load_telemetry_data(folder_path: Path) -> pd.DataFrame:
    """Load telemetry data from CSV files."""
    telem_files = list(folder_path.glob('*VBOX*.csv')) + list(folder_path.glob('*telemetry*.csv'))
    
    if not telem_files:
        return pd.DataFrame()
    
    # Load and combine telemetry files
    all_telem = []
    for file in telem_files[:5]:  # Limit to first 5 files for performance
        try:
            df = pd.read_csv(file, encoding='latin1', skiprows=2)
            all_telem.append(df)
        except:
            continue
    
    if all_telem:
        return pd.concat(all_telem, ignore_index=True)
    return pd.DataFrame()


def extract_car_positions(sector_df: pd.DataFrame, num_frames: int = 1000) -> List[Dict]:
    """Extract car position data from sector analysis and convert to RaceFrame format."""
    if sector_df.empty:
        return []
    
    # Find column names (handle variations)
    number_col = next((col for col in sector_df.columns if 'NUMBER' in col.upper()), None)
    lap_col = next((col for col in sector_df.columns if 'LAP' in col and 'TIME' in col), None)
    
    if not number_col or not lap_col:
        return []
    
    # Get unique drivers
    drivers_list = sector_df[number_col].unique()
    drivers_list = [int(d) for d in drivers_list if pd.notna(d)]
    
    # Create timeline frames
    frames = []
    total_laps = int(sector_df['LAP'].max()) if 'LAP' in sector_df.columns else 10
    
    # Generate multiple frames per lap for smooth animation (e.g., 10 frames per lap)
    frames_per_lap = 10
    
    for lap in range(1, min(total_laps + 1, 50)):  # Limit to 50 laps
        lap_data = sector_df[sector_df['LAP'] == lap] if 'LAP' in sector_df.columns else sector_df
        
        positions = []
        for driver in drivers_list:
            driver_lap = lap_data[lap_data[number_col] == driver]
            
            if not driver_lap.empty:
                lap_time = parse_time_to_seconds(driver_lap[lap_col].iloc[0])
                
                positions.append({
                    'carNumber': int(driver),
                    'driverName': f'Driver {int(driver)}',
                    'lapTime': lap_time if not np.isnan(lap_time) else 90.0,
                    'position': len(positions) + 1,
                    'gap': 0.0,
                })
        
        # Sort by lap time to get correct positions
        positions.sort(key=lambda x: x['lapTime'])
        for i, pos in enumerate(positions):
            pos['position'] = i + 1
            pos['gap'] = pos['lapTime'] - positions[0]['lapTime'] if i > 0 else 0.0
        
        # Generate multiple frames per lap for smooth playback
        for frame_in_lap in range(frames_per_lap):
            progress_in_lap = frame_in_lap / frames_per_lap
            timestamp_ms = ((lap - 1) * 90.0 + progress_in_lap * 90.0) * 1000  # Convert to milliseconds
            
            # Create drivers array with full telemetry (matching DriverState type)
            drivers = []
            for pos in positions:
                # Simulate track progress based on position and lap progress
                base_progress = (lap - 1 + progress_in_lap) / total_laps
                # Add position-based offset (leaders are slightly ahead)
                position_offset = -(pos['position'] - 1) * 0.01
                track_progress = (base_progress + position_offset) % 1.0
                
                # Simulate telemetry based on track position
                is_corner = (track_progress > 0.2 and track_progress < 0.5) or (track_progress > 0.7)
                
                if is_corner:
                    speed_mph = 60 + np.random.randint(-5, 5)
                    throttle = 40
                    brake = 0
                    gear = 2
                    steering = 25
                    rpm = 5000
                else:
                    speed_mph = 130 + np.random.randint(-10, 10)
                    throttle = 90
                    brake = 0
                    gear = 5
                    steering = 0
                    rpm = 7000
                
                drivers.append({
                    'carNumber': pos['carNumber'],
                    'driverName': pos['driverName'],
                    'trackProgress': track_progress,
                    'gapToLeaderSeconds': pos['gap'],
                    'position': pos['position'],
                    'speedMph': speed_mph,
                    'throttlePercent': throttle,
                    'brakePercent': brake,
                    'gear': gear,
                    'steeringAngleDeg': steering,
                    'rpm': rpm,
                })
            
            # Determine race status
            if lap == 1 and frame_in_lap < 3:
                status = 'PAUSED'
            elif lap == total_laps and frame_in_lap >= frames_per_lap - 2:
                status = 'CHECKERED'
            else:
                status = 'GREEN'
            
            frames.append({
                'timestampMs': int(timestamp_ms),
                'status': status,
                'lap': lap,
                'totalLaps': total_laps,
                'raceProgress': base_progress,
                'drivers': drivers,
            })
    
    return frames


def extract_telemetry_summary(telem_df: pd.DataFrame, drivers: List[int]) -> Dict[int, Dict]:
    """Extract telemetry summary for each driver."""
    telemetry = {}
    
    if telem_df.empty or 'vehicle_number' not in telem_df.columns:
        return telemetry
    
    for driver in drivers:
        driver_data = telem_df[telem_df['vehicle_number'] == driver]
        
        if not driver_data.empty:
            # Pivot data if in long format
            if 'telemetry_name' in driver_data.columns:
                pivot = driver_data.pivot_table(
                    index='timestamp',
                    columns='telemetry_name',
                    values='telemetry_value',
                    aggfunc='first'
                )
                
                telemetry[driver] = {
                    'speed_avg': pivot['vspeed'].mean() if 'vspeed' in pivot.columns else 0.0,
                    'speed_max': pivot['vspeed'].max() if 'vspeed' in pivot.columns else 0.0,
                    'throttle_avg': pivot['aps'].mean() if 'aps' in pivot.columns else 0.0,
                    'brake_avg': pivot['pbrake_f'].mean() if 'pbrake_f' in pivot.columns else 0.0,
                }
    
    return telemetry


def process_race_folder(folder_path: Path) -> Dict[str, Any]:
    """
    Process a race data folder and generate RaceTimeline JSON.
    
    Args:
        folder_path: Path to folder containing race CSV files
        
    Returns:
        Dictionary with timeline and metadata
    """
    print(f"Processing folder: {folder_path}", file=sys.stderr)
    
    # Load metadata if exists
    metadata = {}
    metadata_file = folder_path / 'metadata.json'
    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
    else:
        # Generate metadata from folder name
        folder_name = folder_path.name
        track_name = folder_name.replace('-', ' ').title()
        metadata = {
            'trackName': track_name,
            'raceName': f'GR Cup Series - {track_name}',
            'folder': folder_name,
        }
    
    # Load race data
    sector_df = load_sector_data(folder_path)
    telem_df = load_telemetry_data(folder_path)
    
    print(f"Loaded sector data: {len(sector_df)} rows", file=sys.stderr)
    print(f"Loaded telemetry data: {len(telem_df)} rows", file=sys.stderr)
    
    # Extract timeline frames
    timeline = extract_car_positions(sector_df)
    
    if not timeline:
        # Return empty timeline with metadata
        return {
            'timeline': [],
            'metadata': metadata,
            'error': 'No valid race data found in folder',
        }
    
    # Extract driver list from timeline
    drivers = list(set([d['carNumber'] for frame in timeline for d in frame['drivers']]))
    telemetry = extract_telemetry_summary(telem_df, drivers)
    
    # Enrich timeline with real telemetry if available
    # (Currently we're using simulated telemetry in extract_car_positions,
    # but could override with real telemetry here if available)
    for frame in timeline:
        for driver_state in frame['drivers']:
            car_num = driver_state['carNumber']
            if car_num in telemetry:
                # Override simulated telemetry with real data if available
                driver_state['speedMph'] = int(telemetry[car_num].get('speed_avg', driver_state['speedMph']))
                driver_state['throttlePercent'] = int(telemetry[car_num].get('throttle_avg', driver_state['throttlePercent']))

    
    return {
        'timeline': timeline,
        'metadata': metadata,
        'stats': {
            'totalFrames': len(timeline),
            'totalDrivers': len(drivers),
            'drivers': drivers,
        }
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No folder path provided'}))
        sys.exit(1)
    
    folder_path = Path(sys.argv[1])
    
    if not folder_path.exists():
        print(json.dumps({'error': f'Folder not found: {folder_path}'}))
        sys.exit(1)
    
    try:
        result = process_race_folder(folder_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e), 'type': type(e).__name__}))
        sys.exit(1)

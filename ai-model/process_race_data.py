"""
Process race CSV data and generate RaceTimeline JSON for frontend.
Supports REAL TELEMETRY integration from VBOX files, with fallback to Sector Analysis data.
Includes Virtual Best Lap analysis.
"""
import sys
import json
import re
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any

# ---------- Helper Functions ----------

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

def get_car_number(filename: str) -> int:
    """Extract car number from filename (e.g. 'VBOX_007.csv' -> 7)."""
    match = re.search(r'(?:^|_|VBOX)(\d+)(?:_|\.|$)', filename, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 0

def normalize_telemetry(df: pd.DataFrame) -> pd.DataFrame:
    """Map various CSV column names to standard internal names."""
    col_map = {
        'vspeed': 'speed', 'Velocity': 'speed', 'Speed': 'speed', 'GPS_Speed': 'speed',
        'aps': 'throttle', 'Throttle': 'throttle', 'Pedal': 'throttle', 'Throttle_Pos': 'throttle',
        'pbrake_f': 'brake', 'Brake': 'brake', 'Brake_Pres': 'brake', 'Brake_Pos': 'brake',
        'rpm': 'rpm', 'RPM': 'rpm', 'Engine_Speed': 'rpm',
        'steer_angle': 'steer', 'Steer': 'steer', 'Steering': 'steer', 'Steering_Angle': 'steer',
        'lat': 'lat', 'Latitude': 'lat', 'G_Lat': 'g_lat',
        'long': 'long', 'Longitude': 'long', 'G_Long': 'g_long',
        'time': 'time', 'Time': 'time', 'utc_time': 'time', 'UTC_Time': 'time'
    }
    
    df.columns = [c.strip() for c in df.columns]
    new_cols = {}
    for col in df.columns:
        lower_col = col.lower()
        if lower_col in col_map:
            new_cols[col] = col_map[lower_col]
            
    df = df.rename(columns=new_cols)
    
    for col in ['speed', 'throttle', 'brake', 'rpm', 'steer']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        else:
            df[col] = 0.0
            
    return df

# ---------- Analysis Functions ----------

def calculate_virtual_best(sector_df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate Virtual Best Lap (sum of best sectors) for each driver."""
    if sector_df.empty: return {'error': 'Empty sector dataframe'}
    
    # Identify columns
    # Look for 'NUMBER' or 'NO'
    num_col = next((c for c in sector_df.columns if 'NUM' in c.upper() or 'NO' in c.upper()), None)
    if not num_col: return {'error': f'No number column found. Columns: {list(sector_df.columns)}'}
    
    # Helper to find sector col
    def find_col(patterns):
        for p in patterns:
            found = next((c for c in sector_df.columns if p in c.upper() and 'SPD' not in c.upper() and 'SPEED' not in c.upper()), None)
            if found: return found
        return None

    s1_col = find_col(['S1', 'SECTOR1', 'SECTOR 1', 'SEC1', 'SECTOR_1'])
    s2_col = find_col(['S2', 'SECTOR2', 'SECTOR 2', 'SEC2', 'SECTOR_2'])
    s3_col = find_col(['S3', 'SECTOR3', 'SECTOR 3', 'SEC3', 'SECTOR_3'])
    lap_time_col = next((c for c in sector_df.columns if 'LAP' in c.upper() and 'TIME' in c.upper()), None)
    
    if not (s1_col and s2_col and s3_col):
        return {'error': f'Missing sector columns. Found: S1={s1_col}, S2={s2_col}, S3={s3_col}. All cols: {list(sector_df.columns)}'}
        
    analysis = {}
    
    # Group by driver
    drivers = sector_df[num_col].unique()
    
    for driver in drivers:
        if pd.isna(driver): continue
        try:
            driver_id = int(driver)
        except:
            continue
            
        d_data = sector_df[sector_df[num_col] == driver]
        
        # Convert times to seconds
        s1_times = d_data[s1_col].apply(parse_time_to_seconds)
        s2_times = d_data[s2_col].apply(parse_time_to_seconds)
        s3_times = d_data[s3_col].apply(parse_time_to_seconds)
        lap_times = d_data[lap_time_col].apply(parse_time_to_seconds) if lap_time_col else pd.Series([])
        
        # Find bests (ignoring NaNs and 0s)
        best_s1 = s1_times[s1_times > 0].min()
        best_s2 = s2_times[s2_times > 0].min()
        best_s3 = s3_times[s3_times > 0].min()
        actual_best = lap_times[lap_times > 0].min()
        
        if pd.notna(best_s1) and pd.notna(best_s2) and pd.notna(best_s3):
            virtual_best = best_s1 + best_s2 + best_s3
            potential_gain = actual_best - virtual_best if pd.notna(actual_best) else 0.0
            
            analysis[str(driver_id)] = {
                'bestS1': float(best_s1),
                'bestS2': float(best_s2),
                'bestS3': float(best_s3),
                'virtualBest': float(virtual_best),
                'actualBest': float(actual_best) if pd.notna(actual_best) else None,
                'potentialGain': float(potential_gain) if potential_gain > 0 else 0.0
            }
            
    return analysis

# ---------- Real Telemetry Processing ----------

def build_timeline_from_telemetry(folder_path: Path) -> List[Dict]:
    """Build race timeline from real VBOX telemetry files."""
    files = list(folder_path.glob('*VBOX*.csv')) + list(folder_path.glob('*telemetry*.csv'))
    files = [f for f in files if 'metadata' not in f.name.lower()]
    
    if not files: return []
        
    print(f"Found {len(files)} telemetry files. Processing...", file=sys.stderr)
    
    drivers_data = {}
    max_frames = 0
    
    for file in files:
        car_num = get_car_number(file.name)
        if car_num == 0: continue
        
        try:
            try:
                df = pd.read_csv(file, skiprows=2, encoding='latin1')
                if len(df.columns) < 2: raise ValueError
            except:
                df = pd.read_csv(file, encoding='latin1')
                
            df = normalize_telemetry(df)
            df = df.iloc[::10].reset_index(drop=True)
            
            df['speed_ms'] = df['speed'] / 3.6
            df['dist_delta'] = df['speed_ms'] * 0.1
            df['total_dist'] = df['dist_delta'].cumsum()
            
            drivers_data[car_num] = df
            max_frames = max(max_frames, len(df))
            
        except Exception as e:
            print(f"Error reading {file.name}: {e}", file=sys.stderr)
            continue
            
    if not drivers_data: return []
        
    frames = []
    max_distances = [df['total_dist'].max() for df in drivers_data.values()]
    if not max_distances: return []
    
    track_length_m = 5000.0 
    
    for i in range(max_frames):
        frame_drivers = []
        status = 'GREEN'
        if i < 10: status = 'PAUSED'
        elif i >= max_frames - 10: status = 'CHECKERED'
        
        current_drivers_dist = []
        
        for car_num, df in drivers_data.items():
            if i < len(df):
                row = df.iloc[i]
                dist = row['total_dist']
                current_drivers_dist.append({'id': car_num, 'dist': dist})
                
                track_progress = (dist % track_length_m) / track_length_m
                
                frame_drivers.append({
                    'carNumber': car_num,
                    'driverName': f'Driver {car_num}',
                    'speedMph': float(row['speed']) * 0.621371,
                    'throttlePercent': float(row['throttle']),
                    'brakePercent': float(row['brake']),
                    'rpm': float(row['rpm']),
                    'steeringAngleDeg': float(row['steer']),
                    'trackProgress': track_progress,
                    'position': 1,
                    'gapToLeaderSeconds': 0.0
                })
        
        frame_drivers.sort(key=lambda x: next(d['dist'] for d in current_drivers_dist if d['id'] == x['carNumber']), reverse=True)
        
        leader_dist = next(d['dist'] for d in current_drivers_dist if d['id'] == frame_drivers[0]['carNumber'])
        
        for pos, driver in enumerate(frame_drivers):
            driver['position'] = pos + 1
            driver_dist = next(d['dist'] for d in current_drivers_dist if d['id'] == driver['carNumber'])
            dist_delta = leader_dist - driver_dist
            speed_ms = (driver['speedMph'] * 1.60934 * 1000) / 3600
            if speed_ms > 1:
                driver['gapToLeaderSeconds'] = dist_delta / speed_ms
            else:
                driver['gapToLeaderSeconds'] = 0.0
                
        frames.append({
            'timestampMs': i * 100,
            'drivers': frame_drivers,
            'lap': int(leader_dist / track_length_m) + 1,
            'totalLaps': int(max(max_distances) / track_length_m),
            'raceProgress': leader_dist / max(max_distances) if max(max_distances) > 0 else 0,
            'status': status
        })
        
    return frames

# ---------- Fallback: Sector Data Processing ----------

def load_sector_data(folder_path: Path) -> pd.DataFrame:
    """Load sector/lap time data from analysis files."""
    sector_files = list(folder_path.glob('*23_Analysis*.csv'))
    if not sector_files: return pd.DataFrame()
    return pd.read_csv(sector_files[0], encoding='latin1', sep=';')

def build_timeline_from_sectors(sector_df: pd.DataFrame) -> List[Dict]:
    """Extract car position data from sector analysis (Fallback)."""
    if sector_df.empty: return []
    
    number_col = next((col for col in sector_df.columns if 'NUMBER' in col.upper()), None)
    lap_col = next((col for col in sector_df.columns if 'LAP' in col and 'TIME' in col), None)
    
    if not number_col or not lap_col: return []
    
    drivers_list = [int(d) for d in sector_df[number_col].unique() if pd.notna(d)]
    frames = []
    total_laps = int(sector_df['LAP'].max()) if 'LAP' in sector_df.columns else 10
    frames_per_lap = 10
    
    for lap in range(1, min(total_laps + 1, 50)):
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
                })
        
        positions.sort(key=lambda x: x['lapTime'])
        
        for frame_in_lap in range(frames_per_lap):
            progress_in_lap = frame_in_lap / frames_per_lap
            timestamp_ms = ((lap - 1) * 90.0 + progress_in_lap * 90.0) * 1000
            
            drivers = []
            for i, pos in enumerate(positions):
                base_progress = (lap - 1 + progress_in_lap) / total_laps
                position_offset = -i * 0.01
                track_progress = (base_progress + position_offset) % 1.0
                
                is_corner = (track_progress > 0.2 and track_progress < 0.5) or (track_progress > 0.7)
                
                drivers.append({
                    'carNumber': pos['carNumber'],
                    'driverName': pos['driverName'],
                    'trackProgress': track_progress,
                    'gapToLeaderSeconds': pos['lapTime'] - positions[0]['lapTime'] if i > 0 else 0.0,
                    'position': i + 1,
                    'speedMph': 60 + np.random.randint(-5, 5) if is_corner else 130 + np.random.randint(-10, 10),
                    'throttlePercent': 40 if is_corner else 90,
                    'brakePercent': 0,
                    'gear': 2 if is_corner else 5,
                    'steeringAngleDeg': 25 if is_corner else 0,
                    'rpm': 5000 if is_corner else 7000,
                })
            
            frames.append({
                'timestampMs': int(timestamp_ms),
                'status': 'GREEN',
                'lap': lap,
                'totalLaps': total_laps,
                'raceProgress': (lap - 1 + progress_in_lap) / total_laps,
                'drivers': drivers,
            })
            
    return frames

# ---------- Main Processing ----------

def process_race_folder(folder_path: Path) -> Dict[str, Any]:
    print(f"Processing folder: {folder_path}", file=sys.stderr)
    
    metadata = {}
    metadata_file = folder_path / 'metadata.json'
    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
    else:
        folder_name = folder_path.name
        track_name = folder_name.replace('-', ' ').title()
        metadata = {
            'trackName': track_name,
            'raceName': f'GR Cup Series - {track_name}',
            'folder': folder_name,
        }
    
    # 1. Try Real Telemetry
    timeline = build_timeline_from_telemetry(folder_path)
    
    # 2. Fallback to Sector Data
    sector_df = load_sector_data(folder_path)
    if not timeline:
        print("No VBOX telemetry found. Falling back to Sector Analysis...", file=sys.stderr)
        timeline = build_timeline_from_sectors(sector_df)
    
    if not timeline:
        return {
            'timeline': [],
            'metadata': metadata,
            'error': 'No valid race data found',
        }
    
    # 3. Perform Analysis (Virtual Best)
    analysis = calculate_virtual_best(sector_df)
    
    drivers = list(set([d['carNumber'] for frame in timeline for d in frame['drivers']]))
    
    return {
        'timeline': timeline,
        'metadata': metadata,
        'analysis': analysis, # New field
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

"""
Tire Degradation Analysis Module
Analyzes lap time progression to identify tire wear patterns and optimal pit strategy.

Features:
- Lap time degradation curves
- Optimal pit window calculation
- Weather correlation (track temp, air temp)
- Stint comparison
- Predictive modeling for remaining laps
"""

import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
from scipy import stats
from datetime import datetime


def parse_lap_time_to_seconds(time_str):
    """Convert lap time string to seconds."""
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


def load_lap_times(folder_path: Path) -> pd.DataFrame:
    """Load lap time data from CSV files."""
    # Try the Analysis CSV first - it has better structure
    analysis_files = list(folder_path.glob('*Analysis*.CSV')) + list(folder_path.glob('*Analysis*.csv'))
    
    if analysis_files:
        try:
            df = pd.read_csv(analysis_files[0], encoding='latin1', sep=';')
            # Strip whitespace from column names
            df.columns = df.columns.str.strip()
            return df
        except Exception as e:
            print(f"Failed to load analysis file: {e}", file=sys.stderr)
            pass
    
    # Fallback to lap time files
    possible_files = [
        'road_america_lap_time_R1.csv',
        '*lap_time*.csv',
        '*lap*.csv'
    ]
    
    for pattern in possible_files:
        matches = list(folder_path.glob(pattern))
        if matches:
            try:
                df = pd.read_csv(matches[0], encoding='latin1')
                df.columns = df.columns.str.strip()
                return df
            except:
                continue
    
    return pd.DataFrame()


def load_weather_data(folder_path: Path) -> Optional[pd.DataFrame]:
    """Load weather data if available."""
    weather_files = list(folder_path.glob('*Weather*.CSV')) + list(folder_path.glob('*weather*.csv'))
    
    if not weather_files:
        return None
    
    try:
        df = pd.read_csv(weather_files[0], encoding='latin1', sep=';')
        return df
    except:
        return None


def calculate_tire_degradation(lap_data: pd.DataFrame, driver_id: int) -> Dict[str, Any]:
    """
    Calculate tire degradation metrics for a specific driver.
    
    Returns:
        - lap_times: List of lap times
        - lap_numbers: List of lap numbers
        - degradation_rate: Seconds per lap degradation
        - optimal_pit_lap: Suggested pit window
        - confidence: Quality of data (0-1)
    """
    # Find driver number column - could be NUMBER or DRIVER_NUMBER or vehicle_number
    driver_col = None
    for col_name in ['NUMBER', 'DRIVER_NUMBER', 'vehicle_number', 'number']:
        if col_name in lap_data.columns:
            driver_col = col_name
            break
    
    if not driver_col:
        return {'error': 'No driver number column found'}
    
    # Filter for this driver
    driver_data = lap_data[lap_data[driver_col] == driver_id].copy()
    
    if driver_data.empty:
        return {'error': f'No data for driver {driver_id}'}
    
    # Get lap column - could be LAP or lap
    lap_col = next((c for c in driver_data.columns if c.upper() == 'LAP'), None)
    if not lap_col:
        return {'error': 'No lap column found'}
    
    # Parse lap times - look for LAP_TIME or similar
    time_col = next((c for c in driver_data.columns if 'LAP' in c.upper() and 'TIME' in c.upper()), None)
    
    if not time_col:
        return {'error': f'No lap time column found. Columns: {list(driver_data.columns)}'}
    
    driver_data['lap_time_seconds'] = driver_data[time_col].apply(parse_lap_time_to_seconds)
    driver_data['lap_number'] = pd.to_numeric(driver_data[lap_col], errors='coerce')
    
    # Remove invalid laps (outliers, pit laps, etc.)
    # Filter out extremely slow laps (likely pit stops or incidents)
    valid_data = driver_data[
        (driver_data['lap_time_seconds'] > 0) &
        (driver_data['lap_number'] > 0) &
        (~driver_data['lap_time_seconds'].isna())
    ].copy()
    
    if len(valid_data) < 3:
        return {'error': f'Insufficient valid lap data (only {len(valid_data)} laps)'}
    
    # Remove statistical outliers
    mean_time = valid_data['lap_time_seconds'].mean()
    std_time = valid_data['lap_time_seconds'].std()
    
    valid_data = valid_data[
        (valid_data['lap_time_seconds'] < mean_time + 2.5 * std_time)  # Remove extreme outliers
    ].copy()
    
    if len(valid_data) < 3:
        return {'error': 'Insufficient valid lap data after filtering'}
    
    valid_data = valid_data.sort_values('lap_number')
    
    lap_times = valid_data['lap_time_seconds'].tolist()
    lap_numbers = valid_data['lap_number'].tolist()
    
    # Calculate linear regression for degradation rate
    slope, intercept, r_value, p_value, std_err = stats.linregress(lap_numbers, lap_times)
    
    # Calculate rolling average to smooth out variations
    window_size = min(3, len(lap_times))
    rolling_avg = valid_data['lap_time_seconds'].rolling(window=window_size, center=True).mean()
    
    # Find optimal pit lap (when degradation exceeds threshold)
    baseline_time = lap_times[0]  # First valid lap as baseline
    degradation_threshold = 0.5  # 0.5 seconds slower than baseline
    
    optimal_pit_lap = None
    for i, (lap_num, lap_time) in enumerate(zip(lap_numbers, lap_times)):
        if lap_time > baseline_time + degradation_threshold:
            optimal_pit_lap = int(lap_num)
            break
    
    # If no pit needed, suggest near end
    if optimal_pit_lap is None and len(lap_numbers) > 0:
        optimal_pit_lap = int(lap_numbers[-1]) - 2
    
    # Calculate average degradation per lap
    if len(lap_times) > 1:
        total_degradation = lap_times[-1] - lap_times[0]
        avg_degradation_per_lap = total_degradation / len(lap_times)
    else:
        avg_degradation_per_lap = 0.0
    
    # Confidence based on R-squared
    confidence = r_value ** 2 if not np.isnan(r_value) else 0.0
    
    return {
        'driverId': driver_id,
        'lapTimes': [float(t) for t in lap_times],
        'lapNumbers': [int(n) for n in lap_numbers],
        'rollingAverage': [float(x) if not np.isnan(x) else None for x in rolling_avg.tolist()],
        'degradationRate': float(slope) if not np.isnan(slope) else 0.0,
        'avgDegradationPerLap': float(avg_degradation_per_lap),
        'baselineTime': float(baseline_time),
        'optimalPitLap': optimal_pit_lap,
        'optimalPitWindow': [max(1, optimal_pit_lap - 2), optimal_pit_lap + 2] if optimal_pit_lap else None,
        'confidence': float(confidence),
        'totalLaps': len(lap_numbers),
        'r_squared': float(r_value ** 2) if not np.isnan(r_value) else 0.0
    }


def analyze_all_drivers_tire_deg(folder_path: Path, weather_data: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """Analyze tire degradation for all drivers in the race."""
    
    lap_data = load_lap_times(folder_path)
    
    if lap_data.empty:
        return {'error': 'No lap time data found'}
    
    # Find driver identifiers - try multiple column names
    driver_col = None
    for col_name in ['NUMBER', 'DRIVER_NUMBER', 'vehicle_number', 'number']:
        if col_name in lap_data.columns:
            driver_col = col_name
            break
    
    if not driver_col:
        return {'error': f'No driver number column found. Columns: {list(lap_data.columns)}'}
    
    drivers = lap_data[driver_col].unique()
    drivers = [int(d) for d in drivers if pd.notna(d) and str(d).replace('.', '').isdigit()]
    
    if not drivers:
        return {'error': 'No valid drivers found'}
    
    tire_analysis = {}
    errors = {}
    
    for driver in drivers:
        result = calculate_tire_degradation(lap_data, driver)
        if 'error' not in result:
            tire_analysis[str(driver)] = result
        else:
            errors[str(driver)] = result['error']
    
    # Add weather context if available
    weather_context = None
    if weather_data is not None and not weather_data.empty:
        # Extract relevant weather info
        weather_context = {
            'available': True,
            'avgTrackTemp': float(weather_data.get('TRACK_TEMP', pd.Series([None])).mean()) if 'TRACK_TEMP' in weather_data.columns else None,
            'avgAirTemp': float(weather_data.get('AIR_TEMP', pd.Series([None])).mean()) if 'AIR_TEMP' in weather_data.columns else None,
            'conditions': 'Data Available'
        }
    
    return {
        'tireAnalysis': tire_analysis,
        'weather': weather_context,
        'driversAnalyzed': len(tire_analysis),
        'totalDrivers': len(drivers),
        'errors': errors if errors else None
    }


if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No folder path provided'}))
        sys.exit(1)
    
    folder_path = Path(sys.argv[1])
    
    if not folder_path.exists():
        print(json.dumps({'error': f'Folder not found: {folder_path}'}))
        sys.exit(1)
    
    try:
        # Load weather data if available
        weather_data = load_weather_data(folder_path)
        
        # Analyze tire degradation
        result = analyze_all_drivers_tire_deg(folder_path, weather_data)
        
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e), 'type': type(e).__name__}))
        sys.exit(1)

"""
Feature extraction from race data for PCA analysis.
Extracts sector performance, consistency, and telemetry-based driving style features.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict

def extract_sector_features(sector_df: pd.DataFrame, driver_num: int) -> Dict:
    """
    Extract sector performance features for a driver.
    
    Args:
        sector_df: DataFrame with sector times (from 23_Analysis files)
       driver_num: Driver number
        
    Returns:
        Dictionary of sector features
    """
    # Handle both 'NUMBER' and 'NUMBER ' (with space) column names
    driver_col = next((col for col in sector_df.columns if 'NUMBER' in col), None)
    if not driver_col:
        return {}
    
    driver_data = sector_df[sector_df[driver_col] == driver_num]
    
    if len(driver_data) == 0:
        return {}
    
    features = {}
    
    # Find sector columns (handle variations with spaces)
    s1_col = next((col for col in sector_df.columns if 'S1_SECONDS' in col or 'S1' in col), None)
    s2_col = next((col for col in sector_df.columns if 'S2_SECONDS' in col or 'S2' in col), None)
    s3_col = next((col for col in sector_df.columns if 'S3_SECONDS' in col or 'S3' in col), None)
    
    if not all([s1_col, s2_col, s3_col]):
        return {}
    
    # Average sector times
    from utils.data_utils import parse_time_column
    
    # Convert columns to numeric seconds
    s1_vals = parse_time_column(driver_data[s1_col])
    s2_vals = parse_time_column(driver_data[s2_col])
    s3_vals = parse_time_column(driver_data[s3_col])
    
    # Filter out invalid laps (NaNs)
    valid_laps = ~(s1_vals.isna() | s2_vals.isna() | s3_vals.isna())
    if not valid_laps.any():
        return {}
        
    s1_vals = s1_vals[valid_laps]
    s2_vals = s2_vals[valid_laps]
    s3_vals = s3_vals[valid_laps]
    
    features['S1_avg'] = s1_vals.mean()
    features['S2_avg'] = s2_vals.mean()
    features['S3_avg'] = s3_vals.mean()
    
    # Delta from track average (using all drivers' data for this file)
    track_s1 = parse_time_column(sector_df[s1_col])
    track_s2 = parse_time_column(sector_df[s2_col])
    track_s3 = parse_time_column(sector_df[s3_col])
    
    features['S1_delta'] = features['S1_avg'] - track_s1.mean()
    features['S2_delta'] = features['S2_avg'] - track_s2.mean()
    features['S3_delta'] = features['S3_avg'] - track_s3.mean()
    
    # Sector consistency (std deviation)
    features['S1_std'] = s1_vals.std()
    features['S2_std'] = s2_vals.std()
    features['S3_std'] = s3_vals.std()
    
    # Lap time consistency
    lap_col = next((col for col in driver_data.columns if 'LAP_TIME' in col or 'TIME' in col), None)
    if lap_col:
        lap_vals = parse_time_column(driver_data[lap_col])
        features['lap_time_std'] = lap_vals.std()
        features['lap_time_mean'] = lap_vals.mean()
    
    return features

def extract_telemetry_features(telem_df: pd.DataFrame, driver_num: int) -> Dict:
    """
    Extract driving style features from telemetry data.
    
    Args:
        telem_df: Telemetry DataFrame (vehicle_number, telemetry_name, telemetry_value)
        driver_num: Driver number
        
    Returns:
        Dictionary of telemetry features
    """
    driver_data = telem_df[telem_df['vehicle_number'] == driver_num]
    
    if len(driver_data) == 0:
        return {}
    
    features = {}
    
    # Pivot telemetry data
    try:
        telem_pivot = driver_data.pivot_table(
            index='timestamp',
            columns='telemetry_name',
            values='telemetry_value',
            aggfunc='first'
        )
        
        # Brake aggression
        if 'pbrake_f' in telem_pivot.columns:
            brake_data = telem_pivot['pbrake_f'].dropna()
            brake_events = brake_data[brake_data > 0.1]
            features['brake_aggression'] = brake_events.mean() if len(brake_events) > 0 else 0.0
        
        # Throttle smoothness
        if 'aps' in telem_pivot.columns:
            throttle_changes = telem_pivot['aps'].diff().abs()
            features['throttle_smoothness'] = throttle_changes.mean()
        
        # Steering smoothness
        if 'Steering_Angle' in telem_pivot.columns:
            steer_changes = telem_pivot['Steering_Angle'].diff().abs()
            features['steering_smoothness'] = steer_changes.mean()
    except Exception as e:
        print(f"Telemetry extraction error for driver {driver_num}: {e}")
    
    return features

def build_driver_feature_row(driver_num: int, race_files: Dict) -> Dict:
    """
    Build a single feature row for a driver across all available races.
    
    Args:
        driver_num: Driver number
        race_files: Dict of discovered race files
        
    Returns:
        Dictionary of aggregated features for this driver
    """
    all_sector_features = []
    all_telem_features = []
    
    # Process each sector file
    for sector_file in race_files['sectors']:
        try:
            sector_df = pd.read_csv(sector_file, encoding='latin1', sep=';')
            features = extract_sector_features(sector_df, driver_num)
            if features:
                all_sector_features.append(features)
        except Exception as e:
            continue
    
    # Process telemetry (sample a few files for speed)
    for telem_file in race_files['telemetry'][:3]:
        try:
            from utils.data_utils import load_telemetry_sample
            telem_df = load_telemetry_sample(telem_file, sample_rate=0.02)
            features = extract_telemetry_features(telem_df, driver_num)
            if features:
                all_telem_features.append(features)
        except Exception as e:
            continue
    
    # Aggregate features across all races
    aggregated = {'NUMBER': driver_num}
    
    if all_sector_features:
        sector_agg = pd.DataFrame(all_sector_features).mean().to_dict()
        aggregated.update(sector_agg)
    
    if all_telem_features:
        telem_agg = pd.DataFrame(all_telem_features).mean().to_dict()
        aggregated.update(telem_agg)
    
    return aggregated

def build_feature_matrix(data_root: Path, output_path: Path) -> pd.DataFrame:
    """
    Build complete feature matrix for all drivers.
    
    Args:
        data_root: Root directory with race data
        output_path: Path to save CSV
        
    Returns:
        Feature matrix DataFrame
    """
    from utils.data_utils import discover_race_files, get_unique_drivers
    
    print("🔍 Discovering race files...")
    race_files = discover_race_files(data_root)
    
    print(f"   Found {len(race_files['sectors'])} sector files")
    print(f"   Found {len(race_files['telemetry'])} telemetry files")
    
    print("\n👥 Extracting unique drivers...")
    drivers = get_unique_drivers(race_files['sectors'])
    print(f"   Found {len(drivers)} drivers: {drivers}")
    
    print("\n⚙️  Extracting features...")
    feature_rows = []
    
    for i, driver in enumerate(drivers, 1):
        print(f"   Processing driver {i}/{len(drivers)}: {driver}")
        row = build_driver_feature_row(driver, race_files)
        if row and len(row) > 1:  # At least NUMBER + 1 feature
            feature_rows.append(row)
    
    # Build DataFrame
    feature_matrix = pd.DataFrame(feature_rows)
    
    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    feature_matrix.to_csv(output_path, index=False)
    
    print(f"\n✅ Feature matrix saved!")
    print(f"   Location: {output_path}")
    print(f"   Shape: {feature_matrix.shape}")
    print(f"   Features: {list(feature_matrix.columns)}")
    
    return feature_matrix

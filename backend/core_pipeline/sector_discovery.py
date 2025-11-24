# sector_discovery.py (Phase I - Step 2)

import pandas as pd
import numpy as np
import os

# --- Configuration (Paths must match ingestion_sync.py) ---
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROCESSED_DATA_PATH = os.path.join(REPO_ROOT, 'data_processed', 'master_timeline.parquet')

# --- Sector Discovery Constants ---
ROLLING_MEDIAN_WINDOW = 5  # Rolling window for noise reduction
# Curvature threshold: 0.1 degrees per step at 20Hz (50ms) = 2 degrees/sec
# This matches the specification requirement of 2 degrees/sec
CURVATURE_THRESHOLD_DEGREES_PER_STEP = 0.1

def calculate_bearing(lat1, lon1, lat2, lon2):
    """Calculates the bearing (initial course) in degrees between two GPS points."""
    R = 6371  # Earth radius in km

    lat1_rad, lon1_rad = np.radians(lat1), np.radians(lon1)
    lat2_rad, lon2_rad = np.radians(lat2), np.radians(lon2)
    
    dLon = lon2_rad - lon1_rad
    
    y = np.sin(dLon) * np.cos(lat2_rad)
    x = np.cos(lat1_rad) * np.sin(lat2_rad) - np.sin(lat1_rad) * np.cos(lat2_rad) * np.cos(dLon)
    
    bearing = np.arctan2(y, x)
    bearing = np.degrees(bearing)
    bearing = (bearing + 360) % 360
    return bearing

def automated_critical_sector_discovery(df=None):
    """Mathematically defines "Critical Sectors" (Curves) using GPS data."""
    if df is None:
        try:
            df = pd.read_parquet(PROCESSED_DATA_PATH)
        except FileNotFoundError:
            print("ERROR: Master Timeline not found. Cannot run sector discovery.")
            return None
    
    print(f"Loading Master Timeline: {len(df):,} rows.")
    print(f"Available columns ({len(df.columns)}): {list(df.columns)}")
    
    # Detect GPS column names (handle variations in naming)
    possible_lat_names = ['VBOX_Lat_Min', 'VBOX_Lat', 'Lat', 'Latitude', 'GPS_Lat']
    possible_long_names = ['VBOX_Long_Minutes', 'VBOX_Long', 'Long', 'Longitude', 'GPS_Long', 'Lon']
    
    GPS_LAT_COL = None
    GPS_LONG_COL = None
    
    # Find the actual column names
    for col in df.columns:
        col_lower = col.lower()
        if GPS_LAT_COL is None:
            for possible in possible_lat_names:
                if possible.lower() in col_lower or ('lat' in col_lower and 'lap' not in col_lower):
                    GPS_LAT_COL = col
                    print(f"Found latitude column: {col}")
                    break
        if GPS_LONG_COL is None:
            for possible in possible_long_names:
                if possible.lower() in col_lower or ('long' in col_lower and 'lap' not in col_lower):
                    GPS_LONG_COL = col
                    print(f"Found longitude column: {col}")
                    break
    
    # Validate GPS columns exist
    if GPS_LAT_COL is None or GPS_LONG_COL is None:
        print(f"ERROR: GPS columns not found.")
        print(f"Available columns ({len(df.columns)} total): {list(df.columns)}")
        print(f"Looking for latitude column matching: {possible_lat_names}")
        print(f"Looking for longitude column matching: {possible_long_names}")
        return None
    
    print(f"Using GPS columns: {GPS_LAT_COL} (Lat), {GPS_LONG_COL} (Long)")
    
    # Verify columns actually exist in the dataframe
    if GPS_LAT_COL not in df.columns:
        print(f"ERROR: Detected column '{GPS_LAT_COL}' does not exist in dataframe.")
        print(f"Available columns: {list(df.columns)}")
        return None
    if GPS_LONG_COL not in df.columns:
        print(f"ERROR: Detected column '{GPS_LONG_COL}' does not exist in dataframe.")
        print(f"Available columns: {list(df.columns)}")
        return None
    
    all_tracks_data = []
    
    for track in df['Track'].unique():
        track_df = df[df['Track'] == track].copy()
        
        # Check if GPS columns exist for this track
        if GPS_LAT_COL not in track_df.columns or GPS_LONG_COL not in track_df.columns:
            print(f"WARNING: GPS columns missing for track {track}. Skipping sector discovery for this track.")
            all_tracks_data.append(track_df)
            continue
        
        # Filter out rows with invalid GPS data
        valid_gps = track_df[GPS_LAT_COL].notna() & track_df[GPS_LONG_COL].notna()
        if valid_gps.sum() < 10:  # Need at least 10 valid GPS points
            print(f"WARNING: Insufficient valid GPS data for track {track}. Skipping sector discovery.")
            all_tracks_data.append(track_df)
            continue
        
        track_df = track_df[valid_gps].copy()
        
        # 1. Noise Reduction: Apply a rolling median filter
        track_df['Lat_Smoothed'] = track_df[GPS_LAT_COL].rolling(ROLLING_MEDIAN_WINDOW, center=True, min_periods=1).median()
        track_df['Long_Smoothed'] = track_df[GPS_LONG_COL].rolling(ROLLING_MEDIAN_WINDOW, center=True, min_periods=1).median()
        
        # 2. Heading Calculation: Calculate bearing between sequential points
        track_df['Next_Lat'] = track_df['Lat_Smoothed'].shift(-1)
        track_df['Next_Long'] = track_df['Long_Smoothed'].shift(-1)
        bearings = calculate_bearing(track_df['Lat_Smoothed'].values, track_df['Long_Smoothed'].values, track_df['Next_Lat'].values, track_df['Next_Long'].values)
        track_df['Heading'] = bearings
        
        # 3. Curvature Analysis: Rate of change in heading (Delta_Heading)
        delta_heading = track_df['Heading'].diff().fillna(0)
        delta_heading = np.where(delta_heading > 180, delta_heading - 360, delta_heading)
        delta_heading = np.where(delta_heading < -180, delta_heading + 360, delta_heading)
        track_df['Delta_Heading'] = delta_heading
        
        # 4. Sector Definition: Classify based on threshold
        track_df['Track_Section'] = np.where(np.abs(track_df['Delta_Heading']) > CURVATURE_THRESHOLD_DEGREES_PER_STEP, 'CRITICAL_SECTOR', 'STRAIGHT')
        
        # 5. Grouping: Assign unique Sector_ID per track
        is_critical = (track_df['Track_Section'] == 'CRITICAL_SECTOR')
        track_df['Sector_Start'] = (is_critical) & (~is_critical.shift(1, fill_value=False))
        track_df['Sector_Block_ID'] = track_df['Sector_Start'].cumsum()
        
        # Initialize Sector_ID based on Track_Section
        track_df['Sector_ID'] = track_df['Track_Section'].copy()
        
        critical_sections = track_df[is_critical].copy()
        if not critical_sections.empty:
            critical_sections['Sector_ID'] = 'S_' + (critical_sections['Sector_Block_ID']).astype(str).str.zfill(3)
            # Use boolean mask to assign values (handles duplicate indices)
            track_df.loc[is_critical, 'Sector_ID'] = critical_sections['Sector_ID'].values
        
        track_df = track_df.drop(columns=['Lat_Smoothed', 'Long_Smoothed', 'Next_Lat', 'Next_Long', 
                                          'Heading', 'Sector_Start', 'Sector_Block_ID', 'Track_Section'])
        
        all_tracks_data.append(track_df)

    # 6. Reconstruct and Save the Enhanced Master Timeline
    if all_tracks_data:
        enhanced_master_timeline = pd.concat(all_tracks_data)
        enhanced_master_timeline.to_parquet(PROCESSED_DATA_PATH)
        print(f"\nSuccessfully added 'Delta_Heading' and 'Sector_ID' to the Master Timeline.")
        return enhanced_master_timeline
    
    return None

if __name__ == '__main__':
    automated_critical_sector_discovery()
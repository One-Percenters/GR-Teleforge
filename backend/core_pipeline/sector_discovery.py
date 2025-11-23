# 02_sector_discovery.py (Phase I - Step 2)

import pandas as pd
import numpy as np
import os

# --- Configuration (Paths must match 01_ingestion_sync.py) ---
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROCESSED_DATA_PATH = os.path.join(REPO_ROOT, 'data_processed', 'master_timeline.parquet')

# --- Sector Discovery Constants ---
ROLLING_MEDIAN_WINDOW = 5 
# [cite_start]Threshold for classification [cite: 52]
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

def automated_critical_sector_discovery():
    """
    [cite_start]Mathematically defines "Critical Sectors" (Curves) using GPS data[cite: 43].
    """
    print(f"Loading Master Timeline from {PROCESSED_DATA_PATH}...")
    try:
        df = pd.read_parquet(PROCESSED_DATA_PATH)
        print(f"Loaded Master Timeline: {len(df):,} rows.")
    except FileNotFoundError:
        print("ERROR: Master Timeline not found. Cannot run sector discovery.")
        return None
    
    all_tracks_data = []
    GPS_LAT_COL = 'VBOX_Lat_Min'
    GPS_LONG_COL = 'VBOX_Long_Minutes'
    
    for track in df['Track'].unique():
        track_df = df[df['Track'] == track].copy()
        
        # [cite_start]1. Noise Reduction: Apply a rolling median filter [cite: 49]
        track_df['Lat_Smoothed'] = track_df[GPS_LAT_COL].rolling(ROLLING_MEDIAN_WINDOW, center=True, min_periods=1).median()
        track_df['Long_Smoothed'] = track_df[GPS_LONG_COL].rolling(ROLLING_MEDIAN_WINDOW, center=True, min_periods=1).median()
        
        # [cite_start]2. Heading Calculation: Calculate bearing between sequential points [cite: 50]
        track_df['Next_Lat'] = track_df['Lat_Smoothed'].shift(-1)
        track_df['Next_Long'] = track_df['Long_Smoothed'].shift(-1)
        bearings = calculate_bearing(track_df['Lat_Smoothed'].values, track_df['Long_Smoothed'].values, track_df['Next_Lat'].values, track_df['Next_Long'].values)
        track_df['Heading'] = bearings
        
        # [cite_start]3. Curvature Analysis: Rate of change in heading (Delta_Heading) [cite: 51]
        delta_heading = track_df['Heading'].diff().fillna(0)
        delta_heading = np.where(delta_heading > 180, delta_heading - 360, delta_heading)
        delta_heading = np.where(delta_heading < -180, delta_heading + 360, delta_heading)
        track_df['Delta_Heading'] = delta_heading
        
        # [cite_start]4. Sector Definition: Classify based on threshold [cite: 52, 53]
        track_df['Track_Section'] = np.where(np.abs(track_df['Delta_Heading']) > CURVATURE_THRESHOLD_DEGREES_PER_STEP, 'CRITICAL_SECTOR', 'STRAIGHT')
        
        # [cite_start]5. Grouping: Assign unique Sector_ID per track [cite: 57, 55]
        is_critical = (track_df['Track_Section'] == 'CRITICAL_SECTOR')
        track_df['Sector_Start'] = (is_critical) & (~is_critical.shift(1, fill_value=False))
        track_df['Sector_Block_ID'] = track_df['Sector_Start'].cumsum()
        
        critical_sections = track_df[is_critical].copy()
        if not critical_sections.empty:
            critical_sections['Sector_ID'] = 'S_' + (critical_sections['Sector_Block_ID']).astype(str).str.zfill(3)
            track_df = track_df.merge(critical_sections[['Sector_ID']], left_index=True, right_index=True, how='left')
        
        track_df['Sector_ID'] = track_df['Sector_ID'].fillna(track_df['Track_Section'])
        
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
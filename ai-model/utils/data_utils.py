"""
Enhanced data loader for telemetry and sector analysis files.
Builds on existing data_loader.py with support for PCA feature extraction.
"""
import pandas as pd
from pathlib import Path
from typing import List, Dict

def discover_race_files(data_root: str) -> Dict[str, List[Path]]:
    """
    Discover all race CSV files in the data directory.
    
    Args:
        data_root: Root directory containing track folders
        
    Returns:
        Dictionary mapping file types to list of file paths
    """
    data_root = Path(data_root)
    
    files = {
        'sectors': [],
        'telemetry': [],
        'lap_times': []
    }
    
    # Find sector analysis files (23_Analysis...)
    files['sectors'] = list(data_root.glob('**/23_Analysis*.CSV'))
    
    # Find all telemetry files
    files['telemetry'] = list(data_root.glob('**/R*_*_telemetry*.csv'))
    
    # Find lap time files
    files['lap_times'] = list(data_root.glob('**/R*_*_lap_time.csv'))
    
    return files

def load_telemetry_sample(file_path: Path, sample_rate: float = 0.05) -> pd.DataFrame:
    """
    Load telemetry CSV with sampling to reduce memory usage.
    
    Args:
        file_path: Path to telemetry CSV
        sample_rate: Fraction of rows to keep (0.05 = 5%)
        
    Returns:
        Sampled DataFrame
    """
    try:
        df = pd.read_csv(file_path, encoding='latin1')
        
        # Sample to reduce size
        if sample_rate < 1.0 and len(df) > 1000:
            df = df.sample(frac=sample_rate, random_state=42).sort_index()
        
        return df
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return pd.DataFrame()

def get_unique_drivers(sector_files: List[Path]) -> List[int]:
    """
    Get list of all unique driver numbers from sector data.
    
    Args:
        sector_files: List of paths to sector CSV files
        
    Returns:
        List of unique driver numbers
    """
    drivers = set()
    
    for file in sector_files[:5]:  # Sample first few files for efficiency
        try:
            # Try semicolon delimiter first (common in these CSVs)
            df = pd.read_csv(file, encoding='latin1', sep=';')
            
            # Find the NUMBER column (may have variations)
            driver_col = next((col for col in df.columns if 'NUMBER' in col.upper()), None)
            if driver_col:
                drivers.update(df[driver_col].dropna().unique())
        except:
            continue
    
    return sorted([int(d) for d in drivers if pd.notna(d) and str(d).replace('.0', '').isdigit()])

def parse_time_column(series: pd.Series) -> pd.Series:
    """
    Convert time strings (MM:SS.mmm or SS.mmm) to float seconds.
    Handles various formats and errors gracefully.
    """
    def convert(x):
        if pd.isna(x) or x == '':
            return np.nan
        if isinstance(x, (int, float)):
            return float(x)
        
        x = str(x).strip()
        try:
            # Handle MM:SS.mmm
            if ':' in x:
                parts = x.split(':')
                if len(parts) == 2:
                    return float(parts[0]) * 60 + float(parts[1])
                elif len(parts) == 3: # HH:MM:SS
                    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            # Handle SS.mmm
            return float(x)
        except:
            return np.nan
            
    import numpy as np
    return series.apply(convert)

"""
Debug script to identify CSV parsing issues.
"""
import pandas as pd
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from utils.data_utils import discover_race_files, get_unique_drivers

# Test data discovery
print("=" * 60)
print("Testing Data Discovery")
print("=" * 60)

data_root = Path(__file__).parent.parent.parent
print(f"\nData root: {data_root}")

race_files = discover_race_files(data_root)
print(f"\nFound sector files: {len(race_files['sectors'])}")
for f in race_files['sectors'][:3]:
    print(f"  - {f.name}")

print(f"\nFound telemetry files: {len(race_files['telemetry'])}")
for f in race_files['telemetry'][:3]:
    print(f"  - {f.name}")

# Test driver extraction
print("\n" + "=" * 60)
print("Testing Driver Extraction")
print("=" * 60)

drivers = get_unique_drivers(race_files['sectors'])
print(f"\nUnique drivers found: {drivers}")

# Test sector file parsing
print("\n" + "=" * 60)
print("Testing Sector File Parsing")
print("=" * 60)

if race_files['sectors']:
    test_file = race_files['sectors'][0]
    print(f"\nTesting file: {test_file.name}")
    
    try:
        df = pd.read_csv(test_file, encoding='latin1', sep=';')
        print(f"OK - Loaded successfully!")
        print(f"   Shape: {df.shape}")
        print(f"   Columns: {df.columns.tolist()[:10]}")
        
        # Check for NUMBER column
        driver_col = next((col for col in df.columns if 'NUMBER' in col.upper() and 'DRIVER' not in col.upper()), None)
        print(f"   Driver column found: '{driver_col}'")
        
        if driver_col:
            print(f"   Sample driver numbers: {df[driver_col].dropna().unique()[:10]}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

# Test feature extraction for one driver
print("\n" + "=" * 60)
print("Testing Feature Extraction")
print("=" * 60)

if drivers and race_files['sectors']:
    test_driver = drivers[0]
    print(f"\nTesting driver: {test_driver}")
    
    from features.extract_features import extract_sector_features
    
    try:
        df = pd.read_csv(race_files['sectors'][0], encoding='latin1', sep=';')
        features = extract_sector_features(df, test_driver)
        print(f"OK - Features extracted: {len(features)} features")
        print(f"   Feature names: {list(features.keys())}")
    except Exception as e:
        print(f"ERROR during feature extraction: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "=" * 60)
print("Debug Complete")
print("=" * 60)


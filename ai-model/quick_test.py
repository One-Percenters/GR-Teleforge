import pandas as pd
from pathlib import Path
import sys

sys.path.insert(0, '.')

from utils.data_utils import discover_race_files, get_unique_drivers

data_root = Path('.').parent.parent.parent
race_files = discover_race_files(data_root)

print(f'Sector files found: {len(race_files["sectors"])}')
print(f'Telemetry files found: {len(race_files["telemetry"])}')

drivers = get_unique_drivers(race_files['sectors'])
print(f'Drivers found: {drivers}')

# Test loading the first sector file
if race_files['sectors']:
    test_file = race_files['sectors'][0]
    print(f'\nTesting file: {test_file.name}')
    df = pd.read_csv(test_file, encoding='latin1', sep=';')
    print(f'Shape: {df.shape}')
    print(f'Columns: {df.columns.tolist()}')

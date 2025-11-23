import pandas as pd
from pathlib import Path
import sys

sys.path.insert(0, '.')

from utils.data_utils import discover_race_files, parse_time_column
from features.extract_features import extract_sector_features

# 1. Get a sector file
data_root = Path(r'd:\ToyotaData')
race_files = discover_race_files(data_root)
if not race_files['sectors']:
    print(f"No sector files found in {data_root}")
    sys.exit(1)
sector_file = race_files['sectors'][0]

print(f"Testing on file: {sector_file.name}")

# 2. Load it exactly like the main script does
df = pd.read_csv(sector_file, encoding='latin1', sep=';')

# 3. Pick a driver
driver_col = next((col for col in df.columns if 'NUMBER' in col), None)
driver_num = df[driver_col].iloc[0]
print(f"Testing driver: {driver_num}")

# 4. Run the extraction
features = extract_sector_features(df, driver_num)

# 5. Check results
print("\nExtracted Features:")
for k, v in features.items():
    print(f"  {k}: {v}")

if 'S1_avg' in features and features['S1_avg'] > 0:
    print("\n✅ SUCCESS: Pace data extracted correctly!")
else:
    print("\n❌ FAILURE: Pace data missing.")

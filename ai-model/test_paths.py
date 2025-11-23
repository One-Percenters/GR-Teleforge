from pathlib import Path

# Check what the current path resolution gives us
script_path = Path(__file__).resolve()
print(f'Script path: {script_path}')
print(f'Parent: {script_path.parent}')
print(f'Parent.parent: {script_path.parent.parent}')
print(f'Parent.parent.parent: {script_path.parent.parent.parent}')

# What we actually need
correct_path = Path('d:/ToyotaData')
print(f'\nCorrect data root should be: {correct_path}')
print(f'Exists: {correct_path.exists()}')

# Test discovery from correct path
from utils.data_utils import discover_race_files
race_files = discover_race_files(correct_path)
print(f'\nWith correct path:')
print(f'  Sector files: {len(race_files["sectors"])}')
print(f'  Telemetry files: {len(race_files["telemetry"])}')

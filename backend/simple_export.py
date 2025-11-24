# Simple export - just organize existing data for frontend
import os
import json
import shutil

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, 'data_processed')

print("=== SIMPLE FRONTEND EXPORT ===")

# 1. Create directories
for d in ['tracks', 'events', 'timeline', 'drivers']:
    os.makedirs(os.path.join(DATA_DIR, d), exist_ok=True)
print("[1/5] Directories created")

# 2. Track boundaries (hardcoded from data - fast!)
tracks = {
    "Barber": {"lat_min": 33.52, "lat_max": 33.54, "long_min": -86.63, "long_max": -86.61, "has_events": True},
    "Indianapolis": {"lat_min": 39.78, "lat_max": 39.80, "long_min": -86.24, "long_max": -86.22, "has_events": True},
    "COTA": {"lat_min": 30.13, "lat_max": 30.14, "long_min": -97.64, "long_max": -97.63, "has_events": False},
    "Sonoma": {"lat_min": 38.16, "lat_max": 38.17, "long_min": -122.46, "long_max": -122.45, "has_events": False},
    "Sebring": {"lat_min": 27.45, "lat_max": 27.46, "long_min": -81.35, "long_max": -81.34, "has_events": False},
    "VIR": {"lat_min": 36.55, "lat_max": 36.56, "long_min": -79.21, "long_max": -79.20, "has_events": False},
    "RoadAmerica": {"lat_min": 43.79, "lat_max": 43.80, "long_min": -87.99, "long_max": -87.98, "has_events": False}
}
with open(os.path.join(DATA_DIR, 'tracks', 'all_tracks.json'), 'w') as f:
    json.dump(tracks, f, indent=2)
print("[2/5] Track info saved")

# 3. Consolidate events
events_dir = os.path.join(DATA_DIR, 'event_metadata')
all_events = []
if os.path.exists(events_dir):
    for fname in os.listdir(events_dir):
        if fname.endswith('_Events.json'):
            with open(os.path.join(events_dir, fname)) as f:
                events = json.load(f)
                all_events.extend(events)
                print(f"  Loaded {len(events)} events from {fname}")

with open(os.path.join(DATA_DIR, 'events', 'all_events.json'), 'w') as f:
    json.dump({"total": len(all_events), "events": all_events}, f)
print(f"[3/5] Consolidated {len(all_events)} events")

# 4. Timeline index
timeline_info = {
    "total_rows": 4798609,
    "tracks": list(tracks.keys()),
    "races_with_events": ["Barber_R1", "Barber_R2", "Indianapolis_R1", "Indianapolis_R2"],
    "all_races": [
        "Barber_R1", "Barber_R2", "COTA_R1", "COTA_R2", 
        "Indianapolis_R1", "Indianapolis_R2", "RoadAmerica_R1", "RoadAmerica_R2",
        "Sebring_R1", "Sebring_R2", "Sonoma_R1", "Sonoma_R2", "VIR_R1", "VIR_R2"
    ]
}
with open(os.path.join(DATA_DIR, 'timeline', 'index.json'), 'w') as f:
    json.dump(timeline_info, f, indent=2)
print("[4/5] Timeline index saved")

# 5. Copy driver profiles
src = os.path.join(DATA_DIR, 'driver_profiles.json')
dst = os.path.join(DATA_DIR, 'drivers', 'profiles.json')
if os.path.exists(src):
    shutil.copy(src, dst)
print("[5/5] Driver profiles copied")

print("\n=== EXPORT COMPLETE ===")
print(f"Output: {DATA_DIR}")
print(f"  tracks/all_tracks.json")
print(f"  events/all_events.json ({len(all_events)} events)")
print(f"  timeline/index.json")
print(f"  drivers/profiles.json")


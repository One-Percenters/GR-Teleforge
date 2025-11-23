import os
import shutil
import re

# Configuration
BASE_DIR = r"C:\Users\Hasnain Niazi\Documents\GRTeleforge\Raw Folders"

# Map folder names to standardized track names
TRACK_MAPPING = {
    "barber-motorsports-park": "Barber",
    "virginia-international-raceway": "VIR",
    "road-america": "RoadAmerica",
    "indianapolis": "Indianapolis",
    "sebring": "Sebring",
    "COTA": "COTA",
    "Sonoma": "Sonoma"
}

def get_race_number(filename):
    """
    Determines race number from filename.
    Returns 'R1', 'R2', or None if ambiguous.
    """
    filename_lower = filename.lower()
    
    if "r1" in filename_lower or "race 1" in filename_lower or "race_1" in filename_lower:
        return "R1"
    if "r2" in filename_lower or "race 2" in filename_lower or "race_2" in filename_lower:
        return "R2"
    
    return None

def restructure_folders():
    print(f"Starting restructuring in: {BASE_DIR}")
    
    for old_folder_name, new_track_name in TRACK_MAPPING.items():
        old_folder_path = os.path.join(BASE_DIR, old_folder_name)
        
        if not os.path.exists(old_folder_path):
            print(f"Skipping {old_folder_name} (not found)")
            continue
            
        print(f"Processing {old_folder_name} -> {new_track_name}...")
        
        files = [f for f in os.listdir(old_folder_path) if os.path.isfile(os.path.join(old_folder_path, f))]
        
        for filename in files:
            race_num = get_race_number(filename)
            
            if race_num:
                new_folder_name = f"{new_track_name}_{race_num}"
                new_folder_path = os.path.join(BASE_DIR, new_folder_name)
                
                if not os.path.exists(new_folder_path):
                    os.makedirs(new_folder_path)
                    print(f"  Created {new_folder_name}")
                
                src = os.path.join(old_folder_path, filename)
                dst = os.path.join(new_folder_path, filename)
                
                # print(f"  Moving {filename} -> {new_folder_name}/")
                shutil.move(src, dst)
            else:
                print(f"  [WARNING] Could not determine race for: {filename}")

    print("Restructuring complete.")

if __name__ == "__main__":
    restructure_folders()

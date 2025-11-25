import json
import sys

def process_sectors(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Extract sectors and sort by ID
        sectors = []
        for sector_id, sector_data in data.items():
            # Assuming sector_id format is "S_XXX"
            try:
                num_id = int(sector_id.split('_')[1])
                sectors.append({
                    'id': num_id,
                    'lat': sector_data['center_lat'],
                    'long': sector_data['center_long']
                })
            except (IndexError, ValueError):
                continue
        
        sectors.sort(key=lambda x: x['id'])
        
        if not sectors:
            print("No valid sectors found.")
            return

        # Extract points
        points = [(s['long'], s['lat']) for s in sectors]
        
        # Normalize
        min_x = min(p[0] for p in points)
        max_x = max(p[0] for p in points)
        min_y = min(p[1] for p in points)
        max_y = max(p[1] for p in points)
        
        width = max_x - min_x
        height = max_y - min_y
        
        norm_points = []
        for x, y in points:
            nx = (x - min_x) / width
            # Flip Y for canvas rendering (0 at top) if needed, 
            # but usually map coordinates have higher lat (y) at top.
            # Canvas Y increases downwards. Lat increases upwards.
            # So normalized Y should be (max_y - y) / height to have North up.
            ny = (max_y - y) / height 
            norm_points.append([nx, ny])
            
        # Output as JSON
        print(json.dumps(norm_points))
        
        # Also print bounds for verification
        print(f"\nBounds: Lat [{min_y}, {max_y}], Long [{min_x}, {max_x}]", file=sys.stderr)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    process_sectors('data_processed/sectors/Barber_sectors.json')

import xml.etree.ElementTree as ET
import json
import sys
import re

def parse_svg_path(svg_file):
    tree = ET.parse(svg_file)
    root = tree.getroot()
    
    # Find the main path. Usually the longest one or specific ID
    # This is a heuristic. We might need to adjust based on the specific SVG structure.
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    paths = root.findall('.//svg:path', ns)
    
    if not paths:
        # Try without namespace if it fails
        paths = root.findall('.//path')
        
    if not paths:
        print("No paths found")
        return []

    # Pick the path with the most data (longest d attribute)
    track_path = max(paths, key=lambda p: len(p.get('d', '')))
    d = track_path.get('d', '')
    
    # Simple parser for M and L commands (and implicit lines)
    # This is NOT a full SVG path parser, but often sufficient for simple track maps
    # We'll extract all numbers and treat them as points
    
    # Normalize command letters to separate them
    d = re.sub(r'([a-zA-Z])', r' \1 ', d)
    parts = d.split()
    
    points = []
    current_cmd = None
    
    # Very basic extraction: just get all coordinate pairs
    # This assumes absolute coordinates for simplicity or relative ones that we can just sum up
    # Actually, for a robust solution without a library, let's just regex for pairs of floats
    # and assume they trace the shape.
    
    # Regex to find coordinate pairs
    # This captures "x,y" or "x y" patterns
    raw_coords = re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', d)
    
    # Pair them up
    raw_points = []
    for i in range(0, len(raw_coords) - 1, 2):
        try:
            x = float(raw_coords[i])
            y = float(raw_coords[i+1])
            raw_points.append((x, y))
        except ValueError:
            continue
            
    if not raw_points:
        return []

    # Normalize to 0-1
    min_x = min(p[0] for p in raw_points)
    max_x = max(p[0] for p in raw_points)
    min_y = min(p[1] for p in raw_points)
    max_y = max(p[1] for p in raw_points)
    
    width = max_x - min_x
    height = max_y - min_y
    
    if width == 0 or height == 0:
        return []
        
    norm_points = []
    for x, y in raw_points:
        nx = (x - min_x) / width
        ny = (y - min_y) / height
        norm_points.append([nx, ny])
        
    return norm_points

if __name__ == "__main__":
    try:
        points = parse_svg_path('frontend/public/barber.svg')
        print(json.dumps(points))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

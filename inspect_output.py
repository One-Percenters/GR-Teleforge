import json
import sys

try:
    with open('full_output.json', 'r') as f:
        data = json.load(f)
        
    if 'analysis' in data:
        print("Analysis found.")
        analysis = data['analysis']
        print("Keys:", list(analysis.keys()))
        
        if '7' in analysis:
            print("Driver 7 analysis:", analysis['7'])
        else:
            print("Driver 7 NOT in analysis")
    else:
        print("Analysis NOT found in output")
        if 'error' in data:
            print("Error:", data['error'])
            
except Exception as e:
    print("Failed to parse JSON:", e)

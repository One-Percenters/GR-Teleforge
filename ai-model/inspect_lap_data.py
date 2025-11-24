import pandas as pd
import json

# Load lap time data
df = pd.read_csv(r'd:\ToyotaData\HackToyota\GR-Teleforge\data\raw\road-america\Race 1\road_america_lap_time_R1.csv')

print("=== LAP TIME DATA STRUCTURE ===\n")
print(f"Total rows: {len(df)}")
print(f"\nColumns ({len(df.columns)}):")
for i, col in enumerate(df.columns):
    print(f"  {i+1}. {col}")

print("\n=== FIRST 3 ROWS ===")
print(df.head(3))

print("\n=== SAMPLE DATA (row 0) ===")
for col in df.columns:
    print(f"{col}: {df[col].iloc[0]}")

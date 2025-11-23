"""
Main runner script for PCA driver profiling pipeline.
Run this to extract features, train PCA model, and generate driver profiles.
"""
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from training.train_pca import train_full_pipeline

if __name__ == "__main__":
    # Configure paths
    # Data root should be d:/ToyotaData where race CSVs are located
    data_root = Path(__file__).parent.parent.parent.parent  # Go up to ToyotaData
    output_dir = Path(__file__).parent / 'outputs'
    
    print(f"\n📂 Configuration:")
    print(f"   Data root: {data_root}")
    print(f"   Output dir: {output_dir}\n")
    
    # Run pipeline
    train_full_pipeline(data_root, output_dir)
    
    print(f"\n🎉 Driver profiles ready for frontend!")
    print(f"   Load from: {output_dir / 'driver_profiles.json'}")

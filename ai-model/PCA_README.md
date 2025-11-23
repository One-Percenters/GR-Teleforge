# PCA Driver DNA Model

Automated driver profiling system using PCA to discover "Driver DNA" and generate intelligent skill tags.

## Quick Start

### 1. Install Dependencies
```bash
cd ai-model
pip install -r requirements.txt
```

### 2. Run Training Pipeline
```bash
python run_training.py
```

This will:
- Extract features from all race CSV files
- Train PCA model (3 components)
- Cluster drivers into archetypes  
- Generate `driver_profiles.json` for the frontend

### 3. Outputs

After training completes, you'll find:

- **`outputs/driver_profiles.json`** → Load this in your React frontend
- **`outputs/driver_features_matrix.csv`** → Feature data for analysis
- **`models/pca_model.pkl`** → Trained model (reusable)

## Project Structure

```
ai-model/
├── features/
│   └── extract_features.py     # Feature extraction pipeline
├── training/
│   └── train_pca.py           # PCA training & clustering
├── utils/
│   └── data_utils.py          # Data loading utilities
├── models/                     # Saved model artifacts
├── outputs/                    # Generated driver profiles
└── run_training.py            # Main runner script
```

## What Gets Generated

### Driver Profile Example (`driver_profiles.json`)

```json
{
  "GR86-007": {
    "vehicle_id": "GR86-007",
    "vehicle_number": 7,
    "pca_analysis": {
      "pc1_pace": 1.42,
      "pc2_style": -0.68,
      "pc3_aggression": 0.23,
      "percentile_pace": 87
    },
    "skill_tags": [
      "Elite Pace",
      "Corner Speed Master",
      "Smooth Operator"
    ],
    "cluster_id": 2,
    "cluster_name": "Technical Specialists"
  }
}
```

### Skill Tags Explained

- **Elite Pace** / **Strong Pace** / **Development Driver** → Based on PC1 (overall speed)
- **Corner Speed Master** / **Straight-Line Specialist** → Based on PC2 (S1 vs S2 tradeoff)
- **Aggressive Braker** / **Smooth Operator** → Based on PC3 (telemetry aggression)
- **Metronome** → High consistency (low variance)

## How to Add New Races

Once trained, you can process new races automatically:

```python
from features.extract_features import build_driver_feature_row
from training.train_pca import apply_model_to_new_data
import pickle

# Load model
with open('models/pca_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Extract features from new race
new_features = extract_new_race_features(race_csv_files)

# Apply model
X_scaled = model['scaler'].transform(new_features)
X_pca = model['pca'].transform(X_scaled)
clusters = model['kmeans'].predict(X_pca[:, :2])

# Update profiles
update_driver_profiles(X_pca, clusters)
```

## Troubleshooting

**Issue**: "No valid CSV files found"
- **Fix**: Ensure race CSV files are in parent directory with correct structure

**Issue**: "Missing required column"
- **Fix**: Check that sector files have `NUMBER`, `S1_SECONDS`, `S2_SECONDS`, `S3_SECONDS`

**Issue**: Model trains but profiles are empty
- **Fix**: Check that driver numbers in sector files match telemetry `vehicle_number`

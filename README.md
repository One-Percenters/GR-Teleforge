# GR Teleforge - Motorsport Telemetry Analysis Platform

A comprehensive data processing and visualization system for Toyota GR Cup Series telemetry analysis.

## Project Structure

```
GR-Teleforge/
├── backend/                    # Python data processing pipeline
│   ├── core_pipeline/         # Main processing modules
│   │   ├── ingestion_sync.py  # Step 1: Data ingestion & synchronization
│   │   ├── sector_discovery.py # Step 2: Critical sector detection
│   │   ├── event_detection.py # Step 3: Overtake detection
│   │   ├── causal_analysis.py # Step 4: Root cause analysis
│   │   ├── data_export.py     # Step 5: Frontend data export
│   │   └── timeline_query.py  # Query utilities
│   ├── ideal_baseline/        # XGBoost ideal racer model
│   ├── run_pipeline.py        # Master execution script
│   └── ARCHITECTURE.md        # Backend architecture docs
│
├── frontend/                  # Next.js visualization layer
│   ├── app/                   # Next.js app directory
│   ├── BACKEND_INTEGRATION.md # How to consume backend data
│   ├── COMPONENT_DATA_MAPPING.md # Component-to-data mapping
│   ├── PERFORMANCE_GUIDE.md   # 60 FPS optimization guide
│   └── SETUP_GUIDE.md         # Frontend setup instructions
│
└── data_processed/            # Processed data output
    ├── master_timeline.parquet # Complete time-series data
    ├── tracks/                # Track boundaries
    ├── sectors/               # Sector boundaries
    ├── events/                # Critical events
    ├── timeline/              # Timeline index
    ├── drivers/               # Driver profiles
    └── README.md              # Data structure guide
```

## Quick Start

### Backend Setup

1. **Install Dependencies**:
   ```bash
   python -m venv .venv
   .venv\Scripts\Activate.ps1  # Windows
   pip install pandas numpy pyarrow
   ```

2. **Prepare Raw Data**:
   - Organize CSV files into `Raw Folders/[Track]_[Race]/` structure
   - Example: `Raw Folders/Barber_R1/R1_barber_telemetry_data.csv`

3. **Run Pipeline**:
   ```bash
   python -m backend.run_pipeline
   ```

### Frontend Setup

See `frontend/SETUP_GUIDE.md` for detailed instructions.

## Pipeline Overview

The backend processes data through 5 automated steps:

1. **Ingestion & Sync**: Consolidates 14 race files → Master Timeline (Parquet)
2. **Sector Discovery**: GPS curvature analysis → Critical Sectors
3. **Event Detection**: Position tracking → Overtake Events
4. **Causal Analysis**: Input comparison → Root Cause Codes
5. **Data Export**: Organized JSON files → Frontend-ready data

## Key Features

- **Automated Processing**: No manual data alignment needed
- **GPS-Based Sector Detection**: No manual track mapping
- **Event Detection**: Automatic overtake identification
- **Root Cause Analysis**: Quantified driving input deltas
- **Frontend-Ready**: Organized data structures for visualization
- **60 FPS Playback**: Optimized for real-time visualization

## Documentation

- **Backend**: `backend/ARCHITECTURE.md`
- **Data Structure**: `data_processed/README.md`
- **Frontend Integration**: `frontend/BACKEND_INTEGRATION.md`
- **Component Mapping**: `frontend/COMPONENT_DATA_MAPPING.md`
- **Performance**: `frontend/PERFORMANCE_GUIDE.md`

## Data Flow

```
Raw CSV (Long Format)
    ↓
[Step 1] Pivot → Wide Format + Resample to 20Hz
    ↓
Master Timeline (Parquet)
    ↓
[Step 2] GPS Analysis → Sector_ID + Delta_Heading
    ↓
Enhanced Timeline
    ↓
[Step 3] Position Tracking → Critical Events (JSON)
    ↓
[Step 4] Input Comparison → Reason Codes
    ↓
[Step 5] Export → Organized JSON Files
    ↓
Frontend Visualization
```

## Technology Stack

**Backend**:
- Python 3.10+
- Pandas (data processing)
- NumPy (vector math)
- PyArrow (Parquet I/O)

**Frontend**:
- Next.js 16 (App Router)
- TypeScript
- React 19
- Tailwind CSS
- Zustand (state management)
- react-zoom-pan-pinch (map interaction)

## License

[Your License Here]

## Contributors

- Backend: Hasnain Niazi
- Frontend: [Your Friend's Name]

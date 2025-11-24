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

## Frontend Workflow (Visualization Layer)

1. **Architecture Setup:** Use Next.js (App Router) with TypeScript for type safety and Tailwind CSS for rapid styling.
2. **Data Consumption:** Fetch pre-processed data (Parquet/JSON) via standard HTTP requests and load it into memory for instant access.
3. **Playback Engine:** The core `usePlaybackLoop()` hook uses `requestAnimationFrame` to drive the entire system, reading the Master Timeline data every 16ms.
4. **Real-time Updates:** Push telemetry values (speed, angle, pressure) from the loop via a Zustand store to all visualization components.
5. **Map Rendering:** Render the track as a single SVG Polyline and wrap it in `react-zoom-pan-pinch` for panning capability.
6. **Car Positioning:** Update car marker positions 60 times per second by feeding interpolated GPS coordinates directly to the `translate3d(...)` CSS property via a React Ref.
7. **Telemetry Dashboard:** Update digital gauges, the steering wheel, and the brake/throttle bars on every frame using the current telemetry values.

## Backend Workflow (Data Processing & Logic Layer)

1. **Manual Data Preparation:** Standardize the raw downloaded folder structure into the `[Track_Name]_[Race_Number]` schema to enable automatic script execution.
2. **Data Ingestion & Sync:** Use Python's `glob` to find all race CSV files and iteratively process them, converting `meta_time` to datetime, and resampling all data to a uniform 20Hz time grid (50ms).
3. **Driver Database Build:** As each race is processed, update and regenerate the lightweight `driver_profiles.json` file with career stats and finishing positions.
4. **Critical Sector Discovery:** Apply a rolling median filter to GPS data, calculate the bearing and rate of change in heading (`Delta_Heading`), and classify sections as `CRITICAL_SECTOR` or `STRAIGHT`.
5. **Event Detection Logic:** Scan the Master Timeline, monitor the distance delta between adjacent cars, and flag a confirmed **Critical Event** only after the spatial buffer is crossed and the position is held for >0.3 seconds.
6. **Causal Analysis:** Calculate the input deltas (e.g., Winner Peak Pressure - Loser Peak Pressure) around the event timestamp, assigning the metric with the largest deviation as the primary "Reason Code".
7. **LLM Context Generation:** Feed the event details (Sector, Error, Value) to the Gemini API with the "race engineer" prompt to generate a concise, 2-sentence coaching narrative, which is then stored.
8. **Ideal Baseline Model:** Filter the dataset for the top 5% fastest sector times and train an XGBoost model to predict the **Optimal Throttle Position** and **Optimal Brake Pressure** for any track coordinate.

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

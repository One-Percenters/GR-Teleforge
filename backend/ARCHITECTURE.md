# GR Teleforge Backend Architecture

## Overview

The backend pipeline processes multi-gigabyte motorsport telemetry data into structured, queryable formats optimized for frontend visualization and analysis.

## Pipeline Flow

```
Raw CSV Files → Ingestion & Sync → Sector Discovery → Event Detection → Causal Analysis → Data Export
     ↓                ↓                  ↓                 ↓                  ↓                ↓
  Long Format    Master Timeline    Enhanced TL      Event JSONs      Reason Codes    Frontend Data
```

## Directory Structure

### Input
- `Raw Folders/` - Standardized race folders (`[Track]_[Race]`)

### Output (`data_processed/`)
```
data_processed/
├── master_timeline.parquet      # Complete time-series (Parquet for efficiency)
├── driver_profiles.json         # Driver statistics
│
├── tracks/                      # Track metadata (JSON)
│   ├── tracks_index.json
│   └── [Track]_boundaries.json
│
├── sectors/                     # Sector boundaries (JSON)
│   ├── sectors_index.json
│   └── [Track]_sectors.json
│
├── events/                      # Event data (JSON)
│   ├── all_events.json
│   └── [Track]_events.json
│
├── timeline/                    # Timeline indexing (JSON)
│   └── timeline_index.json
│
└── drivers/                     # Driver data (JSON)
    └── driver_profiles.json
```

## Module Responsibilities

### `ingestion_sync.py`
- **Input**: Raw CSV files (long format with `telemetry_name`/`value`)
- **Process**: 
  - Pivot long → wide format
  - Resample to 20Hz (50ms intervals)
  - Convert all columns to numeric
  - Accumulate all races
- **Output**: `master_timeline.parquet` (wide format with explicit columns)

### `sector_discovery.py`
- **Input**: Master Timeline with GPS data
- **Process**:
  - Apply rolling median filter to GPS
  - Calculate bearing/heading
  - Calculate Delta_Heading (curvature)
  - Classify sectors (CRITICAL_SECTOR vs STRAIGHT)
  - Generate Sector_IDs (S_001, S_002, ...)
- **Output**: Enhanced Master Timeline with `Sector_ID` and `Delta_Heading`

### `event_detection.py`
- **Input**: Enhanced Master Timeline
- **Process**:
  - Normalize lap distance (modulo track length)
  - Filter by Critical Sectors only
  - Apply hysteresis buffer (2m)
  - Check persistence (>0.3s)
  - Generate Critical_Event_IDs
- **Output**: Event JSON files per race

### `causal_analysis.py`
- **Input**: Master Timeline + Event list
- **Process**:
  - Verify events in Critical Sectors
  - Calculate deltas (Brake, Throttle, Gear)
  - Assign Reason_Code based on largest deviation
- **Output**: Enhanced event JSONs with Reason Codes

### `data_export.py` (NEW)
- **Input**: Master Timeline + Event JSONs
- **Process**:
  - Extract track boundaries (GPS min/max)
  - Extract sector boundaries (GPS coordinates)
  - Consolidate event data
  - Create timeline index
- **Output**: Organized JSON files for frontend

### `timeline_query.py` (NEW)
- **Purpose**: Efficient query utilities for frontend
- **Functions**:
  - `get_race_timeline()` - Get specific race data
  - `get_vehicle_timeline()` - Get specific vehicle data
  - `get_events_at_time()` - Get all vehicles at a timestamp
  - `get_sector_data()` - Get all data in a sector
  - `get_event_context()` - Get data around an event

## Data Flow for Frontend

### Map Visualization
1. Load `tracks/[Track]_boundaries.json` → Get track bounds
2. Load `sectors/[Track]_sectors.json` → Get sector polygons
3. Load `events/[Track]_events.json` → Get event locations
4. Query `master_timeline.parquet` → Get vehicle positions over time

### Playback Engine
1. Load `timeline/timeline_index.json` → Check available races
2. Query `master_timeline.parquet` for specific race → Get time-series
3. Use `timeline_query.py` utilities → Efficient data access

### Event Analysis
1. Load `events/all_events.json` → Get all events
2. Use `get_event_context()` → Get surrounding data
3. Display on map using sector boundaries

## Key Design Decisions

1. **Parquet for Master Timeline**: Efficient compression, fast queries, columnar storage
2. **JSON for Metadata**: Human-readable, easy frontend loading, no parsing needed
3. **Organized Directories**: Clear separation of concerns, easy to navigate
4. **Query Utilities**: Abstract away Parquet complexity from frontend
5. **Index Files**: Quick lookups without loading full datasets

## Performance Considerations

- Master Timeline: ~100-200MB compressed (Parquet)
- JSON files: <10MB total (lightweight metadata)
- Query utilities: Use Parquet columnar reads (only load needed columns)
- Frontend: Load JSON first, query Parquet on-demand

## Future Enhancements

- API layer (FastAPI) for HTTP access to query utilities
- Caching layer for frequently accessed queries
- Real-time data streaming for live race analysis
- Database migration (PostgreSQL) for complex queries


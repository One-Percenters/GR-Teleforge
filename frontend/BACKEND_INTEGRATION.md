# Frontend Backend Integration Guide

This guide explains how to consume backend data for the GR Teleforge visualization layer.

## Data Sources

### 1. Master Timeline (Time-Series Data)
**Location**: `data_processed/master_timeline.parquet`

**Format**: Apache Parquet (columnar, compressed)

**Contents**: Complete time-series data for all races, all vehicles, synchronized to 20Hz (50ms intervals)

**Key Columns**:
- `Time` (index) - Timestamp for each data point
- `Vehicle_ID` - Vehicle identifier
- `Track` - Track name (e.g., "Barber")
- `Race_Number` - Race identifier (e.g., "R1")
- `Sector_ID` - Critical sector identifier (e.g., "S_012")
- `VBOX_Lat_Min`, `VBOX_Long_Minutes` - GPS coordinates for map rendering
- `Laptrigger_lapdist_dls` - Lap distance (meters from start/finish)
- `Speed` - Vehicle speed (km/h)
- `pbrake_f` - Front brake pressure (bar, 0.0-1.0 normalized)
- `ath` - Throttle position (0-100%, normalized to 0.0-1.0)
- `Steering_Angle` - Steering wheel angle (degrees)
- `Gear` - Current gear (integer)
- `nmot` - Engine RPM

**Usage**: Load into memory for 60 FPS playback loop. Query by Time, Track, Race_Number, Vehicle_ID.

---

### 2. Track Boundaries
**Location**: `data_processed/tracks/[Track]_boundaries.json`

**Format**: JSON

**Structure**:
```json
{
  "lat_min": 33.123,
  "lat_max": 33.456,
  "long_min": -87.789,
  "long_max": -87.123,
  "center_lat": 33.289,
  "center_long": -87.456
}
```

**Usage**: 
- Set map viewport bounds
- Calculate zoom level
- Center map on track

**Index**: `data_processed/tracks/tracks_index.json` - Lists all available tracks

---

### 3. Sector Boundaries
**Location**: `data_processed/sectors/[Track]_sectors.json`

**Format**: JSON

**Structure**:
```json
{
  "S_001": {
    "sector_id": "S_001",
    "lat_min": 33.123,
    "lat_max": 33.234,
    "long_min": -87.789,
    "long_max": -87.678,
    "center_lat": 33.178,
    "center_long": -87.733,
    "sample_points": [
      {"lat": 33.123, "long": -87.789},
      {"lat": 33.145, "long": -87.765},
      ...
    ]
  },
  "S_002": { ... }
}
```

**Usage**:
- Render sector polygons on map
- Highlight critical sectors
- Show sector boundaries for analysis

**Index**: `data_processed/sectors/sectors_index.json` - Lists all sectors per track

---

### 4. Critical Events
**Location**: `data_processed/events/[Track]_events.json` or `all_events.json`

**Format**: JSON Array

**Structure**:
```json
[
  {
    "Timestamp": "2024-01-15 14:23:45.123",
    "Winner_ID": "7",
    "Loser_ID": "12",
    "Sector_ID": "S_012",
    "Track": "Barber",
    "Race_Number": "R1",
    "Lap_Number": 5,
    "Critical_Event_ID": "S_012_L5_WIN7_LOS12",
    "Reason_Code": "Brake_Timing_Delta",
    "Reason_Value": "15.2",
    "LLM_Context_Input": {
      "Sector": "S_012",
      "Error": "Brake_Timing_Delta",
      "Value": "15.2",
      "Context": "Overtake"
    }
  }
]
```

**Usage**:
- Render event markers on map (GR Red rectangles)
- Show event details on click
- Seek to event timestamp in playback
- Display reason codes and analysis

---

### 5. Driver Profiles
**Location**: `data_processed/drivers/driver_profiles.json`

**Format**: JSON

**Structure**:
```json
{
  "7": {
    "Vehicle_ID": "7",
    "Finishing_Positions": [1, 2, 3],
    "Critical_Events_Involved": ["S_012_L5_WIN7_LOS12", ...],
    "Aggregated_Stats": {
      "Avg_Speed_kmh": 145.3
    }
  }
}
```

**Usage**:
- Display driver standings
- Show driver skill tags (Late Braker, etc.)
- Driver selection in UI

---

### 6. Timeline Index
**Location**: `data_processed/timeline/timeline_index.json`

**Format**: JSON

**Structure**:
```json
{
  "total_rows": 113097593,
  "tracks": {
    "Barber": {
      "races": ["R1", "R2"],
      "row_count": 8000000,
      "vehicles": 15
    }
  },
  "races": [
    {
      "track": "Barber",
      "race": "R1",
      "row_count": 4000000,
      "vehicles": 15
    }
  ],
  "time_range": {
    "start": "2024-01-15 10:00:00",
    "end": "2024-01-15 15:30:00"
  }
}
```

**Usage**:
- Quick lookup of available races
- Check data availability before loading
- Estimate data size for memory planning

---

## Data Loading Strategy

### For 60 FPS Playback

1. **Initial Load**:
   ```typescript
   // Load timeline index to check available data
   const index = await fetch('/api/data/timeline/timeline_index.json').then(r => r.json());
   
   // Load track boundaries for map setup
   const trackBounds = await fetch(`/api/data/tracks/${track}_boundaries.json`).then(r => r.json());
   
   // Load sectors for visualization
   const sectors = await fetch(`/api/data/sectors/${track}_sectors.json`).then(r => r.json());
   
   // Load events for markers
   const events = await fetch(`/api/data/events/${track}_events.json`).then(r => r.json());
   ```

2. **Master Timeline Loading**:
   - Option A: Load entire race into memory (for small races)
   - Option B: Stream/query on-demand (for large races)
   - Use Parquet.js or similar library for browser-side Parquet reading
   - Or: Create API endpoint that serves JSON chunks

3. **Playback Loop**:
   ```typescript
   // In usePlaybackLoop hook
   const currentTime = playbackState.currentTimeMs;
   const timestamp = startTime + currentTime;
   
   // Query Master Timeline for this timestamp
   const frameData = getFrameAtTime(timestamp);
   
   // Update all components via Zustand store
   playbackStore.setFrame(frameData);
   ```

---

## Coordinate System

### GPS to Screen Coordinates

**Input**: GPS coordinates (WGS84 decimal degrees)
- `VBOX_Lat_Min` (latitude)
- `VBOX_Long_Minutes` (longitude)

**Process**:
1. Get track boundaries (min/max lat/long)
2. Normalize GPS to 0-1000 viewbox:
   ```typescript
   const normalizedX = ((long - bounds.long_min) / (bounds.long_max - bounds.long_min)) * 1000;
   const normalizedY = ((lat - bounds.lat_min) / (bounds.lat_max - bounds.lat_min)) * 1000;
   ```
3. Apply to SVG viewbox or canvas coordinates

**Output**: Screen coordinates for car markers, sector polygons, etc.

---

## Performance Optimization

### Memory Management

1. **Lazy Loading**: Only load data for selected race/track
2. **Chunking**: Load timeline data in time-based chunks
3. **Caching**: Cache frequently accessed data (track bounds, sectors)
4. **Cleanup**: Unload data when switching races

### Rendering Optimization

1. **React Refs**: Use refs for DOM updates (not useState) in 60 FPS loop
2. **CSS Transforms**: Use `transform: translate3d()` for car positions
3. **RequestAnimationFrame**: Native browser API for smooth updates
4. **Virtualization**: Only render visible sectors/events on map

---

## API Endpoints (To Be Created)

The backend should expose these endpoints:

```
GET /api/data/tracks/{track}/boundaries
GET /api/data/sectors/{track}/sectors
GET /api/data/events/{track}/events
GET /api/data/timeline/{track}/{race}/frame?timestamp={iso}
GET /api/data/timeline/{track}/{race}/range?start={iso}&end={iso}
GET /api/data/drivers/profiles
```

For now, serve static files from `data_processed/` directory via Next.js public API routes.

---

## Data Normalization

### Brake/Throttle (0.0 - 1.0)
- `pbrake_f`: Already normalized (bar pressure, treat as 0.0-1.0)
- `ath`: Throttle 0-100%, divide by 100 for 0.0-1.0

### Speed Conversion
- Backend: `Speed` in km/h
- Frontend: Convert to mph if needed: `speedMph = speedKmh * 0.621371`

### Steering Angle
- Backend: `Steering_Angle` in degrees
- Frontend: Use directly for CSS `transform: rotate(${angle}deg)`

---

## Error Handling

1. **Missing Data**: Check if columns exist before accessing
2. **Invalid Timestamps**: Handle NaT/NaN values gracefully
3. **Empty Results**: Show "No data available" message
4. **Network Errors**: Retry logic for data loading

---

## Next Steps

1. Set up Next.js API routes to serve data from `data_processed/`
2. Implement Parquet.js integration or create JSON export endpoint
3. Create Zustand store for playback state
4. Implement `usePlaybackLoop` hook
5. Build data transformation utilities (GPS → screen coords)


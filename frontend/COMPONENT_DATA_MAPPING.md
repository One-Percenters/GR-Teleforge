# Component Data Mapping Guide

This document maps each frontend component to its backend data source.

## Component: TrackMap

### Data Sources
- **Track Boundaries**: `tracks/[Track]_boundaries.json`
- **Sector Polygons**: `sectors/[Track]_sectors.json`
- **Car Positions**: `master_timeline.parquet` (VBOX_Lat_Min, VBOX_Long_Minutes)
- **Events**: `events/[Track]_events.json`

### Implementation
```typescript
// Load track bounds
const bounds = await loadTrackBounds(track);

// Load sectors
const sectors = await loadSectors(track);

// In playback loop (60 FPS)
const frameData = playbackStore.getCurrentFrame();
const cars = frameData.vehicles.map(vehicle => ({
  id: vehicle.Vehicle_ID,
  lat: vehicle.VBOX_Lat_Min,
  long: vehicle.VBOX_Long_Minutes,
  // Convert to screen coords using bounds
  x: normalizeGPS(vehicle.VBOX_Long_Minutes, bounds, 'x'),
  y: normalizeGPS(vehicle.VBOX_Lat_Min, bounds, 'y')
}));

// Render sectors as SVG polygons
sectors.forEach(sector => {
  renderSectorPolygon(sector.sample_points, sector.sector_id);
});

// Render events as red rectangles
events.forEach(event => {
  renderEventMarker(event, event.Sector_ID);
});
```

### Update Frequency
- **Car Positions**: 60 FPS (via React Ref + CSS Transform)
- **Sectors**: Static (load once)
- **Events**: Static (load once, highlight on hover/click)

---

## Component: TelemetryPanel

### Data Sources
- **Current Vehicle Data**: `master_timeline.parquet` (filtered by Vehicle_ID and Time)

### Backend Variables → Frontend Props

| Frontend Prop | Backend Variable | Transformation |
|---------------|------------------|---------------|
| `speedMph` | `Speed` | `speedKmh * 0.621371` |
| `throttlePercent` | `ath` | `ath * 100` (already 0-100%) |
| `brakePercent` | `pbrake_f` | `pbrake_f * 100` (normalize 0.0-1.0 → 0-100%) |
| `gear` | `Gear` | Direct (integer) |
| `steeringAngleDeg` | `Steering_Angle` | Direct (degrees) |
| `rpm` | `nmot` | Direct (RPM) |

### Implementation
```typescript
// In playback loop
const vehicleData = getVehicleAtTime(selectedVehicleId, currentTimestamp);

// Update via Zustand store (not useState for performance)
telemetryStore.setData({
  speedMph: vehicleData.Speed * 0.621371,
  throttlePercent: vehicleData.ath * 100,
  brakePercent: vehicleData.pbrake_f * 100,
  gear: vehicleData.Gear,
  steeringAngleDeg: vehicleData.Steering_Angle,
  rpm: vehicleData.nmot
});

// Component reads from store and updates via refs
<SteeringWheel angle={telemetryStore.steeringAngleDeg} />
<ThrottleBar height={`${telemetryStore.throttlePercent}%`} />
<BrakeBar height={`${telemetryStore.brakePercent}%`} />
```

### Update Frequency
- **All Values**: 60 FPS (every frame)
- **Rendering**: Use CSS transforms/height changes (not React re-renders)

---

## Component: RaceInfoPanel

### Data Sources
- **Standings**: `master_timeline.parquet` (grouped by Time, sorted by Laptrigger_lapdist_dls)
- **Driver Profiles**: `drivers/driver_profiles.json`
- **Lap Info**: `master_timeline.parquet` (calculate from Laptrigger_lapdist_dls)

### Implementation
```typescript
// Get current standings at timestamp
const standings = getStandingsAtTime(track, race, currentTimestamp);

// Sort by lap distance (further = better position)
const sorted = standings.sort((a, b) => 
  b.Laptrigger_lapdist_dls - a.Laptrigger_lapdist_dls
);

// Calculate gaps
const leader = sorted[0];
const gaps = sorted.map(driver => ({
  ...driver,
  gapToLeader: calculateGap(driver, leader)
}));

// Load driver profiles for skill tags
const profiles = await loadDriverProfiles();
const driverWithTags = gaps.map(driver => ({
  ...driver,
  tags: profiles[driver.Vehicle_ID]?.Skill_Tags || []
}));
```

### Update Frequency
- **Standings**: 60 FPS (recalculate position from lap distance)
- **Driver Profiles**: Static (load once)

---

## Component: PlaybackControls

### Data Sources
- **Timeline Index**: `timeline/timeline_index.json`
- **Master Timeline**: `master_timeline.parquet`

### Implementation
```typescript
// Get race duration from timeline index
const raceInfo = timelineIndex.races.find(r => 
  r.track === track && r.race === race
);

// Calculate total duration
const startTime = new Date(raceInfo.time_range.start);
const endTime = new Date(raceInfo.time_range.end);
const totalDurationMs = endTime - startTime;

// Scrub to timestamp
const handleScrub = (ratio: number) => {
  const targetTime = startTime + (totalDurationMs * ratio);
  playbackStore.seekTo(targetTime);
};
```

### Update Frequency
- **Progress Bar**: 60 FPS (update current time)
- **Controls**: User interaction only

---

## Component: Header

### Data Sources
- **Track List**: `tracks/tracks_index.json`
- **Race List**: `timeline/timeline_index.json`

### Implementation
```typescript
// Load available tracks
const tracks = await loadTracksIndex();

// Load races for selected track
const races = timelineIndex.tracks[selectedTrack].races;

// Render track selector with arrows
<TrackSelector 
  tracks={tracks}
  currentTrack={selectedTrack}
  onTrackChange={setSelectedTrack}
/>

// Render race tabs
<RaceTabs 
  races={races}
  activeRace={selectedRace}
  onRaceChange={setSelectedRace}
/>
```

### Update Frequency
- **Static**: Only updates on user selection

---

## Component: Event Markers (Map Overlay)

### Data Sources
- **Events**: `events/[Track]_events.json`
- **Sector Boundaries**: `sectors/[Track]_sectors.json`

### Implementation
```typescript
// Load events for track
const events = await loadEvents(track);

// For each event, get sector boundaries
events.forEach(event => {
  const sector = sectors[event.Sector_ID];
  
  // Render red rectangle over sector
  <rect
    x={sector.long_min}
    y={sector.lat_min}
    width={sector.long_max - sector.long_min}
    height={sector.lat_max - sector.lat_min}
    fill="rgba(215, 25, 33, 0.3)" // GR Red with transparency
    onClick={() => seekToEvent(event)}
  />
});

// Seek to event timestamp
const seekToEvent = (event: Event) => {
  const eventTime = new Date(event.Timestamp);
  playbackStore.seekTo(eventTime);
};
```

### Update Frequency
- **Static**: Load once, highlight on hover/click

---

## Data Transformation Utilities

### GPS to Screen Coordinates
```typescript
function normalizeGPS(
  coord: number,
  bounds: TrackBounds,
  axis: 'x' | 'y'
): number {
  if (axis === 'x') {
    return ((coord - bounds.long_min) / 
            (bounds.long_max - bounds.long_min)) * 1000;
  } else {
    return ((coord - bounds.lat_min) / 
            (bounds.lat_max - bounds.lat_min)) * 1000;
  }
}
```

### Lap Distance to Progress (0-1)
```typescript
function lapDistanceToProgress(
  lapDist: number,
  trackLength: number
): number {
  return (lapDist % trackLength) / trackLength;
}
```

### Calculate Gap (seconds)
```typescript
function calculateGap(
  driver: VehicleData,
  leader: VehicleData,
  trackLength: number
): number {
  // Normalize lap distances (handle lap rollover)
  const driverNorm = driver.Laptrigger_lapdist_dls % trackLength;
  const leaderNorm = leader.Laptrigger_lapdist_dls % trackLength;
  
  // Calculate distance gap
  const distGap = leaderNorm - driverNorm;
  
  // Convert to time gap (approximate using speed)
  const avgSpeed = (driver.Speed + leader.Speed) / 2;
  const timeGap = (distGap / 1000) / (avgSpeed / 3.6); // km/h to m/s
  
  return timeGap;
}
```

---

## Performance Checklist

- [ ] Use React Refs for 60 FPS updates (not useState)
- [ ] Use CSS Transforms for car positions (translate3d)
- [ ] Load data into memory before playback starts
- [ ] Cache track bounds and sectors
- [ ] Lazy load race data (only load selected race)
- [ ] Use requestAnimationFrame for smooth updates
- [ ] Minimize re-renders (use Zustand selectors)
- [ ] Virtualize map markers if >100 events


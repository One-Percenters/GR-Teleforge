# Virtual Best Lap Implementation

## Overview
The Virtual Best Lap feature calculates the theoretical best lap time for each driver by combining their best sector times (S1, S2, S3), showing the potential time gain compared to their actual best lap.

## Implementation Status: ✅ COMPLETE

### 1. Backend (Python) - `process_race_data.py`
- ✅ `calculate_virtual_best()` function (lines 71-134)
- ✅ Returns analysis data with structure:
  ```json
  {
    "7": {
      "bestS1": 28.234,
      "bestS2": 31.567,
      "bestS3": 29.891,
      "virtualBest": 89.692,  // Sum of best sectors
      "actualBest": 90.145,    // Actual best lap time
      "potentialGain": 0.453   // Time that could be saved
    }
  }
  ```

### 2. API Route - `/app/api/race-timeline/route.ts`
- ✅ Returns `analysis` field in JSON response
- ✅ Mock data includes virtual best analysis for drivers 7, 13, 55, 99
- ✅ Real data passes through analysis from Python script

### 3. Frontend Container - `DashboardPlaybackContainer.tsx`
- ✅ Fetches analysis data from API (line 70)
- ✅ Stores in state: `const [analysis, setAnalysis] = useState<any>(null);`
- ✅ Passes to TrackMap component (line 198):
  ```tsx
  <TrackMap {...trackMap} analysis={analysis} focusedCarNumber={focusedCarNumber} />
  ```

### 4. TrackMap Component - `TrackMap.tsx`
- ✅ Accepts `analysis` and `focusedCarNumber` props (lines 26-27)
- ✅ Extracts focused driver stats (line 29):
  ```tsx
  const focusedStats = analysis && focusedCarNumber ? analysis[String(focusedCarNumber)] : null;
  ```
- ✅ Console logs for debugging (line 30)
- ✅ Displays Virtual Lap Analysis overlay (lines 72-94) showing:
  - Actual Best lap time
  - Virtual Best lap time  
  - Potential Gain

## How It Works

1. **Data Collection**: Python script analyzes sector CSV files to find each driver's best sector times
2. **Calculation**: Virtual Best = Best S1 + Best S2 + Best S3
3. **Comparison**: Potential Gain = Actual Best - Virtual Best
4. **Display**: When a driver is selected, their virtual best analysis appears in bottom-left overlay on track map

## Visual Display

The overlay shows in the bottom-left of the TrackMap with:
- **Actual Best**: Driver's actual fastest lap (white text)
- **Virtual Best**: Theoretical best lap from best sectors (amber text)
- **Potential Gain**: Time that could be saved (green text with negative sign)

## To View

1. Navigate to http://localhost:3000
2. Select a driver from the Race Info panel (cars 7, 13, 55, or 99)
3. Look at bottom-left of track map for "Virtual Lap Analysis" card

## Mock Data Sample

For Driver #7 (Jaxon Bell):
- Actual Best: 90.145s
- Virtual Best: 89.692s
- Potential Gain: -0.453s (could be 0.453 seconds faster)

This means if Driver #7 combined their best performance in each sector into a single lap, they could theoretically be 0.453 seconds faster!

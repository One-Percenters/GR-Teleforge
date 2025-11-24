# Foxglove-Style Data Loading System

## Overview

Your dashboard now features a **Foxglove-inspired sidebar** that allows you to:
- ✅ Browse available race data folders
- ✅ Switch between different race sessions instantly  
- ✅ View race metadata (track name, date, session type)
- ✅ Upload new data folders
- ✅ See which dataset is currently loaded

## How It Works

### 1. **Hover-to-Expand Sidebar**

- **Home Icon**: A fixed icon appears on the left side of the screen
- **Hover**: Move your mouse over the icon to expand the full sidebar panel
- **Animated**: Smooth spring animation using Framer Motion

### 2. **Data Source Selection**

The sidebar displays all available race folders from: 
```
GR-Teleforge/
  └── data/
      └── raw/
          ├── barber-motorsports-park/
          ├── road-atlanta/
          └── sebring-international/
```

Each folder can contain:
- **CSV files**: Telemetry data (speed, throttle, brake, etc.)
- **metadata.json**: Race information (track name, date, session type)

### 3. **Metadata Display**

When you select a data source, the dashboard header shows:
- **Track Name**: From metadata.json or inferred from folder name
- **Folder Name**: Displayed in the version label area (e.g., "📁  barber-motorsports-park")

### 4. **Upload New Data**

Click the "Upload Folder" button to add new race data:
1. Select a folder containing your CSV telemetry files
2. The system will scan for data
3. New source appears in the list automatically

## File Structure

### Example Data Folder

```
barber-motorsports-park/
  ├── metadata.json           # Race information
  ├── lap_times.csv           # Lap time data
  ├── telemetry_car_7.csv     # Telemetry for car #7
  ├── telemetry_car_12.csv    # Telemetry for car #12
  └── ...
```

### Sample metadata.json

```json
{
  "trackName": "Barber Motorsports Park",
  "raceName": "GR Cup Series - Barber Motorsports Park",
  "date": "2024-04-20",
  "sessionType": "Race",
  "location": "Birmingham, Alabama",
  "trackLength": 2.38,
  "trackLengthUnit": "miles"
}
```

## API Endpoints

### GET /api/data-sources
Lists all available race data folders.

**Response:**
```json
[
  {
    "id": "barber-motorsports-park",
    "name": "barber-motorsports-park",
    "path": "/path/to/data/raw/barber-motorsports-park",
    "lastModified": "2024-04-20T10:30:00Z",
    "metadata": {
      "trackName": "Barber Motorsports Park",
      "date": "2024-04-20",
      "sessionType": "Race"
    }
  }
]
```

### GET /api/race-timeline?folder=<folder-name>
Fetches race timeline data for a specific folder.

**Example:**
```
GET /api/race-timeline?folder=barber-motorsports-park
```

**Response:**
```json
{
  "timeline": [ /* array of race frames */ ],
  "metadata": {
    "trackName": "Barber Motorsports Park",
    "raceName": "GR Cup Series - Barber Motorsports Park",
    "folder": "barber-motorsports-park"
  }
}
```

## Adding Real CSV Processing

Currently, the system returns **mock data**. To process real CSV files:

1. **Create Python Script**: `ai-model/serve_race_data.py`
   ```python
   import sys
   import json
   import pandas as pd
   
   def process_folder(folder_path):
       # Read CSV files
       # Process telemetry
       # Generate RaceTimeline
       return timeline_data
   
   if __name__ == "__main__":
       folder = sys.argv[1]
       result = process_folder(folder)
       print(json.dumps(result))
   ```

2. **Update API Route**: `frontend/app/api/race-timeline/route.ts`
   ```typescript
   import { exec } from 'child_process';
   import { promisify } from 'util';
   
   const execAsync = promisify(exec);
   
   export async function GET(request: NextRequest) {
     const folder = request.nextUrl.searchParams.get('folder');
     
     // Call Python script
     const { stdout } = await execAsync(
       `python ../ai-model/serve_race_data.py "${folder}"`
     );
     
     const data = JSON.parse(stdout);
     return NextResponse.json(data);
   }
   ```

## UI Components

### DataSourceSidebar
- **Location**: `frontend/app/components/dashboard/DataSourceSidebar.tsx`
- **Props**: 
  - `currentSource`: ID of currently loaded data source
  - `onSourceSelect(id)`: Callback when user selects a source

### DashboardPlaybackContainer
- **Updated**: Now integrates the sidebar
- **Features**:
  - Loads data based on selected source
  - Displays race metadata in header
  - Reloads timeline when data source changes

## Development

### Install Dependencies
```bash
cd frontend
npm install framer-motion
```

### Run Development Server
```bash
npm run dev
```

### Test the Sidebar
1. Navigate to `http://localhost:3000/dashboard`
2. Hover over the home icon on the left
3. Click on a data source to load it
4. Watch the header update with race information

## Future Enhancements

- [ ] **Real CSV Processing**: Parse actual telemetry files
- [ ] **Data Validation**: Check CSV format before loading
- [ ] **Progress Indicators**: Show loading progress for large files
- [ ] **Error Handling**: Better UX for missing or corrupt data
- [ ] **Caching**: Cache processed timelines for faster switching
- [ ] **Search/Filter**: Search for specific races or dates
- [ ] **Comparison Mode**: Load multiple races side-by-side

## Troubleshooting

**Sidebar doesn't show data sources:**
- Check that `data/raw/` directory exists
- Verify folders contain valid data files

**Race metadata not showing:**
- Add `metadata.json` to your data folder
- Or rely on auto-inference from folder name

**Data doesn't load:**
- Check browser console for errors
- Verify API routes are accessible
- Ensure Python script is executable (if using real data)

---

**Happy Racing! 🏎️💨**

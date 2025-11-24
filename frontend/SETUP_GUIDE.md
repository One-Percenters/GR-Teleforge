# Frontend Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Initial Setup

```bash
cd frontend
npm install
```

## Project Structure

```
frontend/
├── app/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── DashboardPlaybackContainer.tsx  # Main container
│   │   │   ├── TrackMap.tsx                     # Map component
│   │   │   ├── Telemetry.tsx                    # Telemetry panel
│   │   │   ├── RaceInfo.tsx                     # Standings panel
│   │   │   ├── PlaybackControls.tsx             # Controls
│   │   │   └── LapProgress.tsx                  # Progress bar
│   │   └── ParticleBackground.tsx
│   ├── dashboard/
│   │   └── page.tsx                             # Dashboard page
│   └── page.tsx                                 # Landing page
├── public/                                      # Static assets
└── ...
```

## Data Access

### Option 1: Static File Serving (Development)

Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/data/:path*',
        destination: '/../data_processed/:path*',
      },
    ];
  },
};
```

### Option 2: API Routes (Production)

Create `app/api/data/[...path]/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const filePath = path.join(
    process.cwd(),
    '..',
    'data_processed',
    ...params.path
  );
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  const data = fs.readFileSync(filePath, 'utf-8');
  return NextResponse.json(JSON.parse(data));
}
```

## Required Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "zustand": "^5.0.8",
    "react-zoom-pan-pinch": "^3.7.0"
  }
}
```

## Environment Setup

Create `.env.local`:
```
NEXT_PUBLIC_DATA_PATH=/api/data
```

## Development Workflow

1. **Start Backend Pipeline** (if needed):
   ```bash
   cd ../backend
   python -m backend.run_pipeline
   ```

2. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Dashboard**:
   - Landing: `http://localhost:3000`
   - Dashboard: `http://localhost:3000/dashboard`

## Data Loading Example

```typescript
// hooks/useRaceData.ts
import { useEffect, useState } from 'react';

export function useRaceData(track: string, race: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function load() {
      const [bounds, sectors, events] = await Promise.all([
        fetch(`/api/data/tracks/${track}_boundaries.json`).then(r => r.json()),
        fetch(`/api/data/sectors/${track}_sectors.json`).then(r => r.json()),
        fetch(`/api/data/events/${track}_events.json`).then(r => r.json()),
      ]);
      
      setData({ bounds, sectors, events });
      setLoading(false);
    }
    
    load();
  }, [track, race]);
  
  return { data, loading };
}
```

## TypeScript Types

Create `types/backend.ts`:
```typescript
export interface TrackBounds {
  lat_min: number;
  lat_max: number;
  long_min: number;
  long_max: number;
  center_lat: number;
  center_long: number;
}

export interface SectorData {
  sector_id: string;
  lat_min: number;
  lat_max: number;
  long_min: number;
  long_max: number;
  center_lat: number;
  center_long: number;
  sample_points: Array<{ lat: number; long: number }>;
}

export interface CriticalEvent {
  Timestamp: string;
  Winner_ID: string;
  Loser_ID: string;
  Sector_ID: string;
  Track: string;
  Race_Number: string;
  Lap_Number: number;
  Critical_Event_ID: string;
  Reason_Code: string;
  Reason_Value: string;
}

export interface VehicleFrame {
  Vehicle_ID: string;
  VBOX_Lat_Min: number;
  VBOX_Long_Minutes: number;
  Speed: number;
  pbrake_f: number;
  ath: number;
  Steering_Angle: number;
  Gear: number;
  nmot: number;
  Laptrigger_lapdist_dls: number;
}
```

## Next Steps

1. Set up Zustand store (see PERFORMANCE_GUIDE.md)
2. Implement usePlaybackLoop hook
3. Create data transformation utilities
4. Build map rendering components
5. Connect telemetry components to data

## Troubleshooting

**Issue**: Cannot find data files
- **Fix**: Check `next.config.ts` rewrites or API route setup

**Issue**: CORS errors
- **Fix**: Ensure API routes are properly configured

**Issue**: Type errors
- **Fix**: Add TypeScript types from `types/backend.ts`


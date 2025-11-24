'use client';

import { useMemo } from 'react';
import type { TrackData } from '../types';

interface MiniMapProps {
  trackData: TrackData;
  drivers: string[];
  currentTime: number;
  raceDuration: number;
  getDriverColor: (driverId: string) => string;
  viewPosition: number; // 0-1 where camera is focused
}

export function MiniMap({
  trackData,
  drivers,
  currentTime,
  raceDuration,
  getDriverColor,
  viewPosition
}: MiniMapProps) {
  const SIZE = 150;
  const PADDING = 10;

  // Convert GPS to minimap coordinates
  const gpsToMini = (long: number, lat: number) => {
    const { bounds } = trackData;
    const x = PADDING + ((long - bounds.long_min) / (bounds.long_max - bounds.long_min)) * (SIZE - 2 * PADDING);
    const y = PADDING + ((bounds.lat_max - lat) / (bounds.lat_max - bounds.lat_min)) * (SIZE - 2 * PADDING);
    return { x, y };
  };

  // Track path for minimap
  const trackPath = useMemo(() => {
    return trackData.path.map((point, i) => {
      const { x, y } = gpsToMini(point[0], point[1]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z';
  }, [trackData]);

  // Driver positions
  const driverPositions = useMemo(() => {
    const progress = raceDuration > 0 ? currentTime / raceDuration : 0;
    
    return drivers.slice(0, 5).map((driverId, index) => { // Only show top 5 on minimap
      const speedMod = 1 - (index * 0.005);
      const driverProgress = (progress * speedMod * 3) % 1;
      
      const pathIdx = Math.floor(driverProgress * trackData.path.length);
      const point = trackData.path[pathIdx % trackData.path.length];
      const pos = gpsToMini(point[0], point[1]);
      
      return { driverId, ...pos };
    });
  }, [drivers, currentTime, raceDuration, trackData]);

  // Camera view indicator position
  const viewIndicatorPos = useMemo(() => {
    const pathIdx = Math.floor(viewPosition * trackData.path.length);
    const point = trackData.path[pathIdx % trackData.path.length];
    return gpsToMini(point[0], point[1]);
  }, [viewPosition, trackData]);

  return (
    <div className="bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-zinc-800">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Track outline */}
        <path
          d={trackPath}
          fill="none"
          stroke="#333"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={trackPath}
          fill="none"
          stroke="#D71921"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />

        {/* Camera view indicator */}
        <circle
          cx={viewIndicatorPos.x}
          cy={viewIndicatorPos.y}
          r={12}
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          opacity="0.5"
        />
        <circle
          cx={viewIndicatorPos.x}
          cy={viewIndicatorPos.y}
          r={4}
          fill="#fff"
        />

        {/* Driver dots */}
        {driverPositions.map((pos, idx) => (
          <circle
            key={pos.driverId}
            cx={pos.x}
            cy={pos.y}
            r={4}
            fill={getDriverColor(pos.driverId)}
            stroke="#000"
            strokeWidth="1"
          />
        ))}
      </svg>
      <p className="text-[9px] text-zinc-500 text-center mt-1 uppercase tracking-wider">Track Map</p>
    </div>
  );
}


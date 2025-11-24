'use client';

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { TrackData, ProcessedEvent } from '../types';

interface TrackViewProps {
  trackData: TrackData;
  drivers: string[];
  events: ProcessedEvent[];
  activeEvents: ProcessedEvent[];
  selectedEvent: ProcessedEvent | null;
  selectedDriver: string | null;
  currentTime: number;
  raceDuration: number;
  onEventClick: (event: ProcessedEvent) => void;
  onDriverClick: (driverId: string) => void;
  getDriverColor: (driverId: string) => string;
}

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;
const PADDING = 40;

export function TrackView({
  trackData,
  drivers,
  events,
  activeEvents,
  selectedEvent,
  selectedDriver,
  currentTime,
  raceDuration,
  onEventClick,
  onDriverClick,
  getDriverColor
}: TrackViewProps) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert GPS to view coordinates (straight top-down)
  const gpsToView = useCallback((long: number, lat: number) => {
    const { bounds } = trackData;
    const rangeX = bounds.long_max - bounds.long_min;
    const rangeY = bounds.lat_max - bounds.lat_min;
    
    // Keep aspect ratio
    const scaleX = (VIEW_WIDTH - 2 * PADDING) / rangeX;
    const scaleY = (VIEW_HEIGHT - 2 * PADDING) / rangeY;
    const s = Math.min(scaleX, scaleY);
    
    const offsetX = (VIEW_WIDTH - rangeX * s) / 2;
    const offsetY = (VIEW_HEIGHT - rangeY * s) / 2;
    
    const x = offsetX + (long - bounds.long_min) * s;
    const y = offsetY + (bounds.lat_max - lat) * s; // Flip Y
    
    return { x, y };
  }, [trackData]);

  // Track path as SVG
  const trackPath = useMemo(() => {
    if (trackData.path.length === 0) return '';
    return trackData.path.map((point, i) => {
      const { x, y } = gpsToView(point[0], point[1]);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, [trackData, gpsToView]);

  // Get position along track
  const getTrackPosition = useCallback((progress: number) => {
    const len = trackData.path.length;
    if (len === 0) return { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };
    const idx = Math.floor((progress % 1) * len);
    const point = trackData.path[idx];
    return gpsToView(point[0], point[1]);
  }, [trackData, gpsToView]);

  // Calculate all driver positions
  const driverPositions = useMemo(() => {
    const progress = raceDuration > 0 ? currentTime / raceDuration : 0;
    
    return drivers.map((driverId, index) => {
      // Simulate race positions - leader is fastest
      const speedFactor = 1 - (index * 0.004);
      const driverProgress = (progress * speedFactor * 5) % 1; // 5 laps worth
      const pos = getTrackPosition(driverProgress);
      
      const isInEvent = activeEvents.some(
        e => e.Winner_ID === driverId || e.Loser_ID === driverId
      );
      
      return {
        driverId,
        x: pos.x,
        y: pos.y,
        isInEvent,
        position: index + 1
      };
    });
  }, [drivers, currentTime, raceDuration, activeEvents, getTrackPosition]);

  // Event positions (spread along track based on sector)
  const eventPositions = useMemo(() => {
    return events.slice(0, 30).map((event, idx) => {
      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || idx;
      const progress = (sectorNum % 50) / 50;
      const pos = getTrackPosition(progress);
      return { ...event, x: pos.x, y: pos.y };
    });
  }, [events, getTrackPosition]);

  // Get driver number
  const getDriverNumber = (id: string) => id.split('-').pop() || '?';

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.5, Math.min(3, s * delta)));
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0a0a0a] rounded-xl"
      onWheel={handleWheel}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full h-full"
        style={{ 
          transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center'
        }}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a1a" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Track outline - outer */}
        <path
          d={trackPath}
          fill="none"
          stroke="#D71921"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />

        {/* Track surface */}
        <path
          d={trackPath}
          fill="none"
          stroke="#1f1f1f"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Track center line */}
        <path
          d={trackPath}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="8,8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Event markers */}
        <g id="events">
          {eventPositions.map((event) => {
            const isActive = activeEvents.some(e => e.Critical_Event_ID === event.Critical_Event_ID);
            const isSelected = selectedEvent?.Critical_Event_ID === event.Critical_Event_ID;
            
            return (
              <g
                key={event.Critical_Event_ID}
                onClick={() => onEventClick(event)}
                className="cursor-pointer"
              >
                {/* Event ring */}
                {isActive && (
                  <circle
                    cx={event.x}
                    cy={event.y}
                    r={18}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    opacity="0.5"
                    className="animate-ping"
                  />
                )}
                
                {/* Event dot */}
                <circle
                  cx={event.x}
                  cy={event.y}
                  r={isSelected ? 8 : isActive ? 6 : 4}
                  fill={isSelected ? "#fff" : "#ef4444"}
                  stroke={isSelected ? "#ef4444" : "none"}
                  strokeWidth="2"
                  opacity={isActive ? 1 : 0.6}
                />
              </g>
            );
          })}
        </g>

        {/* Driver bubbles */}
        <g id="drivers">
          {driverPositions.map((driver) => {
            const isSelected = selectedDriver === driver.driverId;
            const color = getDriverColor(driver.driverId);
            const opacity = selectedDriver && !isSelected ? 0.3 : 1;
            
            return (
              <g
                key={driver.driverId}
                onClick={() => onDriverClick(driver.driverId)}
                className="cursor-pointer"
                style={{ opacity }}
              >
                {/* Highlight ring */}
                {(isSelected || driver.isInEvent) && (
                  <circle
                    cx={driver.x}
                    cy={driver.y}
                    r={isSelected ? 18 : 14}
                    fill="none"
                    stroke={isSelected ? "#fff" : driver.isInEvent ? "#ef4444" : "none"}
                    strokeWidth="2"
                    opacity="0.6"
                  />
                )}
                
                {/* Driver circle */}
                <circle
                  cx={driver.x}
                  cy={driver.y}
                  r={isSelected ? 12 : 10}
                  fill={color}
                  stroke="#000"
                  strokeWidth="2"
                />
                
                {/* Position number */}
                <text
                  x={driver.x}
                  y={driver.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#000"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {driver.position}
                </text>
                
                {/* Driver number label */}
                <text
                  x={driver.x}
                  y={driver.y - 18}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="8"
                  fontWeight="bold"
                  style={{ textShadow: '0 1px 2px #000' }}
                >
                  #{getDriverNumber(driver.driverId)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => setScale(s => Math.min(3, s * 1.2))}
          className="w-8 h-8 bg-zinc-900 border border-zinc-700 rounded text-white text-lg hover:bg-zinc-800"
        >
          +
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.5, s / 1.2))}
          className="w-8 h-8 bg-zinc-900 border border-zinc-700 rounded text-white text-lg hover:bg-zinc-800"
        >
          −
        </button>
        <button
          onClick={() => setScale(1)}
          className="w-8 h-8 bg-zinc-900 border border-zinc-700 rounded text-zinc-400 text-xs hover:bg-zinc-800"
        >
          1:1
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute top-4 right-4 text-xs text-zinc-500">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}


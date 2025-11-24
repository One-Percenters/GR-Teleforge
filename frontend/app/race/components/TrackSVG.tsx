'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { TrackData, ProcessedEvent } from '../types';

interface TrackSVGProps {
  trackData: TrackData;
  activeEvents: ProcessedEvent[];
  selectedEvent: ProcessedEvent | null;
  selectedDriver: string | null;
  drivers: string[];
  currentTime: number;
  raceDuration: number;
  currentLap: number;
  onEventClick: (event: ProcessedEvent) => void;
  getDriverColor: (driverId: string) => string;
}

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 700;
const PADDING = 80;
const TRACK_WIDTH = 22;

export function TrackSVG({
  trackData,
  activeEvents,
  selectedEvent,
  selectedDriver,
  drivers,
  currentTime,
  raceDuration,
  currentLap,
  onEventClick,
  getDriverColor
}: TrackSVGProps) {
  const driverRefs = useRef<Map<string, SVGCircleElement>>(new Map());

  // Convert GPS to SVG coordinates
  const gpsToSvg = useCallback((long: number, lat: number) => {
    const { bounds } = trackData;
    const rangeX = bounds.long_max - bounds.long_min;
    const rangeY = bounds.lat_max - bounds.lat_min;
    
    // Maintain aspect ratio
    const scaleX = (SVG_WIDTH - 2 * PADDING) / rangeX;
    const scaleY = (SVG_HEIGHT - 2 * PADDING) / rangeY;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (SVG_WIDTH - rangeX * scale) / 2;
    const offsetY = (SVG_HEIGHT - rangeY * scale) / 2;
    
    const x = offsetX + (long - bounds.long_min) * scale;
    const y = offsetY + (bounds.lat_max - lat) * scale;
    
    return { x, y };
  }, [trackData]);

  // Generate track path
  const trackPath = useMemo(() => {
    if (trackData.path.length === 0) return '';
    return trackData.path.map((point, i) => {
      const { x, y } = gpsToSvg(point[0], point[1]);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, [trackData, gpsToSvg]);

  // Get position on track at given progress (0-1)
  const getPositionOnTrack = useCallback((progress: number) => {
    const len = trackData.path.length;
    if (len === 0) return { x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2 };
    
    const idx = Math.floor((progress % 1) * len);
    const point = trackData.path[idx];
    return gpsToSvg(point[0], point[1]);
  }, [trackData, gpsToSvg]);

  // Start/finish position
  const startPos = useMemo(() => {
    if (trackData.path.length === 0) return { x: 0, y: 0 };
    return gpsToSvg(trackData.path[0][0], trackData.path[0][1]);
  }, [trackData, gpsToSvg]);

  // Animate drivers using requestAnimationFrame
  useEffect(() => {
    const progress = raceDuration > 0 ? currentTime / raceDuration : 0;
    
    drivers.forEach((driverId, idx) => {
      const circle = driverRefs.current.get(driverId);
      if (!circle) return;
      
      // Each driver has slightly different speed based on position
      const speedMod = 1 - (idx * 0.006);
      const driverProgress = (progress * speedMod) % 1;
      
      const pos = getPositionOnTrack(driverProgress);
      circle.setAttribute('cx', pos.x.toString());
      circle.setAttribute('cy', pos.y.toString());
    });
  }, [currentTime, raceDuration, drivers, getPositionOnTrack]);

  // Grid pattern
  const gridLines = useMemo(() => {
    const lines = [];
    const spacing = 40;
    
    // Vertical lines
    for (let x = 0; x < SVG_WIDTH; x += spacing) {
      if (Math.random() > 0.3) { // Disjointed effect
        lines.push(
          <line
            key={`v${x}`}
            x1={x}
            y1={Math.random() * 100}
            x2={x}
            y2={SVG_HEIGHT - Math.random() * 100}
            stroke="#1a1a1a"
            strokeWidth="1"
            strokeDasharray={`${10 + Math.random() * 20},${5 + Math.random() * 15}`}
          />
        );
      }
    }
    
    // Horizontal lines
    for (let y = 0; y < SVG_HEIGHT; y += spacing) {
      if (Math.random() > 0.3) {
        lines.push(
          <line
            key={`h${y}`}
            x1={Math.random() * 100}
            y1={y}
            x2={SVG_WIDTH - Math.random() * 100}
            y2={y}
            stroke="#1a1a1a"
            strokeWidth="1"
            strokeDasharray={`${10 + Math.random() * 20},${5 + Math.random() * 15}`}
          />
        );
      }
    }
    
    return lines;
  }, []);

  return (
    <svg 
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="w-full h-full max-h-[65vh]"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background grid */}
      <g id="grid" opacity="0.5">
        {gridLines}
      </g>

      {/* Track layers */}
      <g id="track">
        {/* Track shadow */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth={TRACK_WIDTH + 8}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(3, 3)"
        />
        
        {/* Track border (kerb effect) */}
        <path
          d={trackPath}
          fill="none"
          stroke="#D71921"
          strokeWidth={TRACK_WIDTH + 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        
        {/* Track surface */}
        <path
          d={trackPath}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Track inner edge */}
        <path
          d={trackPath}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={TRACK_WIDTH - 4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Start/Finish marker */}
      <g id="start-finish">
        <rect
          x={startPos.x - 2}
          y={startPos.y - 15}
          width="4"
          height="30"
          fill="#fff"
        />
        <rect
          x={startPos.x - 2}
          y={startPos.y - 15}
          width="4"
          height="6"
          fill="#000"
        />
        <rect
          x={startPos.x - 2}
          y={startPos.y - 3}
          width="4"
          height="6"
          fill="#000"
        />
        <rect
          x={startPos.x - 2}
          y={startPos.y + 9}
          width="4"
          height="6"
          fill="#000"
        />
      </g>

      {/* Selected driver's path trail (only if driver selected) */}
      {selectedDriver && (
        <path
          d={trackPath}
          fill="none"
          stroke={getDriverColor(selectedDriver)}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
          strokeDasharray="5,3"
        />
      )}

      {/* Event markers */}
      <g id="events">
        {activeEvents.slice(0, 8).map((event, idx) => {
          const eventProgress = (idx / 8) * 0.8 + 0.1;
          const pos = getPositionOnTrack(eventProgress);
          const isSelected = selectedEvent?.Critical_Event_ID === event.Critical_Event_ID;
          const involvedWithDriver = selectedDriver && 
            (event.Winner_ID === selectedDriver || event.Loser_ID === selectedDriver);
          
          if (selectedDriver && !involvedWithDriver) return null;

          return (
            <g 
              key={event.Critical_Event_ID}
              onClick={() => onEventClick(event)}
              className="cursor-pointer"
            >
              {/* Pulse effect */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? 20 : 14}
                fill="rgba(239, 68, 68, 0.2)"
                className="animate-pulse"
              />
              {/* Event dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? 7 : 5}
                fill="#ef4444"
                stroke={isSelected ? "#fff" : "#000"}
                strokeWidth={isSelected ? 2 : 1}
              />
            </g>
          );
        })}
      </g>

      {/* Driver circles */}
      <g id="drivers">
        {drivers.map((driverId, idx) => {
          const isSelected = selectedDriver === driverId;
          const color = getDriverColor(driverId);
          const inActiveEvent = activeEvents.some(
            e => e.Winner_ID === driverId || e.Loser_ID === driverId
          );
          
          // Hide non-selected drivers when a driver is selected
          const opacity = selectedDriver 
            ? (isSelected ? 1 : 0.15) 
            : (inActiveEvent ? 1 : 0.8);

          return (
            <g key={driverId}>
              {/* Highlight ring for selected/active */}
              {(isSelected || inActiveEvent) && (
                <circle
                  ref={el => {
                    if (el) {
                      const mainCircle = driverRefs.current.get(driverId);
                      if (mainCircle) {
                        el.setAttribute('cx', mainCircle.getAttribute('cx') || '0');
                        el.setAttribute('cy', mainCircle.getAttribute('cy') || '0');
                      }
                    }
                  }}
                  r={isSelected ? 14 : 11}
                  fill="none"
                  stroke={isSelected ? "#fff" : color}
                  strokeWidth="2"
                  opacity="0.5"
                  className={inActiveEvent ? "animate-pulse" : ""}
                />
              )}
              
              {/* Main driver circle */}
              <circle
                ref={el => { if (el) driverRefs.current.set(driverId, el); }}
                r={isSelected ? 9 : 7}
                fill={color}
                stroke="#000"
                strokeWidth="2"
                opacity={opacity}
              />
              
              {/* Position number */}
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#000"
                fontSize="8"
                fontWeight="bold"
                opacity={opacity}
                style={{ pointerEvents: 'none' }}
              >
                {idx + 1}
              </text>
            </g>
          );
        })}
      </g>

      {/* Lap counter */}
      <g id="lap-display">
        <rect
          x={SVG_WIDTH - 90}
          y={15}
          width={75}
          height={35}
          rx={6}
          fill="rgba(0,0,0,0.8)"
          stroke="#333"
          strokeWidth="1"
        />
        <text x={SVG_WIDTH - 52} y={28} fill="#666" fontSize="9" textAnchor="middle" fontWeight="bold">
          LAP
        </text>
        <text x={SVG_WIDTH - 52} y={43} fill="#fff" fontSize="16" textAnchor="middle" fontWeight="bold">
          {currentLap}
        </text>
      </g>
    </svg>
  );
}

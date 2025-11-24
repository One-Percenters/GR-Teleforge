'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { TrackData, ProcessedEvent } from '../types';

interface TrackCanvasProps {
  trackData: TrackData;
  drivers: string[];
  events: ProcessedEvent[];
  isPlaying: boolean;
  playbackSpeed: number;
  selectedDriver: string | null;
  selectedEvent: ProcessedEvent | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onEventClick: (event: ProcessedEvent) => void;
  onDriverClick: (driverId: string) => void;
  getDriverColor: (driverId: string) => string;
  onTimeUpdate: (time: number, lap: number) => void;
  onEventTrigger: (event: ProcessedEvent) => void;
  currentTimeOverride?: number;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#71717a', '#64748b', '#475569'
];

export function TrackCanvas({
  trackData,
  drivers,
  events,
  isPlaying,
  playbackSpeed,
  selectedDriver,
  selectedEvent,
  leftPanelOpen,
  rightPanelOpen,
  onEventClick,
  onDriverClick,
  getDriverColor,
  onTimeUpdate,
  onEventTrigger,
  currentTimeOverride
}: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const triggeredEventsRef = useRef<Set<string>>(new Set());
  const scaledPointsRef = useRef<{x: number, y: number}[]>([]);
  const initializedRef = useRef(false);
  
  const RACE_DURATION = 45 * 60 * 1000;
  const TOTAL_LAPS = 15;

  // Sync time with external override
  useEffect(() => {
    if (currentTimeOverride !== undefined) {
      timeRef.current = currentTimeOverride;
    }
  }, [currentTimeOverride]);

  // Reset time when track changes
  useEffect(() => {
    timeRef.current = 0;
    triggeredEventsRef.current.clear();
    initializedRef.current = false;
  }, [trackData]);

  const getViewBounds = useCallback((width: number, height: number) => {
    const leftOffset = leftPanelOpen ? 340 : 0;
    const rightOffset = rightPanelOpen ? 360 : 0;
    return { left: leftOffset, right: width - rightOffset, width: width - leftOffset - rightOffset, height };
  }, [leftPanelOpen, rightPanelOpen]);

  const gpsToCanvas = useCallback((long: number, lat: number, viewBounds: ReturnType<typeof getViewBounds>) => {
    const { bounds } = trackData;
    const padding = 80;
    const rangeX = bounds.long_max - bounds.long_min;
    const rangeY = bounds.lat_max - bounds.lat_min;
    const availWidth = viewBounds.width - 2 * padding;
    const availHeight = viewBounds.height - 2 * padding;
    const scale = Math.min(availWidth / rangeX, availHeight / rangeY);
    const centerX = viewBounds.left + viewBounds.width / 2;
    const centerY = viewBounds.height / 2;
    return {
      x: centerX + (long - (bounds.long_min + rangeX / 2)) * scale,
      y: centerY - (lat - (bounds.lat_min + rangeY / 2)) * scale
    };
  }, [trackData]);

  const getTrackPosition = useCallback((progress: number) => {
    const points = scaledPointsRef.current;
    if (points.length === 0) return { x: 0, y: 0 };
    const idx = Math.floor((progress % 1) * points.length);
    return points[idx] || points[0];
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const delta = lastFrameRef.current ? now - lastFrameRef.current : 16.67;
    lastFrameRef.current = now;

    if (isPlaying) {
      timeRef.current += delta * playbackSpeed;
      if (timeRef.current >= RACE_DURATION) {
        timeRef.current = 0;
        triggeredEventsRef.current.clear();
      }
    }

    const currentTime = timeRef.current;
    const progress = currentTime / RACE_DURATION;
    const currentLap = Math.min(TOTAL_LAPS, Math.floor(progress * TOTAL_LAPS) + 1);

    if (Math.floor(currentTime / 100) !== Math.floor((currentTime - delta) / 100)) {
      onTimeUpdate(currentTime, currentLap);
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const viewBounds = getViewBounds(width, height);

    // Clear
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    // Grid pattern
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = viewBounds.left % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Build track points
    scaledPointsRef.current = trackData.path.map(p => gpsToCanvas(p[0], p[1], viewBounds));
    const points = scaledPointsRef.current;

    if (points.length < 2) {
      animationRef.current = requestAnimationFrame(render);
      return;
    }

    // Track glow
    ctx.save();
    ctx.shadowColor = '#D71921';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(215, 25, 33, 0.25)';
    ctx.lineWidth = 35;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Track edge (outer)
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Track surface
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Center dashed line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/Finish line
    if (trackData.startLine) {
      const startPos = gpsToCanvas(trackData.startLine[0], trackData.startLine[1], viewBounds);
      // Checkered flag pattern
      ctx.fillStyle = '#fff';
      ctx.fillRect(startPos.x - 18, startPos.y - 4, 36, 8);
      ctx.fillStyle = '#000';
      const checkerSize = 4;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 9; col++) {
          if ((row + col) % 2 === 0) {
            ctx.fillRect(startPos.x - 18 + col * checkerSize, startPos.y - 4 + row * checkerSize, checkerSize, checkerSize);
          }
        }
      }
    }

    // Events - only show when active
    events.slice(0, 50).forEach((event, idx) => {
      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || idx;
      const eventProgress = (sectorNum % 50) / 50;
      const pos = getTrackPosition(eventProgress);
      const timeDiff = Math.abs(event.timeMs - currentTime);
      const isActive = timeDiff < 3000;
      const isSelected = selectedEvent?.Critical_Event_ID === event.Critical_Event_ID;

      // Only show events when they're happening
      if (!isActive && !isSelected) return;

      if (isPlaying && isActive && !triggeredEventsRef.current.has(event.Critical_Event_ID)) {
        triggeredEventsRef.current.add(event.Critical_Event_ID);
        onEventTrigger(event);
      }

      // Pulsing ring for active events
      if (isActive) {
        const pulseSize = 20 + Math.sin(now / 150) * 5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 - (timeDiff / 3000) * 0.4})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Event marker
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 12 : isActive ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#fff' : isActive ? '#ef4444' : 'rgba(239, 68, 68, 0.4)';
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Drivers
    drivers.forEach((driverId, idx) => {
      const speedFactor = 1 - (idx * 0.003);
      const driverProgress = (progress * speedFactor * 5) % 1;
      const pos = getTrackPosition(driverProgress);
      const color = COLORS[idx % COLORS.length];
      const isSelected = selectedDriver === driverId;
      
      ctx.globalAlpha = selectedDriver && !isSelected ? 0.3 : 1;

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Driver circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 14 : 12, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Position number
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), pos.x, pos.y);

      // Driver number label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Inter, system-ui, sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`#${driverId.split('-').pop()}`, pos.x, pos.y - 20);
      ctx.shadowBlur = 0;
      
      ctx.globalAlpha = 1;
    });

    animationRef.current = requestAnimationFrame(render);
  }, [trackData, drivers, events, isPlaying, playbackSpeed, selectedDriver, selectedEvent, 
      getViewBounds, gpsToCanvas, getTrackPosition, onTimeUpdate, onEventTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };
    
    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(render);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [render]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const progress = timeRef.current / RACE_DURATION;

    // Check drivers
    for (let idx = 0; idx < drivers.length; idx++) {
      const speedFactor = 1 - (idx * 0.003);
      const driverProgress = (progress * speedFactor * 5) % 1;
      const pos = getTrackPosition(driverProgress);
      if (Math.hypot(x - pos.x, y - pos.y) < 18) {
        onDriverClick(drivers[idx]);
        return;
      }
    }

    // Check events
    for (let idx = 0; idx < Math.min(events.length, 50); idx++) {
      const event = events[idx];
      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || idx;
      const eventProgress = (sectorNum % 50) / 50;
      const pos = getTrackPosition(eventProgress);
      if (Math.hypot(x - pos.x, y - pos.y) < 18) {
        onEventClick(event);
        return;
      }
    }
  }, [drivers, events, getTrackPosition, onDriverClick, onEventClick]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="fixed inset-0 cursor-pointer"
      style={{ zIndex: 0 }}
    />
  );
}

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
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#71717a', '#64748b', '#475569'
];

// Smooth curve through points using Catmull-Rom spline
function catmullRomSpline(points: {x: number, y: number}[], tension = 0.5): string {
  if (points.length < 2) return '';
  
  const result: string[] = [];
  result.push(`M ${points[0].x} ${points[0].y}`);
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? points.length - 1 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? (i + 2) % points.length : i + 2];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
    
    result.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  
  return result.join(' ');
}

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
  onEventTrigger
}: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const triggeredEventsRef = useRef<Set<string>>(new Set());
  const trackPathRef = useRef<Path2D | null>(null);
  const scaledPointsRef = useRef<{x: number, y: number}[]>([]);
  
  const RACE_DURATION = 45 * 60 * 1000;
  const TOTAL_LAPS = 15;

  // Calculate view bounds based on panels
  const getViewBounds = useCallback((width: number, height: number) => {
    const leftOffset = leftPanelOpen ? 320 : 0;
    const rightOffset = rightPanelOpen ? 380 : 0;
    return {
      left: leftOffset,
      right: width - rightOffset,
      width: width - leftOffset - rightOffset,
      height: height
    };
  }, [leftPanelOpen, rightPanelOpen]);

  // Convert GPS to canvas coordinates with smooth scaling
  const gpsToCanvas = useCallback((long: number, lat: number, viewBounds: ReturnType<typeof getViewBounds>) => {
    const { bounds } = trackData;
    const padding = 80;
    
    const rangeX = bounds.long_max - bounds.long_min;
    const rangeY = bounds.lat_max - bounds.lat_min;
    
    const availWidth = viewBounds.width - 2 * padding;
    const availHeight = viewBounds.height - 2 * padding;
    
    const scaleX = availWidth / rangeX;
    const scaleY = availHeight / rangeY;
    const scale = Math.min(scaleX, scaleY);
    
    const centerX = viewBounds.left + viewBounds.width / 2;
    const centerY = viewBounds.height / 2;
    
    const x = centerX + (long - (bounds.long_min + rangeX / 2)) * scale;
    const y = centerY - (lat - (bounds.lat_min + rangeY / 2)) * scale;
    
    return { x, y };
  }, [trackData]);

  // Build smooth track path
  const buildTrackPath = useCallback((ctx: CanvasRenderingContext2D, viewBounds: ReturnType<typeof getViewBounds>) => {
    const points = trackData.path.map(p => gpsToCanvas(p[0], p[1], viewBounds));
    scaledPointsRef.current = points;
    
    // Sample every nth point for smoother rendering
    const sampledPoints = points.filter((_, i) => i % 3 === 0 || i === points.length - 1);
    
    const pathString = catmullRomSpline(sampledPoints, 1);
    trackPathRef.current = new Path2D(pathString + ' Z');
    
    return trackPathRef.current;
  }, [trackData, gpsToCanvas]);

  // Get position along track
  const getTrackPosition = useCallback((progress: number) => {
    const points = scaledPointsRef.current;
    if (points.length === 0) return { x: 0, y: 0 };
    
    const totalLen = points.length;
    const idx = Math.floor((progress % 1) * totalLen);
    const nextIdx = (idx + 1) % totalLen;
    const t = (progress * totalLen) % 1;
    
    const p1 = points[idx];
    const p2 = points[nextIdx];
    
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }, []);

  // Main render loop
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

    const width = canvas.width;
    const height = canvas.height;
    const viewBounds = getViewBounds(width, height);

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Grid pattern
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    ctx.beginPath();
    for (let x = viewBounds.left; x < viewBounds.right; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(viewBounds.left, y);
      ctx.lineTo(viewBounds.right, y);
    }
    ctx.stroke();

    // Build/update track path
    const trackPath = buildTrackPath(ctx, viewBounds);

    // Track glow
    ctx.save();
    ctx.shadowColor = '#D71921';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(215, 25, 33, 0.4)';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(trackPath);
    ctx.restore();

    // Track surface
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(trackPath);

    // Track edge
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 24;
    ctx.stroke(trackPath);
    
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 20;
    ctx.stroke(trackPath);

    // Center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.stroke(trackPath);
    ctx.setLineDash([]);

    // Events
    const activeEventIds = new Set<string>();
    events.slice(0, 40).forEach((event, idx) => {
      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || idx;
      const eventProgress = (sectorNum % 50) / 50;
      const pos = getTrackPosition(eventProgress);
      
      const isActive = Math.abs(event.timeMs - currentTime) < 2000;
      const isSelected = selectedEvent?.Critical_Event_ID === event.Critical_Event_ID;

      if (isPlaying && isActive && !triggeredEventsRef.current.has(event.Critical_Event_ID)) {
        triggeredEventsRef.current.add(event.Critical_Event_ID);
        onEventTrigger(event);
      }

      if (isActive) activeEventIds.add(event.Critical_Event_ID);

      // Event marker
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 10 : isActive ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#fff' : isActive ? '#ef4444' : 'rgba(239, 68, 68, 0.6)';
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      if (isActive) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 15 + Math.sin(now / 150) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2;
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
      const alpha = selectedDriver && !isSelected ? 0.35 : 1;

      ctx.globalAlpha = alpha;

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Driver circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 12 : 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Position number
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), pos.x, pos.y);

      // Driver label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Inter, system-ui, sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      const driverNum = driverId.split('-').pop() || '?';
      ctx.fillText(`#${driverNum}`, pos.x, pos.y - 18);
      ctx.shadowBlur = 0;

      ctx.globalAlpha = 1;
    });

    animationRef.current = requestAnimationFrame(render);
  }, [trackData, drivers, events, isPlaying, playbackSpeed, selectedDriver, selectedEvent, 
      getViewBounds, gpsToCanvas, buildTrackPath, getTrackPosition, onTimeUpdate, onEventTrigger]);

  // Start animation
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

  // Handle clicks
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
      
      if (Math.hypot(x - pos.x, y - pos.y) < 15) {
        onDriverClick(drivers[idx]);
        return;
      }
    }

    // Check events
    for (let idx = 0; idx < Math.min(events.length, 40); idx++) {
      const event = events[idx];
      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || idx;
      const eventProgress = (sectorNum % 50) / 50;
      const pos = getTrackPosition(eventProgress);
      
      if (Math.hypot(x - pos.x, y - pos.y) < 15) {
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

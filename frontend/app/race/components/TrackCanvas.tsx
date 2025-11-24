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
  const scaledPointsRef = useRef<{x: number, y: number}[]>([]);
  
  const RACE_DURATION = 45 * 60 * 1000;
  const TOTAL_LAPS = 15;

  const getViewBounds = useCallback((width: number, height: number) => {
    const leftOffset = leftPanelOpen ? 340 : 0;
    const rightOffset = rightPanelOpen ? 360 : 0;
    return { left: leftOffset, right: width - rightOffset, width: width - leftOffset - rightOffset, height };
  }, [leftPanelOpen, rightPanelOpen]);

  const gpsToCanvas = useCallback((long: number, lat: number, viewBounds: ReturnType<typeof getViewBounds>) => {
    const { bounds } = trackData;
    const padding = 100;
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

    const width = canvas.width;
    const height = canvas.height;
    const viewBounds = getViewBounds(width, height);

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1;
    for (let x = viewBounds.left; x < viewBounds.right; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(viewBounds.left, y);
      ctx.lineTo(viewBounds.right, y);
      ctx.stroke();
    }

    // Build track points
    scaledPointsRef.current = trackData.path.map(p => gpsToCanvas(p[0], p[1], viewBounds));
    const points = scaledPointsRef.current;

    // Draw paddock
    if (trackData.paddock && trackData.paddock.length >= 4) {
      const paddockPoints = trackData.paddock.map((p: number[]) => gpsToCanvas(p[0], p[1], viewBounds));
      ctx.fillStyle = '#1a1a2e';
      ctx.strokeStyle = '#2d2d4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(paddockPoints[0].x, paddockPoints[0].y);
      paddockPoints.forEach((p: {x: number, y: number}) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Paddock label
      const cx = paddockPoints.reduce((sum: number, p: {x: number}) => sum + p.x, 0) / paddockPoints.length;
      const cy = paddockPoints.reduce((sum: number, p: {y: number}) => sum + p.y, 0) / paddockPoints.length;
      ctx.fillStyle = '#555';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PADDOCK', cx, cy);
    }

    // Draw pit lane
    if (trackData.pitLane && trackData.pitLane.length >= 2) {
      const pitStart = gpsToCanvas(trackData.pitLane[0][0], trackData.pitLane[0][1], viewBounds);
      const pitEnd = gpsToCanvas(trackData.pitLane[1][0], trackData.pitLane[1][1], viewBounds);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(pitStart.x, pitStart.y);
      ctx.lineTo(pitEnd.x, pitEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Track glow
    ctx.save();
    ctx.shadowColor = '#D71921';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = 'rgba(215, 25, 33, 0.35)';
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Track surface
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();

    // Track edge
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 26;
    ctx.stroke();
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 22;
    ctx.stroke();

    // Center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Start line
    if (trackData.startLine) {
      const startPos = gpsToCanvas(trackData.startLine[0], trackData.startLine[1], viewBounds);
      ctx.fillStyle = '#fff';
      ctx.fillRect(startPos.x - 15, startPos.y - 3, 30, 6);
      ctx.fillStyle = '#000';
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) ctx.fillRect(startPos.x - 15 + i * 6, startPos.y - 3, 6, 3);
        else ctx.fillRect(startPos.x - 15 + i * 6, startPos.y, 6, 3);
      }
    }

    // Events
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

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 10 : isActive ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#fff' : isActive ? '#ef4444' : 'rgba(239, 68, 68, 0.5)';
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (isActive) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 16 + Math.sin(now / 150) * 3, 0, Math.PI * 2);
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
      ctx.globalAlpha = selectedDriver && !isSelected ? 0.35 : 1;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 12 : 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), pos.x, pos.y);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`#${driverId.split('-').pop()}`, pos.x, pos.y - 18);
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

    for (let idx = 0; idx < drivers.length; idx++) {
      const speedFactor = 1 - (idx * 0.003);
      const driverProgress = (progress * speedFactor * 5) % 1;
      const pos = getTrackPosition(driverProgress);
      if (Math.hypot(x - pos.x, y - pos.y) < 15) {
        onDriverClick(drivers[idx]);
        return;
      }
    }

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

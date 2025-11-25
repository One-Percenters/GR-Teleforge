'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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
  const scaledPointsRef = useRef<{ x: number, y: number }[]>([]);
  const lastLeaderRef = useRef<string | null>(null);
  const leaderChangeEventsRef = useRef<Map<string, ProcessedEvent>>(new Map());

  // Camera State
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState(0); // Degrees
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

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
    lastLeaderRef.current = null;
    leaderChangeEventsRef.current.clear();
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setTilt(0);
    // Debug: Log track data
    if (trackData) {
      console.log('Track loaded:', {
        name: trackData.path?.length ? 'Valid' : 'Invalid',
        pathLength: trackData.path?.length || 0,
        hasStartLine: !!trackData.startLine
      });
    }
  }, [trackData]);

  const getViewBounds = useCallback((width: number, height: number) => {
    const leftOffset = leftPanelOpen ? 340 : 0;
    const rightOffset = rightPanelOpen ? 360 : 0;
    return { left: leftOffset, right: width - rightOffset, width: width - leftOffset - rightOffset, height };
  }, [leftPanelOpen, rightPanelOpen]);

  // Transform logic
  const transformPoint = useCallback((x: number, y: number, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Apply Offset
    let tx = x + offset.x;
    let ty = y + offset.y;

    // Apply Zoom relative to center
    tx = centerX + (tx - centerX) * zoom;
    ty = centerY + (ty - centerY) * zoom;

    // Apply Tilt (simple perspective simulation)
    // We compress Y axis based on tilt angle
    const tiltFactor = Math.cos(tilt * Math.PI / 180);
    ty = centerY + (ty - centerY) * tiltFactor;

    return { x: tx, y: ty };
  }, [zoom, offset, tilt]);

  const gpsToCanvas = useCallback((normX: number, normY: number, viewBounds: ReturnType<typeof getViewBounds>) => {
    const padding = 60;
    const availWidth = viewBounds.width - 2 * padding;
    const availHeight = viewBounds.height - 2 * padding;

    // Base position in the view area
    const baseX = viewBounds.left + padding + normX * availWidth;
    const baseY = padding + normY * availHeight;

    return { x: baseX, y: baseY };
  }, []);

  const getTrackPosition = useCallback((progress: number) => {
    const points = scaledPointsRef.current;
    if (points.length === 0) return { x: 0, y: 0 };
    // Use modulo to wrap around
    const wrappedProgress = ((progress % 1) + 1) % 1;
    const exactIdx = wrappedProgress * points.length;
    const idx = Math.floor(exactIdx);
    const nextIdx = (idx + 1) % points.length;
    const t = exactIdx - idx;
    
    // Linear interpolation for smoother movement
    const p1 = points[idx] || points[0];
    const p2 = points[nextIdx] || points[0];
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
    if (!ctx) return;

    const now = performance.now();
    const delta = lastFrameRef.current ? now - lastFrameRef.current : 16.67;
    lastFrameRef.current = now;
    
    // Cap delta to prevent large jumps
    const cappedDelta = Math.min(delta, 100);

    if (isPlaying) {
      timeRef.current += cappedDelta * playbackSpeed;
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
    } else if (currentTime === 0) {
      // Force update on reset
      onTimeUpdate(0, 1);
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const viewBounds = getViewBounds(width, height);

    // Clear
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    // Grid pattern (optimized - only draw visible grid lines)
    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    const startX = Math.floor(0 / gridSpacing) * gridSpacing;
    const startY = Math.floor(0 / gridSpacing) * gridSpacing;
    ctx.beginPath();
    for (let x = startX; x < width; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();

    // Calculate base points first
    const basePoints = trackData.path.map(p => gpsToCanvas(p[0], p[1], viewBounds));

    // Apply Camera Transform
    scaledPointsRef.current = basePoints.map(p => transformPoint(p.x, p.y, width, height));
    const points = scaledPointsRef.current;

    if (points.length < 2) {
      // Draw error message if track path is invalid
      ctx.fillStyle = '#fff';
      ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Track path invalid or loading...', width / 2, height / 2);
      animationRef.current = requestAnimationFrame(render);
      return;
    }

    // Track glow
    ctx.save();
    ctx.shadowColor = '#D71921';
    ctx.shadowBlur = 30 * zoom;
    ctx.strokeStyle = 'rgba(215, 25, 33, 0.25)';
    ctx.lineWidth = 35 * zoom;
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
    ctx.lineWidth = 28 * zoom;
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
    ctx.lineWidth = 22 * zoom;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Center dashed line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * zoom;
    ctx.setLineDash([10 * zoom, 10 * zoom]);
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
      const startBase = gpsToCanvas(trackData.startLine[0], trackData.startLine[1], viewBounds);
      const startPos = transformPoint(startBase.x, startBase.y, width, height);

      ctx.save();
      ctx.translate(startPos.x, startPos.y);
      // Rotate to match track direction roughly? For now just draw a box
      ctx.fillStyle = '#fff';
      const size = 18 * zoom;
      ctx.fillRect(-size, -4 * zoom, size * 2, 8 * zoom);
      ctx.fillStyle = '#000';
      const checkerSize = 4 * zoom;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 9; col++) {
          if ((row + col) % 2 === 0) {
            ctx.fillRect(-size + col * checkerSize, -4 * zoom + row * checkerSize, checkerSize, checkerSize);
          }
        }
      }
      ctx.restore();
    }

    // Calculate driver positions - smooth continuous movement from start line
    const driverPositions = drivers.map((driverId, idx) => {
      let driverProgress = 0; // All drivers start at start line (progress 0)
      
      // Only calculate position if time has progressed
      if (currentTime > 0) {
        // Base position calculation: continuous movement from start
        // Each driver has slightly different speed to show realistic spread
        const speedFactor = 1 - (idx * 0.0015); // Smaller spread for smoother movement
        const baseProgress = (currentTime / RACE_DURATION) * speedFactor * TOTAL_LAPS;
        
        // Find the most recent event involving this driver to adjust position
        const driverEvents = [...events, ...Array.from(leaderChangeEventsRef.current.values())]
          .filter(e => e.Winner_ID === driverId || e.Loser_ID === driverId)
          .filter(e => e.timeMs <= currentTime && e.timeMs > 0)
          .sort((a, b) => b.timeMs - a.timeMs); // Most recent first
        
        if (driverEvents.length > 0) {
          // Use the position from the most recent event as a reference point
          const latestEvent = driverEvents[0];
          const eventProgress = latestEvent.pathProgress !== undefined 
            ? latestEvent.pathProgress 
            : (parseInt(latestEvent.Sector_ID.replace('S_', ''), 10) % 50) / 50;
          
          // Calculate time-based progress from the event
          const timeSinceEvent = Math.max(0, currentTime - latestEvent.timeMs);
          const trackLength = 1.0;
          const avgLapTime = RACE_DURATION / TOTAL_LAPS;
          const progressPerMs = trackLength / avgLapTime;
          const eventBasedProgress = eventProgress + timeSinceEvent * progressPerMs;
          
          // Blend between base progress and event-based progress for smoothness
          // Use event-based progress if it's close to base, otherwise use base
          const progressDiff = Math.abs(eventBasedProgress - baseProgress);
          if (progressDiff < 0.2) {
            // Event is close to expected position, use it
            driverProgress = eventBasedProgress % 1;
          } else {
            // Use base progress for smooth continuous movement
            driverProgress = baseProgress % 1;
          }
        } else {
          // No events yet, use smooth time-based progress
          driverProgress = baseProgress % 1;
        }
      }
      // If currentTime is 0, driverProgress remains 0 (start line)
      
      return { driverId, progress: driverProgress, index: idx };
    });

    // Sort by progress to find leader (highest progress = leader)
    const sortedDrivers = [...driverPositions].sort((a, b) => b.progress - a.progress);
    const currentLeader = sortedDrivers[0]?.driverId || null;

    // Check for leader change and create event
    if (isPlaying && currentTime > 1000 && currentLeader && currentLeader !== lastLeaderRef.current && lastLeaderRef.current) {
      const oldLeaderIdx = drivers.indexOf(lastLeaderRef.current);
      const newLeaderIdx = drivers.indexOf(currentLeader);
      
      if (oldLeaderIdx >= 0 && newLeaderIdx >= 0) {
        const leaderChangeEvent: ProcessedEvent = {
          Critical_Event_ID: `leader_change_${currentTime}`,
          Timestamp: new Date(Date.now()).toISOString(),
          Winner_ID: currentLeader,
          Loser_ID: lastLeaderRef.current,
          Sector_ID: `S_${Math.floor((currentTime / RACE_DURATION) * 50)}`,
          Lap_Number: currentLap,
          Reason_Code: 'Leader_Change',
          Reason_Value: 0,
          timeMs: currentTime,
          pathProgress: sortedDrivers[0].progress
        };
        
        leaderChangeEventsRef.current.set(leaderChangeEvent.Critical_Event_ID, leaderChangeEvent);
        onEventTrigger(leaderChangeEvent);
      }
    }
    
    if (currentLeader) {
      lastLeaderRef.current = currentLeader;
    }

    // Render drivers
    driverPositions.forEach(({ driverId, progress: driverProgress, index: idx }) => {
      const pos = getTrackPosition(driverProgress);
      if (!pos || (pos.x === 0 && pos.y === 0 && scaledPointsRef.current.length > 0)) {
        return;
      }
      
      const color = COLORS[idx % COLORS.length];
      const isSelected = selectedDriver === driverId;
      const isLeader = driverId === currentLeader;

      ctx.globalAlpha = selectedDriver && !isSelected ? 0.3 : 1;

      // Leader indicator (gold/yellow ring)
      if (isLeader) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 24 * zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3 * zoom;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10 * zoom;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20 * zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * zoom;
        ctx.stroke();
      }

      // Driver circle
      ctx.beginPath();
      const driverSize = (isSelected ? 14 : isLeader ? 13 : 12) * zoom;
      ctx.arc(pos.x, pos.y, driverSize, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();

      // Position number
      ctx.fillStyle = '#000';
      ctx.font = `bold ${10 * zoom}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), pos.x, pos.y);

      // Driver number label
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${9 * zoom}px Inter, system-ui, sans-serif`;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`#${driverId.split('-').pop()}`, pos.x, pos.y - 20 * zoom);
      ctx.shadowBlur = 0;

      ctx.globalAlpha = 1;
    });

    // Render events AFTER drivers so they appear on top
    const allEvents = [...events, ...Array.from(leaderChangeEventsRef.current.values())];
    
    allEvents.slice(0, 50).forEach((event, idx) => {
      const isLeaderChange = event.Critical_Event_ID?.startsWith('leader_change');
      const timeWindow = isLeaderChange ? 10000 : 5000;
      const timeDiff = Math.abs(event.timeMs - currentTime);
      const isActive = timeDiff < timeWindow;
      const isSelected = selectedEvent?.Critical_Event_ID === event.Critical_Event_ID;

      if (!isActive && !isSelected) return;

      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || idx;
      const eventProgress = event.pathProgress !== undefined ? event.pathProgress : (sectorNum % 50) / 50;
      const pos = getTrackPosition(eventProgress);

      if (isPlaying && isActive && !triggeredEventsRef.current.has(event.Critical_Event_ID)) {
        triggeredEventsRef.current.add(event.Critical_Event_ID);
        onEventTrigger(event);
      }

      const eventColor = isLeaderChange ? '#fbbf24' : '#ef4444';
      const pulseBase = isLeaderChange ? 25 : 20;
      const pulseVariation = isLeaderChange ? 8 : 5;

      // Pulsing ring for active events
      if (isActive) {
        const pulseSize = (pulseBase + Math.sin(now / (isLeaderChange ? 100 : 150)) * pulseVariation) * zoom;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${isLeaderChange ? '251, 191, 36' : '239, 68, 68'}, ${0.6 - (timeDiff / timeWindow) * 0.4})`;
        ctx.lineWidth = 3 * zoom;
        if (isLeaderChange) {
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10 * zoom;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Event marker
      ctx.beginPath();
      const markerSize = (isSelected ? 12 : isActive ? 8 : 6) * zoom;
      ctx.arc(pos.x, pos.y, markerSize, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#fff' : isActive ? eventColor : `rgba(${isLeaderChange ? '251, 191, 36' : '239, 68, 68'}, 0.4)`;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = eventColor;
        ctx.lineWidth = 3 * zoom;
        ctx.stroke();
      }

      // Leader change label
      if (isLeaderChange && (isActive || isSelected)) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${9 * zoom}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('LEADER', pos.x, pos.y - 25 * zoom);
        ctx.shadowBlur = 0;
      }
    });

    animationRef.current = requestAnimationFrame(render);
  }, [trackData, drivers, events, isPlaying, playbackSpeed, selectedDriver, selectedEvent,
    getViewBounds, gpsToCanvas, getTrackPosition, onTimeUpdate, onEventTrigger, zoom, offset, tilt]);

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

  // Mouse Handlers for Zoom/Pan/Tilt
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey) {
      // Zoom
      const delta = -e.deltaY * 0.001;
      setZoom(z => Math.min(Math.max(0.5, z + delta), 5));
    } else if (e.shiftKey) {
      // Tilt
      const delta = e.deltaY * 0.1;
      setTilt(t => Math.min(Math.max(0, t + delta), 60));
    } else {
      // Pan
      setOffset(o => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey || e.button === 2) {
      // Tilt with shift drag or right click drag
      setTilt(t => Math.min(Math.max(0, t + dy * 0.5), 60));
    } else {
      // Pan
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) return; // Don't click if dragging

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const progress = timeRef.current / RACE_DURATION;

    // Check drivers
    for (let idx = 0; idx < drivers.length; idx++) {
      let driverProgress = 0;
      if (timeRef.current > 0) {
        const speedFactor = 1 - (idx * 0.003);
        driverProgress = (progress * speedFactor * 5) % 1;
      }
      const pos = getTrackPosition(driverProgress);
      if (Math.hypot(x - pos.x, y - pos.y) < 18 * zoom) {
        onDriverClick(drivers[idx]);
        return;
      }
    }

    // Check events
    for (let idx = 0; idx < Math.min(events.length, 50); idx++) {
      const event = events[idx];
      const timeDiff = Math.abs(event.timeMs - timeRef.current);
      if (timeDiff > 5000 && selectedEvent?.Critical_Event_ID !== event.Critical_Event_ID) continue;

      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || idx;
      const eventProgress = (sectorNum % 50) / 50;
      const pos = getTrackPosition(eventProgress);
      if (Math.hypot(x - pos.x, y - pos.y) < 18 * zoom) {
        onEventClick(event);
        return;
      }
    }

    // Check leader change events
    leaderChangeEventsRef.current.forEach((event) => {
      const timeDiff = Math.abs(event.timeMs - timeRef.current);
      if (timeDiff > 10000 && selectedEvent?.Critical_Event_ID !== event.Critical_Event_ID) return;
      
      const pos = getTrackPosition(event.pathProgress || 0);
      if (Math.hypot(x - pos.x, y - pos.y) < 20 * zoom) {
        onEventClick(event);
        return;
      }
    });
  }, [drivers, events, getTrackPosition, onDriverClick, onEventClick, zoom, selectedEvent]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="fixed inset-0 cursor-move"
      style={{ zIndex: 0 }}
    />
  );
}

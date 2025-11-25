'use client';

import { useMemo, useEffect, useRef } from 'react';
import type { TrackData, ProcessedEvent } from '../types';

interface RoadViewProps {
  trackData: TrackData;
  drivers: string[];
  currentTime: number;
  raceDuration: number;
  activeEvents: ProcessedEvent[];
  selectedDriver: string | null;
  getDriverColor: (driverId: string) => string;
}

export function RoadView({
  trackData,
  drivers,
  currentTime,
  raceDuration,
  activeEvents,
  selectedDriver,
  getDriverColor
}: RoadViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Calculate driver positions
  const driverPositions = useMemo(() => {
    const progress = raceDuration > 0 ? currentTime / raceDuration : 0;
    
    return drivers.map((driverId, index) => {
      const speedMod = 1 - (index * 0.005);
      const baseProgress = (progress * speedMod * 3) % 1; // 3 laps worth of movement
      
      // Add oscillation for realistic racing
      const oscillation = Math.sin(currentTime / 2000 + index * 0.5) * 0.02;
      const laneOffset = (index % 3 - 1) * 0.15; // -0.15, 0, 0.15 for 3 lanes
      
      return {
        driverId,
        progress: baseProgress,
        lane: laneOffset + oscillation,
        isInEvent: activeEvents.some(e => e.Winner_ID === driverId || e.Loser_ID === driverId)
      };
    });
  }, [drivers, currentTime, raceDuration, activeEvents]);

  // Draw road view
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    // Draw perspective road
    const horizonY = height * 0.35;
    const roadTopWidth = width * 0.15;
    const roadBottomWidth = width * 0.8;
    
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#0a0a0a');
    skyGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    // Ground
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Road
    ctx.beginPath();
    ctx.moveTo(width / 2 - roadTopWidth / 2, horizonY);
    ctx.lineTo(width / 2 + roadTopWidth / 2, horizonY);
    ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
    ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
    ctx.closePath();
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // Road edges (kerbs)
    ctx.strokeStyle = '#D71921';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2 - roadTopWidth / 2, horizonY);
    ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width / 2 + roadTopWidth / 2, horizonY);
    ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
    ctx.stroke();

    // Center line (dashed)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 30]);
    ctx.beginPath();
    ctx.moveTo(width / 2, horizonY);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw lane markers
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const y = horizonY + (height - horizonY) * t;
      const roadWidth = roadTopWidth + (roadBottomWidth - roadTopWidth) * t;
      
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2 - roadWidth / 2, y);
      ctx.lineTo(width / 2 + roadWidth / 2, y);
      ctx.stroke();
    }

    // Sort drivers by progress (furthest first for depth)
    const sortedDrivers = [...driverPositions].sort((a, b) => a.progress - b.progress);

    // Draw cars
    sortedDrivers.forEach((driver, _) => {
      const t = driver.progress; // 0 = horizon, 1 = bottom
      const y = horizonY + (height - horizonY) * t;
      const roadWidth = roadTopWidth + (roadBottomWidth - roadTopWidth) * t;
      const x = width / 2 + driver.lane * roadWidth;
      
      // Car size based on perspective
      const carWidth = 20 + t * 40;
      const carHeight = 10 + t * 20;
      
      const color = getDriverColor(driver.driverId);
      const isSelected = selectedDriver === driver.driverId;
      const driverIdx = drivers.indexOf(driver.driverId);

      // Car shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - carWidth/2 + 3, y - carHeight/2 + 3, carWidth, carHeight);

      // Car body
      ctx.fillStyle = color;
      ctx.fillRect(x - carWidth/2, y - carHeight/2, carWidth, carHeight);

      // Car highlight if in event
      if (driver.isInEvent) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - carWidth/2 - 2, y - carHeight/2 - 2, carWidth + 4, carHeight + 4);
      }

      // Selected highlight
      if (isSelected) {
        ctx.strokeStyle = '#D71921';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - carWidth/2 - 4, y - carHeight/2 - 4, carWidth + 8, carHeight + 8);
      }

      // Position number
      if (t > 0.3) { // Only show for cars close enough
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(8 + t * 10)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`P${driverIdx + 1}`, x, y - carHeight/2 - 5);
      }
    });

    // Draw speed lines effect
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const startX = Math.random() * width;
      const startY = horizonY + Math.random() * (height - horizonY) * 0.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + (startX - width/2) * 0.5, startY + 50);
      ctx.stroke();
    }

  }, [driverPositions, selectedDriver, getDriverColor, drivers]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={500}
      className="w-full h-full rounded-lg"
      style={{ maxHeight: '60vh' }}
    />
  );
}


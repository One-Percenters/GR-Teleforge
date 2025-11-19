'use client';

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DashboardHeader,
  type DashboardHeaderProps,
} from "./Header";
import {
  RaceInfoPanel,
  type RaceInfoPanelProps,
} from "./RaceInfo";
import {
  TrackMap,
  type TrackMapProps,
  type TrackCarMarker,
} from "./TrackMap";
import {
  TelemetryPanel,
  type TelemetryPanelProps,
} from "./Telemetry";
import {
  LapProgressStrip,
  type LapProgressProps,
} from "./LapProgress";
import {
  PlaybackControls,
  type PlaybackControlsProps,
} from "./PlaybackControls";
import {
  getMockRaceTimeline,
  type RaceFrame,
  type RaceTimeline,
  type DriverState,
} from "./raceData";

type DashboardData = {
  header: DashboardHeaderProps;
  raceInfo: RaceInfoPanelProps;
  trackMap: TrackMapProps;
  telemetry: TelemetryPanelProps;
  lapProgress: LapProgressProps;
  playback: Omit<PlaybackControlsProps, "onPlayPause" | "onStepBack" | "onStepForward" | "onScrub">;
};

const DEFAULT_FOCUSED_CAR = 7;

export function DashboardPlaybackContainer() {
  const timeline: RaceTimeline = useMemo(() => getMockRaceTimeline(), []);
  
  // We assume the timeline is sorted by timestamp
  const totalDurationMs = timeline.length > 0 ? timeline[timeline.length - 1].timestampMs : 0;

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedCarNumber, setFocusedCarNumber] = useState(DEFAULT_FOCUSED_CAR);
  
  // Ref to track the last animation frame time
  const lastFrameTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  const animate = (time: number) => {
    if (lastFrameTimeRef.current !== null) {
      const deltaTime = time - lastFrameTimeRef.current;
      
      setCurrentTimeMs((prev) => {
        const nextTime = prev + deltaTime;
        if (nextTime >= totalDurationMs) {
          setIsPlaying(false);
          return totalDurationMs;
        }
        return nextTime;
      });
    }
    lastFrameTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      lastFrameTimeRef.current = null;
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, totalDurationMs]);

  // Interpolate state based on currentTimeMs
  const currentFrame = useMemo(() => {
    if (timeline.length === 0) return undefined;
    
    // Find the frame indices surrounding the current time
    let nextIndex = timeline.findIndex(f => f.timestampMs > currentTimeMs);
    
    if (nextIndex === -1) {
      // We are past the end, show last frame
      return timeline[timeline.length - 1];
    }
    
    if (nextIndex === 0) {
      return timeline[0];
    }
    
    const prevFrame = timeline[nextIndex - 1];
    const nextFrame = timeline[nextIndex];
    
    const range = nextFrame.timestampMs - prevFrame.timestampMs;
    const progress = (currentTimeMs - prevFrame.timestampMs) / range;
    
    return interpolateFrames(prevFrame, nextFrame, progress);
  }, [timeline, currentTimeMs]);

  const progressRatio = totalDurationMs > 0 ? currentTimeMs / totalDurationMs : 0;

  const dashboardData: DashboardData | undefined = currentFrame
    ? mapFrameToDashboardData(currentFrame, focusedCarNumber, isPlaying, progressRatio)
    : undefined;

  const handlePlayPause = () => {
    if (!totalDurationMs) return;
    // Restart from the beginning if we're at the end.
    if (!isPlaying && currentTimeMs >= totalDurationMs) {
      setCurrentTimeMs(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentTimeMs((prev) => Math.max(0, prev - 1000)); // Step back 1s
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentTimeMs((prev) => Math.min(totalDurationMs, prev + 1000)); // Step forward 1s
  };

  const handleScrub = (ratio: number) => {
    if (!totalDurationMs) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    const time = clamped * totalDurationMs;
    setIsPlaying(false);
    setCurrentTimeMs(time);
  };

  if (!dashboardData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Loading race simulation…
      </div>
    );
  }

  const { header, raceInfo, trackMap, telemetry, lapProgress, playback } =
    dashboardData;

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <DashboardHeader {...header} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-6">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <div className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">
            {/* Removed hardcoded title */}
          </div>
          <div className="text-xs font-mono text-zinc-500">
            {/* Removed hardcoded slogan */}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <RaceInfoPanel 
              {...raceInfo} 
              onDriverSelect={(carNumber) => setFocusedCarNumber(carNumber)}
            />
          </div>

          <div className="lg:col-span-6">
            <TrackMap {...trackMap} />
          </div>

          <div className="lg:col-span-3">
            <TelemetryPanel {...telemetry} />
          </div>
        </div>
      </main>

      <LapProgressStrip {...lapProgress} onScrub={handleScrub} />
      <PlaybackControls
        {...playback}
        onPlayPause={handlePlayPause}
        onStepBack={handleStepBack}
        onStepForward={handleStepForward}
      />
    </div>
  );
}

function interpolateFrames(prev: RaceFrame, next: RaceFrame, t: number): RaceFrame {
  // t is 0..1
  
  // Interpolate drivers
  const drivers = prev.drivers.map(prevDriver => {
    const nextDriver = next.drivers.find(d => d.carNumber === prevDriver.carNumber);
    if (!nextDriver) return prevDriver;
    
    return {
      ...prevDriver,
      trackProgress: lerp(prevDriver.trackProgress, nextDriver.trackProgress, t),
      speedMph: lerp(prevDriver.speedMph, nextDriver.speedMph, t),
      throttlePercent: lerp(prevDriver.throttlePercent, nextDriver.throttlePercent, t),
      brakePercent: lerp(prevDriver.brakePercent, nextDriver.brakePercent, t),
      steeringAngleDeg: lerp(prevDriver.steeringAngleDeg, nextDriver.steeringAngleDeg, t),
      rpm: lerp(prevDriver.rpm, nextDriver.rpm, t),
      // Discrete values flip at 0.5
      gear: t < 0.5 ? prevDriver.gear : nextDriver.gear,
      position: t < 0.5 ? prevDriver.position : nextDriver.position,
      gapToLeaderSeconds: lerp(prevDriver.gapToLeaderSeconds, nextDriver.gapToLeaderSeconds, t),
    };
  });

  return {
    ...prev,
    timestampMs: lerp(prev.timestampMs, next.timestampMs, t),
    raceProgress: lerp(prev.raceProgress, next.raceProgress, t),
    // Discrete values
    status: t < 0.5 ? prev.status : next.status,
    lap: t < 0.5 ? prev.lap : next.lap,
    totalLaps: prev.totalLaps,
    drivers,
  };
}

function lerp(start: number, end: number, t: number) {
  // Handle wrap-around for track progress if needed, but our data is 0-1
  // If one is 0.99 and other is 0.01, we should interpolate across the boundary.
  // But for simplicity let's assume linear for now unless we see jumping.
  // Actually, trackProgress wraps 0->1.
  if (Math.abs(end - start) > 0.5) {
    // Wrapping case
    if (start > end) {
      // e.g. 0.9 -> 0.1. Treat 0.1 as 1.1
      return (start + (end + 1 - start) * t) % 1;
    } else {
      // e.g. 0.1 -> 0.9. Treat 0.9 as -0.1? No, usually forward.
      // This case implies going backwards? Or just a big jump.
      // Let's just do simple lerp for now, the points are close enough (10fps)
      // that wrapping shouldn't happen often unless we have very low fps.
      // With 10fps, max delta is small.
    }
  }
  return start + (end - start) * t;
}

function mapFrameToDashboardData(
  frame: RaceFrame,
  focusedCarNumber: number,
  isPlaying: boolean,
  overallProgressRatio: number,
): DashboardData {
  const sortedDrivers = [...frame.drivers].sort(
    (a, b) => a.position - b.position,
  );
  const leader = sortedDrivers[0];
  const focused =
    sortedDrivers.find((d) => d.carNumber === focusedCarNumber) ?? leader;

  const header: DashboardHeaderProps = {
    trackName: "", // Removed hardcoded track name
    races: [], // Removed hardcoded races
    activeRaceIndex: 0,
    versionLabel: "", // Removed hardcoded version
  };

  const raceInfo: RaceInfoPanelProps = {
    status: frame.status,
    lap: frame.lap,
    totalLaps: frame.totalLaps,
    leader: `#${leader.carNumber} ${getLastName(leader.driverName)}`,
    gap:
      focused.position === 1
        ? "+0.0s"
        : `+${focused.gapToLeaderSeconds.toFixed(1)}s`,
    standings: sortedDrivers.map((d) => ({
      number: d.carNumber,
      name: d.driverName,
      position: `P${d.position}`,
      highlight: d.carNumber === focused.carNumber,
    })),
  };

  const trackMap: TrackMapProps = {
    cars: sortedDrivers.map(driverToMarker),
    projectedPathClassName: undefined,
    showStartFinish: true,
    startFinishLabel: "S/F",
  };

  const telemetry: TelemetryPanelProps = {
    carNumber: focused.carNumber,
    driverName: focused.driverName,
    position: `P${focused.position}`,
    // Pass raw floats for smooth gauges, component will round for text
    speedMph: focused.speedMph,
    throttlePercent: focused.throttlePercent,
    brakePercent: focused.brakePercent,
    gear: focused.gear,
    steeringAngleDeg: focused.steeringAngleDeg,
    rpm: focused.rpm,
  };

  const lapProgress: LapProgressProps = {
    currentLap: frame.lap,
    totalLaps: frame.totalLaps,
    progressRatio: frame.raceProgress,
  };

  const playback: DashboardData["playback"] = {
    status: isPlaying ? "PLAYING" : "PAUSED",
  };

  return {
    header,
    raceInfo,
    trackMap,
    telemetry,
    lapProgress,
    playback,
  };
}

function driverToMarker(driver: DriverState): TrackCarMarker {
  // Track map is an oval, 0 is at top (start/finish)
  // Angle needs to be adjusted to match the CSS oval shape
  // 0 progress -> -PI/2 (top)
  const angle = 2 * Math.PI * driver.trackProgress - Math.PI / 2;
  
  // The track visual is an oval.
  // Width is 80% of container, Height is 64px (fixed in TrackMap.tsx)
  // Wait, looking at TrackMap.tsx:
  // <div className="relative h-64 w-[80%] max-w-xl rounded-full border-[6px] ...">
  // It's a rounded rect / stadium shape if width > height, or circle if equal.
  // Let's assume it's roughly elliptical for the marker positioning.
  
  // Container is relative. 
  // Center is 50%, 50%.
  // Radius X should be slightly less than 50% to fit on the border.
  // Radius Y should be slightly less than 50% to fit on the border.
  
  // The track map CSS uses: w-[80%] max-w-xl h-64
  // We need to approximate this aspect ratio for the markers to land ON the line.
  
  // Let's try to match the visual border.
  const radiusX = 45; // % of container width
  const radiusY = 45; // % of container height
  
  // Since the visual is a rounded rectangle (stadium) or oval depending on CSS,
  // simple ellipse math might be slightly off but much better than before.
  // If it's a true CSS border-radius: 9999px on a rectangle, it's a stadium.
  // But here it says rounded-full.
  
  const centerX = 50;
  const centerY = 50;

  const left = centerX + radiusX * Math.cos(angle);
  const top = centerY + radiusY * Math.sin(angle);

  return {
    id: String(driver.carNumber),
    label: String(driver.carNumber),
    style: {
      left: `${left}%`,
      top: `${top}%`,
      transform: "translate(-50%, -50%)",
    },
  };
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

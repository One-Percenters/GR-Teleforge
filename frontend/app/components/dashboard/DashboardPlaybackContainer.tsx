'use client';

import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardHeader, type DashboardHeaderProps } from "./Header";
import { RaceInfoPanel, type RaceInfoPanelProps } from "./RaceInfo";
import { TrackMap, type TrackMapProps, type TrackCarMarker } from "./TrackMap";
import { TelemetryPanel, type TelemetryPanelProps } from "./Telemetry";
import { LapProgressStrip, type LapProgressProps } from "./LapProgress";
import { PlaybackControls, type PlaybackControlsProps } from "./PlaybackControls";
import { DriverDNA } from "./DriverDNA";

import {
  type RaceFrame,
  type RaceTimeline,
  type DriverState,
  getMockRaceTimeline,
} from "./raceData";

type DashboardData = {
  header: DashboardHeaderProps;
  raceInfo: RaceInfoPanelProps;
  trackMap: TrackMapProps;
  telemetry: TelemetryPanelProps;
  lapProgress: LapProgressProps;
  playback: Omit<PlaybackControlsProps, 'onPlayPause' | 'onStepBack' | 'onStepForward' | 'onScrub'>;
};

const DEFAULT_FOCUSED_CAR = 7;

export function DashboardPlaybackContainer() {
  // ---------- ALL HOOKS MUST BE DECLARED FIRST (before any early returns) ----------

  // Data loading state
  const [timeline, setTimeline] = useState<RaceTimeline | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedCarNumber, setFocusedCarNumber] = useState(DEFAULT_FOCUSED_CAR);

  // Refs for animation
  const lastFrameTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  // Data fetching effect
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/race-timeline");
        if (!res.ok) throw new Error("Network error");
        const data = (await res.json()) as RaceTimeline;
        setTimeline(data);
      } catch (e) {
        console.error("Failed to load real timeline, falling back to mock:", e);
        setTimeline(getMockRaceTimeline());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute timeline duration (safe to compute even when null)
  const totalDurationMs = timeline && timeline.length > 0 ? timeline[timeline.length - 1].timestampMs : 0;

  // Animation effect
  useEffect(() => {
    if (!timeline || !isPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastFrameTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastFrameTimeRef.current !== null) {
        const deltaTime = time - lastFrameTimeRef.current;
        setCurrentTimeMs((prev) => {
          const next = prev + deltaTime;
          if (next >= totalDurationMs) {
            setIsPlaying(false);
            return totalDurationMs;
          }
          return next;
        });
      }
      lastFrameTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, totalDurationMs, timeline]);

  // Interpolation (safe even when timeline is null)
  const currentFrame = useMemo(() => {
    if (!timeline || timeline.length === 0) return undefined;
    const nextIdx = timeline.findIndex((f) => f.timestampMs > currentTimeMs);
    if (nextIdx === -1) return timeline[timeline.length - 1];
    if (nextIdx === 0) return timeline[0];
    const prev = timeline[nextIdx - 1];
    const next = timeline[nextIdx];
    const range = next.timestampMs - prev.timestampMs;
    const progress = (currentTimeMs - prev.timestampMs) / range;
    return interpolateFrames(prev, next, progress);
  }, [timeline, currentTimeMs]);

  const progressRatio = totalDurationMs > 0 ? currentTimeMs / totalDurationMs : 0;

  const dashboardData: DashboardData | undefined = currentFrame
    ? mapFrameToDashboardData(currentFrame, focusedCarNumber, isPlaying, progressRatio)
    : undefined;

  // ---------- EARLY RETURNS ONLY AFTER ALL HOOKS ----------

  if (loading || !timeline) {
    return <div className="flex h-full items-center justify-center text-zinc-500">Loading race data…</div>;
  }

  if (!dashboardData) {
    return <div className="flex h-full items-center justify-center text-zinc-500">Processing race data…</div>;
  }

  // ---------- controls ----------
  const handlePlayPause = () => {
    if (!totalDurationMs) return;
    if (!isPlaying && currentTimeMs >= totalDurationMs) setCurrentTimeMs(0);
    setIsPlaying((p) => !p);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentTimeMs((p) => Math.max(0, p - 1000));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentTimeMs((p) => Math.min(totalDurationMs, p + 1000));
  };

  const handleScrub = (ratio: number) => {
    if (!totalDurationMs) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    setCurrentTimeMs(clamped * totalDurationMs);
  };


  const { header, raceInfo, trackMap, telemetry, lapProgress, playback } = dashboardData;

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <DashboardHeader {...header} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-6">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <div className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase"></div>
          <div className="text-xs font-mono text-zinc-500"></div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3 flex flex-col gap-4">
            <RaceInfoPanel {...raceInfo} onDriverSelect={(car) => setFocusedCarNumber(car)} />
            <DriverDNA focusedCarNumber={focusedCarNumber} />
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

// ---------- helper functions ----------
function interpolateFrames(prev: RaceFrame, next: RaceFrame, t: number): RaceFrame {
  const drivers = prev.drivers.map((prevDriver) => {
    const nextDriver = next.drivers.find((d) => d.carNumber === prevDriver.carNumber);
    if (!nextDriver) return prevDriver;
    return {
      ...prevDriver,
      trackProgress: lerp(prevDriver.trackProgress, nextDriver.trackProgress, t),
      speedMph: lerp(prevDriver.speedMph, nextDriver.speedMph, t),
      throttlePercent: lerp(prevDriver.throttlePercent, nextDriver.throttlePercent, t),
      brakePercent: lerp(prevDriver.brakePercent, nextDriver.brakePercent, t),
      steeringAngleDeg: lerp(prevDriver.steeringAngleDeg, nextDriver.steeringAngleDeg, t),
      rpm: lerp(prevDriver.rpm, nextDriver.rpm, t),
      gear: t < 0.5 ? prevDriver.gear : nextDriver.gear,
      position: t < 0.5 ? prevDriver.position : nextDriver.position,
      gapToLeaderSeconds: lerp(prevDriver.gapToLeaderSeconds, nextDriver.gapToLeaderSeconds, t),
    };
  });
  return {
    ...prev,
    timestampMs: lerp(prev.timestampMs, next.timestampMs, t),
    raceProgress: lerp(prev.raceProgress, next.raceProgress, t),
    status: t < 0.5 ? prev.status : next.status,
    lap: t < 0.5 ? prev.lap : next.lap,
    totalLaps: prev.totalLaps,
    drivers,
  };
}

function lerp(start: number, end: number, t: number) {
  if (Math.abs(end - start) > 0.5) {
    if (start > end) {
      return (start + (end + 1 - start) * t) % 1;
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
  const sorted = [...frame.drivers].sort((a, b) => a.position - b.position);
  const leader = sorted[0];
  const focused = sorted.find((d) => d.carNumber === focusedCarNumber) ?? leader;

  const header: DashboardHeaderProps = {
    trackName: "",
    races: [],
    activeRaceIndex: 0,
    versionLabel: "",
  };

  const raceInfo: RaceInfoPanelProps = {
    status: frame.status,
    lap: frame.lap,
    totalLaps: frame.totalLaps,
    leader: `#${leader.carNumber} ${getLastName(leader.driverName)}`,
    gap: focused.position === 1 ? "+0.0s" : `+${focused.gapToLeaderSeconds.toFixed(1)}s`,
    standings: sorted.map((d) => ({
      number: d.carNumber,
      name: d.driverName,
      position: `P${d.position}`,
      highlight: d.carNumber === focused.carNumber,
    })),
  };

  const trackMap: TrackMapProps = {
    cars: sorted.map(driverToMarker),
    projectedPathClassName: undefined,
    showStartFinish: true,
    startFinishLabel: "S/F",
  };

  const telemetry: TelemetryPanelProps = {
    carNumber: focused.carNumber,
    driverName: focused.driverName,
    position: `P${focused.position}`,
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

  return { header, raceInfo, trackMap, telemetry, lapProgress, playback };
}

function driverToMarker(driver: DriverState): TrackCarMarker {
  const angle = 2 * Math.PI * driver.trackProgress - Math.PI / 2;
  const radiusX = 45;
  const radiusY = 45;
  const centerX = 50;
  const centerY = 50;
  const left = centerX + radiusX * Math.cos(angle);
  const top = centerY + radiusY * Math.sin(angle);
  return {
    id: String(driver.carNumber),
    label: String(driver.carNumber),
    style: { left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" },
  };
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

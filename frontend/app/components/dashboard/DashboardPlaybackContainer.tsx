'use client';

import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardHeader, type DashboardHeaderProps } from "./Header";
import { RaceInfoPanel, type RaceInfoPanelProps } from "./RaceInfo";
import { TrackMap, type TrackMapProps, type TrackCarMarker } from "./TrackMap";
import { TelemetryPanel, type TelemetryPanelProps } from "./Telemetry";
import { LapProgressStrip, type LapProgressProps } from "./LapProgress";
import { PlaybackControls, type PlaybackControlsProps } from "./PlaybackControls";
import { DriverDNA } from "./DriverDNA";
import { DataSourceSidebar } from "./DataSourceSidebar";
import { GhostOverlay } from "./GhostOverlay";
import { BattlePredictor } from "./BattlePredictor";
import { TireDegradation, type TireDegradationData } from "./TireDegradation";

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
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null);
  const [raceMetadata, setRaceMetadata] = useState<any>(null);

  // UI state
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedCarNumber, setFocusedCarNumber] = useState(DEFAULT_FOCUSED_CAR);

  // Refs for animation
  const lastFrameTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  // Data fetching effect - reload when data source changes
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = selectedDataSource
          ? `/api/race-timeline?folder=${encodeURIComponent(selectedDataSource)}`
          : '/api/race-timeline';
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network error");
        const data = await res.json();

        // Handle both old format (array) and new format (object with timeline + metadata)
        if (Array.isArray(data)) {
          setTimeline(data);
          setRaceMetadata(null);
        } else {
          setTimeline(data.timeline);
          setRaceMetadata(data.metadata || null);
        }
      } catch (e) {
        console.error("Failed to load real timeline, falling back to mock:", e);
        setTimeline(getMockRaceTimeline());
        setRaceMetadata(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedDataSource]);

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
    ? mapFrameToDashboardData(currentFrame, focusedCarNumber, isPlaying, progressRatio, raceMetadata)
    : undefined;

  // Generate tire data for the current frame
  const tireDegData = useMemo(() => {
    if (!currentFrame) return undefined;
    return generateMockTireData(currentFrame);
  }, [currentFrame?.lap]);

  const referenceCarNumber = useMemo(() => {
    if (!currentFrame) return 0;
    const sorted = [...currentFrame.drivers].sort((a, b) => a.position - b.position);
    if (sorted.length < 2) return 0;

    const leader = sorted[0];
    // If we are the leader, compare with P2 (the chaser)
    if (focusedCarNumber === leader.carNumber) {
      return sorted[1].carNumber;
    }
    // Otherwise compare with leader
    return leader.carNumber;
  }, [currentFrame, focusedCarNumber]);

  // Determine the target car for the Battle Predictor
  const battleTargetCarNumber = useMemo(() => {
    if (!currentFrame) return 0;
    const sorted = [...currentFrame.drivers].sort((a, b) => a.position - b.position);
    const focusedIndex = sorted.findIndex(d => d.carNumber === focusedCarNumber);

    if (focusedIndex === -1) return 0;

    // If we are P1, look at P2 (behind)
    if (focusedIndex === 0) {
      return sorted.length > 1 ? sorted[1].carNumber : 0;
    }

    // Otherwise look at the car ahead
    return sorted[focusedIndex - 1].carNumber;
  }, [currentFrame, focusedCarNumber]);

  const currentFocusedDriver = currentFrame?.drivers.find((d) => d.carNumber === focusedCarNumber);
  const currentProgress = currentFocusedDriver?.trackProgress || 0;

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
    <div className="flex h-screen flex-col bg-black text-zinc-100 overflow-hidden">
      {/* Data Source Sidebar */}
      <DataSourceSidebar
        currentSource={selectedDataSource}
        onSourceSelect={setSelectedDataSource}
      />

      <div className="flex-none">
        <DashboardHeader {...header} />
      </div>

      <main className="flex flex-1 w-full gap-4 px-4 py-2 overflow-hidden">
        <div className="grid h-full w-full grid-cols-12 gap-4">

          {/* COLUMN 1: Race Info & Driver List (Dedicated Column) */}
          <div className="col-span-2 flex flex-col gap-3 h-full overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <RaceInfoPanel {...raceInfo} onDriverSelect={(car) => setFocusedCarNumber(car)} />
            </div>
            <div className="flex-[0.4] min-h-0">
              <BattlePredictor
                timeline={timeline}
                currentLap={currentFrame?.lap || 0}
                focusedCarNumber={focusedCarNumber}
                targetCarNumber={battleTargetCarNumber}
              />
            </div>
          </div>

          {/* COLUMN 2: Strategy & Analysis (Stacked) */}
          <div className="col-span-2 flex flex-col gap-3 h-full overflow-hidden">
            <div className="flex-none">
              <DriverDNA focusedCarNumber={focusedCarNumber} />
            </div>
            <div className="flex-1 min-h-0">
              <TireDegradation focusedCarNumber={focusedCarNumber} tireDegData={tireDegData} />
            </div>
          </div>

          {/* COLUMN 3: Track Map (Center Stage) */}
          <div className="col-span-5 h-full rounded-2xl border border-zinc-800 bg-zinc-900/50 relative overflow-hidden">
            <div className="absolute inset-0">
              <TrackMap {...trackMap} />
            </div>
          </div>

          {/* COLUMN 4: Telemetry & Analytics */}
          <div className="col-span-3 flex flex-col gap-3 h-full overflow-hidden">
            <div className="flex-none">
              <TelemetryPanel {...telemetry} />
            </div>
            <div className="flex-1 min-h-0">
              <GhostOverlay
                timeline={timeline}
                currentLap={currentFrame?.lap || 0}
                focusedCarNumber={focusedCarNumber}
                comparisonCarNumber={referenceCarNumber}
                currentProgress={currentProgress}
              />
            </div>
          </div>

        </div>
      </main>

      <div className="flex-none">
        <LapProgressStrip {...lapProgress} onScrub={handleScrub} />
        <PlaybackControls
          {...playback}
          onPlayPause={handlePlayPause}
          onStepBack={handleStepBack}
          onStepForward={handleStepForward}
        />
      </div>
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
  raceMetadata: any
): DashboardData {
  const sorted = [...frame.drivers].sort((a, b) => a.position - b.position);
  const leader = sorted[0];
  const focused = sorted.find((d) => d.carNumber === focusedCarNumber) ?? leader;

  const header: DashboardHeaderProps = {
    trackName: raceMetadata?.trackName || raceMetadata?.raceName || "Unknown Track",
    races: [],
    activeRaceIndex: 0,
    versionLabel: raceMetadata?.folder ? `📁 ${raceMetadata.folder}` : "v1.0",
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
    cars: sorted.map((d) => ({
      ...driverToMarker(d),
      highlight: d.carNumber === focusedCarNumber,
    })),
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

function generateMockTireData(frame: RaceFrame): Record<string, TireDegradationData> {
  const data: Record<string, TireDegradationData> = {};

  frame.drivers.forEach(driver => {
    const currentLap = Math.max(1, frame.lap);
    const lapTimes: number[] = [];
    // Baseline time around 80s
    const baseline = 80.0;

    // Generate history
    for (let i = 1; i <= currentLap; i++) {
      // Simulate degradation: +0.05s per lap linear deg
      // Add some noise based on driver ID to make it look different
      const noise = Math.sin(i * 0.5 + driver.carNumber) * 0.3;
      const deg = (i - 1) * 0.08;
      lapTimes.push(baseline + deg + noise);
    }

    data[driver.carNumber] = {
      driverId: driver.carNumber,
      lapTimes,
      lapNumbers: Array.from({ length: currentLap }, (_, i) => i + 1),
      degradationRate: 0.08,
      optimalPitLap: 25,
      optimalPitWindow: [24, 28],
      confidence: 0.85,
      baselineTime: baseline,
      totalLaps: frame.totalLaps
    };
  });

  return data;
}

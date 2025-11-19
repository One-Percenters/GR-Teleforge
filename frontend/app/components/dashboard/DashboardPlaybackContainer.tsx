'use client';

import { useEffect, useMemo, useState } from "react";

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

const MOCK_FRAME_DURATION_MS = 200;
const DEFAULT_FOCUSED_CAR = 7;

export function DashboardPlaybackContainer() {
  const timeline: RaceTimeline = useMemo(() => getMockRaceTimeline(), []);
  const totalFrames = timeline.length;

  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedCarNumber] = useState(DEFAULT_FOCUSED_CAR);

  // Advance frames while playing.
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;

    const id = window.setInterval(() => {
      setFrameIndex((prev) => {
        if (prev + 1 >= totalFrames) {
          return prev;
        }
        return prev + 1;
      });
    }, MOCK_FRAME_DURATION_MS);

    return () => window.clearInterval(id);
  }, [isPlaying, totalFrames]);

  // Auto-pause when we hit the last frame.
  useEffect(() => {
    if (isPlaying && frameIndex >= totalFrames - 1) {
      setIsPlaying(false);
    }
  }, [frameIndex, totalFrames, isPlaying]);

  const currentFrame: RaceFrame | undefined =
    totalFrames > 0 ? timeline[frameIndex] : undefined;

  const progressRatio =
    totalFrames > 1 ? frameIndex / (totalFrames - 1) : 0;

  const dashboardData: DashboardData | undefined = currentFrame
    ? mapFrameToDashboardData(currentFrame, focusedCarNumber, isPlaying, progressRatio)
    : undefined;

  const handlePlayPause = () => {
    if (!totalFrames) return;
    // Restart from the beginning if we're at the end.
    if (!isPlaying && frameIndex >= totalFrames - 1) {
      setFrameIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleStepBack = () => {
    if (!totalFrames) return;
    setIsPlaying(false);
    setFrameIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    if (!totalFrames) return;
    setIsPlaying(false);
    setFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
  };

  const handleScrub = (ratio: number) => {
    if (!totalFrames) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    const index = Math.round(clamped * (totalFrames - 1));
    setIsPlaying(false);
    setFrameIndex(index);
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
            GR <span className="text-red-500">Teleforge</span> •{" "}
            <span className="text-zinc-300">Race Control</span>
          </div>
          <div className="text-xs font-mono text-zinc-500">
            Past + Present = Future
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <RaceInfoPanel {...raceInfo} />
          </div>

          <div className="lg:col-span-6">
            <TrackMap {...trackMap} />
          </div>

          <div className="lg:col-span-3">
            <TelemetryPanel {...telemetry} />
          </div>
        </div>
      </main>

      <LapProgressStrip {...lapProgress} />
      <PlaybackControls
        {...playback}
        onPlayPause={handlePlayPause}
        onStepBack={handleStepBack}
        onStepForward={handleStepForward}
        onScrub={handleScrub}
      />
    </div>
  );
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
    trackName: "Barber Motorsports",
    races: ["Race 1", "Race 2"],
    activeRaceIndex: 0,
    versionLabel: "v0.1 • GR Teleforge",
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
    currentLap: frame.lap,
    totalLaps: frame.totalLaps,
    progressRatio: overallProgressRatio,
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
  const angle = 2 * Math.PI * driver.trackProgress;
  const radiusX = 40;
  const radiusY = 32;
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



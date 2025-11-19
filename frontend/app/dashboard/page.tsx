import { DashboardHeader } from "../components/dashboard/Header";
import type { DashboardHeaderProps } from "../components/dashboard/Header";
import { RaceInfoPanel } from "../components/dashboard/RaceInfo";
import type { RaceInfoPanelProps } from "../components/dashboard/RaceInfo";
import { TrackMap } from "../components/dashboard/TrackMap";
import type { TrackMapProps } from "../components/dashboard/TrackMap";
import { TelemetryPanel } from "../components/dashboard/Telemetry";
import type { TelemetryPanelProps } from "../components/dashboard/Telemetry";
import { LapProgressStrip } from "../components/dashboard/LapProgress";
import type { LapProgressProps } from "../components/dashboard/LapProgress";
import { PlaybackControls } from "../components/dashboard/PlaybackControls";
import type { PlaybackControlsProps } from "../components/dashboard/PlaybackControls";

type DashboardData = {
  header: DashboardHeaderProps;
  raceInfo: RaceInfoPanelProps;
  trackMap: TrackMapProps;
  telemetry: TelemetryPanelProps;
  lapProgress: LapProgressProps;
  playback: PlaybackControlsProps;
};

// For now this page uses static mock data so you can iterate on the UI.
// To connect a real API, replace `dashboardData` with data from `fetch`, SWR,
// or your preferred data layer, keeping the same `DashboardData` shape.
const dashboardData: DashboardData = {
  header: {
    trackName: "Barber Motorsports",
    races: ["Race 1", "Race 2"],
    activeRaceIndex: 0,
    versionLabel: "v0.1 • GR Teleforge",
  },
  raceInfo: {
    status: "PAUSED",
    lap: 1,
    totalLaps: 50,
    leader: "#13 Workman",
    gap: "+2.3s",
    standings: [
      { number: 13, name: "Westin Workman", position: "P1" },
      { number: 55, name: "Spike Kohlbecker", position: "P2" },
      { number: 7, name: "Jaxon Bell", position: "P3", highlight: true },
      { number: 99, name: "Gresham Wagner", position: "P4" },
    ],
  },
  trackMap: {
    cars: [
      { id: "car-7", label: "7", className: "left-[16%] top-[60%]" },
      {
        id: "car-55",
        label: "55",
        className: "bottom-[14%] left-1/2 -translate-x-1/2",
      },
      { id: "car-13", label: "13", className: "right-[12%] top-[52%]" },
      {
        id: "car-99",
        label: "99",
        className: "left-1/2 top-[6%] -translate-x-1/2",
      },
    ],
    projectedPathClassName: "left-[9%] top-[52%] h-24 w-40 -rotate-15",
    showStartFinish: true,
    startFinishLabel: "S/F",
  },
  telemetry: {
    carNumber: 7,
    driverName: "Jaxon Bell",
    position: "P3",
    speedMph: 110,
    throttlePercent: 90,
    brakePercent: 0,
    gear: 4,
    steeringAngleDeg: 0,
    rpm: 5500,
  },
  lapProgress: {
    currentLap: 1,
    totalLaps: 50,
    progressRatio: 0.08,
  },
  playback: {
    status: "PAUSED",
    currentLap: 1,
    totalLaps: 50,
    progressRatio: 0.08,
  },
};

export default function Dashboard() {
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
      <PlaybackControls {...playback} />
    </div>
  );
}

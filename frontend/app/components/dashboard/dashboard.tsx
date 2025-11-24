"use client";

import type { ReactNode } from "react";

import Map from "./map";
import {
  type CarState,
  type Standing,
  type TelemetryStore,
  useTelemetry,
} from "./hooks";
import { usePlaybackClient } from "../../hooks/usePlaybackClient";

type CardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

type TelemetryState = TelemetryStore;

const Card = ({ title, children, className = "" }: CardProps) => (
  <section
    className={`rounded-3xl border border-border bg-card px-6 py-5 text-foreground shadow-[0_25px_65px_rgba(0,0,0,0.45)] ${className}`}
  >
    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
      {title}
    </p>
    {children}
  </section>
);

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-border/30 py-3 text-sm">
    <span className="uppercase tracking-[0.3em] text-muted-foreground">
      {label}
    </span>
    <span className="font-semibold text-foreground">{value}</span>
  </div>
);

const clampPercent = (value: number | null) => {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
};

const RaceSelector = () => (
  <header className="rounded-full border border-border px-10 py-3 text-center text-xs uppercase tracking-[0.45em] text-muted-foreground">
    race 1 · race 2 · race 3
  </header>
);

const RaceInfoCard = ({ telemetry }: { telemetry: TelemetryState }) => {
  const raceStats = [
    { label: "Status", value: telemetry.raceStatus ?? "—" },
    { label: "Leader", value: telemetry.leader ?? "—" },
    { label: "Gap", value: telemetry.gap ?? "—" },
  ];

  const standings =
    telemetry.standings.length > 0
      ? telemetry.standings
      : Array.from({ length: 4 }, (_, index) => ({
          car: null,
          driver: null,
          position: `P${index + 1}`,
        }));

  return (
    <Card title="Race Info" className="space-y-4 lg:col-span-3">
      <div className="mt-2 space-y-1">
        {raceStats.map((stat) => (
          <StatRow key={stat.label} label={stat.label} value={stat.value} />
        ))}
        {telemetry.latestWeather && (
          <div className="mt-3 grid grid-cols-3 gap-3 rounded-2xl border border-border/40 bg-background/40 p-3 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <div>
              Air
              <p className="mt-1 text-base font-semibold text-foreground">
                {telemetry.latestWeather.airTempC != null
                  ? `${telemetry.latestWeather.airTempC.toFixed(1)}°C`
                  : "—"}
              </p>
            </div>
            <div>
              Track
              <p className="mt-1 text-base font-semibold text-foreground">
                {telemetry.latestWeather.trackTempC != null
                  ? `${telemetry.latestWeather.trackTempC.toFixed(1)}°C`
                  : "—"}
              </p>
            </div>
            <div>
              Humidity
              <p className="mt-1 text-base font-semibold text-foreground">
                {telemetry.latestWeather.humidityPercent != null
                  ? `${telemetry.latestWeather.humidityPercent.toFixed(0)}%`
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="pt-3">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Standings
        </p>
        <ul className="mt-3 space-y-2">
          {standings.map((entry: Standing, index: number) => (
            <li
              key={`${entry.car ?? index}-${entry.position ?? index}`}
              className="flex items-center justify-between rounded-2xl border border-border/50 bg-background px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="text-muted-foreground">
                  {entry.car ?? "—"}
                </span>
                <span className="font-semibold text-foreground">
                  {entry.driver ?? "—"}
                </span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                {entry.position ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};

const MapPanel = () => (
  <div className="min-h-112 lg:col-span-6">
    <Map />
  </div>
);

const TelemetryCard = ({
  telemetry,
  activeCar,
}: {
  telemetry: TelemetryState;
  activeCar: CarState | null;
}) => {
  const throttle = clampPercent(activeCar?.speedKph ?? null);
  const brake = clampPercent(null);
  const steeringAngle = activeCar?.steeringAngle ?? 0;

  return (
    <Card title="Telemetry" className="space-y-4 lg:col-span-3">
      <div className="mt-2 space-y-3">
        <StatRow label="Driver" value={activeCar?.driverName ?? "—"} />
        <StatRow label="Car" value={activeCar?.carNumber ?? "—"} />
        <StatRow
          label="Speed"
          value={
            activeCar?.speedKph != null
              ? `${activeCar.speedKph.toFixed(0)} km/h`
              : "—"
          }
        />
      </div>

      <TelemetryBar
        label="Throttle"
        value={activeCar?.speedKph ?? null}
        percent={throttle}
      />
      <TelemetryBar label="Brake" value={null} percent={brake} />

      <div className="pt-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Steering
        </p>
        <div className="relative mx-auto mt-4 h-32 w-32 rounded-full border border-border/50">
          <div className="absolute inset-6 rounded-full border border-border/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground">
              {activeCar?.steeringAngle != null
                ? `${activeCar.steeringAngle.toFixed(1)}°`
                : "—"}
            </span>
            <span
              className="absolute top-1/2 left-1/2 h-1/2 w-0.5 -translate-x-1/2 origin-bottom bg-primary"
              style={{
                transform: `rotate(${steeringAngle}deg)`,
              }}
            />
          </div>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Lap{" "}
          <span className="ml-2 text-base font-semibold text-foreground">
            {activeCar?.lap ?? "—"}
          </span>
        </p>
      </div>
    </Card>
  );
};

const TelemetryBar = ({
  label,
  value,
  percent,
}: {
  label: string;
  value: number | null;
  percent: number;
}) => (
  <div>
    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">
        {value != null ? `${percent}%` : "—"}
      </span>
    </div>
    <div className="mt-2 h-2 rounded-full bg-background">
      <div
        className={`h-full rounded-full ${
          label === "Brake" ? "bg-muted" : "bg-primary"
        } transition-all`}
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

const LapTimelineCard = ({
  telemetry,
  activeCar,
}: {
  telemetry: TelemetryState;
  activeCar: CarState | null;
}) => {
  const lapPercent = clampPercent(activeCar?.lapDistanceMeters ?? null);

  return (
    <Card title="Lap Timeline">
      <div className="mt-4 h-3 rounded-full bg-background">
        <div
          className="h-full rounded-full bg-primary shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
          style={{ width: `${lapPercent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Lap {activeCar?.lap ?? "—"}</span>
        <span>{telemetry.gap ?? "—"}</span>
      </div>
    </Card>
  );
};

const PlaybackControls = ({ status }: { status: string | null }) => (
  <section className="flex justify-center">
    <div className="flex items-center gap-4 rounded-full border border-border bg-card px-6 py-3 text-sm text-muted-foreground shadow-lg shadow-black/40">
      <IconButton label="previous lap">
        <PrevIcon />
      </IconButton>
      <IconButton label="next lap">
        <NextIcon />
      </IconButton>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground transition hover:bg-accent"
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
        Play
      </button>
      <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
        {status ?? "paused"}
      </span>
    </div>
  </section>
);

const IconButton = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    className="rounded-full border border-border px-3 py-2 transition hover:border-primary hover:text-primary"
    aria-label={label}
  >
    <span className="flex h-4 w-4 items-center justify-center text-foreground">
      {children}
    </span>
  </button>
);

const PrevIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
    <path d="M5 5v14h2V5H5zm14 7L8 5v14l11-7z" />
  </svg>
);

const NextIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
    <path d="M17 5v14h2V5h-2zm-2 7L4 5v14l11-7z" />
  </svg>
);

const Dashboard = () => {
  usePlaybackClient("race1");
  const telemetry = useTelemetry();
  const activeCarNumber =
    telemetry.standings[0]?.car ?? Object.keys(telemetry.cars)[0] ?? null;
  const activeCar = activeCarNumber
    ? telemetry.cars[activeCarNumber] ?? null
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:px-10">
        <RaceSelector />

        <div className="grid gap-6 lg:grid-cols-12">
          <RaceInfoCard telemetry={telemetry} />
          <MapPanel />
          <TelemetryCard telemetry={telemetry} activeCar={activeCar} />
        </div>

        <LapTimelineCard telemetry={telemetry} activeCar={activeCar} />

        <PlaybackControls status={telemetry.raceStatus} />
      </div>
    </main>
  );
};

export default Dashboard;

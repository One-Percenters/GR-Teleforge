"use client";

import type { ReactNode } from "react";

import Map from "./map";
import { useTelemetry } from "./hooks";

type CardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

type TelemetryState = ReturnType<typeof useTelemetry>;

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
    { label: "Status", value: telemetry.status ?? "—" },
    { label: "Lap", value: telemetry.lap ?? "—" },
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
      </div>
      <div className="pt-3">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Standings
        </p>
        <ul className="mt-3 space-y-2">
          {standings.map((entry, index) => (
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

const TelemetryCard = ({ telemetry }: { telemetry: TelemetryState }) => {
  const throttle = clampPercent(telemetry.ath);
  const brake = clampPercent(telemetry.pbrake_f);
  const steeringAngle = telemetry.Steering_Angle ?? 0;

  return (
    <Card title="Telemetry" className="space-y-4 lg:col-span-3">
      <div className="mt-2 space-y-3">
        <StatRow label="Driver" value={telemetry.driverName ?? "—"} />
        <StatRow label="Position" value={telemetry.positionLabel ?? "—"} />
        <StatRow
          label="Speed"
          value={
            telemetry.speed != null ? `${telemetry.speed.toFixed(0)} mph` : "—"
          }
        />
      </div>

      <TelemetryBar label="Throttle" value={telemetry.ath} percent={throttle} />
      <TelemetryBar label="Brake" value={telemetry.pbrake_f} percent={brake} />

      <div className="pt-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Steering
        </p>
        <div className="relative mx-auto mt-4 h-32 w-32 rounded-full border border-border/50">
          <div className="absolute inset-6 rounded-full border border-border/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground">
              {telemetry.Steering_Angle != null
                ? `${telemetry.Steering_Angle.toFixed(1)}°`
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
          RPM{" "}
          <span className="ml-2 text-base font-semibold text-foreground">
            {telemetry.nmot != null ? telemetry.nmot.toFixed(0) : "—"}
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

const LapTimelineCard = ({ telemetry }: { telemetry: TelemetryState }) => {
  const lapPercent = clampPercent(
    telemetry.Laptrigger_lapdist_dls != null
      ? telemetry.Laptrigger_lapdist_dls
      : 0
  );

  return (
    <Card title="Lap Timeline">
      <div className="mt-4 h-3 rounded-full bg-background">
        <div
          className="h-full rounded-full bg-primary shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
          style={{ width: `${lapPercent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Lap {telemetry.lap ?? "—"}</span>
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
  const telemetry = useTelemetry();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:px-10">
        <RaceSelector />

        <div className="grid gap-6 lg:grid-cols-12">
          <RaceInfoCard telemetry={telemetry} />
          <MapPanel />
          <TelemetryCard telemetry={telemetry} />
        </div>

        <LapTimelineCard telemetry={telemetry} />

        <PlaybackControls status={telemetry.status} />
      </div>
    </main>
  );
};

export default Dashboard;

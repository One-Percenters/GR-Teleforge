export type TelemetryPanelProps = {
  carNumber: number;
  driverName: string;
  position: string;
  speedMph: number;
  throttlePercent: number;
  brakePercent: number;
  gear: number;
  steeringAngleDeg: number;
  rpm: number;
};

export function TelemetryPanel({
  carNumber,
  driverName,
  position,
  speedMph,
  throttlePercent,
  brakePercent,
  gear,
  steeringAngleDeg,
  rpm,
}: TelemetryPanelProps) {
  return (
    <section className="flex h-full flex-col border border-zinc-800 bg-zinc-950/70 px-5 py-4">
      <h2 className="mb-4 text-xs font-semibold tracking-[0.35em] text-red-500">
        TELEMETRY
      </h2>

      <div className="space-y-1 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Driver</span>
          <span className="text-zinc-100">
            #{carNumber} {driverName}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Position</span>
          <span className="text-amber-300">{position}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Speed</span>
          <span className="text-emerald-400">{Math.round(speedMph)} mph</span>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-xs font-mono">
        <TelemetryBar label="Throttle" value={throttlePercent} color="bg-emerald-500" />
        <TelemetryBar label="Brake" value={brakePercent} color="bg-zinc-500" />

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Gear</span>
          <span className="text-amber-300 text-base">{gear}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-1 flex-col gap-6">
        <div>
          <div className="mb-3 text-xs font-semibold tracking-[0.35em] text-zinc-400">
            STEERING
          </div>
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80">
            <div 
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-black/60 will-change-transform"
              style={{ transform: `rotate(${steeringAngleDeg}deg)` }}
            >
              <div className="absolute inset-4 rounded-full border border-zinc-700" />
              <div className="absolute top-3 h-10 w-[2px] rounded-full bg-red-500" />
              <div className="h-2 w-2 rounded-full bg-red-500" />
            </div>
          </div>
          <div className="mt-2 text-center text-xs font-mono text-zinc-400">
            {Math.round(steeringAngleDeg)}°
          </div>
        </div>

        <div className="space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">RPM</span>
            <span className="text-emerald-400">{Math.round(rpm)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TelemetryBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-100">{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}



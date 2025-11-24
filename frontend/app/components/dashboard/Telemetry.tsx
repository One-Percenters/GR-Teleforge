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
    <section className="flex h-full flex-col border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold tracking-[0.2em] text-red-500">TELEMETRY</h2>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-100">#{carNumber} {driverName}</span>
          <span className="text-amber-300 font-bold">{position}</span>
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        {/* Left: Bars & Stats */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="flex items-end justify-between">
            <span className="text-zinc-400 text-[10px] uppercase">Speed</span>
            <span className="text-2xl font-mono font-bold text-emerald-400 leading-none">
              {Math.round(speedMph)} <span className="text-xs text-zinc-600 font-normal">mph</span>
            </span>
          </div>

          <div className="space-y-2">
            <TelemetryBar label="THR" value={throttlePercent} color="bg-emerald-500" />
            <TelemetryBar label="BRK" value={brakePercent} color="bg-red-500" />
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase">Gear</span>
              <span className="text-xl font-mono text-amber-300 leading-none">{gear}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-zinc-500 uppercase">RPM</span>
              <span className="text-sm font-mono text-zinc-300">{Math.round(rpm)}</span>
            </div>
          </div>
        </div>

        {/* Right: Steering */}
        <div className="flex flex-col items-center justify-center w-24 border-l border-zinc-800/50 pl-2">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700">
            <div
              className="absolute inset-0 flex items-center justify-center will-change-transform"
              style={{ transform: `rotate(${steeringAngleDeg}deg)` }}
            >
              <div className="w-full h-1 bg-zinc-600 rounded-full"></div>
              <div className="absolute top-0 h-3 w-1 bg-red-500 rounded-full"></div>
            </div>
          </div>
          <span className="mt-1 text-[10px] font-mono text-zinc-500">{Math.round(steeringAngleDeg)}°</span>
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



export type Standing = {
  number: number;
  name: string;
  position: string;
  highlight?: boolean;
};

export type RaceInfoPanelProps = {
  status: string;
  lap: number;
  totalLaps: number;
  leader: string;
  gap: string;
  standings: Standing[];
  onDriverSelect?: (carNumber: number) => void;
};

export function RaceInfoPanel({
  status,
  lap,
  totalLaps,
  leader,
  gap,
  standings,
  onDriverSelect,
}: RaceInfoPanelProps) {
  return (
    <section className="flex h-full flex-col border border-zinc-800 bg-zinc-950/70 px-5 py-4">
      <h2 className="mb-4 text-xs font-semibold tracking-[0.35em] text-red-500">
        RACE INFO
      </h2>

      <div className="space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Status</span>
          <span className="text-emerald-400">{status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Lap</span>
          <span className="text-zinc-100">
            {lap} <span className="text-zinc-500">/ {totalLaps}</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Leader</span>
          <span className="text-zinc-100">{leader}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Gap</span>
          <span className="text-rose-400">{gap}</span>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-hidden">
        <h3 className="mb-3 text-xs font-semibold tracking-[0.35em] text-red-500">
          STANDINGS
        </h3>
        <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1 text-xs font-mono">
          {standings.map((driver) => (
            <button
              key={driver.number}
              onClick={() => onDriverSelect?.(driver.number)}
              className={[
                "flex items-center justify-between rounded border px-3 py-2 text-left transition-colors",
                driver.highlight
                  ? "border-red-500 bg-red-950/40 text-zinc-50"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-200 hover:border-red-500/70 hover:bg-zinc-900",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 text-zinc-500">#{driver.number}</span>
                <span>{driver.name}</span>
              </div>
              <span className="text-rose-400">{driver.position}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

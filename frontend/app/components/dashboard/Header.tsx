export type DashboardHeaderProps = {
  trackName: string;
  races: string[];
  activeRaceIndex: number;
  versionLabel?: string;
};

export function DashboardHeader({
  trackName,
  races,
  activeRaceIndex,
  versionLabel = "v0.1 • GR Teleforge",
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-black/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-baseline gap-2 tracking-[0.25em] text-xs font-semibold text-zinc-500">
          <span className="text-zinc-400">TRACK</span>
          <span className="text-zinc-100 text-sm tracking-[0.35em]">
            {trackName.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            &lt;
          </button>
          <div className="flex items-center gap-8 text-xs font-semibold tracking-[0.35em] uppercase">
            {races.map((raceName, index) => {
              const isActive = index === activeRaceIndex;
              return (
                <button
                  key={raceName}
                  className={
                    isActive
                      ? "border-b-2 border-red-500 pb-2 text-red-500"
                      : "pb-2 text-zinc-500 transition-colors hover:text-zinc-300"
                  }
                >
                  {raceName}
                </button>
              );
            })}
          </div>
          <button className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            &gt;
          </button>
        </div>

        <div className="hidden text-xs font-mono text-zinc-500 md:block">
          {versionLabel}
        </div>
      </div>
    </header>
  );
}

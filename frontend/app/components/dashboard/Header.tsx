export type DashboardHeaderProps = {
  trackName: string;
  races: string[];
  activeRaceIndex: number;
  versionLabel: string;
};

export function DashboardHeader({
  trackName,
  races,
  activeRaceIndex,
  versionLabel,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-900 bg-black/90 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-red-600" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            {trackName}
          </h1>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {races.map((race, idx) => (
            <button
              key={race}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                idx === activeRaceIndex
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {race}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-zinc-600">{versionLabel}</span>
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
      </div>
    </header>
  );
}

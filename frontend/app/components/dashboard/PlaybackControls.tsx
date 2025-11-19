export type PlaybackControlsProps = {
  status: "PAUSED" | "PLAYING";
  currentLap: number;
  totalLaps: number;
  /** Ratio from 0 to 1 representing lap progress. */
  progressRatio: number;
};

export function PlaybackControls({
  status,
  currentLap,
  totalLaps,
  progressRatio,
}: PlaybackControlsProps) {
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));

  return (
    <section className="flex items-center justify-between border-t border-zinc-900 bg-black/90 px-8 py-4 text-xs font-mono text-zinc-400">
      <div className="flex items-center gap-3">
        <span className="h-[3px] w-28 rounded-full bg-zinc-700">
          <span
            className="block h-full rounded-full bg-red-500"
            style={{ width: `${clampedRatio * 100}%` }}
          />
        </span>
        <span>Lap Progress</span>
      </div>

      <div className="flex items-center gap-6">
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-lg text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">
          <span className="-translate-x-[1px]">&lt;</span>
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-lg text-white shadow-lg shadow-red-900/40">
          {status === "PLAYING" ? "▌▌" : "▶"}
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-lg text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">
          <span className="translate-x-[1px]">&gt;</span>
        </button>

        <span className="text-zinc-400">{status}</span>
      </div>

      <div className="text-right text-xs font-mono">
        <span className="text-zinc-400">Lap </span>
        <span className="text-red-400">
          {currentLap} / {totalLaps}
        </span>
      </div>
    </section>
  );
}



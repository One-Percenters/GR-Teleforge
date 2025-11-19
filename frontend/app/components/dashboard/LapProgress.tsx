export type LapProgressProps = {
  currentLap: number;
  totalLaps: number;
  /** Ratio from 0 to 1 representing lap progress. */
  progressRatio: number;
};

export function LapProgressStrip({
  currentLap,
  totalLaps,
  progressRatio,
}: LapProgressProps) {
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));

  return (
    <section className="border-t border-zinc-900 bg-black/95 px-8 py-3 text-xs font-mono text-zinc-400">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        <div className="flex flex-1 items-center gap-3">
          <span className="text-zinc-500">Lap Progress</span>
          <div className="relative h-[3px] w-full rounded-full bg-zinc-800">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-red-500"
              style={{ width: `${clampedRatio * 100}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <span className="text-zinc-500">Lap </span>
          <span className="text-red-500">{currentLap}</span>
          <span className="text-zinc-500"> / {totalLaps}</span>
        </div>
      </div>
    </section>
  );
}

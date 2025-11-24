import type { CSSProperties } from "react";

export type TrackCarMarker = {
  id: string;
  label: string;
  highlight?: boolean;
  /** Tailwind positioning classes or any extra styling. */
  className?: string;
  /** Optional inline style if you prefer not to use Tailwind utility classes. */
  style?: CSSProperties;
};

export type TrackMapProps = {
  cars: TrackCarMarker[];
  /** Tailwind / CSS size + position classes for the projected path element. */
  projectedPathClassName?: string;
  showStartFinish?: boolean;
  startFinishLabel?: string;
};

export function TrackMap({
  cars,
  projectedPathClassName,
  showStartFinish = true,
  startFinishLabel = "S/F",
  analysis,
  focusedCarNumber,
}: TrackMapProps & { analysis?: any; focusedCarNumber?: number }) {
  // Extract virtual best analysis data for the currently focused driver
  // Analysis contains: bestS1, bestS2, bestS3, virtualBest, actualBest, potentialGain
  const focusedStats = analysis && focusedCarNumber ? analysis[String(focusedCarNumber)] : null;
  console.log('TrackMap props:', { analysis, focusedCarNumber, focusedStats });

  return (
    <section className="relative flex h-[380px] flex-1 items-center justify-center overflow-hidden border border-zinc-800 bg-zinc-950/70 px-6 py-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative flex h-full w-full items-center justify-center">
        {/* Track outline - replace this block with a custom SVG if you need a different track shape */}
        <div className="relative h-64 w-[80%] max-w-xl rounded-full border-[6px] border-zinc-700/70">
          <div className="absolute inset-4 rounded-full border-[6px] border-zinc-800/80" />

          {/* Start/Finish zone */}
          {showStartFinish && (
            <div className="absolute left-1/2 top-2 flex -translate-x-1/2 flex-col items-center gap-1">
              <div className="h-20 w-16 bg-red-900/60" />
              <span className="text-xs font-semibold tracking-[0.3em] text-amber-300">
                {startFinishLabel}
              </span>
            </div>
          )}

          {/* Car markers */}
          {cars.map((car) => (
            <CarDot
              key={car.id}
              label={car.label}
              highlight={car.highlight}
              className={car.className}
              style={car.style}
            />
          ))}

          {/* Projected line for a highlighted car */}
          {projectedPathClassName && (
            <div
              className={`absolute rounded-full border-2 border-dashed border-amber-300/70 ${projectedPathClassName}`}
            />
          )}
        </div>
      </div>

      {/* Virtual Lap Analysis Overlay - Shows theoretical best lap vs actual */}
      {focusedStats && (
        <div className="absolute bottom-2 left-2 z-30 rounded border border-zinc-700/40 bg-zinc-900/95 px-2.5 py-2 shadow-lg backdrop-blur-sm">
          <h4 className="mb-1.5 text-[9px] font-bold tracking-[0.15em] text-zinc-500 uppercase">
            Virtual Lap Analysis
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            <div className="text-zinc-500">Actual Best</div>
            <div className="font-mono text-right text-zinc-200">
              {focusedStats.actualBest ? `${focusedStats.actualBest.toFixed(3)}s` : "--"}
            </div>

            <div className="text-zinc-500">Virtual Best</div>
            <div className="font-mono text-right text-amber-400">
              {focusedStats.virtualBest ? `${focusedStats.virtualBest.toFixed(3)}s` : "--"}
            </div>

            <div className="text-zinc-500">Potential Gain</div>
            <div className="font-mono text-right text-emerald-400">
              {focusedStats.potentialGain > 0 ? `-${focusedStats.potentialGain.toFixed(3)}s` : "0.000s"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CarDot({
  label,
  highlight,
  className,
  style,
}: {
  label: string;
  highlight?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`absolute flex items-center justify-center rounded-full font-bold transition-all duration-300 ${highlight
        ? "h-8 w-8 bg-red-600 text-white shadow-lg shadow-red-500/50 z-20 scale-110 ring-2 ring-white/20 text-xs"
        : "h-5 w-5 bg-zinc-700 text-zinc-300 border border-zinc-600 z-10 text-[9px] opacity-90"
        } ${className ?? ""}`}
    >
      {label}
    </div>
  );
}

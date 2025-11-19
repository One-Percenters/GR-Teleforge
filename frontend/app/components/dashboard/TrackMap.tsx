import type { CSSProperties } from "react";

export type TrackCarMarker = {
  id: string;
  label: string;
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
}: TrackMapProps) {
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
    </section>
  );
}

function CarDot({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`absolute flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-zinc-50 shadow-lg shadow-red-900/40 ${className ?? ""}`}
    >
      {label}
    </div>
  );
}



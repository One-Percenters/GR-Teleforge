import { useEffect, useRef, useState } from "react";

export type LapProgressProps = {
  currentLap: number;
  totalLaps: number;
  /** Ratio from 0 to 1 representing lap progress. */
  progressRatio: number;
  onScrub?: (progress: number) => void;
};

export function LapProgressStrip({
  currentLap,
  totalLaps,
  progressRatio,
  onScrub,
}: LapProgressProps) {
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateProgress = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, x / width));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onScrub) return;
    setIsDragging(true);
    onScrub(calculateProgress(e.clientX));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && onScrub) {
      onScrub(calculateProgress(e.clientX));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [isDragging]);

  return (
    <section className="border-t border-zinc-900 bg-black/95 px-8 py-3 text-xs font-mono text-zinc-400">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        <div className="flex flex-1 items-center gap-3">
          <span className="text-zinc-500">Race Progress</span>
          <div
            ref={containerRef}
            className={`relative h-[6px] w-full rounded-full bg-zinc-800 ${
              onScrub ? "cursor-pointer hover:bg-zinc-700" : ""
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-red-500 transition-all duration-75 ease-linear"
              style={{ width: `${clampedRatio * 100}%` }}
            />
            {/* Scrubber handle for better visibility */}
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all duration-75 ease-linear"
              style={{
                left: `${clampedRatio * 100}%`,
                width: isDragging ? "12px" : "0px",
                height: isDragging ? "12px" : "0px",
                opacity: isDragging ? 1 : 0,
              }}
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

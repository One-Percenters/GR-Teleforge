import { useMemo } from "react";
import { type RaceTimeline, type RaceFrame } from "./raceData";

export type BattlePredictorProps = {
    timeline: RaceTimeline | null;
    currentLap: number;
    focusedCarNumber: number;
    targetCarNumber: number; // The car we are chasing or defending against
};

export function BattlePredictor({
    timeline,
    currentLap,
    focusedCarNumber,
    targetCarNumber,
}: BattlePredictorProps) {
    // 1. Extract Gap History
    const history = useMemo(() => {
        if (!timeline) return [];

        // Filter frames for the last 5 laps to keep it relevant
        const relevantFrames = timeline.filter(
            (f) => f.lap <= currentLap && f.lap >= Math.max(1, currentLap - 5)
        );

        // Sample down to avoid too many points
        const sampled = relevantFrames.filter((_, i) => i % 10 === 0);

        return sampled.map((frame) => {
            const focused = frame.drivers.find((d) => d.carNumber === focusedCarNumber);
            const target = frame.drivers.find((d) => d.carNumber === targetCarNumber);

            if (!focused || !target) return null;

            // Gap is absolute difference in gapToLeader
            const gap = Math.abs(focused.gapToLeaderSeconds - target.gapToLeaderSeconds);

            return {
                lap: frame.lap,
                gap,
                timestamp: frame.timestampMs,
            };
        }).filter((p): p is NonNullable<typeof p> => p !== null);
    }, [timeline, currentLap, focusedCarNumber, targetCarNumber]);

    // 2. Calculate Prediction & Metrics
    const analysis = useMemo(() => {
        if (history.length < 10) return null;

        // Linear Regression on recent history (last ~50 samples)
        const recent = history.slice(-50);
        if (recent.length < 2) return null;

        const n = recent.length;
        let sumX = 0; // Time
        let sumY = 0; // Gap
        let sumXY = 0;
        let sumXX = 0;

        // Normalize time to seconds from start of window
        const startTime = recent[0].timestamp;

        recent.forEach((p) => {
            const t = (p.timestamp - startTime) / 1000; // seconds
            sumX += t;
            sumY += p.gap;
            sumXY += t * p.gap;
            sumXX += t * t;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX); // Gap change per second
        const currentGap = recent[recent.length - 1].gap;

        // Metrics
        const paceDelta = slope * 80; // Approx gap change per 80s lap (negative = closing)
        const isClosing = slope < -0.001;

        let catchLap = null;
        if (isClosing) {
            const timeToCatch = -currentGap / slope; // seconds
            const lapsToCatch = timeToCatch / 80; // approx laps
            catchLap = currentLap + lapsToCatch;
        }

        // Win Probability (Heuristic)
        // If closing fast enough to catch before end (assuming 20 lap race for demo), high prob.
        // If gap is small, high prob.
        let winProb = 50;
        if (isClosing) {
            winProb += Math.min(40, Math.abs(paceDelta) * 20); // Bonus for speed
            if (currentGap < 1.0) winProb += 10; // Bonus for proximity
        } else {
            winProb -= Math.min(40, slope * 1000); // Penalty for losing ground
        }
        winProb = Math.max(5, Math.min(95, winProb));

        let statusText = "STABLE";
        let statusColor = "text-zinc-400";
        if (slope < -0.005) {
            statusText = "HUNTING";
            statusColor = "text-emerald-500";
        } else if (slope > 0.005) {
            statusText = "LOSING TIME";
            statusColor = "text-rose-500";
        }

        return {
            currentGap,
            slope,
            paceDelta,
            catchLap,
            winProb,
            statusText,
            statusColor,
        };
    }, [history, currentLap]);

    if (!timeline || history.length === 0) {
        return (
            <section className="flex h-full flex-col border border-zinc-800 bg-zinc-950/70 px-5 py-4">
                <h2 className="mb-4 text-xs font-semibold tracking-[0.35em] text-red-500">
                    BATTLE PREDICTOR
                </h2>
                <div className="flex flex-1 items-center justify-center text-zinc-600 text-xs">
                    NO DATA
                </div>
            </section>
        );
    }

    // Chart Data
    const maxGap = Math.max(...history.map(p => p.gap), 0.5);
    const minGap = 0;
    const width = 100;
    const height = 40;

    const points = history.map((p, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - ((p.gap - minGap) / (maxGap - minGap)) * height;
        return `${x},${y}`;
    }).join(" ");

    return (
        <section className="flex h-full flex-col border border-zinc-800 bg-zinc-950/70 px-5 py-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold tracking-[0.35em] text-red-500">
                    BATTLE AI
                </h2>
                <div className="text-[10px] font-mono text-zinc-500">
                    VS <span className="text-zinc-100 font-bold text-xs">#{targetCarNumber}</span>
                </div>
            </div>

            {/* Main Stat: Gap */}
            <div className="flex items-end gap-3 mb-4">
                <div>
                    <div className="text-[10px] uppercase text-zinc-500 mb-0.5">Current Gap</div>
                    <div className="text-3xl font-bold text-zinc-100 leading-none">
                        {analysis?.currentGap.toFixed(2)}<span className="text-sm font-normal text-zinc-500">s</span>
                    </div>
                </div>
                <div className={`text-xs font-bold mb-1 ${analysis?.statusColor}`}>
                    {analysis?.statusText}
                </div>
            </div>

            {/* Detailed Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                    <div className="text-[9px] uppercase text-zinc-500">Pace Delta</div>
                    <div className={`text-sm font-mono font-bold ${analysis && analysis.paceDelta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {analysis ? (analysis.paceDelta > 0 ? '+' : '') + analysis.paceDelta.toFixed(2) : '-'} s/lap
                    </div>
                </div>
                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                    <div className="text-[9px] uppercase text-zinc-500">Catch Lap</div>
                    <div className="text-sm font-mono font-bold text-zinc-200">
                        {analysis?.catchLap ? `L${Math.floor(analysis.catchLap)}` : '---'}
                    </div>
                </div>
                <div className="col-span-2 bg-zinc-900/50 p-2 rounded border border-zinc-800 flex items-center justify-between">
                    <div className="text-[9px] uppercase text-zinc-500">Overtake Prob</div>
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-red-500 to-emerald-500"
                                style={{ width: `${analysis?.winProb || 0}%` }}
                            />
                        </div>
                        <div className="text-sm font-mono font-bold text-zinc-200">
                            {Math.round(analysis?.winProb || 0)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Mini Chart */}
            <div className="flex-1 w-full min-h-0 relative border-t border-zinc-800/50 pt-2">
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <line x1="0" y1={height} x2="100" y2={height} stroke="#3f3f46" strokeWidth="0.5" />
                    <path
                        d={`M0,${height} ${points} L${width},${height} Z`}
                        fill="url(#gradient)"
                    />
                    <polyline
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        points={points}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>
        </section>
    );
}

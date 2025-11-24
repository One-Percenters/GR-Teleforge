'use client';

import { useMemo, useState, useRef } from 'react';
import { RaceTimeline } from './raceData';

type GhostOverlayProps = {
    timeline: RaceTimeline | null;
    currentLap: number;
    focusedCarNumber: number;
    comparisonCarNumber: number;
    currentProgress: number;
};

export function GhostOverlay({
    timeline,
    currentLap,
    focusedCarNumber,
    comparisonCarNumber,
    currentProgress,
}: GhostOverlayProps) {
    const [zoomLevel, setZoomLevel] = useState(1); // 1x to 10x
    const [hoverX, setHoverX] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Extract traces for the current lap
    const { focusedTrace, comparisonTrace } = useMemo(() => {
        if (!timeline) return { focusedTrace: [], comparisonTrace: [] };

        const focused: { x: number; y: number }[] = [];
        const comparison: { x: number; y: number }[] = [];

        for (const frame of timeline) {
            if (frame.lap !== currentLap) continue;

            const fDriver = frame.drivers.find((d) => d.carNumber === focusedCarNumber);
            const cDriver = frame.drivers.find((d) => d.carNumber === comparisonCarNumber);

            if (fDriver) focused.push({ x: fDriver.trackProgress, y: fDriver.speedMph });
            if (cDriver) comparison.push({ x: cDriver.trackProgress, y: cDriver.speedMph });
        }

        focused.sort((a, b) => a.x - b.x);
        comparison.sort((a, b) => a.x - b.x);

        return { focusedTrace: focused, comparisonTrace: comparison };
    }, [timeline, currentLap, focusedCarNumber, comparisonCarNumber]);

    // 2. Interaction Handlers
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // Calculate normalized X (0-1) relative to the current view
        setHoverX(x);
    };

    const handleMouseLeave = () => {
        setHoverX(null);
    };

    if (!timeline || focusedTrace.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <span className="text-xs text-zinc-600">Waiting for lap data...</span>
            </div>
        );
    }

    // 3. Viewport Calculations
    const width = 1000; // Internal SVG coordinate width
    const height = 300; // Internal SVG coordinate height
    const maxSpeed = 160;

    // Calculate ViewBox for Zoom
    // We want to center on `currentProgress` if zoomed in
    const viewWidth = width / zoomLevel;
    let viewX = (currentProgress * width) - (viewWidth / 2);

    // Clamp viewX
    viewX = Math.max(0, Math.min(width - viewWidth, viewX));

    // If we are hovering, we need to map the mouse X to the data X
    // Mouse X is pixels in the DOM element. We need to map that to the SVG viewBox.
    let hoverDataX = 0;
    let hoverTrackProgress = 0;
    if (hoverX !== null && containerRef.current) {
        const domWidth = containerRef.current.getBoundingClientRect().width;
        const ratio = hoverX / domWidth; // 0 to 1 within the visible area
        // Map to SVG coordinates
        hoverDataX = viewX + (ratio * viewWidth);
        hoverTrackProgress = hoverDataX / width;
    } else {
        // Default to current car position if not hovering
        hoverTrackProgress = currentProgress;
        hoverDataX = currentProgress * width;
    }

    // Helper to generate path string
    const toPoints = (data: { x: number; y: number }[]) => {
        return data
            .map((p) => {
                const x = p.x * width;
                const y = height - (p.y / maxSpeed) * height;
                return `${x},${y}`;
            })
            .join(' ');
    };

    const toFilledPath = (data: { x: number; y: number }[]) => {
        if (data.length === 0) return "";
        const points = toPoints(data);
        return `M ${points} L ${data[data.length - 1].x * width},${height} L ${data[0].x * width},${height} Z`;
    };

    const focusedPath = toPoints(focusedTrace);
    const focusedFilledPath = toFilledPath(focusedTrace);
    const comparisonPath = toPoints(comparisonTrace);

    // Get values at the active point (Hover or Current)
    const getSpeedAt = (trace: { x: number; y: number }[], progress: number) => {
        if (trace.length === 0) return 0;
        // Find closest point
        // Optimization: could use binary search for large datasets
        const point = trace.reduce((prev, curr) =>
            Math.abs(curr.x - progress) < Math.abs(prev.x - progress) ? curr : prev
        );
        return point ? point.y : 0;
    };

    const activeFocusedSpeed = focusedTrace.length > 0 ? getSpeedAt(focusedTrace, hoverTrackProgress) : 0;
    const activeComparisonSpeed = comparisonTrace.length > 0 ? getSpeedAt(comparisonTrace, hoverTrackProgress) : 0;
    const activeDelta = activeFocusedSpeed - activeComparisonSpeed;

    return (
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur-md h-full">
            {/* Header & Controls */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Ghost Trace</h3>
                        <span className="text-[10px] text-zinc-600">SPEED TELEMETRY</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono mt-1">
                        <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                            <span className="text-zinc-400">LDR</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                            <span className="text-zinc-400">YOU</span>
                        </div>
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button
                        onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    >
                        -
                    </button>
                    <span className="text-[10px] font-mono text-zinc-500 w-8 text-center">{zoomLevel}x</span>
                    <button
                        onClick={() => setZoomLevel(Math.min(10, zoomLevel + 1))}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Main Chart Area */}
            <div
                ref={containerRef}
                className="relative flex-1 w-full min-h-[200px] overflow-hidden rounded border border-zinc-800/50 bg-zinc-900/30 cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <svg
                    viewBox={`${viewX} 0 ${viewWidth} ${height}`}
                    className="h-full w-full"
                    preserveAspectRatio="none"
                >
                    {/* Y-Axis Grid Lines (Static relative to height, but we draw them in world space) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                        <line
                            key={ratio}
                            x1={0}
                            y1={height * ratio}
                            x2={width}
                            y2={height * ratio}
                            stroke="#333"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}

                    {/* X-Axis Grid Lines (Every 10%) */}
                    {Array.from({ length: 11 }).map((_, i) => (
                        <line
                            key={i}
                            x1={width * (i / 10)}
                            y1={0}
                            x2={width * (i / 10)}
                            y2={height}
                            stroke="#333"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}

                    {/* Comparison Trace (Red) */}
                    <polyline
                        points={comparisonPath}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeOpacity="0.8"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Focused Trace (White) */}
                    <path
                        d={focusedFilledPath}
                        fill="#fff"
                        fillOpacity="0.05"
                        stroke="none"
                    />
                    <polyline
                        points={focusedPath}
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Active Cursor Line (Hover or Current) */}
                    <line
                        x1={hoverDataX}
                        y1="0"
                        x2={hoverDataX}
                        y2={height}
                        stroke={hoverX !== null ? "#a1a1aa" : "#f59e0b"} // Zinc-400 if hover, Amber if auto
                        strokeWidth="1.5"
                        strokeDasharray={hoverX !== null ? "0" : "4 2"}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>

                {/* Axis Labels Overlay (Absolute positioned) */}
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-1 pointer-events-none">
                    <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950/80 px-1">{maxSpeed}</span>
                    <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950/80 px-1">{Math.round(maxSpeed * 0.75)}</span>
                    <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950/80 px-1">{Math.round(maxSpeed * 0.5)}</span>
                    <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950/80 px-1">{Math.round(maxSpeed * 0.25)}</span>
                    <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950/80 px-1">0</span>
                </div>

                {/* Floating Tooltip */}
                <div className="absolute top-2 right-2 flex flex-col items-end pointer-events-none bg-zinc-950/90 p-2 rounded border border-zinc-800 backdrop-blur">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            {hoverX !== null ? 'Cursor' : 'Live'}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                            {(hoverTrackProgress * 100).toFixed(1)}% Lap
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                        <span className="text-[10px] text-zinc-500">You</span>
                        <span className="text-xs font-mono font-bold text-white">
                            {Math.round(activeFocusedSpeed)} <span className="text-[9px] font-normal text-zinc-600">mph</span>
                        </span>

                        <span className="text-[10px] text-zinc-500">Ldr</span>
                        <span className="text-xs font-mono font-bold text-red-400">
                            {Math.round(activeComparisonSpeed)} <span className="text-[9px] font-normal text-zinc-600">mph</span>
                        </span>

                        <span className="text-[10px] text-zinc-500">Delta</span>
                        <span className={`text-xs font-mono font-bold ${activeDelta >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                            {activeDelta > 0 ? '+' : ''}{Math.round(activeDelta)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

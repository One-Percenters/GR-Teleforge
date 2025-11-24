'use client';

import { motion } from 'framer-motion';

export type TireDegradationData = {
    driverId: number;
    lapTimes: number[];
    lapNumbers: number[];
    degradationRate: number;
    optimalPitLap: number;
    optimalPitWindow: [number, number];
    confidence: number;
    baselineTime: number;
    totalLaps: number;
};

export type TireDegradationProps = {
    focusedCarNumber?: number;
    tireDegData?: Record<string, TireDegradationData>;
};

export function TireDegradation({ focusedCarNumber, tireDegData }: TireDegradationProps) {
    const driverData = focusedCarNumber && tireDegData ? tireDegData[String(focusedCarNumber)] : null;

    if (!driverData) {
        return (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Tire Status</span>
                <span className="text-[10px] text-zinc-700 mt-1">No Data Available</span>
            </div>
        );
    }

    const { lapTimes, degradationRate, optimalPitWindow, baselineTime } = driverData;

    // Calculate metrics
    const currentLapTime = lapTimes[lapTimes.length - 1] || baselineTime;
    const totalDegradation = Math.max(0, currentLapTime - baselineTime);

    // Calculate "Health" percentage (inverse of degradation)
    // Assuming 2.0s drop-off is 0% health. 
    const baseHealth = Math.max(0, Math.min(100, 100 - (totalDegradation / 2.5) * 100));

    // Simulate per-tire wear (Fronts usually wear faster)
    const tires = {
        fl: Math.max(0, baseHealth - 2),
        fr: Math.max(0, baseHealth - 3), // Right side often wears more on clockwise tracks
        rl: Math.max(0, baseHealth),
        rr: Math.max(0, baseHealth - 1),
    };

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Tire Health</h3>
                    <span className="text-[10px] text-zinc-600">SOFT</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                    Deg: <span className="text-zinc-300">+{totalDegradation.toFixed(2)}s</span>
                </div>
            </div>

            {/* 4-Tire Grid Layout */}
            <div className="grid grid-cols-2 gap-2">
                <TireWidget label="FL" health={tires.fl} />
                <TireWidget label="FR" health={tires.fr} />
                <TireWidget label="RL" health={tires.rl} />
                <TireWidget label="RR" health={tires.rr} />
            </div>

            {/* Strategy Footer */}
            <div className="flex items-center justify-between rounded bg-zinc-900/50 px-3 py-2 border border-zinc-800/50">
                <span className="text-[10px] font-medium text-zinc-500 uppercase">Est. Pit Window</span>
                <span className="text-xs font-bold text-amber-400 tracking-wide">
                    Laps {optimalPitWindow[0]}-{optimalPitWindow[1]}
                </span>
            </div>
        </div>
    );
}

function TireWidget({ label, health }: { label: string, health: number }) {
    // Color logic
    let colorClass = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (health < 70) colorClass = 'text-blue-400 border-blue-500/20 bg-blue-500/5';
    if (health < 40) colorClass = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    if (health < 20) colorClass = 'text-red-400 border-red-500/20 bg-red-500/5';

    return (
        <div className={`flex items-center justify-between rounded border px-3 py-2 ${colorClass} transition-colors duration-500`}>
            <span className="text-[10px] font-bold opacity-70">{label}</span>
            <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-bold font-mono tracking-tight">{health.toFixed(0)}</span>
                <span className="text-[9px] opacity-60">%</span>
            </div>
        </div>
    );
}

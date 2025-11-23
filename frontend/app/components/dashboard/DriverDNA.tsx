import { useState, useEffect } from 'react';

type DriverProfile = {
    vehicle_id: string;
    vehicle_number: number;
    pca_analysis: {
        pc1_pace: number;
        pc2_style: number;
        pc3_aggression: number;
        percentile_pace: number;
    };
    skill_tags: string[];
    cluster_id: number;
    cluster_name: string;
};

type DriverDNAProps = {
    focusedCarNumber: number;
};

export function DriverDNA({ focusedCarNumber }: DriverDNAProps) {
    const [profiles, setProfiles] = useState<Record<string, DriverProfile>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/data/driver_profiles.json')
            .then(res => res.json())
            .then(data => {
                setProfiles(data);
                setLoading(false);
            })
            .catch(err => console.error("Failed to load profiles", err));
    }, []);

    if (loading) return <div className="h-full flex items-center justify-center text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">Loading DNA...</div>;

    // Find profile for focused car
    const profileKey = Object.keys(profiles).find(key => profiles[key].vehicle_number === focusedCarNumber);
    const profile = profileKey ? profiles[profileKey] : null;

    if (!profile) return (
        <div className="h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <span className="text-2xl mb-2">🧬</span>
            <span>No DNA Profile for #{focusedCarNumber}</span>
        </div>
    );

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg h-full backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                <span className="text-red-500 animate-pulse">🧬</span> Driver DNA
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Archetype</div>
                    <div className="text-sm font-bold text-white leading-tight">{profile.cluster_name}</div>
                </div>

                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pace Rating</div>
                    <div className="text-2xl font-black text-red-500">{profile.pca_analysis.percentile_pace}</div>
                </div>
            </div>

            <div className="mb-6">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Skill Tags</div>
                <div className="flex flex-wrap gap-2">
                    {profile.skill_tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-zinc-800/80 text-[10px] uppercase font-bold text-zinc-300 rounded border border-zinc-700 shadow-sm">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* DNA Bars */}
            <div className="space-y-3">
                <DNA_Bar label="Pace" value={profile.pca_analysis.pc1_pace} color="bg-blue-500" />
                <DNA_Bar label="Style" value={profile.pca_analysis.pc2_style} color="bg-emerald-500" />
                <DNA_Bar label="Aggression" value={profile.pca_analysis.pc3_aggression} color="bg-orange-500" />
            </div>
        </div>
    );
}

function DNA_Bar({ label, value, color }: { label: string, value: number, color: string }) {
    // Normalize value roughly between -3 and 3 to 0-100%
    // Center is 50%
    // Scale factor: 3.0 -> 100% (so 50 + 3*16 = 98)
    const scale = 16;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                <span>{label}</span>
                <span className="font-mono">{value > 0 ? '+' : ''}{value.toFixed(2)}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                {/* Center Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600 z-10"></div>

                {/* Bar */}
                <div
                    className={`h-full ${color} absolute transition-all duration-500`}
                    style={{
                        width: `${Math.min(50, Math.abs(value * scale))}%`,
                        left: value < 0 ? `${50 - Math.min(50, Math.abs(value * scale))}%` : '50%'
                    }}
                ></div>
            </div>
        </div>
    );
}

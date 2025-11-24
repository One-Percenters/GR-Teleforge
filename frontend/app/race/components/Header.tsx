'use client';

import Link from 'next/link';
import type { TrackName, RaceNumber } from '../types';

interface HeaderProps {
  currentTrack: TrackName;
  currentRace: RaceNumber;
  availableTracks: TrackName[];
  onTrackChange: (track: TrackName) => void;
  onRaceChange: (race: RaceNumber) => void;
}

export function Header({
  currentTrack,
  currentRace,
  availableTracks,
  onTrackChange,
  onRaceChange
}: HeaderProps) {
  // Get next/prev track
  const switchTrack = (direction: 'prev' | 'next') => {
    const currentIdx = availableTracks.indexOf(currentTrack);
    const newIdx = direction === 'next' 
      ? (currentIdx + 1) % availableTracks.length 
      : (currentIdx - 1 + availableTracks.length) % availableTracks.length;
    onTrackChange(availableTracks[newIdx]);
  };

  return (
    <>
      {/* Back button */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-50 text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-2 group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span>
        <span>Back</span>
      </Link>

      {/* Track Name - Floating, minimal */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
        <button 
          onClick={() => switchTrack('prev')}
          className="text-zinc-500 hover:text-white transition-all text-2xl px-3 py-2 hover:bg-white/10 rounded-lg"
          aria-label="Previous track"
        >
          ←
        </button>
        <h1 className="text-3xl font-black tracking-wider text-white uppercase min-w-[200px] text-center">
          {currentTrack}
        </h1>
        <button 
          onClick={() => switchTrack('next')}
          className="text-zinc-500 hover:text-white transition-all text-2xl px-3 py-2 hover:bg-white/10 rounded-lg"
          aria-label="Next track"
        >
          →
        </button>
      </div>

      {/* Race Tabs - Below track name */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex gap-8">
        {(['R1', 'R2'] as const).map((race) => (
          <button
            key={race}
            onClick={() => onRaceChange(race)}
            className={`text-lg font-bold tracking-wider transition-all pb-1 ${
              currentRace === race 
                ? 'text-white border-b-2 border-red-500' 
                : 'text-zinc-600 hover:text-zinc-400 border-b-2 border-transparent'
            }`}
          >
            Race {race.slice(1)}
          </button>
        ))}
      </div>
    </>
  );
}


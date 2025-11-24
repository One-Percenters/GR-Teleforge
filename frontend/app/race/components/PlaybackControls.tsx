'use client';

import { useCallback, useRef } from 'react';
import type { PlaybackState } from '../types';

interface PlaybackControlsProps {
  state: PlaybackState;
  progress: number;
  currentLap: number;
  totalLaps: number;
  eventCount: number;
  trackName: string;
  raceNumber: string;
  onToggle: () => void;
  onSeekPercent: (percent: number) => void;
  onSetSpeed: (speed: number) => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4];

export function PlaybackControls({
  state,
  progress,
  currentLap,
  totalLaps,
  eventCount,
  trackName,
  raceNumber,
  onToggle,
  onSeekPercent,
  onSetSpeed
}: PlaybackControlsProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = (clickX / rect.width) * 100;
    onSeekPercent(Math.max(0, Math.min(100, percent)));
  }, [onSeekPercent]);

  // Handle progress bar drag
  const handleProgressDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleProgressClick(e);
  }, [handleProgressClick]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {/* Main control bar */}
      <div className="flex items-center gap-4 bg-[#0d0d0d]/95 backdrop-blur-sm px-6 py-3 rounded-2xl border border-zinc-800/50 shadow-2xl">
        {/* Lap indicator */}
        <div className="flex flex-col items-center px-3 border-r border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Lap</span>
          <span className="text-lg font-mono font-bold text-white">
            {currentLap}<span className="text-zinc-600">/{totalLaps}</span>
          </span>
        </div>

        {/* Time */}
        <span className="text-sm font-mono text-zinc-400 w-14 text-right">
          {formatTime(state.currentTime)}
        </span>

        {/* Play/Pause */}
        <button 
          onClick={onToggle}
          className="w-12 h-12 rounded-full bg-[#D71921] hover:bg-[#ff2a35] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/30"
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress bar */}
        <div 
          ref={progressBarRef}
          className="w-56 h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative group"
          onClick={handleProgressClick}
          onMouseMove={handleProgressDrag}
        >
          {/* Lap markers */}
          {Array.from({ length: totalLaps - 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 w-px h-full bg-zinc-700"
              style={{ left: `${((i + 1) / totalLaps) * 100}%` }}
            />
          ))}
          
          {/* Progress fill */}
          <div 
            className="h-full bg-gradient-to-r from-[#D71921] to-[#ff4d4d] transition-all duration-75 relative"
            style={{ width: `${progress}%` }}
          >
            {/* Glowing tip */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Duration */}
        <span className="text-sm font-mono text-zinc-500 w-14">
          {formatTime(state.duration)}
        </span>

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-800" />

        {/* Speed control */}
        <div className="flex items-center gap-1.5">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
                state.speed === speed 
                  ? 'bg-[#D71921] text-white' 
                  : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Info text */}
      <p className="text-center text-[10px] text-zinc-600 mt-2 tracking-wider">
        {eventCount} OVERTAKES • {trackName.toUpperCase()} {raceNumber}
      </p>
    </div>
  );
}

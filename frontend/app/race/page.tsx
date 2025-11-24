'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { TrackCanvas } from './components/TrackCanvas';
import { LeftPanel, RightPanel, PlaybackControls, Header } from './components';
import { useRaceData } from './hooks/useRaceData';
import type { TrackName, RaceNumber, ProcessedEvent } from './types';

const DRIVER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#71717a', '#64748b', '#475569'
];

const AVAILABLE_TRACKS: TrackName[] = ['Barber', 'Indianapolis'];
const TOTAL_LAPS = 15;
const RACE_DURATION = 45 * 60 * 1000;

export default function RacePage() {
  const [currentTrack, setCurrentTrack] = useState<TrackName>('Barber');
  const [currentRace, setCurrentRace] = useState<RaceNumber>('R1');
  const [selectedEvent, setSelectedEvent] = useState<ProcessedEvent | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [activeEvents, setActiveEvents] = useState<ProcessedEvent[]>([]);

  const {
    isLoading,
    error,
    currentTrackData,
    currentDrivers,
    processedEvents
  } = useRaceData(currentTrack, currentRace);

  const getDriverColor = useCallback((driverId: string) => {
    const idx = currentDrivers.indexOf(driverId);
    return idx >= 0 ? DRIVER_COLORS[idx % DRIVER_COLORS.length] : '#666';
  }, [currentDrivers]);

  const handleTrackChange = useCallback((track: TrackName) => {
    setCurrentTrack(track);
    setSelectedEvent(null);
    setSelectedDriver(null);
    setRightPanelOpen(false);
  }, []);

  const handleRaceChange = useCallback((race: RaceNumber) => {
    setCurrentRace(race);
    setSelectedEvent(null);
    setRightPanelOpen(false);
  }, []);

  const handleEventClick = useCallback((event: ProcessedEvent) => {
    setSelectedEvent(event);
    setRightPanelOpen(true);
  }, []);

  const handleDriverClick = useCallback((driverId: string) => {
    setSelectedDriver(prev => prev === driverId ? null : driverId);
  }, []);

  const handleCloseRightPanel = useCallback(() => {
    setRightPanelOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleTimeUpdate = useCallback((time: number, lap: number) => {
    setCurrentTime(time);
    setCurrentLap(lap);
  }, []);

  const handleEventTrigger = useCallback((event: ProcessedEvent) => {
    setActiveEvents(prev => {
      const exists = prev.some(e => e.Critical_Event_ID === event.Critical_Event_ID);
      if (exists) return prev;
      return [event, ...prev].slice(0, 15);
    });
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const seekPercent = useCallback((percent: number) => {
    // Would need to expose a ref to the canvas time
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      if (e.code === 'KeyL') setLeftPanelOpen(prev => !prev);
      if (e.code === 'Escape') {
        setRightPanelOpen(false);
        setSelectedEvent(null);
        setSelectedDriver(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#D71921] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !currentTrackData) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Error</p>
          <Link href="/" className="text-[#D71921]">← Back</Link>
        </div>
      </div>
    );
  }

  const progress = (currentTime / RACE_DURATION) * 100;

  return (
    <div className="min-h-screen bg-[#080808] overflow-hidden">
      {/* Full screen canvas */}
      <TrackCanvas
        trackData={currentTrackData}
        drivers={currentDrivers}
        events={processedEvents}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        selectedDriver={selectedDriver}
        selectedEvent={selectedEvent}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onEventClick={handleEventClick}
        onDriverClick={handleDriverClick}
        getDriverColor={getDriverColor}
        onTimeUpdate={handleTimeUpdate}
        onEventTrigger={handleEventTrigger}
      />

      {/* GR Branding */}
      <div className="fixed top-5 right-6 z-50 flex items-center gap-2">
        <span className="text-2xl font-black">
          <span className="text-white">G</span>
          <span className="text-[#D71921]">R</span>
        </span>
        <span className="text-xs text-zinc-500 font-bold tracking-wider">TELEFORGE</span>
      </div>

      {/* Header */}
      <Header
        currentTrack={currentTrack}
        currentRace={currentRace}
        availableTracks={AVAILABLE_TRACKS}
        onTrackChange={handleTrackChange}
        onRaceChange={handleRaceChange}
      />

      {/* Left Panel Toggle */}
      <button
        onClick={() => setLeftPanelOpen(prev => !prev)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 w-6 h-20 bg-zinc-900/80 hover:bg-zinc-800 border-r border-zinc-700 rounded-r flex items-center justify-center text-zinc-400 hover:text-white transition-all"
      >
        {leftPanelOpen ? '‹' : '›'}
      </button>

      {/* Left Panel */}
      <div 
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-300 ${
          leftPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 320 }}
      >
        <div className="h-full bg-[#0a0a0a]/95 backdrop-blur-sm border-r border-zinc-800">
          <LeftPanel
            drivers={currentDrivers}
            selectedDriver={selectedDriver}
            events={processedEvents}
            activeEvents={activeEvents}
            trackName={currentTrack}
            raceNumber={currentRace}
            currentLap={currentLap}
            totalLaps={TOTAL_LAPS}
            onDriverSelect={handleDriverClick}
            getDriverColor={getDriverColor}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div 
        className={`fixed right-0 top-0 h-full z-40 transition-transform duration-300 ${
          rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 380 }}
      >
        <div className="h-full bg-[#0a0a0a]/95 backdrop-blur-sm border-l border-zinc-800">
          <RightPanel
            isOpen={rightPanelOpen}
            event={selectedEvent}
            drivers={currentDrivers}
            trackName={currentTrack}
            raceNumber={currentRace}
            onClose={handleCloseRightPanel}
            getDriverColor={getDriverColor}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-sm px-6 py-3 rounded-full border border-zinc-800">
          {/* Lap */}
          <div className="text-center px-3 border-r border-zinc-700">
            <span className="text-[10px] text-zinc-500 uppercase block">Lap</span>
            <span className="text-lg font-bold text-white">{currentLap}<span className="text-zinc-600">/{TOTAL_LAPS}</span></span>
          </div>

          {/* Time */}
          <span className="text-sm font-mono text-zinc-400 w-14">
            {Math.floor(currentTime / 60000).toString().padStart(2, '0')}:
            {Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')}
          </span>

          {/* Play/Pause */}
          <button 
            onClick={togglePlayback}
            className="w-12 h-12 rounded-full bg-[#D71921] hover:bg-[#ff2a35] flex items-center justify-center transition-all"
          >
            {isPlaying ? (
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

          {/* Progress */}
          <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#D71921]" style={{ width: `${progress}%` }} />
          </div>

          {/* Duration */}
          <span className="text-sm font-mono text-zinc-500">45:00</span>

          {/* Speed */}
          <div className="flex gap-1 border-l border-zinc-700 pl-4">
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded ${
                  playbackSpeed === speed 
                    ? 'bg-[#D71921] text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-600 mt-2">
          {processedEvents.length} OVERTAKES • {currentTrack.toUpperCase()} {currentRace} • SPACE to play/pause
        </p>
      </div>
    </div>
  );
}

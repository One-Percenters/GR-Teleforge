'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TrackCanvas } from './components/TrackCanvas';
import { LeftPanel, RightPanel, Header } from './components';
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
const RACE_DURATION = 45 * 60 * 1000; // 45 minutes in ms

export default function RacePage() {
  const [currentTrack, setCurrentTrack] = useState<TrackName>('Barber');
  const [currentRace, setCurrentRace] = useState<RaceNumber>('R1');
  const [selectedEvent, setSelectedEvent] = useState<ProcessedEvent | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true); // Default open for weather

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [activeEvents, setActiveEvents] = useState<ProcessedEvent[]>([]);

  // Zoom and tilt
  const [zoom, setZoom] = useState(1);
  const [tilt, setTilt] = useState(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

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
    setCurrentTime(0);
    setCurrentLap(1);
    setActiveEvents([]);
  }, []);

  const handleRaceChange = useCallback((race: RaceNumber) => {
    setCurrentRace(race);
    setSelectedEvent(null);
    setCurrentTime(0);
    setCurrentLap(1);
    setActiveEvents([]);
  }, []);

  const handleEventClick = useCallback((event: ProcessedEvent) => {
    setSelectedEvent(event);
    setRightPanelOpen(true);
  }, []);

  const handleDriverClick = useCallback((driverId: string | null) => {
    if (!driverId) {
      setSelectedDriver(null);
      return;
    }
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

  const seekToLap = useCallback((lap: number) => {
    const newTime = ((lap - 1) / TOTAL_LAPS) * RACE_DURATION;
    setCurrentTime(newTime);
    setCurrentLap(lap);
    setActiveEvents([]);
  }, []);

  const seekPercent = useCallback((percent: number) => {
    const newTime = (percent / 100) * RACE_DURATION;
    setCurrentTime(newTime);
    setCurrentLap(Math.min(TOTAL_LAPS, Math.floor((percent / 100) * TOTAL_LAPS) + 1));
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(3, z * 1.2)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.5, z / 1.2)), []);
  const handleResetZoom = useCallback(() => { setZoom(1); setTilt(0); }, []);

  // Mouse drag for tilt
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const deltaY = e.clientY - dragStartRef.current.y;
      setTilt(t => Math.max(-30, Math.min(30, t + deltaY * 0.2)));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.code === 'KeyL') setLeftPanelOpen(p => !p);
      if (e.code === 'KeyR') setRightPanelOpen(p => !p);
      if (e.code === 'Equal' || e.code === 'NumpadAdd') handleZoomIn();
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') handleZoomOut();
      if (e.code === 'Digit0') handleResetZoom();
      if (e.code === 'Escape') {
        setSelectedEvent(null);
        setSelectedDriver(null);
      }
      // Lap navigation
      if (e.code === 'ArrowRight' && currentLap < TOTAL_LAPS) seekToLap(currentLap + 1);
      if (e.code === 'ArrowLeft' && currentLap > 1) seekToLap(currentLap - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLap, handleZoomIn, handleZoomOut, handleResetZoom, seekToLap]);

  // Wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.001)));
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
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
    <div
      className="min-h-screen bg-[#080808] overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Full screen canvas with zoom/tilt */}
      <div
        className="fixed inset-0 transition-transform duration-200"
        style={{
          transform: `scale(${zoom}) perspective(1000px) rotateX(${tilt}deg)`,
          transformOrigin: 'center center'
        }}
      >
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
          currentTimeOverride={currentTime}
        />
      </div>


      {/* Header */}
      <Header
        currentTrack={currentTrack}
        currentRace={currentRace}
        availableTracks={AVAILABLE_TRACKS}
        onTrackChange={handleTrackChange}
        onRaceChange={handleRaceChange}
      />

      {/* Zoom Controls */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-1">
        <button onClick={handleZoomIn} className="w-8 h-8 bg-zinc-900/80 hover:bg-zinc-800 rounded text-white text-lg border border-zinc-700">+</button>
        <button onClick={handleZoomOut} className="w-8 h-8 bg-zinc-900/80 hover:bg-zinc-800 rounded text-white text-lg border border-zinc-700">−</button>
        <button onClick={handleResetZoom} className="w-8 h-8 bg-zinc-900/80 hover:bg-zinc-800 rounded text-zinc-400 text-xs border border-zinc-700">1:1</button>
        <div className="text-[10px] text-zinc-500 text-center mt-1">{Math.round(zoom * 100)}%</div>
        {tilt !== 0 && <div className="text-[10px] text-zinc-500 text-center">{tilt.toFixed(0)}°</div>}
      </div>

      {/* Left Panel Toggle - always visible, moves with panel */}
      <button
        onClick={() => setLeftPanelOpen(prev => !prev)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 w-6 h-20 bg-zinc-900/80 hover:bg-zinc-800 border-r border-zinc-700 rounded-r flex items-center justify-center text-zinc-400 hover:text-white transition-all ${
          leftPanelOpen ? 'left-[340px]' : 'left-0'
        }`}
      >
        {leftPanelOpen ? '‹' : '›'}
      </button>

      {/* Left Panel */}
      <div
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-300 ${leftPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 340 }}
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

      {/* Right Panel Toggle */}
      <button
        onClick={() => setRightPanelOpen(prev => !prev)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 w-6 h-20 bg-zinc-900/80 hover:bg-zinc-800 border-l border-zinc-700 rounded-l flex items-center justify-center text-zinc-400 hover:text-white"
      >
        {rightPanelOpen ? '›' : '‹'}
      </button>

      {/* Right Panel */}
      <div
        className={`fixed right-0 top-0 h-full z-40 transition-transform duration-300 ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 360 }}
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
        <div className="flex items-center gap-3 bg-[#0a0a0a]/90 backdrop-blur-sm px-5 py-3 rounded-full border border-zinc-800">
          {/* Lap Selector */}
          <div className="flex items-center gap-1 pr-3 border-r border-zinc-700">
            <button
              onClick={() => currentLap > 1 && seekToLap(currentLap - 1)}
              className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs"
              disabled={currentLap <= 1}
            >
              ‹
            </button>
            <div className="text-center w-16">
              <span className="text-[9px] text-zinc-500 uppercase block">Lap</span>
              <span className="text-lg font-bold text-white">{currentLap}<span className="text-zinc-600 text-sm">/{TOTAL_LAPS}</span></span>
            </div>
            <button
              onClick={() => currentLap < TOTAL_LAPS && seekToLap(currentLap + 1)}
              className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs"
              disabled={currentLap >= TOTAL_LAPS}
            >
              ›
            </button>
          </div>

          {/* Time */}
          <span className="text-sm font-mono text-zinc-400 w-12">
            {Math.floor(currentTime / 60000).toString().padStart(2, '0')}:
            {Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')}
          </span>

          {/* Play/Pause */}
          <button
            onClick={togglePlayback}
            className="w-11 h-11 rounded-full bg-[#D71921] hover:bg-[#ff2a35] flex items-center justify-center transition-all"
          >
            {isPlaying ? (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div
            className="w-40 h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = ((e.clientX - rect.left) / rect.width) * 100;
              seekPercent(percent);
            }}
          >
            <div className="h-full bg-[#D71921] transition-all" style={{ width: `${progress}%` }} />
          </div>

          {/* Duration */}
          <span className="text-sm font-mono text-zinc-500">45:00</span>

          {/* Speed */}
          <div className="flex gap-1 pl-3 border-l border-zinc-700">
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded transition-all ${playbackSpeed === speed ? 'bg-[#D71921] text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[9px] text-zinc-600 mt-2">
          {processedEvents.length} OVERTAKES • {currentTrack.toUpperCase()} {currentRace} • SPACE play • ←→ laps • SHIFT+drag tilt • Ctrl+scroll zoom
        </p>
      </div>
    </div>
  );
}

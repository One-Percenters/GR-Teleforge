'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRaceData } from './hooks/useRaceData';
import { usePlayback } from './hooks/usePlayback';
import { Header, TrackView, LeftPanel, RightPanel, PlaybackControls } from './components';
import type { TrackName, RaceNumber, ProcessedEvent } from './types';

// Color palette for drivers
const DRIVER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#71717a', '#64748b', '#475569',
  '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a',
  '#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#c026d3'
];

const AVAILABLE_TRACKS: TrackName[] = ['Barber', 'Indianapolis'];
const TOTAL_LAPS = 15;

export default function RacePage() {
  const [currentTrack, setCurrentTrack] = useState<TrackName>('Barber');
  const [currentRace, setCurrentRace] = useState<RaceNumber>('R1');
  const [selectedEvent, setSelectedEvent] = useState<ProcessedEvent | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const {
    isLoading,
    error,
    currentTrackData,
    currentDrivers,
    processedEvents,
    raceDuration
  } = useRaceData(currentTrack, currentRace);

  const handleEventTrigger = useCallback((event: ProcessedEvent) => {
    setSelectedEvent(event);
    setRightPanelOpen(true);
  }, []);

  const {
    state: playbackState,
    toggle: togglePlayback,
    seekPercent,
    setSpeed,
    activeEvents,
    progress
  } = usePlayback({
    duration: raceDuration,
    events: processedEvents,
    onEventTrigger: handleEventTrigger
  });

  const currentLap = useMemo(() => {
    return Math.min(TOTAL_LAPS, Math.floor((progress / 100) * TOTAL_LAPS) + 1);
  }, [progress]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D71921] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading race...</p>
        </div>
      </div>
    );
  }

  if (error || !currentTrackData) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Error</p>
          <p className="text-zinc-500">{error || 'No data'}</p>
          <Link href="/" className="text-[#D71921] mt-4 inline-block hover:underline">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-hidden">
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

      {/* Left Panel */}
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

      {/* Main Track View - Straight top-down */}
      <div className="fixed inset-0 flex items-center justify-center pl-80 pt-24 pb-28 pr-4">
        <div className="w-full h-full max-w-4xl">
          <TrackView
            trackData={currentTrackData}
            drivers={currentDrivers}
            events={processedEvents}
            activeEvents={activeEvents}
            selectedEvent={selectedEvent}
            selectedDriver={selectedDriver}
            currentTime={playbackState.currentTime}
            raceDuration={raceDuration}
            onEventClick={handleEventClick}
            onDriverClick={handleDriverClick}
            getDriverColor={getDriverColor}
          />
        </div>
      </div>

      {/* Right Panel */}
      <RightPanel
        isOpen={rightPanelOpen}
        event={selectedEvent}
        drivers={currentDrivers}
        trackName={currentTrack}
        raceNumber={currentRace}
        onClose={handleCloseRightPanel}
        getDriverColor={getDriverColor}
      />

      {/* Playback Controls */}
      <PlaybackControls
        state={playbackState}
        progress={progress}
        currentLap={currentLap}
        totalLaps={TOTAL_LAPS}
        eventCount={processedEvents.length}
        trackName={currentTrack}
        raceNumber={currentRace}
        onToggle={togglePlayback}
        onSeekPercent={seekPercent}
        onSetSpeed={setSpeed}
      />
    </div>
  );
}

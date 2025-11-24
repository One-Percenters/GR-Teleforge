'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRaceData } from './hooks/useRaceData';
import { usePlayback } from './hooks/usePlayback';
import { Header, RoadView, MiniMap, LeftPanel, PlaybackControls } from './components';
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
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const {
    isLoading,
    error,
    currentTrackData,
    currentDrivers,
    processedEvents,
    raceDuration
  } = useRaceData(currentTrack, currentRace);

  const {
    state: playbackState,
    toggle: togglePlayback,
    seekPercent,
    setSpeed,
    activeEvents,
    progress
  } = usePlayback({
    duration: raceDuration,
    events: processedEvents
  });

  // Current lap
  const currentLap = useMemo(() => {
    return Math.min(TOTAL_LAPS, Math.floor((progress / 100) * TOTAL_LAPS) + 1);
  }, [progress]);

  // Camera view position (follows leader)
  const viewPosition = useMemo(() => {
    return (playbackState.currentTime / raceDuration) % 1;
  }, [playbackState.currentTime, raceDuration]);

  const getDriverColor = useCallback((driverId: string) => {
    const idx = currentDrivers.indexOf(driverId);
    return idx >= 0 ? DRIVER_COLORS[idx % DRIVER_COLORS.length] : '#666';
  }, [currentDrivers]);

  const handleTrackChange = useCallback((track: TrackName) => {
    setCurrentTrack(track);
    setSelectedDriver(null);
  }, []);

  const handleRaceChange = useCallback((race: RaceNumber) => {
    setCurrentRace(race);
  }, []);

  const handleDriverSelect = useCallback((driverId: string | null) => {
    setSelectedDriver(driverId);
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

      {/* Left Panel with event feed */}
      <LeftPanel
        drivers={currentDrivers}
        selectedDriver={selectedDriver}
        events={processedEvents}
        activeEvents={activeEvents}
        trackName={currentTrack}
        raceNumber={currentRace}
        currentLap={currentLap}
        totalLaps={TOTAL_LAPS}
        onDriverSelect={handleDriverSelect}
        getDriverColor={getDriverColor}
      />

      {/* Mini Map - Top Right */}
      <div className="fixed top-20 right-6 z-40">
        <MiniMap
          trackData={currentTrackData}
          drivers={currentDrivers}
          currentTime={playbackState.currentTime}
          raceDuration={raceDuration}
          getDriverColor={getDriverColor}
          viewPosition={viewPosition}
        />
      </div>

      {/* Main Road View */}
      <div className="fixed inset-0 flex items-center justify-center pl-80 pt-16 pb-24">
        <div className="w-full h-full max-w-5xl p-4">
          <RoadView
            trackData={currentTrackData}
            drivers={currentDrivers}
            currentTime={playbackState.currentTime}
            raceDuration={raceDuration}
            activeEvents={activeEvents}
            selectedDriver={selectedDriver}
            getDriverColor={getDriverColor}
          />
        </div>
      </div>

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

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { TracksGPS, EventsByRace, DriversByTrack, TrackName, RaceNumber, ProcessedEvent, TrackData } from '../types';

interface UseRaceDataReturn {
  tracks: TracksGPS | null;
  events: EventsByRace | null;
  drivers: DriversByTrack | null;
  isLoading: boolean;
  error: string | null;
  // Derived data
  currentTrackData: TrackData | null;
  currentDrivers: string[];
  processedEvents: ProcessedEvent[];
  raceDuration: number;
}

export function useRaceData(
  currentTrack: TrackName,
  currentRace: RaceNumber
): UseRaceDataReturn {
  const [tracks, setTracks] = useState<TracksGPS | null>(null);
  const [events, setEvents] = useState<EventsByRace | null>(null);
  const [drivers, setDrivers] = useState<DriversByTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [tracksRes, eventsRes, driversRes] = await Promise.all([
          fetch('/tracks_gps.json'),
          fetch('/events.json'),
          fetch('/drivers.json')
        ]);

        if (!tracksRes.ok || !eventsRes.ok || !driversRes.ok) {
          throw new Error('Failed to fetch race data');
        }

        const [tracksData, eventsData, driversData] = await Promise.all([
          tracksRes.json(),
          eventsRes.json(),
          driversRes.json()
        ]);

        setTracks(tracksData);
        setEvents(eventsData);
        setDrivers(driversData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Current track data
  const currentTrackData = useMemo(() => {
    return tracks?.[currentTrack] ?? null;
  }, [tracks, currentTrack]);

  // Current drivers list
  const currentDrivers = useMemo(() => {
    return drivers?.[currentTrack] ?? [];
  }, [drivers, currentTrack]);

  // Process events with timing information
  const processedEvents = useMemo(() => {
    const raceKey = `${currentTrack}_${currentRace}`;
    const raceEvents = events?.[raceKey] ?? [];

    if (raceEvents.length === 0) return [];

    // Parse timestamps and calculate relative times
    const startTime = new Date(raceEvents[0].Timestamp).getTime();
    const pathLength = currentTrackData?.path.length ?? 1;

    return raceEvents.map((event, index) => {
      const eventTime = new Date(event.Timestamp).getTime();
      const timeMs = eventTime - startTime;
      
      // Distribute events along track based on sector
      const sectorNum = parseInt(event.Sector_ID.replace('S_', ''), 10) || index;
      const pathProgress = (sectorNum % 50) / 50; // Wrap sectors to 0-1 range

      return {
        ...event,
        timeMs,
        pathProgress
      };
    });
  }, [events, currentTrack, currentRace, currentTrackData]);

  // Calculate race duration from events
  const raceDuration = useMemo(() => {
    if (processedEvents.length === 0) return 60000; // Default 1 minute
    const maxTime = Math.max(...processedEvents.map(e => e.timeMs));
    return Math.max(maxTime + 10000, 60000); // At least 1 minute, plus 10s buffer
  }, [processedEvents]);

  return {
    tracks,
    events,
    drivers,
    isLoading,
    error,
    currentTrackData,
    currentDrivers,
    processedEvents,
    raceDuration
  };
}


// Type definitions for race visualization

export interface TrackBounds {
  lat_min: number;
  lat_max: number;
  long_min: number;
  long_max: number;
}

export interface TrackData {
  path: [number, number][]; // [long, lat]
  startLine?: [number, number];
  bounds: TrackBounds;
}

export interface RaceEvent {
  Timestamp: string;
  Winner_ID: string;
  Loser_ID: string;
  Sector_ID: string;
  Track: string;
  Race_Number: string;
  Lap_Number: number;
  Critical_Event_ID: string;
  Reason_Code: string | null;
  Reason_Value?: number | null;
}

export interface TracksGPS {
  [key: string]: TrackData;
}

export interface EventsByRace {
  [key: string]: RaceEvent[];
}

export interface DriversByTrack {
  [key: string]: string[];
}

export type TrackName = 'Barber' | 'Indianapolis';
export type RaceNumber = 'R1' | 'R2';

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number; // ms from race start
  duration: number; // total race duration in ms
  speed: number; // playback speed multiplier
}

// Driver position at a point in time
export interface DriverPosition {
  driverId: string;
  pathProgress: number; // 0-1 position along track
  isInEvent: boolean;
  eventRole?: 'winner' | 'loser';
}

// Processed event with timing info
export interface ProcessedEvent extends RaceEvent {
  timeMs: number; // ms from race start
  pathProgress: number; // position along track 0-1
}


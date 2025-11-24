"use server";

import type {
  ClassResultRow,
  RaceResultRow,
  RaceSession,
  TelemetryFrame,
  WeatherSample,
} from "./schema";
import { loadTrackData, streamTelemetryFrames } from "./loader";

export interface PlaybackBootstrap {
  session: RaceSession;
  raceResults: RaceResultRow[];
  classResults: ClassResultRow[];
  latestWeather: WeatherSample | null;
  sampleTelemetry: TelemetryFrame | null;
}

export const getPlaybackBootstrap = async (
  session: RaceSession
): Promise<PlaybackBootstrap> => {
  const data = await loadTrackData(session);
  const telemetryIterator = streamTelemetryFrames(session, 1);
  const { value: sampleTelemetry } = await telemetryIterator.next();

  return {
    session,
    raceResults: data.raceResults,
    classResults: data.classResults,
    latestWeather: data.weather.at(-1) ?? null,
    sampleTelemetry: sampleTelemetry ?? null,
  };
};

export const getTrackDataForVisualization = async (session: RaceSession) =>
  loadTrackData(session);

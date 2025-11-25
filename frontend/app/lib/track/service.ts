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
  try {
    const data = await loadTrackData(session);
    let sampleTelemetry: TelemetryFrame | null = null;
    
    try {
      const telemetryIterator = streamTelemetryFrames(session, 1);
      const result = await telemetryIterator.next();
      sampleTelemetry = result.value ?? null;
    } catch (error) {
      console.warn("Could not load sample telemetry:", error);
      sampleTelemetry = null;
    }

    return {
      session,
      raceResults: data.raceResults ?? [],
      classResults: data.classResults ?? [],
      latestWeather: data.weather?.at(-1) ?? null,
      sampleTelemetry,
    };
  } catch (error) {
    console.error("Error in getPlaybackBootstrap:", error);
    return {
      session,
      raceResults: [],
      classResults: [],
      latestWeather: null,
      sampleTelemetry: null,
    };
  }
};

export const getTrackDataForVisualization = async (session: RaceSession) =>
  loadTrackData(session);

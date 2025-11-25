"use client";

import { useEffect, useRef } from "react";

import { useTelemetry } from "../components/dashboard/hooks";
import type { RaceSession, TelemetryFrame } from "@/app/lib/track";

type PlaybackEvent =
  | {
      bootstrap: {
        raceResults: Array<{ carNumber: string; position: number }>;
        classResults: Array<{
          carNumber: string;
          positionInClass: number;
          classType: string;
        }>;
        latestWeather: {
          airTempC: number | null;
          trackTempC: number | null;
          humidityPercent: number | null;
        } | null;
      };
    }
  | {
      frame: TelemetryFrame;
    };

export const usePlaybackClient = (
  session: RaceSession = "race1",
  isPlaying: boolean = false
) => {
  const setStandings = useTelemetry((state) => state.setStandings);
  const setWeather = useTelemetry((state) => state.setWeather);
  const updateCar = useTelemetry((state) => state.updateCar);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      return undefined;
    }

    const eventSource = new EventSource(`/api/playback?session=${session}`);
    sourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload: PlaybackEvent = JSON.parse(event.data);
        if ("bootstrap" in payload) {
          setStandings(
            payload.bootstrap.raceResults.map((row) => ({
              car: row.carNumber,
              driver: null,
              position: row.position.toString(),
            }))
          );
          setWeather(payload.bootstrap.latestWeather);
          
          // Initialize car from sample telemetry if available (single frame for one car)
          if (payload.bootstrap.sampleTelemetry) {
            const sample = payload.bootstrap.sampleTelemetry;
            updateCar(sample.carNumber, {
              carNumber: sample.carNumber,
              vboxLon: sample.vboxLon,
              vboxLat: sample.vboxLat,
              steeringAngle: sample.steeringAngleDeg,
              lapDistanceMeters: sample.lapDistanceMeters,
              sectorId: sample.sectorId,
              speedKph: sample.speedKph,
            });
          }
          return;
        }

        if ("frame" in payload) {
          const frame = payload.frame;
          updateCar(frame.carNumber, {
            carNumber: frame.carNumber,
            vboxLon: frame.vboxLon,
            vboxLat: frame.vboxLat,
            steeringAngle: frame.steeringAngleDeg,
            lapDistanceMeters: frame.lapDistanceMeters,
            sectorId: frame.sectorId,
            speedKph: frame.speedKph,
          });
        }
      } catch (error) {
        console.error("Error parsing playback event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
      sourceRef.current = null;
    };

    return () => {
      eventSource.close();
      sourceRef.current = null;
    };
  }, [isPlaying, session, setStandings, setWeather, updateCar]);
};

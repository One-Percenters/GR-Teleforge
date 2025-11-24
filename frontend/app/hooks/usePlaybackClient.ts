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
  options: { autoStart?: boolean } = { autoStart: true }
) => {
  const telemetryStore = useTelemetry();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!options.autoStart) {
      return undefined;
    }

    const eventSource = new EventSource(`/api/playback?session=${session}`);
    sourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const payload: PlaybackEvent = JSON.parse(event.data);
      if ("bootstrap" in payload) {
        telemetryStore.setStandings(
          payload.bootstrap.raceResults.map((row) => ({
            car: row.carNumber,
            driver: null,
            position: row.position.toString(),
          }))
        );
        telemetryStore.setWeather(payload.bootstrap.latestWeather);
        return;
      }

      if ("frame" in payload) {
        const frame = payload.frame;
        telemetryStore.updateCar(frame.carNumber, {
          carNumber: frame.carNumber,
          vboxLon: frame.vboxLon,
          vboxLat: frame.vboxLat,
          steeringAngle: frame.steeringAngleDeg,
          lapDistanceMeters: frame.lapDistanceMeters,
          sectorId: frame.sectorId,
          speedKph: frame.speedKph,
        });
      }
    };

    return () => {
      eventSource.close();
      sourceRef.current = null;
    };
  }, [options.autoStart, session, telemetryStore]);
};

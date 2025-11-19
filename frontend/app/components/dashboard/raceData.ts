export type RaceStatus = "PAUSED" | "GREEN" | "YELLOW" | "CHECKERED";

export type DriverState = {
  carNumber: number;
  driverName: string;
  /** Normalized position around the track from 0–1. */
  trackProgress: number;
  /** Gap to the leader in seconds (0 for leader). */
  gapToLeaderSeconds: number;
  /** 1-based race position, e.g. 1 = P1. */
  position: number;
  speedMph: number;
  throttlePercent: number;
  brakePercent: number;
  gear: number;
  steeringAngleDeg: number;
  rpm: number;
};

export type RaceFrame = {
  /** Elapsed time since race start, in milliseconds. */
  timestampMs: number;
  status: RaceStatus;
  lap: number;
  totalLaps: number;
  /** Overall race completion from 0–1. */
  raceProgress: number;
  drivers: DriverState[];
};

export type RaceTimeline = RaceFrame[];

/**
 * Small embedded sample from `.data/barber-motorsports-park/barber/R1_barber_lap_time.csv`.
 * We only use this to estimate lap count and average lap time so that the
 * dashboard playback roughly matches the real Barber race pacing without
 * needing to load the full CSV at runtime.
 */
const BARBER_R1_LAP_TIME_SAMPLE_CSV = `
expire_at,lap,meta_event,meta_session,meta_source,meta_time,original_vehicle_id,outing,timestamp,vehicle_id,vehicle_number
,2,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:40:41.927Z,GR86-002-000,0,2025-09-06T18:40:41.775Z,GR86-002-000,0
,3,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:42:28.189Z,GR86-002-000,0,2025-09-06T18:42:25.504Z,GR86-002-000,0
,4,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:44:42.583Z,GR86-002-000,0,2025-09-06T18:44:41.000Z,GR86-002-000,0
,5,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:46:44.358Z,GR86-002-000,0,2025-09-06T18:46:42.663Z,GR86-002-000,0
,6,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:48:22.301Z,GR86-002-000,0,2025-09-06T18:48:21.403Z,GR86-002-000,0
,7,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:50:01.292Z,GR86-002-000,0,2025-09-06T18:49:59.666Z,GR86-002-000,0
,8,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:51:42.817Z,GR86-002-000,0,2025-09-06T18:51:38.082Z,GR86-002-000,0
,9,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:53:48.034Z,GR86-002-000,0,2025-09-06T18:53:16.605Z,GR86-002-000,0
,10,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:54:55.675Z,GR86-002-000,0,2025-09-06T18:54:55.377Z,GR86-002-000,0
,11,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:56:36.361Z,GR86-002-000,0,2025-09-06T18:56:34.776Z,GR86-002-000,0
,12,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:58:15.348Z,GR86-002-000,0,2025-09-06T18:58:13.956Z,GR86-002-000,0
,13,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T18:59:52.822Z,GR86-002-000,0,2025-09-06T18:59:52.579Z,GR86-002-000,0
,14,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:01:34.320Z,GR86-002-000,0,2025-09-06T19:01:31.118Z,GR86-002-000,0
,15,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:03:09.911Z,GR86-002-000,0,2025-09-06T19:03:09.708Z,GR86-002-000,0
,16,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:04:51.106Z,GR86-002-000,0,2025-09-06T19:04:47.997Z,GR86-002-000,0
,17,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:06:27.256Z,GR86-002-000,0,2025-09-06T19:06:26.712Z,GR86-002-000,0
,18,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:08:06.443Z,GR86-002-000,0,2025-09-06T19:08:05.383Z,GR86-002-000,0
,19,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:09:46.584Z,GR86-002-000,0,2025-09-06T19:09:43.808Z,GR86-002-000,0
,20,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:11:22.885Z,GR86-002-000,0,2025-09-06T19:11:22.282Z,GR86-002-000,0
,21,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:13:04.812Z,GR86-002-000,0,2025-09-06T19:13:00.727Z,GR86-002-000,0
,22,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:14:40.264Z,GR86-002-000,0,2025-09-06T19:14:39.072Z,GR86-002-000,0
,23,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:16:18.563Z,GR86-002-000,0,2025-09-06T19:16:17.494Z,GR86-002-000,0
,24,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:17:57.809Z,GR86-002-000,0,2025-09-06T19:17:56.073Z,GR86-002-000,0
,25,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:19:35.363Z,GR86-002-000,0,2025-09-06T19:19:34.695Z,GR86-002-000,0
,26,I_R06_2025-09-07,R1,kafka:gr-raw,2025-09-06T19:21:13.889Z,GR86-002-000,0,2025-09-06T19:21:13.466Z,GR86-002-000,0
`.trim();

type BarberLapSample = {
  lap: number;
  timestampMs: number;
};

/**
 * Very small CSV helper: parse the embedded Barber lap-time sample and derive
 * a reasonable lap count and average lap time (in seconds). If anything goes
 * wrong, we fall back to a simple default so the UI still works.
 */
function getBarberLapStatsFromSample(): { totalLaps: number; avgLapTimeSeconds: number } {
  try {
    const lines = BARBER_R1_LAP_TIME_SAMPLE_CSV.split("\n");
    if (lines.length <= 1) {
      return { totalLaps: 5, avgLapTimeSeconds: 60 };
    }

    const header = lines[0].split(",");
    const lapIdx = header.indexOf("lap");
    const timestampIdx = header.indexOf("timestamp");

    if (lapIdx === -1 || timestampIdx === -1) {
      return { totalLaps: 5, avgLapTimeSeconds: 60 };
    }

    const rows: BarberLapSample[] = lines
      .slice(1)
      .map((line) => line.split(","))
      .map((cols) => {
        const lap = Number(cols[lapIdx]);
        const ts = Date.parse(cols[timestampIdx]);
        return {
          lap,
          timestampMs: Number.isFinite(ts) ? ts : NaN,
        };
      })
      .filter((r) => Number.isFinite(r.lap) && Number.isFinite(r.timestampMs));

    if (rows.length < 2) {
      return { totalLaps: 5, avgLapTimeSeconds: 60 };
    }

    // Ensure sorted by lap just in case.
    rows.sort((a, b) => a.lap - b.lap);

    const deltas: number[] = [];
    for (let i = 1; i < rows.length; i++) {
      const dt = rows[i].timestampMs - rows[i - 1].timestampMs;
      if (dt > 0) {
        deltas.push(dt);
      }
    }

    if (!deltas.length) {
      return { totalLaps: rows.length, avgLapTimeSeconds: 60 };
    }

    const avgDeltaMs =
      deltas.reduce((sum, v) => sum + v, 0) / deltas.length;

    return {
      totalLaps: rows[rows.length - 1].lap,
      avgLapTimeSeconds: avgDeltaMs / 1000,
    };
  } catch {
    // Safe fallback if sample parsing fails for any reason.
    return { totalLaps: 5, avgLapTimeSeconds: 60 };
  }
}

/**
 * Returns a deterministic mock race timeline you can replace with real API data later.
 * The shape is intentionally close to the UI props so you can map frames into the dashboard.
 */
export function getMockRaceTimeline(): RaceTimeline {
  const barberStats = getBarberLapStatsFromSample();
  const totalLaps = barberStats.totalLaps;
  const fps = 10; // Data points per second
  const lapTimeSeconds = barberStats.avgLapTimeSeconds || 60; // Approx lap time derived from Barber data
  const totalDurationSeconds = totalLaps * lapTimeSeconds;
  const totalFrames = totalDurationSeconds * fps;
  const frameDurationMs = 1000 / fps;

  // Define drivers with slightly different performance characteristics
  const driversConfig = [
    { carNumber: 13, driverName: "Westin Workman", skill: 1.0, aggression: 0.5 },
    { carNumber: 55, driverName: "Spike Kohlbecker", skill: 0.998, aggression: 0.7 },
    { carNumber: 7, driverName: "Jaxon Bell", skill: 0.995, aggression: 0.6 },
    { carNumber: 99, driverName: "Gresham Wagner", skill: 0.992, aggression: 0.8 },
  ] as const;

  const timeline: RaceTimeline = [];

  // Track cumulative distance for each driver to determine true position
  // Distance is in "laps"
  let driverDistances = driversConfig.map(() => 0);

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const timestampMs = frameIndex * frameDurationMs;
    const raceProgress = frameIndex / (totalFrames - 1);
    
    // Calculate leader's approximate lap for the frame context
    const currentLeaderDist = Math.max(...driverDistances);
    const lap = Math.min(totalLaps, Math.floor(currentLeaderDist) + 1);

    const status: RaceStatus = frameIndex < fps * 2 ? "PAUSED" : "GREEN"; // Pause for 2 seconds at start

    // Update distances for this frame
    driverDistances = driverDistances.map((dist, i) => {
      const driver = driversConfig[i];
      // Base speed varies by position on track (slow in corners, fast on straights)
      // Track is 0-1. Let's say 0-0.2 is straight, 0.2-0.5 is twisty, 0.5-0.7 straight, 0.7-1.0 twisty
      const trackPos = dist % 1;
      
      let baseSpeed = 1.0;
      if ((trackPos > 0.2 && trackPos < 0.5) || (trackPos > 0.7)) {
        baseSpeed = 0.6; // Cornering speed
      }

      // Add some noise and skill factor
      const variation = 0.05 * Math.sin(frameIndex * 0.1 + i);
      const speedFactor = baseSpeed * driver.skill + variation * 0.01;
      
      // Advance distance: speed * time
      // 1 lap = 60 seconds roughly. So speed 1.0 means 1/60 laps per second.
      const distDelta = (speedFactor / lapTimeSeconds) * (1 / fps);
      
      // Don't finish race early
      if (dist >= totalLaps) return totalLaps;
      
      return dist + distDelta;
    });

    // Create driver states
    const driversUnsorted = driversConfig.map((config, i) => {
      const totalDist = driverDistances[i];
      const trackProgress = totalDist % 1;
      
      // Calculate telemetry based on track position
      // Simple physics model
      const isCorner = (trackProgress > 0.2 && trackProgress < 0.5) || (trackProgress > 0.7);
      const isAccelerationZone = (trackProgress >= 0.5 && trackProgress < 0.6) || (trackProgress >= 0.0 && trackProgress < 0.1);
      const isBrakingZone = (trackProgress >= 0.15 && trackProgress <= 0.2) || (trackProgress >= 0.65 && trackProgress <= 0.7);

      let speedMph = 100;
      let throttle = 0;
      let brake = 0;
      let gear = 4;
      let rpm = 6000;
      let steering = 0;

      if (isCorner) {
        speedMph = 60 + 10 * Math.sin(frameIndex * 0.1);
        throttle = 40;
        gear = 2;
        steering = 30 * Math.sin(trackProgress * Math.PI * 4); // Fake steering
      } else {
        speedMph = 140 + 20 * Math.sin(frameIndex * 0.05);
        throttle = 100;
        gear = 5;
        steering = 0;
      }

      if (isBrakingZone) {
        throttle = 0;
        brake = 80;
        speedMph -= 10;
      } else if (isAccelerationZone) {
        throttle = 100;
        brake = 0;
      }

      return {
        carNumber: config.carNumber,
        driverName: config.driverName,
        trackProgress,
        totalDistance: totalDist, // Helper for sorting
        gapToLeaderSeconds: 0,
        position: 0,
        speedMph: Math.round(speedMph),
        throttlePercent: Math.round(throttle),
        brakePercent: Math.round(brake),
        gear,
        steeringAngleDeg: Math.round(steering),
        rpm: Math.round(rpm + (Math.random() * 200 - 100)),
      };
    });

    // Sort by total distance to get positions
    const sorted = [...driversUnsorted].sort((a, b) => b.totalDistance - a.totalDistance);
    const leaderDist = sorted[0].totalDistance;

    const drivers = driversUnsorted.map(d => {
      const position = sorted.findIndex(s => s.carNumber === d.carNumber) + 1;
      const distDiff = leaderDist - d.totalDistance;
      // Approx gap: distDiff (laps) * lapTime
      const gapSeconds = distDiff * lapTimeSeconds;

      const { totalDistance, ...rest } = d; // Remove internal helper
      return {
        ...rest,
        position,
        gapToLeaderSeconds: gapSeconds,
      };
    });

    timeline.push({
      timestampMs,
      status,
      lap,
      totalLaps,
      raceProgress,
      drivers,
    });
  }

  return timeline;
}

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
 * Returns a deterministic mock race timeline you can replace with real API data later.
 * The shape is intentionally close to the UI props so you can map frames into the dashboard.
 */
export function getMockRaceTimeline(): RaceTimeline {
  const totalLaps = 5; // Reduced laps for denser data in same timeframe, or just to keep it focused
  const fps = 10; // Data points per second
  const lapTimeSeconds = 60; // Approx lap time
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

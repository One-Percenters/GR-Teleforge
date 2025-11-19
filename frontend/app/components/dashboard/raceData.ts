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
  const totalLaps = 10;
  const framesPerLap = 20;
  const totalFrames = totalLaps * framesPerLap;
  const frameDurationMs = 200;

  const baseDrivers = [
    { carNumber: 13, driverName: "Westin Workman", baseOffset: 0 },
    { carNumber: 55, driverName: "Spike Kohlbecker", baseOffset: -0.02 },
    { carNumber: 7, driverName: "Jaxon Bell", baseOffset: -0.05 },
    { carNumber: 99, driverName: "Gresham Wagner", baseOffset: -0.08 },
  ] as const;

  const timeline: RaceTimeline = [];

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const timestampMs = frameIndex * frameDurationMs;
    const raceProgress = frameIndex / (totalFrames - 1);
    const lapFloat = raceProgress * totalLaps;
    const lap = Math.min(totalLaps, Math.max(1, Math.floor(lapFloat) + 1));

    // First frame is paused on the grid, then we treat it as green flag.
    const status: RaceStatus = frameIndex === 0 ? "PAUSED" : "GREEN";

    // Base circular progress around the track; drivers are offset slightly.
    const baseTrackProgress = ((lapFloat % 1) + totalLaps - 1) / totalLaps;

    const driversUnsorted = baseDrivers.map((driver) => {
      // Each driver has a tiny unique offset and subtle oscillations to feel alive.
      const rawProgress =
        baseTrackProgress +
        driver.baseOffset +
        0.01 * Math.sin((frameIndex / framesPerLap) * Math.PI * 2);

      const normalizedProgress = ((rawProgress % 1) + 1) % 1; // wrap into [0,1)

      const speedMph = 90 + 25 * Math.sin(normalizedProgress * Math.PI * 2);
      const throttlePercent =
        70 + 25 * Math.cos(normalizedProgress * Math.PI * 2);
      // Brake lightly entering the second half of the lap.
      const brakePercent =
        normalizedProgress > 0.45 && normalizedProgress < 0.65 ? 20 : 0;
      const gear = 3 + (normalizedProgress > 0.5 ? 1 : 0);
      const steeringAngleDeg = 25 * Math.sin(normalizedProgress * Math.PI * 2); // turning through corners
      const rpm = Math.round(5000 + speedMph * 25);

      return {
        carNumber: driver.carNumber,
        driverName: driver.driverName,
        trackProgress: normalizedProgress,
        gapToLeaderSeconds: 0, // filled after we know the leader
        position: 0,
        speedMph,
        throttlePercent: Math.max(0, Math.min(100, throttlePercent)),
        brakePercent,
        gear,
        steeringAngleDeg,
        rpm,
      } as DriverState;
    });

    // Determine positions based on progress around the track.
    const sorted = [...driversUnsorted].sort(
      (a, b) => b.trackProgress - a.trackProgress
    );

    const leader = sorted[0];
    const withPositions = driversUnsorted.map((driver) => {
      const position = sorted.findIndex(
        (d) => d.carNumber === driver.carNumber
      );
      const gapLaps = leader.trackProgress - driver.trackProgress;
      const gapSeconds = Math.max(0, gapLaps * 60); // fake 60s per lap
      return {
        ...driver,
        position: position + 1,
        gapToLeaderSeconds: position === 0 ? 0 : gapSeconds,
      };
    });

    timeline.push({
      timestampMs,
      status,
      lap,
      totalLaps,
      raceProgress,
      drivers: withPositions,
    });
  }

  return timeline;
}

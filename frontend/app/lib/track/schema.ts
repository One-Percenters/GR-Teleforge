export type RaceSession = "race1" | "race2";

export interface RaceResultRow {
  session: RaceSession;
  position: number;
  carNumber: string;
  status: string;
  lapsCompleted: number;
  totalTimeMs: number | null;
  gapToFirstMs: number | null;
  gapToPreviousMs: number | null;
  fastestLapNumber: number | null;
  fastestLapMs: number | null;
  fastestLapKph: number | null;
  driverClass: string | null;
  vehicle: string | null;
}

export interface ClassResultRow {
  session: RaceSession;
  classType: string;
  positionInClass: number;
  carNumber: string;
  vehicle: string;
  lapsCompleted: number;
  elapsedTimeMs: number | null;
  gapToFirstMs: number | null;
  gapToPreviousMs: number | null;
  bestLapNumber: number | null;
  bestLapMs: number | null;
  bestLapKph: number | null;
}

export interface WeatherSample {
  session: RaceSession;
  timestampUtcSeconds: number;
  timestampLocal: string;
  airTempC: number | null;
  trackTempC: number | null;
  humidityPercent: number | null;
  pressureHPa: number | null;
  windSpeedMps: number | null;
  windDirectionDeg: number | null;
  rainRateMM: number | null;
}

export interface LapSegmentRow {
  session: RaceSession;
  carNumber: string;
  lapNumber: number;
  sectorId: string;
  distanceMeters: number | null;
  elapsedTimeMs: number | null;
}

export interface LapTimingRow {
  session: RaceSession;
  carNumber: string;
  lapNumber: number;
  lapTimeMs: number | null;
  startTimeUtcSeconds: number | null;
  endTimeUtcSeconds: number | null;
}

export interface BestLapRow {
  session: RaceSession;
  carNumber: string;
  driver: string | null;
  lapNumber: number;
  lapTimeMs: number | null;
  lapSpeedKph: number | null;
}

export interface TelemetryFrame {
  session: RaceSession;
  timestampUtcSeconds: number;
  carNumber: string;
  vboxLon: number;
  vboxLat: number;
  steeringAngleDeg: number;
  sectorId: string | null;
  lapDistanceMeters: number | null;
  speedKph: number | null;
}

export interface TrackDataCatalogEntry {
  id: string;
  sessionScope: RaceSession | "both";
  path: string;
  description: string;
  target: keyof TrackDataSchema;
  columns: string[];
}

export interface TrackDataSchema {
  raceResults: RaceResultRow[];
  classResults: ClassResultRow[];
  weather: WeatherSample[];
  lapSegments: LapSegmentRow[];
  lapTimings: LapTimingRow[];
  bestLaps: BestLapRow[];
  telemetryFrames: TelemetryFrame[];
}

export const TRACK_DATASETS: TrackDataCatalogEntry[] = [
  {
    id: "race-results-r1",
    sessionScope: "race1",
    path: "data/barber/03_Provisional Results_Race 1_Anonymized.CSV",
    description: "Official finishing order and fastest laps for Race 1.",
    target: "raceResults",
    columns: [
      "POSITION",
      "NUMBER",
      "STATUS",
      "LAPS",
      "TOTAL_TIME",
      "GAP_FIRST",
      "GAP_PREVIOUS",
      "FL_LAPNUM",
      "FL_TIME",
      "FL_KPH",
      "CLASS",
      "VEHICLE",
    ],
  },
  {
    id: "race-results-r2",
    sessionScope: "race2",
    path: "data/barber/03_Provisional Results_Race 2_Anonymized.CSV",
    description: "Official finishing order and fastest laps for Race 2.",
    target: "raceResults",
    columns: [
      "POSITION",
      "NUMBER",
      "STATUS",
      "LAPS",
      "TOTAL_TIME",
      "GAP_FIRST",
      "GAP_PREVIOUS",
      "FL_LAPNUM",
      "FL_TIME",
      "FL_KPH",
      "CLASS",
      "VEHICLE",
    ],
  },
  {
    id: "class-results-r1",
    sessionScope: "race1",
    path: "data/barber/05_Provisional Results by Class_Race 1_Anonymized.CSV",
    description: "Per-class finishing order and best laps for Race 1.",
    target: "classResults",
    columns: [
      "CLASS_TYPE",
      "POS",
      "PIC",
      "NUMBER",
      "VEHICLE",
      "LAPS",
      "ELAPSED",
      "GAP_FIRST",
      "GAP_PREVIOUS",
      "BEST_LAP_NUM",
      "BEST_LAP_TIME",
      "BEST_LAP_KPH",
    ],
  },
  {
    id: "class-results-r2",
    sessionScope: "race2",
    path: "data/barber/05_Provisional Results by Class_Race 2_Anonymized.CSV",
    description: "Per-class finishing order and best laps for Race 2.",
    target: "classResults",
    columns: [
      "CLASS_TYPE",
      "POS",
      "PIC",
      "NUMBER",
      "VEHICLE",
      "LAPS",
      "ELAPSED",
      "GAP_FIRST",
      "GAP_PREVIOUS",
      "BEST_LAP_NUM",
      "BEST_LAP_TIME",
      "BEST_LAP_KPH",
    ],
  },
  {
    id: "weather-r1",
    sessionScope: "race1",
    path: "data/barber/26_Weather_Race 1_Anonymized.CSV",
    description: "Weather station samples recorded during Race 1.",
    target: "weather",
    columns: [
      "TIME_UTC_SECONDS",
      "TIME_UTC_STR",
      "AIR_TEMP",
      "TRACK_TEMP",
      "HUMIDITY",
      "PRESSURE",
      "WIND_SPEED",
      "WIND_DIRECTION",
      "RAIN",
    ],
  },
  {
    id: "weather-r2",
    sessionScope: "race2",
    path: "data/barber/26_Weather_Race 2_Anonymized.CSV",
    description: "Weather station samples recorded during Race 2.",
    target: "weather",
    columns: [
      "TIME_UTC_SECONDS",
      "TIME_UTC_STR",
      "AIR_TEMP",
      "TRACK_TEMP",
      "HUMIDITY",
      "PRESSURE",
      "WIND_SPEED",
      "WIND_DIRECTION",
      "RAIN",
    ],
  },
  {
    id: "lap-segments-r1",
    sessionScope: "race1",
    path: "data/barber/23_AnalysisEnduranceWithSections_Race 1_Anonymized.CSV",
    description: "Lap section breakdowns with sector identifiers for Race 1.",
    target: "lapSegments",
    columns: ["car", "lap", "section_id", "distance_m", "elapsed_ms"],
  },
  {
    id: "lap-segments-r2",
    sessionScope: "race2",
    path: "data/barber/23_AnalysisEnduranceWithSections_Race 2_Anonymized.CSV",
    description: "Lap section breakdowns with sector identifiers for Race 2.",
    target: "lapSegments",
    columns: ["car", "lap", "section_id", "distance_m", "elapsed_ms"],
  },
  {
    id: "best-laps-r1",
    sessionScope: "race1",
    path: "data/barber/99_Best 10 Laps By Driver_Race 1_Anonymized.CSV",
    description: "Top 10 lap performances per driver for Race 1.",
    target: "bestLaps",
    columns: ["NUMBER", "DRIVER", "LAP_NUM", "LAP_TIME", "LAP_KPH"],
  },
  {
    id: "best-laps-r2",
    sessionScope: "race2",
    path: "data/barber/99_Best 10 Laps By Driver_Race 2_Anonymized.CSV",
    description: "Top 10 lap performances per driver for Race 2.",
    target: "bestLaps",
    columns: ["NUMBER", "DRIVER", "LAP_NUM", "LAP_TIME", "LAP_KPH"],
  },
  {
    id: "lap-times-r1",
    sessionScope: "race1",
    path: "data/barber/R1_barber_lap_time.csv",
    description: "Per-lap timing table for Race 1.",
    target: "lapTimings",
    columns: ["car", "lap", "lap_time_ms", "start_time", "end_time"],
  },
  {
    id: "lap-times-r2",
    sessionScope: "race2",
    path: "data/barber/R2_barber_lap_time.csv",
    description: "Per-lap timing table for Race 2.",
    target: "lapTimings",
    columns: ["car", "lap", "lap_time_ms", "start_time", "end_time"],
  },
  {
    id: "lap-starts-r1",
    sessionScope: "race1",
    path: "data/barber/R1_barber_lap_start.csv",
    description: "Timestamps marking lap start boundaries for Race 1.",
    target: "lapTimings",
    columns: ["car", "lap", "start_timestamp"],
  },
  {
    id: "lap-starts-r2",
    sessionScope: "race2",
    path: "data/barber/R2_barber_lap_start.csv",
    description: "Timestamps marking lap start boundaries for Race 2.",
    target: "lapTimings",
    columns: ["car", "lap", "start_timestamp"],
  },
  {
    id: "lap-ends-r1",
    sessionScope: "race1",
    path: "data/barber/R1_barber_lap_end.csv",
    description: "Timestamps marking lap end boundaries for Race 1.",
    target: "lapTimings",
    columns: ["car", "lap", "end_timestamp"],
  },
  {
    id: "lap-ends-r2",
    sessionScope: "race2",
    path: "data/barber/R2_barber_lap_end.csv",
    description: "Timestamps marking lap end boundaries for Race 2.",
    target: "lapTimings",
    columns: ["car", "lap", "end_timestamp"],
  },
  {
    id: "telemetry-r1",
    sessionScope: "race1",
    path: "data/barber/R1_barber_telemetry_data.csv",
    description:
      "High-frequency telemetry frames for Race 1 (Master Timeline).",
    target: "telemetryFrames",
    columns: [
      "timestamp",
      "car",
      "VBOX_Long_Minutes",
      "VBOX_Lat_Min",
      "Steering_Angle",
      "Sector_ID",
      "Laptrigger_lapdist_dls",
      "speed",
    ],
  },
  {
    id: "telemetry-r2",
    sessionScope: "race2",
    path: "data/barber/R2_barber_telemetry_data.csv",
    description:
      "High-frequency telemetry frames for Race 2 (Master Timeline).",
    target: "telemetryFrames",
    columns: [
      "timestamp",
      "car",
      "VBOX_Long_Minutes",
      "VBOX_Lat_Min",
      "Steering_Angle",
      "Sector_ID",
      "Laptrigger_lapdist_dls",
      "speed",
    ],
  },
];

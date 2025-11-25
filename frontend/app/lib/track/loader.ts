import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";
import readline from "readline";

import type {
  BestLapRow,
  ClassResultRow,
  LapSegmentRow,
  LapTimingRow,
  RaceResultRow,
  RaceSession,
  TelemetryFrame,
  TrackDataCatalogEntry,
  TrackDataSchema,
  WeatherSample,
} from "./schema";
import { TRACK_DATASETS } from "./schema";

const DATA_ROOT =
  process.env.TRACK_DATA_ROOT ?? path.resolve(process.cwd(), "..");

const csvCache = new Map<string, Promise<string[][]>>();
const schemaCache = new Map<string, Promise<TrackDataSchema>>();

type HeaderMap = Record<string, number>;

const normalizeKey = (value: string) =>
  value.trim().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/gi, "").toUpperCase();

const buildHeaderMap = (headerRow: string[]): HeaderMap => {
  const map: HeaderMap = {};
  headerRow.forEach((cell, index) => {
    map[normalizeKey(cell)] = index;
  });
  return map;
};

const getCell = (row: string[], headerMap: HeaderMap, key: string) => {
  const idx = headerMap[normalizeKey(key)];
  return idx == null ? "" : row[idx] ?? "";
};

const cleanValue = (value: string) => value.trim();

const parseNumber = (value: string): number | null => {
  const trimmed = cleanValue(value);
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "na") {
    return null;
  }
  const normalized = trimmed.replace(/[^0-9.+-]/g, "");
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDurationMs = (value: string): number | null => {
  const trimmed = cleanValue(value);
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase().includes("lap")) {
    return null;
  }
  const normalized = trimmed.replace("'", ":").replace(/^\+/, "");
  const segments = normalized.split(":");
  if (!segments.length) {
    return null;
  }
  let totalSeconds = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const numeric = Number(segments[i]);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    const power = segments.length - i - 1;
    totalSeconds += numeric * 60 ** power;
  }
  return Math.round(totalSeconds * 1000);
};

const parseTimestampSeconds = (value: string): number | null => {
  const trimmed = cleanValue(value);
  if (!trimmed) {
    return null;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const date = new Date(trimmed);
  const epochMs = date.getTime();
  return Number.isFinite(epochMs) ? Math.round(epochMs / 1000) : null;
};

const detectDelimiter = (line: string) =>
  line.includes(";") && !line.includes(",") ? ";" : ",";

const resolveDataPath = (relativePath: string) =>
  path.resolve(DATA_ROOT, relativePath);

const parseCsvText = (text: string, delimiter: string): string[][] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(delimiter).map((cell) => cell.trim()));

const loadCsvRows = async (
  dataset: TrackDataCatalogEntry,
): Promise<string[][]> => {
  const cacheKey = dataset.path;
  if (!csvCache.has(cacheKey)) {
    csvCache.set(
      cacheKey,
      (async () => {
        const absolutePath = resolveDataPath(dataset.path);
        try {
          await fs.access(absolutePath);
        } catch {
          console.warn(`Data file not found: ${absolutePath}`);
          return [];
        }
        const fileBuffer = await fs.readFile(absolutePath, "utf-8");
        const firstLine = fileBuffer.slice(0, fileBuffer.indexOf("\n"));
        const delimiter = detectDelimiter(firstLine);
        return parseCsvText(fileBuffer, delimiter);
      })(),
    );
  }
  return csvCache.get(cacheKey)!;
};

const parseRaceResults = (
  rows: string[][],
  session: RaceSession,
): RaceResultRow[] => {
  if (!rows.length) {
    return [];
  }
  const headerMap = buildHeaderMap(rows[0]);
  return rows.slice(1).map((row) => ({
    session,
    position: parseNumber(getCell(row, headerMap, "POSITION")) ?? 0,
    carNumber: getCell(row, headerMap, "NUMBER"),
    status: getCell(row, headerMap, "STATUS"),
    lapsCompleted: parseNumber(getCell(row, headerMap, "LAPS")) ?? 0,
    totalTimeMs: parseDurationMs(getCell(row, headerMap, "TOTAL_TIME")),
    gapToFirstMs: parseDurationMs(getCell(row, headerMap, "GAP_FIRST")),
    gapToPreviousMs: parseDurationMs(getCell(row, headerMap, "GAP_PREVIOUS")),
    fastestLapNumber:
      parseNumber(getCell(row, headerMap, "FL_LAPNUM")) ?? null,
    fastestLapMs: parseDurationMs(getCell(row, headerMap, "FL_TIME")),
    fastestLapKph: parseNumber(getCell(row, headerMap, "FL_KPH")),
    driverClass: getCell(row, headerMap, "CLASS") || null,
    vehicle: getCell(row, headerMap, "VEHICLE") || null,
  }));
};

const parseClassResults = (
  rows: string[][],
  session: RaceSession,
): ClassResultRow[] => {
  if (!rows.length) {
    return [];
  }
  const headerMap = buildHeaderMap(rows[0]);
  return rows.slice(1).map((row) => ({
    session,
    classType: getCell(row, headerMap, "CLASS_TYPE"),
    positionInClass: parseNumber(getCell(row, headerMap, "POS")) ?? 0,
    carNumber: getCell(row, headerMap, "NUMBER"),
    vehicle: getCell(row, headerMap, "VEHICLE"),
    lapsCompleted: parseNumber(getCell(row, headerMap, "LAPS")) ?? 0,
    elapsedTimeMs: parseDurationMs(getCell(row, headerMap, "ELAPSED")),
    gapToFirstMs: parseDurationMs(getCell(row, headerMap, "GAP_FIRST")),
    gapToPreviousMs: parseDurationMs(getCell(row, headerMap, "GAP_PREVIOUS")),
    bestLapNumber:
      parseNumber(getCell(row, headerMap, "BEST_LAP_NUM")) ?? null,
    bestLapMs: parseDurationMs(getCell(row, headerMap, "BEST_LAP_TIME")),
    bestLapKph: parseNumber(getCell(row, headerMap, "BEST_LAP_KPH")),
  }));
};

const parseWeather = (
  rows: string[][],
  session: RaceSession,
): WeatherSample[] => {
  if (!rows.length) {
    return [];
  }
  const headerMap = buildHeaderMap(rows[0]);
  return rows.slice(1).map((row) => ({
    session,
    timestampUtcSeconds:
      parseTimestampSeconds(getCell(row, headerMap, "TIME_UTC_SECONDS")) ?? 0,
    timestampLocal: getCell(row, headerMap, "TIME_UTC_STR"),
    airTempC: parseNumber(getCell(row, headerMap, "AIR_TEMP")),
    trackTempC: parseNumber(getCell(row, headerMap, "TRACK_TEMP")),
    humidityPercent: parseNumber(getCell(row, headerMap, "HUMIDITY")),
    pressureHPa: parseNumber(getCell(row, headerMap, "PRESSURE")),
    windSpeedMps: parseNumber(getCell(row, headerMap, "WIND_SPEED")),
    windDirectionDeg: parseNumber(getCell(row, headerMap, "WIND_DIRECTION")),
    rainRateMM: parseNumber(getCell(row, headerMap, "RAIN")),
  }));
};

const parseLapSegments = (
  rows: string[][],
  session: RaceSession,
): LapSegmentRow[] => {
  if (!rows.length) {
    return [];
  }
  const headerMap = buildHeaderMap(rows[0]);
  const segmentKeys = [
    { id: "S1", secondsKey: "S1_SECONDS" },
    { id: "S2", secondsKey: "S2_SECONDS" },
    { id: "S3", secondsKey: "S3_SECONDS" },
  ];
  const segments: LapSegmentRow[] = [];
  rows.slice(1).forEach((row) => {
    const carNumber = getCell(row, headerMap, "NUMBER") || getCell(row, headerMap, "VEHICLE_NUMBER");
    const lapNumber = parseNumber(getCell(row, headerMap, "LAP_NUMBER")) ?? 0;
    segmentKeys.forEach(({ id, secondsKey }) => {
      const elapsed = parseDurationMs(
        getCell(row, headerMap, `${id}_LARGE`) ||
          getCell(row, headerMap, secondsKey),
      );
      segments.push({
        session,
        carNumber,
        lapNumber,
        sectorId: id,
        distanceMeters: null,
        elapsedTimeMs: elapsed,
      });
    });
  });
  return segments;
};

const parseLapTimings = (
  rows: string[][],
  session: RaceSession,
): LapTimingRow[] => {
  if (!rows.length) {
    return [];
  }
  const headerMap = buildHeaderMap(rows[0]);
  return rows.slice(1).map((row) => ({
    session,
    carNumber:
      getCell(row, headerMap, "VEHICLE_NUMBER") ||
      getCell(row, headerMap, "NUMBER") ||
      getCell(row, headerMap, "CAR"),
    lapNumber: parseNumber(getCell(row, headerMap, "LAP")) ?? 0,
    lapTimeMs: parseDurationMs(getCell(row, headerMap, "LAP_TIME")),
    startTimeUtcSeconds: parseTimestampSeconds(
      getCell(row, headerMap, "START_TIME") ||
        getCell(row, headerMap, "TIMESTAMP"),
    ),
    endTimeUtcSeconds: parseTimestampSeconds(
      getCell(row, headerMap, "END_TIME") ||
        getCell(row, headerMap, "META_TIME"),
    ),
  }));
};

const parseBestLaps = (
  rows: string[][],
  session: RaceSession,
): BestLapRow[] => {
  if (!rows.length) {
    return [];
  }
  const headerMap = buildHeaderMap(rows[0]);
  return rows.slice(1).map((row) => ({
    session,
    carNumber: getCell(row, headerMap, "NUMBER"),
    driver: getCell(row, headerMap, "DRIVER") || null,
    lapNumber: parseNumber(getCell(row, headerMap, "LAP_NUM")) ?? 0,
    lapTimeMs: parseDurationMs(getCell(row, headerMap, "LAP_TIME")),
    lapSpeedKph: parseNumber(getCell(row, headerMap, "LAP_KPH")),
  }));
};

const parseTelemetryRow = (
  headerMap: HeaderMap,
  row: string[],
  session: RaceSession,
): TelemetryFrame | null => {
  const lon = parseNumber(getCell(row, headerMap, "VBOX_LONG_MINUTES"));
  const lat = parseNumber(getCell(row, headerMap, "VBOX_LAT_MIN"));
  if (lon == null || lat == null) {
    return null;
  }
  return {
    session,
    timestampUtcSeconds:
      parseTimestampSeconds(getCell(row, headerMap, "TIMESTAMP")) ?? 0,
    carNumber:
      getCell(row, headerMap, "VEHICLE_NUMBER") ||
      getCell(row, headerMap, "CAR") ||
      getCell(row, headerMap, "NUMBER"),
    vboxLon: lon,
    vboxLat: lat,
    steeringAngleDeg:
      parseNumber(getCell(row, headerMap, "STEERING_ANGLE")) ?? 0,
    sectorId: getCell(row, headerMap, "SECTOR_ID") || null,
    lapDistanceMeters:
      parseNumber(getCell(row, headerMap, "LAPTRIGGER_LAPDIST_DLS")) ?? null,
    speedKph: parseNumber(getCell(row, headerMap, "SPEED")),
  };
};

const datasetParsers: Record<
  TrackDataCatalogEntry["target"],
  (rows: string[][], session: RaceSession) => unknown[]
> = {
  raceResults: parseRaceResults,
  classResults: parseClassResults,
  weather: parseWeather,
  lapSegments: parseLapSegments,
  lapTimings: parseLapTimings,
  bestLaps: parseBestLaps,
  telemetryFrames: () => [],
};

export const loadTrackData = async (
  session: RaceSession,
): Promise<TrackDataSchema> => {
  const cacheKey = `schema:${session}`;
  if (!schemaCache.has(cacheKey)) {
    schemaCache.set(
      cacheKey,
      (async () => {
        const schema: TrackDataSchema = {
          raceResults: [],
          classResults: [],
          weather: [],
          lapSegments: [],
          lapTimings: [],
          bestLaps: [],
          telemetryFrames: [],
        };

        const datasets = TRACK_DATASETS.filter(
          (entry) =>
            entry.sessionScope === session || entry.sessionScope === "both",
        );

        await Promise.all(
          datasets.map(async (entry) => {
            if (entry.target === "telemetryFrames") {
              return;
            }
            try {
              const rows = await loadCsvRows(entry);
              const parser = datasetParsers[entry.target];
              if (!parser) {
                return;
              }
              (schema[entry.target] as unknown[]).push(
                ...parser(rows, session),
              );
            } catch (error) {
              console.warn(`Failed to load dataset ${entry.id}:`, error);
              // Continue with other datasets
            }
          }),
        );

        return schema;
      })(),
    );
  }
  return schemaCache.get(cacheKey)!;
};

export async function* streamTelemetryFrames(
  session: RaceSession,
  limit?: number,
): AsyncGenerator<TelemetryFrame> {
  const dataset = TRACK_DATASETS.find(
    (entry) =>
      entry.target === "telemetryFrames" && entry.sessionScope === session,
  );
  if (!dataset) {
    console.warn(`No telemetry dataset found for session: ${session}`);
    return;
  }
  const absolutePath = resolveDataPath(dataset.path);
  try {
    await fs.access(absolutePath);
  } catch {
    console.warn(`Telemetry file not found: ${absolutePath}`);
    return;
  }
  const stream = createReadStream(absolutePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let headerMap: HeaderMap | null = null;
  let delimiter = ",";
  let yielded = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!headerMap) {
      delimiter = detectDelimiter(trimmed);
      headerMap = buildHeaderMap(trimmed.split(delimiter));
      continue;
    }
    const cells = trimmed.split(delimiter).map((cell) => cell.trim());
    const frame = parseTelemetryRow(headerMap, cells, session);
    if (frame) {
      yield frame;
      yielded += 1;
      if (limit && yielded >= limit) {
        break;
      }
    }
  }
}


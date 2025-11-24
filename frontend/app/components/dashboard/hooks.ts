import { create } from "zustand";

export type CarState = {
  carNumber: string;
  driverName: string | null;
  positionLabel: string | null;
  lap: number | null;
  sectorId: string | null;
  vboxLon: number | null;
  vboxLat: number | null;
  steeringAngle: number | null;
  speedKph: number | null;
  lapDistanceMeters: number | null;
};

export type Standing = {
  car: string | null;
  driver: string | null;
  position: string | null;
};

export type TelemetryStore = {
  session: "race1" | "race2";
  raceStatus: string | null;
  leader: string | null;
  gap: string | null;
  cars: Record<string, CarState>;
  standings: Standing[];
  latestWeather: {
    airTempC: number | null;
    trackTempC: number | null;
    humidityPercent: number | null;
  } | null;
  updateCar: (carNumber: string, updates: Partial<CarState>) => void;
  setStandings: (standings: Standing[]) => void;
  setRaceMeta: (payload: {
    status?: string | null;
    leader?: string | null;
    gap?: string | null;
  }) => void;
  setWeather: (payload: TelemetryStore["latestWeather"]) => void;
  reset: () => void;
};

const initialState: TelemetryStore = {
  session: "race1",
  raceStatus: null,
  leader: null,
  gap: null,
  cars: {},
  standings: [],
  latestWeather: null,
  updateCar: () => {},
  setStandings: () => {},
  setRaceMeta: () => {},
  setWeather: () => {},
  reset: () => {},
};

export const useTelemetry = create<TelemetryStore>((set) => ({
  ...initialState,
  updateCar: (carNumber, updates) =>
    set((state) => ({
      ...state,
      cars: {
        ...state.cars,
        [carNumber]: {
          carNumber,
          driverName: state.cars[carNumber]?.driverName ?? null,
          positionLabel: state.cars[carNumber]?.positionLabel ?? null,
          lap: state.cars[carNumber]?.lap ?? null,
          sectorId: state.cars[carNumber]?.sectorId ?? null,
          vboxLon: state.cars[carNumber]?.vboxLon ?? null,
          vboxLat: state.cars[carNumber]?.vboxLat ?? null,
          steeringAngle: state.cars[carNumber]?.steeringAngle ?? null,
          speedKph: state.cars[carNumber]?.speedKph ?? null,
          lapDistanceMeters: state.cars[carNumber]?.lapDistanceMeters ?? null,
          ...updates,
        },
      },
    })),
  setStandings: (standings) =>
    set((state) => ({
      ...state,
      standings,
    })),
  setRaceMeta: ({ status, leader, gap }) =>
    set((state) => ({
      ...state,
      raceStatus: status ?? state.raceStatus,
      leader: leader ?? state.leader,
      gap: gap ?? state.gap,
    })),
  setWeather: (payload) =>
    set((state) => ({
      ...state,
      latestWeather: payload,
    })),
  reset: () => set(() => ({ ...initialState })),
}));

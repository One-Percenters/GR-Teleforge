import { create } from "zustand";

type Standing = {
  car: string | null;
  driver: string | null;
  position: string | null;
};

type Telemetry = {
  speed: number | null;
  gear: string | null;
  nmot: number | null;
  ath: number | null;
  aps: number | null;
  pbrake_f: number | null;
  pbrake_r: number | null;
  accx_can: number | null;
  accy_can: number | null;
  Steering_Angle: number | null;
  VBOX_Long_Minutes: number | null;
  VBOX_Lat_Min: number | null;
  Laptrigger_lapdist_dls: number | null;
  driverName: string | null;
  positionLabel: string | null;
  status: string | null;
  lap: string | null;
  leader: string | null;
  gap: string | null;
  standings: Standing[];
};

type TelemetryStore = Telemetry & {
  updateTelemetry: (partialTelemetry: Partial<Telemetry>) => void;
};

const initialTelemetry: Telemetry = {
  speed: null,
  gear: null,
  nmot: null,
  ath: null,
  aps: null,
  pbrake_f: null,
  pbrake_r: null,
  accx_can: null,
  accy_can: null,
  Steering_Angle: null,
  VBOX_Long_Minutes: null,
  VBOX_Lat_Min: null,
  Laptrigger_lapdist_dls: null,
  driverName: null,
  positionLabel: null,
  status: null,
  lap: null,
  leader: null,
  gap: null,
  standings: [],
};

export const useTelemetry = create<TelemetryStore>((set) => ({
  ...initialTelemetry,
  updateTelemetry: (partialTelemetry) =>
    set((state) => ({ ...state, ...partialTelemetry })),
}));

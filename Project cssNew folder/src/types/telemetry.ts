export type TrackerMode = 'auto' | 'manual';

export type SimulationScenario =
  | 'solar_sweep'
  | 'clear_noon'
  | 'cloudy_drift'
  | 'gas_alert';

export interface LdrQuadrants {
  tl: number; // Top-Left 12-bit ADC (0 - 4095)
  tr: number; // Top-Right 12-bit ADC (0 - 4095)
  bl: number; // Bottom-Left 12-bit ADC (0 - 4095)
  br: number; // Bottom-Right 12-bit ADC (0 - 4095)
}

export interface TelemetryPacket {
  temperature: number; // Celsius
  humidity: number; // Relative Humidity %
  gasPpm: number; // Air quality / gas PPM
  panAngle: number; // 0 - 180 degrees
  tiltAngle: number; // 0 - 180 degrees
  mode: TrackerMode;
  ldr: LdrQuadrants;
  rssi: number; // Wi-Fi dBm
  uptimeSec: number;
  timestamp: number;
}

export interface TelemetryHistoryPoint {
  timestamp: number;
  temperature: number;
  humidity: number;
  gasPpm: number;
}

export interface ApiConfig {
  baseUrl: string;
  pollIntervalMs: number;
}

export interface ControlCommand {
  mode: TrackerMode;
  panAngle: number;
  tiltAngle: number;
}

export type ConnectionState = 'simulation' | 'connected' | 'connecting' | 'error';

export type GasStatusLevel = 'Safe' | 'Elevated' | 'Hazard';

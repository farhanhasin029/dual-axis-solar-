import { ControlCommand, TelemetryPacket, TrackerMode } from '../types/telemetry';

const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function parseMode(raw: unknown): TrackerMode {
  return raw === 'manual' ? 'manual' : 'auto';
}

/**
 * Fetches telemetry from the ESP32 `GET /api/telemetry` endpoint and normalizes numeric ranges.
 */
export async function fetchEsp32Telemetry(
  baseUrl: string,
  timeoutMs = 3500
): Promise<TelemetryPacket> {
  const cleanBase = normalizeBaseUrl(baseUrl);
  if (!cleanBase) {
    throw new Error('ESP32 endpoint URL is empty.');
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${cleanBase}/api/telemetry`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const ldr = data.ldr ?? {};

    return {
      temperature: Number(data.temperature ?? 0),
      humidity: clamp(Number(data.humidity ?? 0), 0, 100),
      gasPpm: Math.max(0, Math.round(Number(data.gasPpm ?? data.gas ?? 0))),
      panAngle: clamp(Math.round(Number(data.panAngle ?? data.pan ?? 90)), 0, 180),
      tiltAngle: clamp(Math.round(Number(data.tiltAngle ?? data.tilt ?? 90)), 0, 180),
      mode: parseMode(data.mode),
      ldr: {
        tl: clamp(Math.round(Number(ldr.tl ?? data.ldrTL ?? 0)), 0, 4095),
        tr: clamp(Math.round(Number(ldr.tr ?? data.ldrTR ?? 0)), 0, 4095),
        bl: clamp(Math.round(Number(ldr.bl ?? data.ldrBL ?? 0)), 0, 4095),
        br: clamp(Math.round(Number(ldr.br ?? data.ldrBR ?? 0)), 0, 4095),
      },
      rssi: Number(data.rssi ?? -65),
      uptimeSec: Math.max(0, Math.round(Number(data.uptimeSec ?? 0))),
      timestamp: Date.now(),
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Sends a mode or servo target override command to `POST /api/control` on the ESP32.
 */
export async function sendEsp32Control(
  baseUrl: string,
  command: ControlCommand,
  timeoutMs = 3500
): Promise<void> {
  const cleanBase = normalizeBaseUrl(baseUrl);
  if (!cleanBase) {
    throw new Error('ESP32 endpoint URL is empty.');
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${cleanBase}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: command.mode,
        panAngle: clamp(Math.round(command.panAngle), 0, 180),
        tiltAngle: clamp(Math.round(command.tiltAngle), 0, 180),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Control command rejected (HTTP ${response.status})`);
    }
  } finally {
    window.clearTimeout(timer);
  }
}

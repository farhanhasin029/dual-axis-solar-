import {
  SimulationScenario,
  TelemetryPacket,
  TrackerMode,
} from '../types/telemetry';

export interface SimulationState {
  tick: number;
  panAngle: number;
  tiltAngle: number;
  targetPan: number;
  targetTilt: number;
  mode: TrackerMode;
  temperature: number;
  humidity: number;
  gasPpm: number;
  uptimeSec: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round1 = (value: number) => Math.round(value * 10) / 10;

export function createInitialSimulationState(): SimulationState {
  return {
    tick: 0,
    panAngle: 88,
    tiltAngle: 64,
    targetPan: 88,
    targetTilt: 64,
    mode: 'auto',
    temperature: 29.4,
    humidity: 54.2,
    gasPpm: 215,
    uptimeSec: 1420,
  };
}

/**
 * Computes sun position and environmental baselines for the selected demo scenario,
 * then simulates closed-loop LDR tracking (or manual servo hold) and 12-bit ADC irradiance.
 */
export function stepSimulation(
  prev: SimulationState,
  scenario: SimulationScenario,
  dtSec: number
): { nextState: SimulationState; packet: TelemetryPacket } {
  const tick = prev.tick + 1;
  const phase = tick * 0.14;

  let sunPan = 90 + Math.sin(phase * 0.45) * 48;
  let sunTilt = 68 + Math.cos(phase * 0.35) * 26;
  let ambientIntensity = 0.88;
  let tempTarget = 29.8 + Math.sin(phase * 0.2) * 1.4;
  let humTarget = 53.5 + Math.cos(phase * 0.25) * 3.2;
  let gasTarget = 220 + Math.sin(phase * 0.5) * 28;

  if (scenario === 'clear_noon') {
    sunPan = 90 + Math.sin(phase * 0.25) * 8;
    sunTilt = 82 + Math.cos(phase * 0.2) * 6;
    ambientIntensity = 0.96;
    tempTarget = 32.4 + Math.sin(phase * 0.2) * 0.8;
    humTarget = 46.0 + Math.cos(phase * 0.2) * 1.5;
    gasTarget = 195 + Math.sin(phase * 0.3) * 16;
  } else if (scenario === 'cloudy_drift') {
    sunPan = 65 + Math.sin(phase * 0.65) * 32;
    sunTilt = 52 + Math.cos(phase * 0.5) * 18;
    ambientIntensity = 0.42 + 0.22 * Math.sin(phase * 0.9);
    tempTarget = 25.1 + Math.sin(phase * 0.25) * 0.9;
    humTarget = 71.5 + Math.cos(phase * 0.3) * 2.8;
    gasTarget = 310 + Math.sin(phase * 0.4) * 35;
  } else if (scenario === 'gas_alert') {
    sunPan = 115 + Math.sin(phase * 0.3) * 14;
    sunTilt = 62 + Math.cos(phase * 0.3) * 10;
    ambientIntensity = 0.78;
    tempTarget = 36.2 + Math.sin(phase * 0.35) * 1.2;
    humTarget = 41.0 + Math.cos(phase * 0.2) * 2.0;
    gasTarget = 845 + Math.sin(phase * 0.85) * 145;
  }

  let panAngle = prev.panAngle;
  let tiltAngle = prev.tiltAngle;

  if (prev.mode === 'auto') {
    // Proportional slew toward the sun with smooth servo damping
    const panStep = clamp((sunPan - panAngle) * 0.28, -6, 6);
    const tiltStep = clamp((sunTilt - tiltAngle) * 0.28, -5, 5);
    panAngle = clamp(panAngle + panStep, 0, 180);
    tiltAngle = clamp(tiltAngle + tiltStep, 0, 180);
  } else {
    // Smoothly move to manual override target
    panAngle = clamp(panAngle + clamp((prev.targetPan - panAngle) * 0.45, -10, 10), 0, 180);
    tiltAngle = clamp(tiltAngle + clamp((prev.targetTilt - tiltAngle) * 0.45, -10, 10), 0, 180);
  }

  // Angular error drives differential readings across the 4 LDR quadrants
  const errX = clamp((sunPan - panAngle) / 45, -1, 1); // + => sun is toward Right (TR/BR)
  const errY = clamp((sunTilt - tiltAngle) / 45, -1, 1); // + => sun is toward Top (TL/TR)

  const baseAdc = 3820 * ambientIntensity;
  const jitter = () => (Math.random() - 0.5) * 70;

  // Cosine-like attenuation as panel faces away from sun
  const alignmentLoss = Math.min(0.45, (Math.abs(errX) + Math.abs(errY)) * 0.22);
  const centerAdc = baseAdc * (1 - alignmentLoss);

  const tl = Math.round(clamp(centerAdc * (1 - errX * 0.34 + errY * 0.34) + jitter(), 0, 4095));
  const tr = Math.round(clamp(centerAdc * (1 + errX * 0.34 + errY * 0.34) + jitter(), 0, 4095));
  const bl = Math.round(clamp(centerAdc * (1 - errX * 0.34 - errY * 0.34) + jitter(), 0, 4095));
  const br = Math.round(clamp(centerAdc * (1 + errX * 0.34 - errY * 0.34) + jitter(), 0, 4095));

  const temperature = round1(prev.temperature + (tempTarget - prev.temperature) * 0.25 + (Math.random() - 0.5) * 0.2);
  const humidity = round1(clamp(prev.humidity + (humTarget - prev.humidity) * 0.25 + (Math.random() - 0.5) * 0.4, 5, 99));
  const gasPpm = Math.round(clamp(prev.gasPpm + (gasTarget - prev.gasPpm) * 0.3 + (Math.random() - 0.5) * 14, 50, 2000));
  const uptimeSec = prev.uptimeSec + Math.max(1, Math.round(dtSec));

  const nextState: SimulationState = {
    ...prev,
    tick,
    panAngle: Math.round(panAngle),
    tiltAngle: Math.round(tiltAngle),
    temperature,
    humidity,
    gasPpm,
    uptimeSec,
  };

  const packet: TelemetryPacket = {
    temperature,
    humidity,
    gasPpm,
    panAngle: nextState.panAngle,
    tiltAngle: nextState.tiltAngle,
    mode: prev.mode,
    ldr: { tl, tr, bl, br },
    rssi: Math.round(-56 + (Math.random() - 0.5) * 6),
    uptimeSec,
    timestamp: Date.now(),
  };

  return { nextState, packet };
}

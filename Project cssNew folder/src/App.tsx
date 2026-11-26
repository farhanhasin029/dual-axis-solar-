import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, Database } from 'lucide-react';
import { EnvironmentalCards } from './components/EnvironmentalCards';
import { Esp32ApiModal } from './components/Esp32ApiModal';
import { GimbalCompassCard } from './components/GimbalCompassCard';
import { HeaderBar } from './components/HeaderBar';
import { LdrMatrixCard } from './components/LdrMatrixCard';
import {
  ApiConfig,
  ConnectionState,
  SimulationScenario,
  TelemetryHistoryPoint,
  TelemetryPacket,
  TrackerMode,
} from './types/telemetry';
import { fetchEsp32Telemetry, sendEsp32Control } from './utils/esp32Api';
import {
  createInitialSimulationState,
  SimulationState,
  stepSimulation,
} from './utils/simulation';

const MAX_HISTORY_POINTS = 30;
const STORAGE_KEY = 'esp32_solar_tracker_api_config';

function loadSavedApiConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : 'http://192.168.1.50',
        pollIntervalMs: Number(parsed.pollIntervalMs) || 1000,
      };
    }
  } catch {
    // Ignore storage access errors
  }
  return { baseUrl: 'http://192.168.1.50', pollIntervalMs: 1000 };
}

function pushHistory(
  prev: TelemetryHistoryPoint[],
  packet: TelemetryPacket
): TelemetryHistoryPoint[] {
  const next = [
    ...prev,
    {
      timestamp: packet.timestamp,
      temperature: packet.temperature,
      humidity: packet.humidity,
      gasPpm: packet.gasPpm,
    },
  ];
  return next.length > MAX_HISTORY_POINTS
    ? next.slice(next.length - MAX_HISTORY_POINTS)
    : next;
}

export default function App() {
  const initialSim = useRef<SimulationState>(createInitialSimulationState());
  const firstStep = useRef(stepSimulation(initialSim.current, 'solar_sweep', 1));

  const [demoMode, setDemoMode] = useState(true);
  const [scenario, setScenario] = useState<SimulationScenario>('solar_sweep');
  const [apiConfig, setApiConfig] = useState<ApiConfig>(loadSavedApiConfig);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetryPacket>(
    firstStep.current.packet
  );
  const [history, setHistory] = useState<TelemetryHistoryPoint[]>(() => [
    {
      timestamp: firstStep.current.packet.timestamp,
      temperature: firstStep.current.packet.temperature,
      humidity: firstStep.current.packet.humidity,
      gasPpm: firstStep.current.packet.gasPpm,
    },
  ]);

  const [mode, setMode] = useState<TrackerMode>('auto');
  const [manualPan, setManualPan] = useState(firstStep.current.packet.panAngle);
  const [manualTilt, setManualTilt] = useState(firstStep.current.packet.tiltAngle);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('simulation');
  const [lastError, setLastError] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [packetCount, setPacketCount] = useState(1);

  const simRef = useRef<SimulationState>(firstStep.current.nextState);
  const controlTimerRef = useRef<number | null>(null);

  // Persist API config
  const handleSaveApiConfig = (next: ApiConfig, disableDemo?: boolean) => {
    setApiConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    if (disableDemo) {
      setDemoMode(false);
    }
  };

  // Close modal with Escape
  useEffect(() => {
    if (!isApiModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsApiModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isApiModalOpen]);

  // Keep simulation state synced with user's mode & manual targets
  useEffect(() => {
    simRef.current = {
      ...simRef.current,
      mode,
      targetPan: manualPan,
      targetTilt: manualTilt,
    };
  }, [mode, manualPan, manualTilt]);

  // Telemetry polling loop (Demo Simulation vs Live ESP32)
  useEffect(() => {
    if (demoMode) {
      setConnectionState('simulation');
      setLastError(null);

      const interval = window.setInterval(() => {
        const { nextState, packet } = stepSimulation(
          simRef.current,
          scenario,
          apiConfig.pollIntervalMs / 1000
        );
        simRef.current = nextState;
        setTelemetry(packet);
        setHistory((prev) => pushHistory(prev, packet));
        setPacketCount((c) => c + 1);
      }, Math.max(400, apiConfig.pollIntervalMs));

      return () => window.clearInterval(interval);
    }

    let cancelled = false;
    setConnectionState('connecting');

    const poll = async () => {
      try {
        const packet = await fetchEsp32Telemetry(apiConfig.baseUrl);
        if (cancelled) return;
        setTelemetry(packet);
        setHistory((prev) => pushHistory(prev, packet));
        setPacketCount((c) => c + 1);
        setConnectionState('connected');
        setLastError(null);
      } catch (err) {
        if (cancelled) return;
        setConnectionState('error');
        setLastError(
          err instanceof Error ? err.message : 'Unable to reach ESP32'
        );
      }
    };

    poll();
    const interval = window.setInterval(poll, Math.max(400, apiConfig.pollIntervalMs));

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [demoMode, scenario, apiConfig]);

  const dispatchControl = useCallback(
    (nextMode: TrackerMode, pan: number, tilt: number, immediate = false) => {
      if (controlTimerRef.current) {
        window.clearTimeout(controlTimerRef.current);
      }

      const send = async () => {
        if (demoMode) {
          setCommandStatus(
            `SIM POST /api/control → ${nextMode.toUpperCase()} (${pan}°, ${tilt}°)`
          );
          return;
        }
        try {
          setCommandStatus('Sending POST /api/control...');
          await sendEsp32Control(apiConfig.baseUrl, {
            mode: nextMode,
            panAngle: pan,
            tiltAngle: tilt,
          });
          setCommandStatus(`Synced ${nextMode.toUpperCase()} (${pan}°, ${tilt}°)`);
        } catch (err) {
          setCommandStatus(
            err instanceof Error ? `Err: ${err.message}` : 'Control failed'
          );
        }
      };

      if (immediate) {
        send();
      } else {
        controlTimerRef.current = window.setTimeout(send, 120);
      }
    },
    [demoMode, apiConfig.baseUrl]
  );

  const handleModeChange = (nextMode: TrackerMode) => {
    setMode(nextMode);
    if (nextMode === 'manual') {
      setManualPan(telemetry.panAngle);
      setManualTilt(telemetry.tiltAngle);
      dispatchControl('manual', telemetry.panAngle, telemetry.tiltAngle, true);
    } else {
      dispatchControl('auto', telemetry.panAngle, telemetry.tiltAngle, true);
    }
  };

  const handleManualPanChange = (pan: number) => {
    setManualPan(pan);
    dispatchControl('manual', pan, manualTilt);
  };

  const handleManualTiltChange = (tilt: number) => {
    setManualTilt(tilt);
    dispatchControl('manual', manualPan, tilt);
  };

  const handleApplyPreset = (pan: number, tilt: number) => {
    setManualPan(pan);
    setManualTilt(tilt);
    dispatchControl('manual', pan, tilt, true);
  };

  const isGasHazard = telemetry.gasPpm >= 800;

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <HeaderBar
          demoMode={demoMode}
          onToggleDemo={setDemoMode}
          scenario={scenario}
          onChangeScenario={setScenario}
          mode={mode}
          onChangeMode={handleModeChange}
          connectionState={connectionState}
          lastError={lastError}
          rssi={telemetry.rssi}
          uptimeSec={telemetry.uptimeSec}
          onOpenApiModal={() => setIsApiModalOpen(true)}
        />

        {/* Hazard Alert Banner */}
        {isGasHazard && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/50 bg-rose-950/50 px-4 py-3 text-xs text-rose-200 shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <span className="font-semibold uppercase tracking-wide text-rose-300">
                  Air Quality Hazard Detected:
                </span>{' '}
                Gas concentration reached{' '}
                <span className="font-mono font-bold text-white">
                  {telemetry.gasPpm} PPM
                </span>{' '}
                (threshold ≥ 800 PPM). Inspect enclosure ventilation or MQ-135 sensor.
              </div>
            </div>
            <span className="rounded-md bg-rose-500/20 px-2 py-1 font-mono text-[11px] font-semibold text-rose-300">
              ALERT ACTIVE
            </span>
          </div>
        )}

        {/* Primary Telemetry Grid: Gimbal/Compass + 4-Quadrant LDR Matrix */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <GimbalCompassCard
            panAngle={telemetry.panAngle}
            tiltAngle={telemetry.tiltAngle}
            manualPan={manualPan}
            manualTilt={manualTilt}
            mode={mode}
            onChangeManualPan={handleManualPanChange}
            onChangeManualTilt={handleManualTiltChange}
            onApplyPreset={handleApplyPreset}
            commandStatus={commandStatus}
          />

          <LdrMatrixCard ldr={telemetry.ldr} />
        </div>

        {/* Environmental Sparkline Cards */}
        <EnvironmentalCards
          temperature={telemetry.temperature}
          humidity={telemetry.humidity}
          gasPpm={telemetry.gasPpm}
          history={history}
        />

        {/* Diagnostics Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#0c121e]/70 px-4 py-2.5 font-mono text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              PACKETS: <strong className="text-slate-200">{packetCount}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              LAST SYNC:{' '}
              <strong className="text-slate-200">
                {new Date(telemetry.timestamp).toLocaleTimeString()}
              </strong>
            </span>
          </div>
          <div>
            SOURCE:{' '}
            <strong className="text-slate-200">
              {demoMode
                ? `Demo Engine (${scenario.replace('_', ' ')})`
                : `${apiConfig.baseUrl}/api/telemetry`}
            </strong>
          </div>
        </footer>
      </div>

      <Esp32ApiModal
        isOpen={isApiModalOpen}
        config={apiConfig}
        demoMode={demoMode}
        onClose={() => setIsApiModalOpen(false)}
        onSaveConfig={handleSaveApiConfig}
      />
    </div>
  );
}

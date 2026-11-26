import {
  Activity,
  Cpu,
  Radio,
  Settings2,
  Sliders,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  ConnectionState,
  SimulationScenario,
  TrackerMode,
} from '../types/telemetry';

interface HeaderBarProps {
  demoMode: boolean;
  onToggleDemo: (enabled: boolean) => void;
  scenario: SimulationScenario;
  onChangeScenario: (scenario: SimulationScenario) => void;
  mode: TrackerMode;
  onChangeMode: (mode: TrackerMode) => void;
  connectionState: ConnectionState;
  lastError: string | null;
  rssi: number;
  uptimeSec: number;
  onOpenApiModal: () => void;
}

function formatUptime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function HeaderBar({
  demoMode,
  onToggleDemo,
  scenario,
  onChangeScenario,
  mode,
  onChangeMode,
  connectionState,
  lastError,
  rssi,
  uptimeSec,
  onOpenApiModal,
}: HeaderBarProps) {
  const statusConfig = {
    simulation: {
      label: 'DEMO SIMULATION',
      dot: 'bg-amber-400',
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    },
    connected: {
      label: 'ESP32 ONLINE',
      dot: 'bg-emerald-400',
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    },
    connecting: {
      label: 'SYNCING...',
      dot: 'bg-cyan-400',
      badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    },
    error: {
      label: 'LINK OFFLINE',
      dot: 'bg-rose-500',
      badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    },
  }[connectionState];

  return (
    <header className="rounded-2xl border border-slate-800/90 bg-[#0c121e]/90 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {/* Brand + Live Link Status */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/5 text-amber-400 shadow-inner">
            <Sun className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
                ESP32 Dual-Axis Solar Tracker
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${statusConfig.badge}`}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${statusConfig.dot}`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${statusConfig.dot}`}
                  />
                </span>
                {statusConfig.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                ESP32-WROOM-32
              </span>
              <span className="inline-flex items-center gap-1.5">
                {connectionState === 'error' ? (
                  <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                )}
                RSSI {rssi} dBm
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-400" />
                UP {formatUptime(uptimeSec)}
              </span>
              {lastError && !demoMode && (
                <span className="text-rose-400">Err: {lastError}</span>
              )}
            </div>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tracking Mode Switch */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            <button
              type="button"
              onClick={() => onChangeMode('auto')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === 'auto'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              Auto Track
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('manual')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === 'manual'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Manual Override
            </button>
          </div>

          {/* Demo Simulation Toggle */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5">
            <span className="text-xs font-medium text-slate-300">
              Demo Sim
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => onToggleDemo(!demoMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                demoMode
                  ? 'border-amber-400/50 bg-amber-500'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                  demoMode ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            {demoMode && (
              <select
                aria-label="Simulation scenario"
                value={scenario}
                onChange={(e) =>
                  onChangeScenario(e.target.value as SimulationScenario)
                }
                className="ml-1 rounded-md border border-slate-700/80 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-amber-200 outline-none focus:border-amber-500"
              >
                <option value="solar_sweep">Solar Sweep</option>
                <option value="clear_noon">Clear Noon</option>
                <option value="cloudy_drift">Cloudy Drift</option>
                <option value="gas_alert">Gas Alert Test</option>
              </select>
            )}
          </div>

          {/* ESP32 API Modal Button */}
          <button
            type="button"
            onClick={onOpenApiModal}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-500/20"
          >
            <Settings2 className="h-4 w-4" />
            ESP32 API
          </button>
        </div>
      </div>
    </header>
  );
}

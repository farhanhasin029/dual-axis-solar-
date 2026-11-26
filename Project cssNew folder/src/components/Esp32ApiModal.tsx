import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Globe,
  RefreshCw,
  Server,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ApiConfig } from '../types/telemetry';
import { fetchEsp32Telemetry } from '../utils/esp32Api';

interface Esp32ApiModalProps {
  isOpen: boolean;
  config: ApiConfig;
  demoMode: boolean;
  onClose: () => void;
  onSaveConfig: (next: ApiConfig, disableDemo?: boolean) => void;
}

const SAMPLE_TELEMETRY = `{
  "temperature": 29.4,
  "humidity": 54.2,
  "gasPpm": 215,
  "panAngle": 92,
  "tiltAngle": 68,
  "mode": "auto",
  "ldr": { "tl": 3420, "tr": 3390, "bl": 3180, "br": 3210 },
  "rssi": -58,
  "uptimeSec": 1420
}`;

const SAMPLE_CONTROL = `{
  "mode": "manual",
  "panAngle": 110,
  "tiltAngle": 75
}`;

export function Esp32ApiModal({
  isOpen,
  config,
  demoMode,
  onClose,
  onSaveConfig,
}: Esp32ApiModalProps) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [pollIntervalMs, setPollIntervalMs] = useState(config.pollIntervalMs);
  const [testState, setTestState] = useState<{
    status: 'idle' | 'testing' | 'ok' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBaseUrl(config.baseUrl);
      setPollIntervalMs(config.pollIntervalMs);
      setTestState({ status: 'idle', message: '' });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTestState({ status: 'testing', message: 'Querying /api/telemetry...' });
    try {
      const packet = await fetchEsp32Telemetry(baseUrl);
      setTestState({
        status: 'ok',
        message: `Connected! Temp ${packet.temperature}°C, Pan ${packet.panAngle}°, Tilt ${packet.tiltAngle}°`,
      });
    } catch (err) {
      setTestState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    }
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="esp32-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0b111d] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="esp32-modal-title"
                className="text-base font-semibold text-slate-100"
              >
                ESP32 HTTP Telemetry &amp; Control API
              </h2>
              <p className="text-xs text-slate-400">
                Configure your ESP32 endpoint for live polling and PWM control
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Endpoint Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="esp32-url"
                className="block font-mono text-xs font-medium text-slate-300"
              >
                ESP32 Base URL
              </label>
              <div className="relative mt-1.5">
                <Globe className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="esp32-url"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://192.168.1.50"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 font-mono text-xs text-slate-100 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="poll-ms"
                className="block font-mono text-xs font-medium text-slate-300"
              >
                Poll Interval
              </label>
              <select
                id="poll-ms"
                value={pollIntervalMs}
                onChange={(e) => setPollIntervalMs(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-cyan-500"
              >
                <option value={500}>500 ms (2 Hz)</option>
                <option value={1000}>1000 ms (1 Hz)</option>
                <option value={2000}>2000 ms (0.5 Hz)</option>
                <option value={5000}>5000 ms</option>
              </select>
            </div>
          </div>

          {/* Connection Test Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testState.status === 'testing'}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 font-mono text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${testState.status === 'testing' ? 'animate-spin' : ''}`}
              />
              Test GET /api/telemetry
            </button>

            <div className="font-mono text-xs">
              {testState.status === 'ok' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {testState.message}
                </span>
              )}
              {testState.status === 'error' && (
                <span className="text-rose-400">{testState.message}</span>
              )}
              {testState.status === 'idle' && (
                <span className="text-slate-500">
                  Target: {baseUrl.replace(/\/+$/, '')}/api/telemetry
                </span>
              )}
            </div>
          </div>

          {/* HTTPS Mixed Content Warning for Vercel */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200/90">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">
                Vercel HTTPS Mixed-Content Note
              </p>
              <p className="leading-relaxed text-slate-300">
                When hosted on Vercel (HTTPS), browsers block direct HTTP requests
                to local LAN IPs like <code className="text-amber-200">http://192.168.x.x</code>.
                For remote live control, expose your ESP32 via an HTTPS tunnel
                (Cloudflare Tunnel / ngrok) or test locally via <code className="text-amber-200">npm run dev</code>.
                Ensure your ESP32 sends CORS headers (<code className="text-amber-200">Access-Control-Allow-Origin: *</code>).
              </p>
            </div>
          </div>

          {/* JSON Schema Reference */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
                <span className="font-semibold text-emerald-300">
                  GET /api/telemetry
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('telemetry', SAMPLE_TELEMETRY)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
                >
                  <Copy className="h-3 w-3" />
                  {copied === 'telemetry' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-300">
                {SAMPLE_TELEMETRY}
              </pre>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
                <span className="font-semibold text-amber-300">
                  POST /api/control
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('control', SAMPLE_CONTROL)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
                >
                  <Copy className="h-3 w-3" />
                  {copied === 'control' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-300">
                {SAMPLE_CONTROL}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveConfig({ baseUrl, pollIntervalMs }, false);
              onClose();
            }}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            Save Config
          </button>
          {demoMode && (
            <button
              type="button"
              onClick={() => {
                onSaveConfig({ baseUrl, pollIntervalMs }, true);
                onClose();
              }}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Save &amp; Switch to Live ESP32
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

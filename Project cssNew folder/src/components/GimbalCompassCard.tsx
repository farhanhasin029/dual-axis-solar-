import { Compass, Lock, RotateCw, Sliders, Unlock } from 'lucide-react';
import { TrackerMode } from '../types/telemetry';

interface GimbalCompassCardProps {
  panAngle: number;
  tiltAngle: number;
  manualPan: number;
  manualTilt: number;
  mode: TrackerMode;
  onChangeManualPan: (angle: number) => void;
  onChangeManualTilt: (angle: number) => void;
  onApplyPreset: (pan: number, tilt: number) => void;
  commandStatus: string | null;
}

const PRESETS = [
  { label: 'East Morning', pan: 30, tilt: 42 },
  { label: 'Solar Noon', pan: 90, tilt: 88 },
  { label: 'West Afternoon', pan: 150, tilt: 45 },
  { label: 'Stow Flat', pan: 90, tilt: 90 },
];

function angleToPwmUs(angle: number): number {
  return Math.round(500 + (angle / 180) * 2000);
}

export function GimbalCompassCard({
  panAngle,
  tiltAngle,
  manualPan,
  manualTilt,
  mode,
  onChangeManualPan,
  onChangeManualTilt,
  onApplyPreset,
  commandStatus,
}: GimbalCompassCardProps) {
  const isManual = mode === 'manual';

  // Compass arc geometry: 0 deg = East (left), 90 deg = South (top), 180 deg = West (right)
  const panRad = ((180 - panAngle) * Math.PI) / 180;
  const needleX = 110 + Math.cos(panRad) * 70;
  const needleY = 115 - Math.sin(panRad) * 70;

  // Tilt gimbal geometry: panel rotates around pivot (110, 108)
  const panelRotation = tiltAngle - 90;

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0c121e]/90 p-5 shadow-xl">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                Dual-Axis Gimbal &amp; Azimuth Compass
              </h2>
              <p className="text-xs text-slate-400">
                Servo orientation telemetry &amp; PWM override
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium ${
              isManual
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {isManual ? (
              <>
                <Unlock className="h-3 w-3" /> MANUAL PWM
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" /> AUTO CLOSED-LOOP
              </>
            )}
          </span>
        </div>

        {/* SVG Gauges Row */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Pan Azimuth Compass SVG */}
          <div className="flex flex-col items-center rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex w-full items-center justify-between font-mono text-xs text-slate-400">
              <span>PAN AZIMUTH</span>
              <span className="text-cyan-400">{angleToPwmUs(panAngle)} µs</span>
            </div>

            <svg viewBox="0 0 220 140" className="mt-2 w-full max-w-[240px]">
              <defs>
                <linearGradient id="panArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>

              {/* Outer semicircle track */}
              <path
                d="M 26 115 A 84 84 0 0 1 194 115"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Active swept arc */}
              <path
                d={`M 26 115 A 84 84 0 0 1 ${110 + Math.cos(panRad) * 84} ${115 - Math.sin(panRad) * 84}`}
                fill="none"
                stroke="url(#panArcGrad)"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Degree ticks */}
              {[0, 45, 90, 135, 180].map((deg) => {
                const rad = ((180 - deg) * Math.PI) / 180;
                const x1 = 110 + Math.cos(rad) * 66;
                const y1 = 115 - Math.sin(rad) * 66;
                const x2 = 110 + Math.cos(rad) * 74;
                const y2 = 115 - Math.sin(rad) * 74;
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#64748b"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Compass labels */}
              <text x="14" y="132" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                E 0°
              </text>
              <text x="95" y="20" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                S 90°
              </text>
              <text x="174" y="132" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                180° W
              </text>

              {/* Needle */}
              <line
                x1="110"
                y1="115"
                x2={needleX}
                y2={needleY}
                stroke="#38bdf8"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="110" cy="115" r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
              <circle cx={needleX} cy={needleY} r="4" fill="#f59e0b" />
            </svg>

            <div className="mt-1 text-center font-mono">
              <span className="text-3xl font-bold tabular-nums text-slate-100">
                {panAngle}°
              </span>
              <span className="ml-2 text-xs text-slate-400">/ 180°</span>
            </div>
          </div>

          {/* Tilt Elevation Gimbal SVG */}
          <div className="flex flex-col items-center rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex w-full items-center justify-between font-mono text-xs text-slate-400">
              <span>TILT ELEVATION</span>
              <span className="text-amber-400">{angleToPwmUs(tiltAngle)} µs</span>
            </div>

            <svg viewBox="0 0 220 140" className="mt-2 w-full max-w-[240px]">
              {/* Horizon baseline */}
              <line
                x1="22"
                y1="118"
                x2="198"
                y2="118"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Arc guide */}
              <path
                d="M 42 108 A 68 68 0 0 1 178 108"
                fill="none"
                stroke="#1e293b"
                strokeWidth="2"
                strokeDasharray="3 4"
              />

              {/* Gimbal pedestal mast */}
              <rect x="103" y="106" width="14" height="16" rx="3" fill="#334155" />
              <rect x="86" y="120" width="48" height="6" rx="3" fill="#475569" />

              {/* Rotating Solar Panel Assembly */}
              <g transform={`translate(110, 104) rotate(${panelRotation})`}>
                {/* Incident sun rays */}
                <line x1="-24" y1="-44" x2="-24" y2="-18" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.65" />
                <line x1="0" y1="-48" x2="0" y2="-18" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.85" />
                <line x1="24" y1="-44" x2="24" y2="-18" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.65" />

                {/* Panel frame */}
                <rect
                  x="-54"
                  y="-12"
                  width="108"
                  height="11"
                  rx="3"
                  fill="#0ea5e9"
                  fillOpacity="0.28"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                {/* Cell dividers */}
                <line x1="-27" y1="-12" x2="-27" y2="-1" stroke="#38bdf8" strokeOpacity="0.5" />
                <line x1="0" y1="-12" x2="0" y2="-1" stroke="#38bdf8" strokeOpacity="0.5" />
                <line x1="27" y1="-12" x2="27" y2="-1" stroke="#38bdf8" strokeOpacity="0.5" />

                {/* Normal vector */}
                <line x1="0" y1="-12" x2="0" y2="-30" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 2" />
              </g>

              <circle cx="110" cy="104" r="5" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
              <text x="16" y="114" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                0°
              </text>
              <text x="98" y="20" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                90°
              </text>
              <text x="184" y="114" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                180°
              </text>
            </svg>

            <div className="mt-1 text-center font-mono">
              <span className="text-3xl font-bold tabular-nums text-slate-100">
                {tiltAngle}°
              </span>
              <span className="ml-2 text-xs text-slate-400">/ 180°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Servo PWM Override Controls */}
      <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            Servo PWM Override
          </div>
          {commandStatus && (
            <span className="font-mono text-[11px] text-cyan-300">
              {commandStatus}
            </span>
          )}
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Pan Slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Pan Target (X)</span>
              <span className="font-semibold text-cyan-300">
                {isManual ? manualPan : panAngle}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              disabled={!isManual}
              value={isManual ? manualPan : panAngle}
              onChange={(e) => onChangeManualPan(Number(e.target.value))}
              className="servo-slider w-full"
            />
          </div>

          {/* Tilt Slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Tilt Target (Y)</span>
              <span className="font-semibold text-amber-300">
                {isManual ? manualTilt : tiltAngle}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              disabled={!isManual}
              value={isManual ? manualTilt : tiltAngle}
              onChange={(e) => onChangeManualTilt(Number(e.target.value))}
              className="servo-slider w-full"
            />
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={!isManual}
                onClick={() => onApplyPreset(preset.pan, preset.tilt)}
                className="rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition hover:border-amber-500/50 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {preset.label}
              </button>
            ))}
          </div>
          {!isManual && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500">
              <RotateCw className="h-3 w-3" />
              Switch to Manual Override to unlock sliders
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

import { Crosshair, SunMedium } from 'lucide-react';
import { LdrQuadrants } from '../types/telemetry';

interface LdrMatrixCardProps {
  ldr: LdrQuadrants;
}

interface QuadrantMeta {
  key: keyof LdrQuadrants;
  label: string;
  pinHint: string;
}

const QUADRANTS: QuadrantMeta[] = [
  { key: 'tl', label: 'Top-Left (TL)', pinHint: 'GPIO34 / ADC1_CH6' },
  { key: 'tr', label: 'Top-Right (TR)', pinHint: 'GPIO35 / ADC1_CH7' },
  { key: 'bl', label: 'Bottom-Left (BL)', pinHint: 'GPIO32 / ADC1_CH4' },
  { key: 'br', label: 'Bottom-Right (BR)', pinHint: 'GPIO33 / ADC1_CH5' },
];

export function LdrMatrixCard({ ldr }: LdrMatrixCardProps) {
  const avgRight = (ldr.tr + ldr.br) / 2;
  const avgLeft = (ldr.tl + ldr.bl) / 2;
  const avgTop = (ldr.tl + ldr.tr) / 2;
  const avgBottom = (ldr.bl + ldr.br) / 2;

  const deltaX = Math.round(avgRight - avgLeft);
  const deltaY = Math.round(avgTop - avgBottom);
  const deadband = 150;
  const isLocked = Math.abs(deltaX) <= deadband && Math.abs(deltaY) <= deadband;

  // Map differential (-2000..+2000) into reticle coordinates (-36..+36)
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));
  const dotX = 60 + clamp((deltaX / 1600) * 38, -40, 40);
  const dotY = 60 - clamp((deltaY / 1600) * 38, -40, 40);

  const avgIrradiancePct = (
    ((ldr.tl + ldr.tr + ldr.bl + ldr.br) / (4 * 4095)) *
    100
  ).toFixed(1);

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0c121e]/90 p-5 shadow-xl">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <SunMedium className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-100">
                4-Quadrant LDR Matrix
              </h2>
              <p className="text-xs text-slate-400">
                12-bit ADC irradiance (0–4095) &amp; sun-pull differential
              </p>
            </div>
          </div>

          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-amber-300">
            AVG {avgIrradiancePct}%
          </span>
        </div>

        {/* 2x2 Quadrant Grid + Central Crosshair Overlay */}
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          {QUADRANTS.map((q) => {
            const raw = ldr[q.key];
            const ratio = Math.min(1, Math.max(0, raw / 4095));
            const pct = (ratio * 100).toFixed(1);
            const glowAlpha = (0.06 + ratio * 0.28).toFixed(2);
            const borderAlpha = (0.2 + ratio * 0.55).toFixed(2);

            return (
              <div
                key={q.key}
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 35%, rgba(245, 158, 11, ${glowAlpha}), rgba(2, 6, 23, 0.85) 75%)`,
                  borderColor: `rgba(245, 158, 11, ${borderAlpha})`,
                }}
                className="flex flex-col justify-between rounded-xl border bg-slate-950/80 p-3.5 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      {q.label}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {q.pinHint}
                    </div>
                  </div>
                  <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
                    {pct}%
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-2xl font-bold tabular-nums text-slate-100">
                      {raw}
                    </span>
                    <span className="text-[11px] text-slate-500">/ 4095</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Central Differential Sun-Pull Crosshair */}
      <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/75 p-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 120 120"
            className="h-24 w-24 shrink-0 rounded-full border border-slate-800 bg-[#05080f]"
          >
            {/* Crosshair axes */}
            <line x1="60" y1="8" x2="60" y2="112" stroke="#1e293b" strokeWidth="1" />
            <line x1="8" y1="60" x2="112" y2="60" stroke="#1e293b" strokeWidth="1" />
            {/* Outer ring & deadband ring */}
            <circle cx="60" cy="60" r="44" fill="none" stroke="#1e293b" strokeWidth="1" />
            <circle
              cx="60"
              cy="60"
              r="11"
              fill={isLocked ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.06)'}
              stroke={isLocked ? '#10b981' : '#475569'}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {/* Pull vector line */}
            <line
              x1="60"
              y1="60"
              x2={dotX}
              y2={dotY}
              stroke={isLocked ? '#10b981' : '#f59e0b'}
              strokeWidth="1.75"
            />
            {/* Sun pull dot */}
            <circle
              cx={dotX}
              cy={dotY}
              r="5.5"
              fill={isLocked ? '#34d399' : '#fbbf24'}
              stroke="#06090f"
              strokeWidth="1.5"
            />
          </svg>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Crosshair className="h-3.5 w-3.5 text-amber-400" />
              Sun-Pull Vector
            </div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                  isLocked
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                {isLocked ? 'LOCKED ON SUN (±150)' : 'TRACKING DIFFERENTIAL'}
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-slate-400">
              Deadband ±{deadband} ADC counts
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2.5 sm:w-auto">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 font-mono">
            <div className="text-[10px] uppercase text-slate-400">ΔX (Pan Err)</div>
            <div
              className={`mt-0.5 text-base font-bold tabular-nums ${
                Math.abs(deltaX) <= deadband ? 'text-emerald-300' : 'text-cyan-300'
              }`}
            >
              {deltaX >= 0 ? `+${deltaX}` : deltaX}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 font-mono">
            <div className="text-[10px] uppercase text-slate-400">ΔY (Tilt Err)</div>
            <div
              className={`mt-0.5 text-base font-bold tabular-nums ${
                Math.abs(deltaY) <= deadband ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {deltaY >= 0 ? `+${deltaY}` : deltaY}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

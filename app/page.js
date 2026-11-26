'use client';

import { useEffect, useState } from 'react';

export default function SolarDashboard() {
  const [data, setData] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry', { cache: 'no-store' });
        const json = await res.json();
        if (!json.offline && json.updatedAt) {
          setData(json);
          // Consider online if telemetry updated within the last 10 seconds
          setIsOnline(Date.now() - json.updatedAt < 10000);
        } else {
          setIsOnline(false);
        }
      } catch (err) {
        setIsOnline(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, []);

  // Digital LDR modules output 0 (LOW) when bright light hits them
  const ldrLabels = [
    'Top Left (D27)',
    'Top Right (D26)',
    'Bottom Left (D25)',
    'Bottom Right (D33)'
  ];
  const ldrStates = data?.ldr || [1, 1, 1, 1];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header & Status Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dual-Axis Solar Tracker</h1>
            <p className="text-sm text-slate-400">ESP32 Telemetry & Environmental Monitor</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              isOnline
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isOnline ? '● ESP32 Online' : '○ Waiting for ESP32'}
          </span>
        </div>

        {/* Environmental Telemetry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Temperature (DHT22)</p>
            <p className="text-3xl font-semibold mt-2 text-amber-400">
              {data && data.temp !== undefined ? `${data.temp.toFixed(1)} °C` : '--'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Humidity (DHT22)</p>
            <p className="text-3xl font-semibold mt-2 text-sky-400">
              {data && data.hum !== undefined ? `${data.hum.toFixed(1)} %` : '--'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Air Quality (MQ135 Raw)</p>
            <p className="text-3xl font-semibold mt-2 text-purple-400">
              {data && data.gas !== undefined ? data.gas : '--'}
            </p>
          </div>
        </div>

        {/* Servo Gauges & 2x2 LDR Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Dual-Axis Servo Orientation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Servo Orientation (MG996R)
            </h2>

            {/* Horizontal Pan */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Horizontal Pan (D19)</span>
                <span className="font-mono text-amber-400">{data ? `${data.pan}°` : '90°'}</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${((data?.pan ?? 90) / 180) * 100}%` }}
                />
              </div>
            </div>

            {/* Vertical Tilt */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Vertical Tilt (D23)</span>
                <span className="font-mono text-sky-400">{data ? `${data.tilt}°` : '90°'}</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-400 h-full transition-all duration-300"
                  style={{ width: `${((data?.tilt ?? 90) / 180) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2x2 LDR Quadrant Array */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              LDR Quadrant Array
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {ldrLabels.map((label, idx) => {
                const isLit = ldrStates[idx] === 0;
                return (
                  <div
                    key={label}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      isLit
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-sm font-bold mt-1">{isLit ? '☀ LIT' : 'SHADED'}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}

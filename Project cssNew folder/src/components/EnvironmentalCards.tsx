import { ReactNode } from 'react';
import { Droplets, Flame, Thermometer } from 'lucide-react';
import { GasStatusLevel, TelemetryHistoryPoint } from '../types/telemetry';

interface EnvironmentalCardsProps {
  temperature: number;
  humidity: number;
  gasPpm: number;
  history: TelemetryHistoryPoint[];
}

interface BadgeStyle {
  label: string;
  classes: string;
}

interface SparklineCardProps {
  id: string;
  title: string;
  sensorModel: string;
  value: string;
  unit: string;
  icon: ReactNode;
  accentColor: string;
  badge: BadgeStyle;
  series: number[];
  decimals?: number;
}

function getGasStatus(ppm: number): { level: GasStatusLevel; badge: BadgeStyle } {
  if (ppm >= 800) {
    return {
      level: 'Hazard',
      badge: {
        label: 'HAZARD',
        classes: 'border-rose-500/50 bg-rose-500/15 text-rose-300 animate-pulse',
      },
    };
  }
  if (ppm >= 400) {
    return {
      level: 'Elevated',
      badge: {
        label: 'ELEVATED',
        classes: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      },
    };
  }
  return {
    level: 'Safe',
    badge: {
      label: 'SAFE',
      classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    },
  };
}

function getTempBadge(temp: number): BadgeStyle {
  if (temp >= 40) {
    return {
      label: 'HIGH HEAT',
      classes: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    };
  }
  if (temp >= 33) {
    return {
      label: 'WARM',
      classes: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    };
  }
  return {
    label: 'OPTIMAL',
    classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  };
}

function getHumidityBadge(rh: number): BadgeStyle {
  if (rh >= 75) {
    return {
      label: 'HIGH RH',
      classes: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
    };
  }
  if (rh <= 30) {
    return {
      label: 'DRY AIR',
      classes: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    };
  }
  return {
    label: 'NOMINAL',
    classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  };
}

function TelemetrySparklineCard({
  id,
  title,
  sensorModel,
  value,
  unit,
  icon,
  accentColor,
  badge,
  series,
  decimals = 1,
}: SparklineCardProps) {
  const width = 280;
  const height = 64;
  const padY = 6;

  const safeSeries = series.length > 1 ? series : [0, 0];
  const minVal = Math.min(...safeSeries);
  const maxVal = Math.max(...safeSeries);
  const span = Math.max(maxVal - minVal, 0.5);

  const points = safeSeries.map((v, idx) => {
    const x = (idx / (safeSeries.length - 1)) * width;
    const y = height - padY - ((v - minVal) / span) * (height - padY * 2);
    return { x, y };
  });

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const lastPt = points[points.length - 1];

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0c121e]/90 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900"
            style={{ color: accentColor }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <p className="font-mono text-[11px] text-slate-500">{sensorModel}</p>
          </div>
        </div>

        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${badge.classes}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="font-mono">
          <span className="text-3xl font-bold tabular-nums text-slate-100">
            {value}
          </span>
          <span className="ml-1.5 text-sm font-medium text-slate-400">
            {unit}
          </span>
        </div>

        <div className="text-right font-mono text-[11px] text-slate-400">
          <div>MIN {minVal.toFixed(decimals)}</div>
          <div>MAX {maxVal.toFixed(decimals)}</div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/70 px-2 pt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
          <defs>
            <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#grad-${id})`} />
          <path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={lastPt.x}
            cy={lastPt.y}
            r="3.2"
            fill={accentColor}
            stroke="#06090f"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}

export function EnvironmentalCards({
  temperature,
  humidity,
  gasPpm,
  history,
}: EnvironmentalCardsProps) {
  const gasStatus = getGasStatus(gasPpm);

  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <TelemetrySparklineCard
        id="temp"
        title="Temperature"
        sensorModel="DHT22 / BME280"
        value={temperature.toFixed(1)}
        unit="°C"
        icon={<Thermometer className="h-4 w-4" />}
        accentColor="#fb923c"
        badge={getTempBadge(temperature)}
        series={history.map((h) => h.temperature)}
        decimals={1}
      />

      <TelemetrySparklineCard
        id="humidity"
        title="Relative Humidity"
        sensorModel="DHT22 / BME280"
        value={humidity.toFixed(1)}
        unit="% RH"
        icon={<Droplets className="h-4 w-4" />}
        accentColor="#38bdf8"
        badge={getHumidityBadge(humidity)}
        series={history.map((h) => h.humidity)}
        decimals={1}
      />

      <TelemetrySparklineCard
        id="gas"
        title="Gas / Air Quality"
        sensorModel="MQ-135 / MQ-2"
        value={String(gasPpm)}
        unit="PPM"
        icon={<Flame className="h-4 w-4" />}
        accentColor={
          gasStatus.level === 'Hazard'
            ? '#f43f5e'
            : gasStatus.level === 'Elevated'
              ? '#f59e0b'
              : '#10b981'
        }
        badge={gasStatus.badge}
        series={history.map((h) => h.gasPpm)}
        decimals={0}
      />
    </section>
  );
}

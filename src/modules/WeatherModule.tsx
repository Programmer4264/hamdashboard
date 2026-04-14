import { useState, useEffect, useCallback } from 'react';

interface WeatherModuleProps {
  stationId: string;
  apiKey: string;
  units?: string;
  /** When true, renders a compact tile-sized view with only key readings */
  compact?: boolean;
}

interface WeatherData {
  stationID: string;
  obsTimeLocal: string;
  neighborhood: string;
  temp: number | null;
  heatIndex: number | null;
  dewpt: number | null;
  windChill: number | null;
  windSpeed: number;
  windGust: number;
  pressure: number | null;
  precipRate: number;
  precipTotal: number;
  humidity: number | null;
  winddir: number;
  uv: number;
  solarRadiation: number | null;
}

const UNIT_LABELS: Record<string, { temp: string; speed: string; pressure: string; precip: string }> = {
  e: { temp: '°F', speed: 'mph', pressure: 'in', precip: 'in' },
  m: { temp: '°C', speed: 'km/h', pressure: 'mb', precip: 'mm' },
  h: { temp: '°C', speed: 'mph', pressure: 'mb', precip: 'mm' },
};

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

function windDirection(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// --- SVG Gauge Components ---

function TemperatureGauge({ temp, units }: { temp: number | null; units: string }) {
  // Arc from -20 to 120°F or -30 to 50°C
  const isMetric = units === 'm' || units === 'h';
  const min = isMetric ? -30 : -20;
  const max = isMetric ? 50 : 120;
  const t = temp ?? 0;
  const fraction = Math.max(0, Math.min(1, (t - min) / (max - min)));
  // Arc: 180° sweep from left to right (π to 0)
  const cx = 100, cy = 100, r = 70;
  const startAngle = Math.PI; // left
  const angle = startAngle - fraction * Math.PI;
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy - r * Math.sin(angle);

  return (
    <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', maxHeight: 100 }}>
      <defs>
        <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="25%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="75%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#334155"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Color arc up to current temp */}
      {fraction > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${dotX} ${dotY}`}
          fill="none"
          stroke="url(#tempGrad)"
          strokeWidth="10"
          strokeLinecap="round"
        />
      )}
      {/* Indicator dot */}
      <circle cx={dotX} cy={dotY} r="6" fill="white" stroke="#1e293b" strokeWidth="2" />
    </svg>
  );
}

function WindCompass({ deg }: { deg: number; speed: number }) {
  const cx = 100, cy = 100, r = 70;
  const labels = [
    { label: 'N', angle: -90 },
    { label: 'E', angle: 0 },
    { label: 'S', angle: 90 },
    { label: 'W', angle: 180 },
  ];
  // Wind arrow points in the direction wind is blowing FROM, so arrow points FROM that direction toward center
  const arrowAngle = (deg - 90) * (Math.PI / 180);
  const arrowLen = 40;
  const ax = cx + arrowLen * Math.cos(arrowAngle);
  const ay = cy + arrowLen * Math.sin(arrowAngle);
  // Arrow tip (opposite side - where it's blowing TO)
  const tipX = cx - arrowLen * Math.cos(arrowAngle);
  const tipY = cy - arrowLen * Math.sin(arrowAngle);

  // Tick marks
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 - 90) * (Math.PI / 180);
    const isMajor = i % 9 === 0;
    const innerR = isMajor ? r - 10 : r - 5;
    ticks.push(
      <line
        key={i}
        x1={cx + innerR * Math.cos(a)}
        y1={cy + innerR * Math.sin(a)}
        x2={cx + r * Math.cos(a)}
        y2={cy + r * Math.sin(a)}
        stroke={isMajor ? '#94a3b8' : '#475569'}
        strokeWidth={isMajor ? 1.5 : 0.5}
      />
    );
  }

  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: 'auto', maxHeight: 130 }}>
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#475569" strokeWidth="1" />
      {ticks}
      {/* Cardinal labels */}
      {labels.map(({ label, angle }) => {
        const a = angle * (Math.PI / 180);
        const lx = cx + (r + 14) * Math.cos(a);
        const ly = cy + (r + 14) * Math.sin(a);
        return (
          <text key={label} x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
            fill="#94a3b8" fontSize="12" fontWeight="bold">{label}</text>
        );
      })}
      {/* Wind arrow - line from source direction through center to destination */}
      <line x1={ax} y1={ay} x2={tipX} y2={tipY} stroke="#e2e8f0" strokeWidth="2.5" />
      {/* Arrowhead at the tip */}
      <polygon
        points={`${tipX},${tipY} ${tipX - 8 * Math.cos(arrowAngle - 0.4)},${tipY - 8 * Math.sin(arrowAngle - 0.4)} ${tipX - 8 * Math.cos(arrowAngle + 0.4)},${tipY - 8 * Math.sin(arrowAngle + 0.4)}`}
        fill="#e2e8f0"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="4" fill="#475569" />
    </svg>
  );
}

function PrecipitationGauge({ total, max: maxVal }: { total: number; max: number }) {
  // Simple cylinder / tube
  const fillFraction = maxVal > 0 ? Math.min(1, total / maxVal) : 0;
  const tubeH = 80;
  const tubeW = 30;
  const tubeX = 85;
  const tubeY = 20;
  const fillH = tubeH * fillFraction;

  return (
    <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', maxHeight: 100 }}>
      {/* Tube outline */}
      <rect x={tubeX} y={tubeY} width={tubeW} height={tubeH} rx="4" ry="4"
        fill="none" stroke="#64748b" strokeWidth="1.5" />
      {/* Fill */}
      {fillH > 0 && (
        <rect x={tubeX + 2} y={tubeY + tubeH - fillH} width={tubeW - 4} height={fillH}
          rx="2" ry="2" fill="#3b82f6" opacity="0.7" />
      )}
      {/* Graduations */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f}
          x1={tubeX} y1={tubeY + tubeH * (1 - f)}
          x2={tubeX + 6} y2={tubeY + tubeH * (1 - f)}
          stroke="#64748b" strokeWidth="1"
        />
      ))}
      {/* Opening at top */}
      <ellipse cx={tubeX + tubeW / 2} cy={tubeY} rx={tubeW / 2 + 4} ry="4"
        fill="none" stroke="#64748b" strokeWidth="1.5" />
    </svg>
  );
}

function PressureGauge({ pressure, units }: { pressure: number | null; units: string }) {
  const isMetric = units === 'm' || units === 'h';
  const min = isMetric ? 960 : 28;
  const max = isMetric ? 1060 : 31;
  const p = pressure ?? (isMetric ? 1013 : 29.92);
  const fraction = Math.max(0, Math.min(1, (p - min) / (max - min)));
  const cx = 100, cy = 100, r = 70;

  // Gauge arc from 225° to -45° (270° sweep)
  const startDeg = 225;
  const sweepDeg = 270;
  const needleDeg = startDeg - fraction * sweepDeg;
  const needleRad = needleDeg * (Math.PI / 180);
  const needleX = cx + (r - 15) * Math.cos(needleRad);
  const needleY = cy - (r - 15) * Math.sin(needleRad);

  // Tick marks
  const ticks = [];
  const numTicks = isMetric ? 10 : 12;
  for (let i = 0; i <= numTicks; i++) {
    const f = i / numTicks;
    const a = (startDeg - f * sweepDeg) * (Math.PI / 180);
    const isMajor = i % (isMetric ? 2 : 3) === 0;
    const innerR = isMajor ? r - 12 : r - 6;
    ticks.push(
      <line key={i}
        x1={cx + innerR * Math.cos(a)} y1={cy - innerR * Math.sin(a)}
        x2={cx + r * Math.cos(a)} y2={cy - r * Math.sin(a)}
        stroke={isMajor ? '#94a3b8' : '#475569'}
        strokeWidth={isMajor ? 1.5 : 0.5}
      />
    );
    if (isMajor) {
      const tickVal = min + f * (max - min);
      const labelR = r + 12;
      ticks.push(
        <text key={`l${i}`}
          x={cx + labelR * Math.cos(a)} y={cy - labelR * Math.sin(a)}
          textAnchor="middle" dominantBaseline="central"
          fill="#64748b" fontSize="8"
        >
          {isMetric ? tickVal.toFixed(0) : tickVal.toFixed(1)}
        </text>
      );
    }
  }

  // Arc path
  const arcStart = startDeg * (Math.PI / 180);
  const arcEnd = (startDeg - sweepDeg) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(arcStart);
  const y1 = cy - r * Math.sin(arcStart);
  const x2 = cx + r * Math.cos(arcEnd);
  const y2 = cy - r * Math.sin(arcEnd);

  return (
    <svg viewBox="0 0 200 140" style={{ width: '100%', height: 'auto', maxHeight: 120 }}>
      {/* Arc */}
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 1 0 ${x2} ${y2}`}
        fill="none" stroke="#475569" strokeWidth="2"
      />
      {ticks}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="5" fill="#ef4444" />
    </svg>
  );
}

// --- Main Component ---

export function WeatherModule({ stationId, apiKey, units = 'e', compact = false }: WeatherModuleProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const unitKey = units === 'm' ? 'metric' : units === 'h' ? 'metric' : 'imperial';
  const labels = UNIT_LABELS[units] || UNIT_LABELS['e'];

  const fetchWeather = useCallback(async () => {
    if (!stationId || !apiKey) {
      setError('Missing station ID or API key');
      setLoading(false);
      return;
    }

    try {
      const url = `https://api.weather.com/v2/pws/observations/current?stationId=${encodeURIComponent(stationId)}&format=json&units=${encodeURIComponent(units)}&apiKey=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }
      const data = await resp.json();
      const obs = data?.observations?.[0];
      if (!obs) {
        throw new Error('No observation data');
      }

      const measurements = obs[unitKey] || obs['imperial'] || {};
      setWeather({
        stationID: obs.stationID || stationId,
        obsTimeLocal: obs.obsTimeLocal || '',
        neighborhood: obs.neighborhood || '',
        temp: measurements.temp ?? null,
        heatIndex: measurements.heatIndex ?? null,
        dewpt: measurements.dewpt ?? null,
        windChill: measurements.windChill ?? null,
        windSpeed: measurements.windSpeed ?? 0,
        windGust: measurements.windGust ?? 0,
        pressure: measurements.pressure ?? null,
        precipRate: measurements.precipRate ?? 0,
        precipTotal: measurements.precipTotal ?? 0,
        humidity: obs.humidity ?? null,
        winddir: obs.winddir ?? 0,
        uv: obs.uv ?? 0,
        solarRadiation: obs.solarRadiation ?? null,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }, [stationId, apiKey, units, unitKey]);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchWeather]);

  if (loading) {
    return (
      <div style={compact ? compactContainerStyle : fullContainerStyle}>
        <span style={loadingStyle}>Loading weather…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={compact ? compactContainerStyle : fullContainerStyle}>
        <span style={errorStyle}>⚠ {error}</span>
        <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          Station: {stationId}
        </span>
      </div>
    );
  }

  if (!weather) return null;

  // --- COMPACT TILE VIEW ---
  if (compact) {
    return (
      <div style={compactContainerStyle}>
        <div style={compactStationRow}>
          <span style={compactStationText}>{weather.neighborhood || weather.stationID}</span>
        </div>
        <div style={compactTempRow}>
          <span style={compactTempText}>{weather.temp ?? '--'}{labels.temp}</span>
        </div>
        <div style={compactReadingsRow}>
          <span style={compactReading}>💧 {weather.humidity ?? '--'}%</span>
          <span style={compactReading}>🌬️ {windDirection(weather.winddir)} {weather.windSpeed}{labels.speed}</span>
          <span style={compactReading}>📊 {weather.pressure ?? '--'}{labels.pressure}</span>
        </div>
      </div>
    );
  }

  // --- FULL DETAIL VIEW (WU-style gauges + summary table) ---
  const summaryRows = [
    { label: 'Temperature', value: weather.temp != null ? `${weather.temp}${labels.temp}` : '--' },
    { label: 'Dew Point', value: weather.dewpt != null ? `${weather.dewpt}${labels.temp}` : '--' },
    { label: 'Humidity', value: weather.humidity != null ? `${weather.humidity}%` : '--' },
    { label: 'Precipitation', value: `${weather.precipTotal}${labels.precip}` },
    { label: 'Wind Speed', value: `${weather.windSpeed}${labels.speed}` },
    { label: 'Wind Gust', value: `${weather.windGust}${labels.speed}` },
    { label: 'Wind Direction', value: `${windDirection(weather.winddir)}` },
    { label: 'Pressure', value: weather.pressure != null ? `${weather.pressure}${labels.pressure}` : '--' },
    { label: 'UV Index', value: `${weather.uv}` },
  ];

  if (weather.solarRadiation !== null) {
    summaryRows.push({ label: 'Solar Radiation', value: `${weather.solarRadiation} W/m²` });
  }

  return (
    <div style={fullContainerStyle}>
      {/* Station header */}
      <div style={fullHeaderStyle}>
        <span style={fullStationName}>{weather.neighborhood || weather.stationID}</span>
        <span style={fullTimeText}>{weather.obsTimeLocal}</span>
      </div>

      {/* Gauge cards row */}
      <div style={gaugeRow}>
        {/* TEMPERATURE */}
        <div style={gaugeCard}>
          <span style={gaugeTitle}>TEMPERATURE</span>
          <TemperatureGauge temp={weather.temp} units={units} />
          <div style={gaugeValueRow}>
            <span style={gaugeValueLarge}>{weather.temp ?? '--'}</span>
            <span style={gaugeValueUnit}>{labels.temp}</span>
          </div>
          <span style={gaugeSubText}>
            {weather.dewpt ?? '--'}° DP · {weather.humidity ?? '--'}% RH
          </span>
        </div>

        {/* WIND */}
        <div style={gaugeCard}>
          <span style={gaugeTitle}>WIND</span>
          <WindCompass deg={weather.winddir} speed={weather.windSpeed} />
          <div style={gaugeValueRow}>
            <span style={gaugeValueLarge}>{weather.windSpeed}</span>
            <span style={gaugeValueUnit}>{labels.speed}</span>
          </div>
          {weather.windGust > 0 && (
            <span style={gaugeSubText}>GUSTS {weather.windGust} {labels.speed.toUpperCase()}</span>
          )}
          <span style={gaugeSubText}>{weather.winddir}° {windDirection(weather.winddir)}</span>
        </div>

        {/* PRECIPITATION */}
        <div style={gaugeCard}>
          <span style={gaugeTitle}>PRECIPITATION</span>
          <PrecipitationGauge total={weather.precipTotal} max={2} />
          <div style={gaugeValueRow}>
            <span style={gaugeValueLarge}>{weather.precipTotal}</span>
            <span style={gaugeValueUnit}>{labels.precip}</span>
          </div>
          <span style={gaugeSubText}>{weather.precipRate} {labels.precip.toUpperCase()}/HR</span>
        </div>

        {/* PRESSURE */}
        <div style={gaugeCard}>
          <span style={gaugeTitle}>PRESSURE</span>
          <PressureGauge pressure={weather.pressure} units={units} />
          <div style={gaugeValueRow}>
            <span style={gaugeValueLarge}>{weather.pressure ?? '--'}</span>
            <span style={gaugeValueUnit}>{labels.pressure}</span>
          </div>
        </div>
      </div>

      {/* Summary table */}
      <div style={summarySection}>
        <table style={summaryTable}>
          <thead>
            <tr>
              <th style={{ ...summaryTh, textAlign: 'left' }}>SUMMARY</th>
              <th style={summaryTh}>CURRENT</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row, i) => (
              <tr key={row.label} style={{
                background: i % 2 === 0 ? 'hsla(210, 15%, 20%, 0.5)' : 'transparent',
              }}>
                <td style={summaryTdLabel}>{row.label}</td>
                <td style={summaryTdValue}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======== STYLES ========

// --- Full detail view ---

const fullContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '24px 32px',
  boxSizing: 'border-box',
  background: '#1a1f2e',
  color: '#e2e8f0',
  fontFamily: '"Roboto Condensed", "Segoe UI", sans-serif',
  overflow: 'auto',
};

const fullHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
  flexShrink: 0,
};

const fullStationName: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const fullTimeText: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
};

const gaugeRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16,
  marginBottom: 32,
  flexShrink: 0,
};

const gaugeCard: React.CSSProperties = {
  background: '#232a3b',
  border: '1px solid #334155',
  borderRadius: 12,
  padding: '16px 12px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const gaugeTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#64b5f6',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: 4,
};

const gaugeValueRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 4,
  marginTop: 2,
};

const gaugeValueLarge: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 300,
  color: '#f1f5f9',
  lineHeight: 1,
};

const gaugeValueUnit: React.CSSProperties = {
  fontSize: 16,
  color: '#94a3b8',
  fontWeight: 400,
};

const gaugeSubText: React.CSSProperties = {
  fontSize: 11,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const summarySection: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
};

const summaryTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const summaryTh: React.CSSProperties = {
  padding: '10px 16px',
  color: '#94a3b8',
  fontWeight: 700,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  borderBottom: '2px solid #334155',
  textAlign: 'center',
};

const summaryTdLabel: React.CSSProperties = {
  padding: '8px 16px',
  color: '#cbd5e1',
  fontWeight: 500,
};

const summaryTdValue: React.CSSProperties = {
  padding: '8px 16px',
  color: '#e2e8f0',
  textAlign: 'center',
};

// --- Loading / error ---

const loadingStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#94a3b8',
  margin: 'auto',
};

const errorStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#f59e0b',
  margin: 'auto',
  textAlign: 'center',
};

// --- Compact tile styles ---

const compactContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '8px',
  boxSizing: 'border-box',
  background: 'linear-gradient(135deg, hsl(210 20% 12%), hsl(210 15% 8%))',
  color: '#e2e8f0',
  fontFamily: '"Roboto Condensed", "Segoe UI", sans-serif',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '4px',
};

const compactStationRow: React.CSSProperties = {
  textAlign: 'center',
  flexShrink: 0,
};

const compactStationText: React.CSSProperties = {
  fontSize: 'clamp(8px, 0.9vw, 12px)',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const compactTempRow: React.CSSProperties = {
  textAlign: 'center',
  flexShrink: 0,
};

const compactTempText: React.CSSProperties = {
  fontSize: 'clamp(32px, 5vw, 64px)',
  fontWeight: 300,
  lineHeight: 1.1,
  color: '#f1f5f9',
};

const compactReadingsRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 'clamp(6px, 1vw, 16px)',
  flexWrap: 'wrap',
  flexShrink: 0,
};

const compactReading: React.CSSProperties = {
  fontSize: 'clamp(9px, 0.85vw, 13px)',
  color: '#94a3b8',
  whiteSpace: 'nowrap',
};

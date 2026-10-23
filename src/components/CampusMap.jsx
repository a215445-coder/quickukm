import { LINES, STOPS } from '../data/mockData';

// Simulated buses: one per line (+ a second bus on Zon A), animated along
// each line's path with SMIL animateMotion
const BUSES = [
  { lineId: 'A', begin: '0s', dur: '52s' },
  { lineId: 'A', begin: '-27s', dur: '52s' },
  { lineId: 'B', begin: '-12s', dur: '42s' },
  { lineId: 'C', begin: '-32s', dur: '60s' },
  { lineId: 'D', begin: '-8s', dur: '38s' },
];

const BUILDINGS = [
  { x: 38, y: 100, w: 57, h: 26, label: 'FSSK', lx: 66, ly: 118 },
  { x: 138, y: 82, w: 64, h: 26, label: 'FEP', lx: 170, ly: 100 },
  { x: 256, y: 100, w: 66, h: 27, label: 'FST', lx: 289, ly: 118 },
  { x: 22, y: 208, w: 43, h: 26, label: 'FPI', lx: 43, ly: 226 },
  { x: 138, y: 168, w: 60, h: 26, label: 'FFAR', lx: 168, ly: 186 },
  { x: 240, y: 216, w: 54, h: 26, label: 'FTSM', lx: 267, ly: 234 },
  { x: 315, y: 255, w: 53, h: 27, label: 'FKAB', lx: 341, ly: 273 },
  { x: 215, y: 345, w: 70, h: 27, label: 'FPER', lx: 250, ly: 363 },
  { x: 103, y: 422, w: 74, h: 24, label: 'FPEND', lx: 140, ly: 438 },
  { x: 30, y: 338, w: 60, h: 27, label: 'FSK', lx: 60, ly: 356 },
  { x: 200, y: 398, w: 62, h: 24, label: 'KIZ', lx: 231, ly: 414 },
];

const ROADS = [
  'M78,92 L170,70 L290,88',
  'M290,88 L290,205 L320,300 L250,330',
  'M250,330 L140,415 L95,330',
  'M95,330 L70,235 L78,92',
  'M70,235 L180,200 L290,205',
  'M180,200 L140,415',
  'M250,330 L230,430 L140,415',
];

export default function CampusMap({ selectedStop, onSelectStop }) {
  return (
    <svg className="campus-svg" viewBox="0 0 380 460" role="img" aria-label="Stylised UKM campus shuttle map">
      <defs>
        <linearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF4EC" />
          <stop offset="1" stopColor="#DDEDE4" />
        </linearGradient>
        <filter id="bShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#16302A" floodOpacity="0.14" />
        </filter>
      </defs>

      <rect width="380" height="460" fill="url(#mapBg)" />

      {/* greenery */}
      <ellipse cx="15" cy="55" rx="26" ry="13" fill="#CBE3D0" opacity="0.7" />
      <ellipse cx="355" cy="60" rx="24" ry="12" fill="#CBE3D0" opacity="0.7" />
      <ellipse cx="12" cy="150" rx="20" ry="10" fill="#CBE3D0" opacity="0.7" />
      <ellipse cx="352" cy="160" rx="22" ry="11" fill="#CBE3D0" opacity="0.7" />
      <ellipse cx="355" cy="395" rx="20" ry="10" fill="#CBE3D0" opacity="0.7" />
      <ellipse cx="185" cy="300" rx="40" ry="16" fill="#CBE3D0" opacity="0.7" />

      {/* lake */}
      <ellipse cx="25" cy="402" rx="22" ry="11" fill="#BFDFF2" />
      <ellipse cx="25" cy="402" rx="15" ry="7" fill="#A8D4EE" />

      {/* roads: casing + surface */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#DDE4EE" strokeWidth="7">
          {ROADS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="#FBFCFE" strokeWidth="4.6">
          {ROADS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>

      {/* route lines */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {LINES.map((l) => (
          <g key={l.id}>
            <path d={l.path} stroke="#fff" strokeWidth="6" opacity="0.85" />
            <path d={l.path} stroke={l.color} strokeWidth="3.4" opacity="0.62" />
          </g>
        ))}
      </g>

      {/* buildings (drawn above roads so roads pass behind them) */}
      <g filter="url(#bShadow)">
        {BUILDINGS.map((b) => (
          <rect
            key={b.label}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx="8"
            fill="#FDFDFD"
            stroke="#D9E2EC"
          />
        ))}
      </g>
      <g fill="#5A6B84" fontSize="9" fontWeight="600" textAnchor="middle">
        {BUILDINGS.map((b) => (
          <text key={b.label} x={b.lx} y={b.ly} fontSize={b.fs || 9}>
            {b.label}
          </text>
        ))}
      </g>

      {/* stops */}
      {STOPS.map((s) => (
        <g
          key={s.id}
          className={`stop ${selectedStop === s.id ? 'selected' : ''}`}
          onClick={() => onSelectStop(s.id)}
        >
          <circle cx={s.x} cy={s.y} r="14" fill="transparent" />
          {selectedStop === s.id && (
            <circle cx={s.x} cy={s.y} r="11" fill="none" stroke="#2B59FF" strokeWidth="2">
              <animate attributeName="r" values="11;17" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={s.x} cy={s.y} r="8.5" fill="#fff" stroke="#B9C4D6" strokeWidth="2.5" />
          <circle cx={s.x} cy={s.y} r="3.6" fill="#2B59FF" />
          <text x={s.x + (s.lx || 0)} y={s.y + (s.ly || 0)} className="stop-label" textAnchor="middle">
            {s.short}
          </text>
          <title>{s.name}</title>
        </g>
      ))}

      {/* buses */}
      {BUSES.map((b, idx) => {
        const line = LINES.find((l) => l.id === b.lineId);
        return (
          <g key={idx} className="bus">
            <animateMotion dur={b.dur} begin={b.begin} repeatCount="indefinite" path={line.path} />
            <rect x="-12.5" y="-6.5" width="25" height="17" rx="6" fill="rgba(14,26,51,0.22)" transform="translate(0,2)" />
            <rect x="-12.5" y="-8.5" width="25" height="17" rx="6" fill={line.color} stroke="#fff" strokeWidth="2" />
            <rect x="-8" y="-5.5" width="4.5" height="11" rx="1.8" fill="#fff" opacity="0.95" />
            <rect x="-1" y="-5.5" width="4.5" height="11" rx="1.8" fill="#fff" opacity="0.95" />
          </g>
        );
      })}

      {/* user location (near FFAR) */}
      <g>
        <circle cx="205" cy="182" r="12" fill="#2B59FF" opacity="0.22">
          <animate attributeName="r" values="10;20" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="205" cy="182" r="6" fill="#2B59FF" stroke="#fff" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

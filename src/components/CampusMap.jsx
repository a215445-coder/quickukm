import { LINES, STOPS } from '../data/mockData';
import campusMapSvg from '../assets/ukm-bangi-map.svg?raw';

// Keep the map available in the single-file offline iPhone bundle.
const campusMapUrl = `data:image/svg+xml,${encodeURIComponent(campusMapSvg)}`;

// Simulated buses: one per line (+ a second bus on Demo A), animated along
// each line's path with SMIL animateMotion
const BUSES = [
  { lineId: 'A', begin: '0s', dur: '52s' },
  { lineId: 'A', begin: '-27s', dur: '52s' },
  { lineId: 'B', begin: '-12s', dur: '42s' },
  { lineId: 'C', begin: '-32s', dur: '60s' },
  { lineId: 'D', begin: '-8s', dur: '38s' },
];

// Focus the map on the stops and end points used by the active journey.
function navViewBox(points) {
  if (!points || !points.length) return '0 0 380 460';
  const pad = 42;
  let minX = Math.min(...points.map((p) => p.x)) - pad;
  let maxX = Math.max(...points.map((p) => p.x)) + pad;
  let minY = Math.min(...points.map((p) => p.y)) - pad;
  let maxY = Math.max(...points.map((p) => p.y)) + pad;
  let w = maxX - minX;
  let h = maxY - minY;
  const ratio = 1.05;
  if (w / h < ratio) {
    const nw = h * ratio;
    minX -= (nw - w) / 2;
    w = nw;
  } else {
    const nh = w / ratio;
    minY -= (nh - h) / 2;
    h = nh;
  }
  return `${minX} ${minY} ${w} ${h}`;
}

export function MapAttribution() {
  return (
    <div className="map-attribution">
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        © OpenStreetMap contributors
      </a>
    </div>
  );
}

export default function CampusMap({ selectedStop, onSelectStop, navigation }) {
  const nav = navigation;
  const alightNearDestination =
    nav &&
    nav.alight &&
    nav.destination &&
    Math.hypot(nav.alight.x - nav.destination.x, nav.alight.y - nav.destination.y) < 60;

  return (
    <svg
      className={`campus-svg ${nav ? 'nav-campus-svg' : ''}`}
      viewBox={nav ? navViewBox(nav.focusPoints) : '10 62 375 334'}
      preserveAspectRatio={nav ? 'xMidYMin meet' : 'xMidYMid meet'}
      role={nav ? 'img' : 'group'}
      aria-label={nav ? 'Step-by-step route map' : 'UKM Bangi campus map with demo shuttle routes'}
    >
      <rect x="-200" y="-200" width="780" height="1500" fill="#eff0e5" />
      <image href={campusMapUrl} x="-45" y="-40" width="470" height="540" />

      {/* route lines */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {LINES.map((l) => (
          <g key={l.id}>
            <path d={l.path} stroke="#fff" strokeWidth="4.5" opacity={nav ? 0.22 : 0.8} />
            <path d={l.path} stroke={l.color} strokeWidth="2.5" opacity={nav ? 0.16 : 0.73} />
          </g>
        ))}
      </g>

      {/* navigation route overlay */}
      {nav && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {nav.busPaths.map((p) => (
            <g key={p.lineName + p.d}>
              <path d={p.d} stroke="#fff" strokeWidth="8.5" opacity="0.95" />
              <path d={p.d} stroke={p.color} strokeWidth="5" />
            </g>
          ))}
          {nav.walkPaths.map((p) => (
            <path
              key={p.key}
              className={`nav-walk-path ${nav.activeWalk === p.key ? 'active' : ''}`}
              d={p.d}
              stroke="#2B59FF"
              strokeWidth="3.2"
              strokeDasharray="0.5 8"
              opacity={nav.activeWalk === p.key ? 1 : 0.42}
            />
          ))}
        </g>
      )}

      {/* stops */}
      {STOPS.map((s) => (
        <g
          key={s.id}
          className={`stop ${selectedStop === s.id ? 'selected' : ''} ${nav ? 'nav-static' : ''}`}
          role={nav ? undefined : 'button'}
          tabIndex={nav ? undefined : 0}
          aria-label={nav ? undefined : `Show ${s.name} arrivals`}
          onClick={nav ? undefined : () => onSelectStop?.(s.id)}
          onKeyDown={nav ? undefined : (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelectStop?.(s.id);
            }
          }}
        >
          <circle cx={s.x} cy={s.y} r="14" fill="transparent" />
          {selectedStop === s.id && (
            <circle cx={s.x} cy={s.y} r="11" fill="none" stroke="#2B59FF" strokeWidth="2">
              <animate attributeName="r" values="11;17" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={s.x} cy={s.y} r="6" fill="#fff" stroke="#8796ab" strokeWidth="1.5" />
          <circle cx={s.x} cy={s.y} r="2.5" fill={s.mappedStop ? "#2B59FF" : "#fff"} />
          <text x={s.x + (s.lx || 0)} y={s.y + (s.ly || 0)} className="stop-label" textAnchor="middle">
            {s.short}
          </text>
          <title>{s.name} · {s.mappedStop ? "Mapped bus stop" : "Demo pickup near this landmark"}</title>
        </g>
      ))}

      {/* boarding / alighting / destination markers */}
      {nav && nav.board && (
        <g>
          <circle cx={nav.board.x} cy={nav.board.y} r="12" fill="none" stroke="#0E9F6E" strokeWidth="3" />
          <text x={nav.board.x} y={nav.board.y - 19} className="nav-marker-label" textAnchor="middle">
            Board
          </text>
        </g>
      )}
      {nav && nav.alight && (
        <g>
          <circle cx={nav.alight.x} cy={nav.alight.y} r="12" fill="none" stroke="#E5484D" strokeWidth="3" />
          {!alightNearDestination && (
            <text x={nav.alight.x} y={nav.alight.y - 19} className="nav-marker-label" textAnchor="middle">
              Alight
            </text>
          )}
        </g>
      )}
      {nav && nav.destination && (
        <g transform={`translate(${nav.destination.x},${nav.destination.y})`}>
          <circle r="13" fill="#E5484D" opacity="0.16" />
          <circle r="6" fill="#E5484D" stroke="#fff" strokeWidth="3" />
          <text y="21" className="nav-marker-label" textAnchor="middle">
            Destination
          </text>
        </g>
      )}

      {/* dynamic current-location marker */}
      {nav && nav.marker && (
        <g transform={`translate(${nav.marker.x},${nav.marker.y})`}>
          <circle r="10" fill="#2B59FF" opacity="0.28">
            <animate attributeName="r" values="9;21" dur="2.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0" dur="2.1s" repeatCount="indefinite" />
          </circle>
          <circle r="7" fill="#2B59FF" stroke="#fff" strokeWidth="3" />
          <circle r="2.3" fill="#fff" />
        </g>
      )}

      {/* buses (explore mode only) */}
      {!nav &&
        BUSES.map((b, idx) => {
          const line = LINES.find((l) => l.id === b.lineId);
          return (
            <g key={idx} className="bus" pointerEvents="none">
              <animateMotion dur={b.dur} begin={b.begin} repeatCount="indefinite" path={line.path} />
              <rect x="-12.5" y="-6.5" width="25" height="17" rx="6" fill="rgba(14,26,51,0.22)" transform="translate(0,2)" />
              <rect x="-12.5" y="-8.5" width="25" height="17" rx="6" fill={line.color} stroke="#fff" strokeWidth="2" />
              <rect x="-8" y="-5.5" width="4.5" height="11" rx="1.8" fill="#fff" opacity="0.95" />
              <rect x="-1" y="-5.5" width="4.5" height="11" rx="1.8" fill="#fff" opacity="0.95" />
            </g>
          );
        })}

    </svg>
  );
}

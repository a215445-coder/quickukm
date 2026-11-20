import { useLayoutEffect, useRef } from 'react';
import { LINES, STOPS, roadPaths } from '../data/shuttleData';
import campusMapSvg from '../assets/ukm-bangi-map.svg?raw';

// Keep the map available in the single-file offline iPhone bundle.
const campusMapUrl = `data:image/svg+xml,${encodeURIComponent(campusMapSvg)}`;

const CAMPUS_VIEW = '0 -115 500 510';
const MAP_STOPS = STOPS.filter((stop) => stop.location);
const LABELLED_STOPS = new Set([
  'kpz', 'ftsm', 'fkab', 'fpend', 'pusanika', 'dectar', 'krk', 'ktho', 'fssk',
  'library', 'fep', 'fst', 'kkm', 'driving',
]);
const LINE_PATHS = LINES.map((line) => ({
  ...line,
  routePath: roadPaths(line.stopIds).map(({ d }) => d).join(' '),
}));

function continuousRoads(stopIds) {
  const sections = [];
  for (const { points } of roadPaths(stopIds)) {
    const current = sections.at(-1);
    const end = current?.at(-1);
    const [x, y] = points[0];
    if (end && end[0] === x && end[1] === y) current.push(...points.slice(1));
    else sections.push([...points]);
  }

  return sections.map((points) => ({
    path: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' '),
    length: points.slice(1).reduce((sum, [x, y], i) => (
      sum + Math.hypot(x - points[i][0], y - points[i][1])
    ), 0),
  })).sort((a, b) => b.length - a.length);
}

// Each bus loops over a continuous section, without crossing gaps in map data.
const usedPreviewPaths = new Set();
const PREVIEW_BUSES = LINES.flatMap((line, index) => {
  const choices = continuousRoads(line.stopIds);
  const section = choices.find(({ path }) => !usedPreviewPaths.has(path)) ?? choices[0];
  if (!section) return [];
  usedPreviewPaths.add(section.path);
  const duration = Math.round(Math.max(24, section.length / 15));
  return [{ ...line, path: section.path, duration, offset: duration * (0.2 + index * 0.15) }];
});

function PreviewBus({ bus }) {
  const timing = { begin: `-${bus.offset}s`, dur: `${bus.duration}s`, repeatCount: 'indefinite' };
  return (
    <g className="preview-bus" pointerEvents="none" aria-hidden="true">
      <animateMotion {...timing} path={bus.path} />
      <animate {...timing} attributeName="opacity" values="0;1;1;0" keyTimes="0;0.03;0.97;1" />
      <rect x="-16" y="-10" width="32" height="20" rx="6" fill={bus.color} stroke="#fff" strokeWidth="2.5" />
      <g transform="translate(-12,-5)" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round">
        <rect x="1" y="0" width="10" height="9" rx="2" />
        <path d="M1 4h10 M3 9v2 M9 9v2" />
        <circle cx="3.5" cy="6.5" r=".65" fill="#fff" stroke="none" />
        <circle cx="8.5" cy="6.5" r=".65" fill="#fff" stroke="none" />
      </g>
      <text x="6" y="4" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="800">{bus.id}</text>
    </g>
  );
}

// Focus the map on the stops and end points used by the active journey.
function navViewBox(points) {
  if (!points || !points.length) return CAMPUS_VIEW;
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

export default function CampusMap({ selectedStop, onSelectStop, navigation, pauseBusMotion = false }) {
  const nav = navigation;
  const mapRef = useRef(null);

  useLayoutEffect(() => {
    if (nav) return;
    const svg = mapRef.current;
    if (pauseBusMotion) svg?.pauseAnimations?.();
    else svg?.unpauseAnimations?.();
  }, [nav, pauseBusMotion]);
  const alightNearDestination =
    nav &&
    nav.alight &&
    nav.destination &&
    Math.hypot(nav.alight.x - nav.destination.x, nav.alight.y - nav.destination.y) < 60;

  return (
    <svg
      ref={mapRef}
      className={`campus-svg ${nav ? 'nav-campus-svg' : ''}`}
      viewBox={nav ? navViewBox(nav.focusPoints) : CAMPUS_VIEW}
      preserveAspectRatio={nav ? 'xMidYMin meet' : 'xMidYMid meet'}
      role={nav ? 'img' : 'group'}
      aria-label={nav ? 'Step-by-step route map' : 'UKM Bangi campus map with listed shuttle stops'}
    >
      <rect x="-200" y="-200" width="780" height="1500" fill="#eff0e5" />
      <image href={campusMapUrl} x="-45" y="-120" width="575" height="620" />

      {/* route lines */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {LINE_PATHS.map((l) => (
          <g key={l.id}>
            <path d={l.routePath} stroke="#fff" strokeWidth="4.5" opacity={nav ? 0.22 : 0.8} />
            <path d={l.routePath} stroke={l.color} strokeWidth="2.5" strokeDasharray="5 3" opacity={nav ? 0.16 : 0.73} />
          </g>
        ))}
      </g>

      {/* navigation route overlay */}
      {nav && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {nav.busPaths.map((p, index) => (
            <g key={index}>
              <path d={p.d} stroke="#fff" strokeWidth="8.5" opacity="0.95" />
              <path d={p.d} stroke={p.color} strokeWidth="5" strokeDasharray="7 4" />
            </g>
          ))}
        </g>
      )}

      {/* stops */}
      {MAP_STOPS.map((s) => (
        <g
          key={s.id}
          className={`stop ${selectedStop === s.id ? 'selected' : ''} ${nav ? 'nav-static' : ''}`}
          role={nav ? undefined : 'button'}
          tabIndex={nav ? undefined : 0}
          aria-label={nav ? undefined : `Show ${s.name} stop details`}
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
          <circle cx={s.x} cy={s.y} r="2.5" fill={s.location === "mapped" ? "#2B59FF" : "#fff"} />
          {(LABELLED_STOPS.has(s.id) || selectedStop === s.id) && (
            <text x={s.x} y={s.y - 10} className="stop-label" textAnchor="middle">{s.short}</text>
          )}
          <title>{s.name} · {s.location === "mapped" ? "Mapped stop" : "Approximate stop area"}</title>
        </g>
      ))}

      {!nav && PREVIEW_BUSES.map((bus) => <PreviewBus key={bus.id} bus={bus} />)}

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

    </svg>
  );
}

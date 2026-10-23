// QuickUKM — simulated campus transit data (prototype only, no real API/GPS)

export const STOPS = [
  { id: 'fssk', name: 'FSSK · Social Sciences & Humanities', short: 'FSSK', x: 78, y: 92, ly: -14, walk: '2 min walk from the FSSK main entrance' },
  { id: 'fep', name: 'FEP · Economics & Management', short: 'FEP', x: 170, y: 70, ly: -14, walk: '3 min walk from the main gate' },
  { id: 'fst', name: 'FST · Science & Technology', short: 'FST', x: 290, y: 88, ly: -14, walk: '5 min walk from Dataran FST' },
  { id: 'ftsm', name: 'FTSM · Information Science & Technology', short: 'FTSM', x: 290, y: 205, lx: 18, ly: 4, walk: '2 min walk to the FTSM lobby' },
  { id: 'fkab', name: 'FKAB · Engineering & Built Environment', short: 'FKAB', x: 320, y: 300, ly: 20, walk: '4 min walk from the FKAB plaza' },
  { id: 'fper', name: 'FPER · Medicine', short: 'FPER', x: 250, y: 330, ly: -16, walk: '6 min walk from HUKM entrance' },
  { id: 'fpend', name: 'FPEND · Education', short: 'FPEND', x: 140, y: 415, ly: -16, walk: '3 min walk to the lecture halls' },
  { id: 'fsk', name: 'FSK · Health Sciences', short: 'FSK', x: 95, y: 330, lx: 16, ly: 4, walk: '2 min walk to the FSK building' },
  { id: 'fpi', name: 'FPI · Islamic Studies', short: 'FPI', x: 70, y: 235, ly: 18, walk: '2 min walk via the masjid' },
  { id: 'ffar', name: 'FFAR · Pharmacy', short: 'FFAR', x: 180, y: 200, ly: 20, walk: '1 min walk from the FFAR entrance' },
  { id: 'kiz', name: 'KIZ · Kolej Ibu Zain', short: 'KIZ', x: 230, y: 430, ly: 20, walk: '1 min walk from the KIZ college gate' },
];

export const STOPS_BY_ID = Object.fromEntries(STOPS.map((s) => [s.id, s]));

// freq/loopTotal in minutes; offsets are minutes from the line's first stop;
// path is the SVG path buses follow on the simulated campus map
export const LINES = [
  {
    id: 'A',
    name: 'Zon A',
    color: '#2563EB',
    stopIds: ['fssk', 'fep', 'fst', 'ftsm', 'fkab', 'fper', 'kiz', 'fpend', 'fsk', 'fpi'],
    offsets: [0, 4, 9, 14, 19, 24, 28, 33, 38, 43],
    freq: 12,
    phase: 0,
    first: 420,
    last: 1380,
    loop: true,
    loopTotal: 49,
    path: 'M78,92 L170,70 L290,88 L290,205 L320,300 L250,330 L230,430 L140,415 L95,330 L70,235 L78,92',
    description: 'Ring line around all faculties (loop)',
  },
  {
    id: 'B',
    name: 'Zon B',
    color: '#F97316',
    stopIds: ['fpi', 'ffar', 'ftsm', 'fst', 'fep', 'fssk'],
    offsets: [0, 6, 11, 16, 21, 25],
    freq: 15,
    phase: 4,
    first: 420,
    last: 1380,
    loop: true,
    loopTotal: 30,
    path: 'M70,235 L180,200 L290,205 L290,88 L170,70 L78,92 L70,235',
    description: 'Inner loop via FFAR & FTSM (loop)',
  },
  {
    id: 'C',
    name: 'Zon C',
    color: '#0E9F6E',
    stopIds: ['fpend', 'kiz', 'fper', 'fkab', 'ftsm', 'ffar', 'fpi'],
    offsets: [0, 4, 8, 13, 18, 25, 31],
    freq: 20,
    phase: 9,
    first: 420,
    last: 1380,
    loop: true,
    loopTotal: 62,
    path: 'M140,415 L230,430 L250,330 L320,300 L290,205 L180,200 L70,235 L180,200 L290,205 L320,300 L250,330 L230,430 L140,415',
    description: 'FPEND ⇄ FPI via KIZ, FPER & FKAB (return service)',
  },
  {
    id: 'D',
    name: 'Zon D',
    color: '#8B5CF6',
    stopIds: ['fst', 'ftsm', 'fkab', 'fper'],
    offsets: [0, 5, 10, 15],
    freq: 10,
    phase: 2,
    first: 420,
    last: 1380,
    loop: true,
    loopTotal: 30,
    path: 'M290,88 L290,205 L320,300 L250,330 L320,300 L290,205 L290,88',
    description: 'FST ⇄ FPER express shuttle (return service)',
  },
];

export const LINE_BY_ID = Object.fromEntries(LINES.map((l) => [l.id, l]));

export function fmtTime(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

function segment(line, fromId, toId) {
  const i = line.stopIds.indexOf(fromId);
  const j = line.stopIds.indexOf(toId);
  if (i === -1 || j === -1) return null;
  if (j >= i) {
    return { mins: line.offsets[j] - line.offsets[i], stops: line.stopIds.slice(i, j + 1) };
  }
  if (line.loop) {
    return {
      mins: line.loopTotal - line.offsets[i] + line.offsets[j],
      stops: line.stopIds.slice(i).concat([line.stopIds[0]]).concat(line.stopIds.slice(1, j + 1)),
    };
  }
  return null;
}

// Direct options first; otherwise one-transfer options via any shared stop
export function findRoutes(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return [];

  const direct = [];
  for (const line of LINES) {
    const seg = segment(line, fromId, toId);
    if (seg) {
      direct.push({
        id: `${line.id}:${fromId}-${toId}`,
        kind: 'direct',
        lineId: line.id,
        fromId,
        toId,
        mins: seg.mins,
        stops: seg.stops,
      });
    }
  }
  direct.sort((a, b) => a.mins - b.mins);
  if (direct.length) return direct.slice(0, 3);

  const options = [];
  for (const via of STOPS.map((s) => s.id)) {
    if (via === fromId || via === toId) continue;
    for (const l1 of LINES) {
      const seg1 = segment(l1, fromId, via);
      if (!seg1) continue;
      for (const l2 of LINES) {
        const seg2 = segment(l2, via, toId);
        if (!seg2) continue;
        options.push({
          id: `${l1.id}+${l2.id}:${fromId}-${toId}@${via}`,
          kind: 'transfer',
          fromId,
          toId,
          via,
          mins: seg1.mins + 5 + seg2.mins,
          seg1: { lineId: l1.id, stops: seg1.stops, mins: seg1.mins },
          seg2: { lineId: l2.id, stops: seg2.stops, mins: seg2.mins },
        });
      }
    }
  }
  options.sort((a, b) => a.mins - b.mins);
  return options.slice(0, 3);
}

// Simulated "live" arrivals at a stop (deterministic, ticks with the clock)
export function getStopArrivals(stopId, now = new Date()) {
  const minsOfDay = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  return LINES.map((line) => {
    const i = line.stopIds.indexOf(stopId);
    if (i === -1) return null;
    const off = line.offsets[i];
    const eta = (((off - line.phase - minsOfDay) % line.freq) + line.freq) % line.freq;
    return { lineId: line.id, eta };
  })
    .filter(Boolean)
    .sort((a, b) => a.eta - b.eta)
    .slice(0, 3);
}

// Next departure times (formatted) for a line at a stop
export function nextDepartures(lineId, stopId, count = 3, now = new Date()) {
  const line = LINE_BY_ID[lineId];
  if (!line) return [];
  const i = line.stopIds.indexOf(stopId);
  if (i === -1) return [];
  const off = line.offsets[i];
  const minsOfDay = now.getHours() * 60 + now.getMinutes();
  let slot = Math.ceil((minsOfDay - line.phase - off) / line.freq);
  if (slot < 0) slot = 0;
  const out = [];
  for (let k = 0; k < count; k++) {
    let t = line.phase + off + (slot + k) * line.freq;
    if (t > line.last) t = line.first + off + line.phase; // next morning's first bus
    out.push(t);
  }
  return out.map(fmtTime);
}

export function tripSummary(fromId, toId) {
  const r = findRoutes(fromId, toId)[0];
  if (!r) return null;
  const lineId = r.kind === 'direct' ? r.lineId : r.seg1.lineId;
  const line = LINE_BY_ID[lineId];
  return {
    mins: r.mins,
    lineId,
    lineName: line.name,
    lineColor: line.color,
    stops: r.kind === 'direct' ? r.stops.length : r.seg1.stops.length + r.seg2.stops.length - 1,
  };
}

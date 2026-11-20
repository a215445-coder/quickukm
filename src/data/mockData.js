// Demo shuttle services use mapped campus pickup points and road geometry.
import campus from './campusGeography.json';

export const STOPS = campus.stops;
export const STOPS_BY_ID = Object.fromEntries(STOPS.map((stop) => [stop.id, stop]));

export function campusPath(points) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
}

export function busRoadPoints(stopIds) {
  return stopIds.slice(1).flatMap((stop, index) => {
    const segment = campus.roadSegments[`${stopIds[index]}:${stop}`];
    if (!segment) throw new Error(`Missing campus road segment to ${stop}`);
    return index === 0 ? segment : segment.slice(1);
  });
}

export const LINES = campus.lines.map((line) => ({
  ...line,
  path: campusPath(busRoadPoints([...line.stopIds, line.stopIds[0]])),
}));

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

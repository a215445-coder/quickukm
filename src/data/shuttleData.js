// Published stop order and typical hours from the source linked on each line.
// Coordinates and approximate road segments are from OpenStreetMap.
import campus from './campusGeography.json';

export const OFFICIAL_BUS_APP = 'https://play.google.com/store/apps/details?id=com.myukmbus.mobile.my_ukm_smart_bus';
export const UKM_TRANSPORT_INFO = 'https://www.ukm.my/kelestarian/sdgukm2024/sdg11/11-4-2/';
export const STOPS = campus.stops;
export const STOPS_BY_ID = Object.fromEntries(STOPS.map((stop) => [stop.id, stop]));
export const LINES = campus.lines;
export const LINE_BY_ID = Object.fromEntries(LINES.map((line) => [line.id, line]));
export const SUGGESTED_TRIPS = [
  ['kpz', 'ftsm'],
  ['ktho', 'library'],
  ['kkm', 'fssk'],
  ['driving', 'fpend'],
];

export function linesAtStop(id) {
  return LINES.filter((line) => line.stopIds.includes(id));
}

export function roadPaths(stopIds) {
  return stopIds.slice(1).flatMap((id, index) => {
    const points = campus.roadSegments[`${stopIds[index]}:${id}`];
    if (!points || points.length < 2) return [];
    const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    return [{ d, points }];
  });
}

function segment(line, fromId, toId) {
  let best = null;
  // Some stops are served twice, on different passes. Search all occurrences.
  // Do not join across the end of a listed trip without confirmed through service.
  line.stopIds.forEach((id, start) => {
    if (id !== fromId) return;
    const end = line.stopIds.indexOf(toId, start + 1);
    if (end !== -1 && (!best || end - start < best.length - 1)) {
      best = line.stopIds.slice(start, end + 1);
    }
  });
  return best;
}

export function findRoutes(fromId, toId) {
  if (!STOPS_BY_ID[fromId] || !STOPS_BY_ID[toId] || fromId === toId) return [];

  const direct = LINES.flatMap((line) => {
    const stops = segment(line, fromId, toId);
    return stops ? [{ id: line.id, kind: 'direct', lineId: line.id, fromId, toId, stops }] : [];
  });
  if (direct.length) return direct.sort((a, b) => a.stops.length - b.stops.length);

  const transfers = [];
  for (const { id: via } of STOPS) {
    if (via === fromId || via === toId) continue;
    for (const first of LINES) {
      const firstStops = segment(first, fromId, via);
      if (!firstStops) continue;
      for (const second of LINES) {
        if (first === second) continue;
        const secondStops = segment(second, via, toId);
        if (secondStops) transfers.push({
          id: `${first.id}+${second.id}@${via}`, kind: 'transfer', fromId, toId, via,
          seg1: { lineId: first.id, stops: firstStops },
          seg2: { lineId: second.id, stops: secondStops },
        });
      }
    }
  }
  const count = (route) => route.seg1.stops.length + route.seg2.stops.length;
  return transfers.sort((a, b) => count(a) - count(b)).slice(0, 3);
}

export function tripSummary(fromId, toId) {
  const route = findRoutes(fromId, toId)[0];
  if (!route) return null;
  const direct = route.kind === 'direct';
  const first = LINE_BY_ID[direct ? route.lineId : route.seg1.lineId];
  return {
    lineName: direct ? first.name : `${first.name} + ${LINE_BY_ID[route.seg2.lineId].name}`,
    lineColor: first.color,
    stops: direct ? route.stops.length - 1 : route.seg1.stops.length + route.seg2.stops.length - 2,
  };
}

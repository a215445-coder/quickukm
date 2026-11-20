import { LINE_BY_ID, STOPS_BY_ID, roadPaths } from './shuttleData';

export function stopPoint(stop) {
  return stop?.location ? { x: stop.x, y: stop.y } : null;
}

export function buildJourney(route) {
  const fromStop = STOPS_BY_ID[route.fromId];
  const toStop = STOPS_BY_ID[route.toId];
  const segments = route.kind === 'direct'
    ? [{ lineId: route.lineId, stops: route.stops }]
    : [route.seg1, route.seg2];
  const legs = segments.map(({ lineId, stops }) => ({
    kind: 'bus',
    line: LINE_BY_ID[lineId],
    stopIds: stops,
    boardId: stops[0],
    alightId: stops.at(-1),
    directionStopId: stops[1],
  }));
  const steps = legs.flatMap((leg, index) => {
    const board = STOPS_BY_ID[leg.boardId];
    const alight = STOPS_BY_ID[leg.alightId];
    return [
      ...(index ? [{
        type: 'transfer', phase: 'board', kicker: 'Transfer',
        title: `Change at ${board.short}`, detail: 'Check the next departure before transferring.',
        nextHint: `Board ${leg.line.name}`, leg: { stopId: board.id }, nextBus: leg,
      }] : []),
      {
        type: 'board', phase: 'board', kicker: 'Board', leg,
        title: `Board ${leg.line.name} at ${board.short}`,
        detail: board.name, nextHint: `Next listed stop: ${STOPS_BY_ID[leg.directionStopId].short}`,
      },
      ...leg.stopIds.slice(1).map((id, position, rest) => {
        const isAlight = position === rest.length - 1;
        return {
          type: 'ride', phase: 'ride', kicker: leg.line.name, leg, isAlight,
          stopIndex: position + 1, remainingStops: rest.length - position - 1,
          lineColor: leg.line.color,
          title: isAlight ? `Alight at ${alight.short}` : `Stop: ${STOPS_BY_ID[id].short}`,
          detail: STOPS_BY_ID[id].name,
          nextHint: isAlight
            ? (index < legs.length - 1 ? 'Change buses here' : 'End of itinerary')
            : `Next listed stop: ${STOPS_BY_ID[rest[position + 1]].short}`,
        };
      }),
    ];
  });
  steps.push({
    type: 'arrived', phase: 'arrive', kicker: 'Destination',
    title: toStop.name, detail: 'End of the published stop sequence for this trip.',
    nextHint: 'Finish the route preview',
  });

  const paths = legs.flatMap((leg) => roadPaths(leg.stopIds).map((path) => ({
    ...path, color: leg.line.color, lineName: leg.line.name,
  })));
  const focusPoints = [
    ...legs.flatMap((leg) => leg.stopIds.map((id) => stopPoint(STOPS_BY_ID[id]))).filter(Boolean),
    ...paths.flatMap(({ points }) => points.map(([x, y]) => ({ x, y }))),
  ];
  return {
    steps, legs, fromStop, toStop,
    destination: stopPoint(toStop),
    busPaths: paths,
    focusPoints,
  };
}

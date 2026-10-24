// QuickUKM — simulated turn-by-turn journey builder (no GPS / maps API)

import { LINE_BY_ID, STOPS_BY_ID } from './mockData';

const WALK_METRES_PER_MIN = 80;
const TRANSFER_MINS = 5;

const DIRS = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
];

function hash(id) {
  return [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function walkMinutes(stop) {
  const match = /(\d+)\s*min/i.exec(stop?.walk || '');
  return match ? Number(match[1]) : 3;
}

function stopPoint(stop) {
  return { x: stop.x, y: stop.y };
}

// A believable, deterministic spot near the stop for the simulated user.
function nearbyPoint(stop, seed) {
  const h = hash(stop.id) + seed * 47;
  const angle = (h % 360) * (Math.PI / 180);
  const dist = 28 + (h % 4) * 5;
  return {
    x: clamp(stop.x + Math.cos(angle) * dist, 16, 364),
    y: clamp(stop.y + Math.sin(angle) * dist, 16, 444),
  };
}

function compass(from, to) {
  const deg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function polyline(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

function busLeg(lineId, stopIds, mins, boardId, alightId) {
  const line = LINE_BY_ID[lineId];
  return {
    kind: 'bus',
    lineId,
    line,
    stopIds,
    mins,
    boardId,
    alightId,
    directionStopId: stopIds[1] || alightId,
  };
}

function walkLeg(key, from, to, stop, mins, title) {
  const distance = Math.round((mins * WALK_METRES_PER_MIN) / 10) * 10;
  return {
    kind: 'walk',
    key,
    mins,
    distance,
    from,
    to,
    stopId: stop.id,
    title,
    compass: compass(from, to),
  };
}

function buildSteps(legs) {
  const steps = [{ type: 'walk', leg: legs[0], duration: legs[0].mins }];

  legs.forEach((leg) => {
    if (leg.kind === 'bus') {
      const transitions = leg.stopIds.length - 1;
      const perStop = transitions ? leg.mins / transitions : 0;
      // the first ride interval is spent between boarding and the next stop
      steps.push({ type: 'board', leg, duration: perStop });
      for (let i = 1; i < leg.stopIds.length; i++) {
        steps.push({
          type: 'ride',
          leg,
          stopIndex: i,
          remainingStops: transitions - i,
          isAlight: i === transitions,
          duration: i === transitions ? 0 : perStop,
        });
      }
    } else if (leg.kind === 'transfer') {
      steps.push({ type: 'transfer', leg, duration: leg.mins });
    }
  });

  const lastWalk = legs[legs.length - 1];
  steps.push({ type: 'walk', leg: lastWalk, duration: lastWalk.mins });
  steps.push({ type: 'arrived', duration: 0 });
  return steps;
}

function decorate(steps, legs, fromStop, toStop, walk1Mins, walk2Mins) {
  const doorToDoor =
    walk1Mins +
    walk2Mins +
    legs.filter((l) => l.kind === 'bus').reduce((sum, l) => sum + l.mins, 0) +
    legs.filter((l) => l.kind === 'transfer').reduce((sum, l) => sum + l.mins, 0);

  steps.forEach((step) => {
    if (step.type === 'walk') {
      const toBoard = step.leg.key === 'to-board';
      if (toBoard) {
        step.phase = 'walk';
        step.kicker = 'Walk';
        step.title = `Walk to ${fromStop.short} stop`;
        step.detail = `Head ${step.leg.compass} · ${step.leg.distance} m · ${walk1Mins} min`;
        step.nextHint = `Arrive at ${fromStop.short} and wait for your bus`;
        step.directions = [
          { label: `Start at your current location`, note: `near ${fromStop.short}` },
          { label: `Head ${step.leg.compass} along the campus path`, note: `${step.leg.distance} m` },
          { label: `Arrive at ${fromStop.name}`, note: `${walk1Mins} min walk` },
        ];
      } else {
        step.phase = 'arrive';
        step.kicker = 'Final walk';
        step.title = `Walk to ${toStop.name}`;
        step.detail = `Head ${step.leg.compass} · ${step.leg.distance} m · ${walk2Mins} min`;
        step.nextHint = `You'll arrive at ${toStop.name}`;
        step.directions = [
          { label: `Leave the bus at ${toStop.short}`, note: 'Alight here' },
          { label: `Head ${step.leg.compass} along the walkway`, note: `${step.leg.distance} m` },
          { label: `Arrive at ${toStop.name}`, note: `${walk2Mins} min walk` },
        ];
      }
      return;
    }

    if (step.type === 'board') {
      const line = step.leg.line;
      const direction = STOPS_BY_ID[step.leg.directionStopId];
      const alight = STOPS_BY_ID[step.leg.alightId];
      step.phase = 'board';
      step.kicker = 'At the stop';
      step.title = `Board ${line.name} towards ${direction.short}`;
      step.detail = `${STOPS_BY_ID[step.leg.boardId].name} · every ${line.freq} min`;
      step.nextHint = `Ride ${step.leg.stopIds.length - 1} stop${
        step.leg.stopIds.length === 2 ? '' : 's'
      } and alight at ${alight.short}`;
      return;
    }

    if (step.type === 'ride') {
      const line = step.leg.line;
      const alight = STOPS_BY_ID[step.leg.alightId];
      const current = STOPS_BY_ID[step.leg.stopIds[step.stopIndex]];
      step.phase = 'ride';
      step.lineColor = line.color;
      if (step.isAlight) {
        const transferLeg = legs.find(
          (l) => l.kind === 'transfer' && l.stopId === step.leg.alightId
        );
        step.kicker = `On ${line.name}`;
        step.title = `Alight at ${alight.short}`;
        step.detail = transferLeg
          ? 'Transfer here for your next bus.'
          : 'You have reached your stop. Use the front door.';
        step.nextHint = transferLeg
          ? `Change at ${alight.short}`
          : `Walk ${walk2Mins} min to ${toStop.name}`;
      } else {
        step.kicker = `On ${line.name}`;
        step.title = `Next stop · ${current.short}`;
        step.detail = `Stay on ${step.remainingStops} more stop${
          step.remainingStops === 1 ? '' : 's'
        } — alight at ${alight.short}`;
        step.nextHint = STOPS_BY_ID[step.leg.stopIds[step.stopIndex + 1]].short;
      }
      return;
    }

    if (step.type === 'transfer') {
      const via = STOPS_BY_ID[step.leg.stopId];
      const nextBus = legs.find(
        (l) => l.kind === 'bus' && l.boardId === step.leg.stopId
      );
      const direction = nextBus ? STOPS_BY_ID[nextBus.directionStopId] : null;
      step.phase = 'ride';
      step.kicker = 'Transfer';
      step.title = `Change at ${via.short}`;
      step.detail = nextBus
        ? `Wait ~${step.leg.mins} min for ${nextBus.line.name} towards ${direction.short}`
        : `Wait ~${step.leg.mins} min for your next bus`;
      step.nextHint = nextBus ? `Board ${nextBus.line.name} at ${via.short}` : 'Board your next bus';
      step.nextBus = nextBus || null;
      return;
    }

    step.phase = 'arrive';
    step.kicker = 'Arrived';
    step.title = `You're at ${toStop.name}`;
    step.detail = `Trip complete · ${doorToDoor} min door to door`;
    step.nextHint = 'Enjoy the rest of your day';
  });
}

export function buildJourney(route) {
  const fromStop = STOPS_BY_ID[route.fromId];
  const toStop = STOPS_BY_ID[route.toId];
  const origin = nearbyPoint(fromStop, 1);
  const destination = nearbyPoint(toStop, 7);
  const walk1Mins = walkMinutes(fromStop);
  const walk2Mins = walkMinutes(toStop);

  const legs = [
    walkLeg('to-board', origin, stopPoint(fromStop), fromStop, walk1Mins, `Walk to ${fromStop.name}`),
  ];

  if (route.kind === 'direct') {
    legs.push(busLeg(route.lineId, route.stops, route.mins, route.fromId, route.toId));
  } else {
    legs.push(
      busLeg(route.seg1.lineId, route.seg1.stops, route.seg1.mins, route.fromId, route.via)
    );
    legs.push({
      kind: 'transfer',
      stopId: route.via,
      mins: TRANSFER_MINS,
      title: `Change at ${STOPS_BY_ID[route.via].short}`,
    });
    legs.push(
      busLeg(route.seg2.lineId, route.seg2.stops, route.seg2.mins, route.via, route.toId)
    );
  }

  legs.push(
    walkLeg(
      'to-destination',
      stopPoint(toStop),
      destination,
      toStop,
      walk2Mins,
      `Walk to ${toStop.name}`
    )
  );

  const steps = buildSteps(legs);

  // Remaining time includes the current step, so it matches the journey total at the start.
  let after = 0;
  for (let i = steps.length - 1; i >= 0; i--) {
    const total = after + steps[i].duration;
    steps[i].remainingMins = steps[i].type === 'arrived' ? 0 : Math.max(1, Math.round(total));
    after = total;
  }

  decorate(steps, legs, fromStop, toStop, walk1Mins, walk2Mins);

  const busPaths = legs
    .filter((l) => l.kind === 'bus')
    .map((l) => ({
      d: polyline(l.stopIds.map((id) => STOPS_BY_ID[id])),
      color: l.line.color,
      lineName: l.line.name,
    }));

  const walkPaths = [
    { d: polyline([origin, stopPoint(fromStop)]), key: 'to-board' },
    { d: polyline([stopPoint(toStop), destination]), key: 'to-destination' },
  ];

  const focusPoints = [
    origin,
    destination,
    ...legs
      .filter((l) => l.kind === 'bus')
      .flatMap((l) => l.stopIds.map((id) => STOPS_BY_ID[id])),
  ];

  return {
    steps,
    legs,
    totalMins: Math.max(1, Math.round(after)),
    origin,
    destination,
    fromStop,
    toStop,
    boardId: route.fromId,
    alightId: route.toId,
    transferId: route.kind === 'transfer' ? route.via : null,
    busPaths,
    walkPaths,
    focusPoints,
  };
}

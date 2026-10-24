import { useMemo, useState } from 'react';
import {
  Bus,
  CircleCheck,
  Clock,
  CornerUpRight,
  Flag,
  Footprints,
  MapPin,
  Navigation,
  Repeat,
  X,
} from 'lucide-react';
import CampusMap from './CampusMap';
import { STOPS_BY_ID, getStopArrivals } from '../data/mockData';
import { buildJourney } from '../data/navigation';

const PHASES = [
  { key: 'walk', label: 'Walk', Icon: Footprints },
  { key: 'board', label: 'Board', Icon: Bus },
  { key: 'ride', label: 'Ride', Icon: Navigation },
  { key: 'arrive', label: 'Arrive', Icon: Flag },
];

function pointOf(stop) {
  return { x: stop.x, y: stop.y };
}

function markerFor(step, journey) {
  if (step.type === 'walk') {
    return step.leg.key === 'to-destination' ? pointOf(journey.toStop) : journey.origin;
  }
  if (step.type === 'board') {
    return pointOf(STOPS_BY_ID[step.leg.boardId]);
  }
  if (step.type === 'ride') {
    return pointOf(STOPS_BY_ID[step.leg.stopIds[step.stopIndex]]);
  }
  if (step.type === 'transfer') {
    return pointOf(STOPS_BY_ID[step.leg.stopId]);
  }
  return journey.destination;
}

function StopTimeline({ leg, currentIndex = null }) {
  const last = leg.stopIds.length - 1;
  return (
    <ol className="nav-stop-list">
      {leg.stopIds.map((id, i) => {
        const stop = STOPS_BY_ID[id];
        const isBoard = i === 0;
        const isAlight = i === last;
        const isCurrent = currentIndex === i;
        const isPassed = currentIndex != null && i < currentIndex;
        const cls = [
          isPassed ? 'passed' : '',
          isCurrent ? 'current' : '',
          isBoard ? 'board' : '',
          isAlight ? 'alight' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const tag = isCurrent
          ? isAlight
            ? 'Alight here'
            : 'You are here'
          : isBoard
            ? 'Board'
            : isAlight
              ? 'Alight'
              : null;
        return (
          <li key={`${id}-${i}`} className={cls}>
            <span className="nav-stop-dot" />
            <span className="nav-stop-name">{stop.name}</span>
            {tag && (
              <small
                className={`nav-stop-tag ${
                  isAlight ? 'red' : isBoard ? 'green' : 'blue'
                }`}
              >
                {tag}
              </small>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function WalkBody({ step }) {
  return (
    <div className="nav-walk-card">
      <div className="nav-leg-head">
        <Footprints size={15} />
        <b>Walking route</b>
        <span className="nav-leg-time">
          {step.leg.distance} m · {step.leg.mins} min
        </span>
      </div>
      <ol className="nav-walk-steps">
        {step.directions.map((d, i) => (
          <li
            key={d.label}
            className={i === 0 ? 'start' : i === step.directions.length - 1 ? 'end' : ''}
          >
            <span className="nav-walk-dot" />
            <span className="nav-walk-copy">
              <b>{d.label}</b>
              <small>{d.note}</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BoardBody({ step }) {
  const line = step.leg.line;
  const direction = STOPS_BY_ID[step.leg.directionStopId];
  const board = STOPS_BY_ID[step.leg.boardId];
  const arrival = getStopArrivals(step.leg.boardId).find((a) => a.lineId === line.id);
  const arrivalLabel = arrival
    ? arrival.eta < 0.8
      ? 'Arriving now'
      : `Next bus ~${Math.round(arrival.eta)} min`
    : 'Simulated service';

  return (
    <div className="nav-board-card">
      <div className="nav-line-row">
        <span className="line-pill" style={{ background: line.color }}>
          {line.name}
        </span>
        <span className="nav-towards">towards {direction.short}</span>
        <span className="nav-eta-pill">
          <Clock size={10} /> {arrivalLabel}
        </span>
      </div>
      <p className="nav-line-desc">{line.description}</p>
      <p className="nav-board-at">
        <MapPin size={12} /> Board at {board.name}
      </p>
      <StopTimeline leg={step.leg} />
    </div>
  );
}

function RideBody({ step }) {
  const line = step.leg.line;
  const direction = STOPS_BY_ID[step.leg.directionStopId];
  const alight = STOPS_BY_ID[step.leg.alightId];

  return (
    <div className="nav-ride-card">
      <div className="nav-line-row">
        <span className="line-pill" style={{ background: line.color }}>
          {line.name}
        </span>
        <span className="nav-towards">towards {direction.short}</span>
        <span className="nav-stops-left">
          {step.isAlight
            ? 'Alight now'
            : `${step.remainingStops} stop${step.remainingStops === 1 ? '' : 's'} to go`}
        </span>
      </div>
      <StopTimeline leg={step.leg} currentIndex={step.stopIndex} />
      {step.isAlight && (
        <div className="nav-alight-banner">
          <Flag size={15} /> Alight at {alight.short} · use the front door
        </div>
      )}
    </div>
  );
}

function TransferBody({ step }) {
  const via = STOPS_BY_ID[step.leg.stopId];
  const nextBus = step.nextBus;
  const direction = nextBus ? STOPS_BY_ID[nextBus.directionStopId] : null;

  return (
    <div className="nav-transfer-card">
      <div className="nav-transfer-head">
        <Repeat size={15} /> Change at {via.name}
      </div>
      {nextBus && (
        <>
          <div className="nav-line-row" style={{ marginTop: 8 }}>
            <span className="line-pill" style={{ background: nextBus.line.color }}>
              {nextBus.line.name}
            </span>
            <span className="nav-towards">towards {direction.short}</span>
            <span className="nav-eta-pill">
              <Clock size={10} /> ~{step.leg.mins} min wait
            </span>
          </div>
          <StopTimeline leg={nextBus} />
        </>
      )}
    </div>
  );
}

function ArrivedBody({ journey }) {
  const walked = journey.legs
    .filter((l) => l.kind === 'walk')
    .reduce((sum, l) => sum + l.distance, 0);
  const lineNames = [
    ...new Set(journey.legs.filter((l) => l.kind === 'bus').map((l) => l.line.name)),
  ].join(' + ');

  return (
    <>
      <div className="nav-arrived-card">
        <span className="nav-arrived-icon">
          <CircleCheck size={22} />
        </span>
        <div>
          <b>Destination reached</b>
          <p>{journey.toStop.name}</p>
        </div>
      </div>
      <div className="nav-summary-grid">
        <div>
          <span>Journey</span>
          <b>~{journey.totalMins} min</b>
        </div>
        <div>
          <span>Walked</span>
          <b>{walked} m</b>
        </div>
        <div>
          <span>Bus</span>
          <b>{lineNames || '—'}</b>
        </div>
      </div>
    </>
  );
}

export default function NavigationView({ route, onExit }) {
  const journey = useMemo(() => buildJourney(route), [route]);
  const [index, setIndex] = useState(0);
  const step = journey.steps[index];
  const isLast = index === journey.steps.length - 1;
  const activePhase = PHASES.findIndex((p) => p.key === step.phase);
  const progress = journey.totalMins
    ? Math.min(100, Math.max(3, ((journey.totalMins - step.remainingMins) / journey.totalMins) * 100))
    : 0;

  const nav = {
    busPaths: journey.busPaths,
    walkPaths: journey.walkPaths,
    focusPoints: journey.focusPoints,
    marker: markerFor(step, journey),
    board: pointOf(journey.fromStop),
    alight: pointOf(journey.toStop),
    destination: journey.destination,
    activeWalk:
      step.type === 'walk' ? step.leg.key : step.type === 'arrived' ? 'to-destination' : null,
  };

  const StepIcon =
    step.type === 'walk'
      ? Footprints
      : step.type === 'transfer'
        ? Repeat
        : step.type === 'arrived'
          ? CircleCheck
          : Bus;

  const iconStyle =
    step.type === 'arrived'
      ? { background: '#eaf9f2', color: '#0e9f6e' }
      : step.lineColor
        ? { background: `${step.lineColor}1a`, color: step.lineColor }
        : undefined;

  const next = () => {
    if (isLast) onExit();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="nav-screen">
      <div className="nav-map">
        <CampusMap navigation={nav} />
        <span className="nav-live">
          <span className="pulse-dot" /> Simulated GPS
        </span>
      </div>

      <section className="nav-panel" aria-live="polite">
        <span className="nav-handle" />
        <ol className="nav-phases">
          {PHASES.map(({ key, label, Icon }, i) => (
            <li
              key={key}
              className={i < activePhase ? 'done' : i === activePhase ? 'active' : ''}
            >
              <span className="nav-phase-icon">
                <Icon size={13} />
              </span>
              {label}
              {i < PHASES.length - 1 && <span className="nav-phase-line" />}
            </li>
          ))}
        </ol>

        <div className="nav-progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="nav-instruction">
          <span className="nav-step-icon" style={iconStyle}>
            <StepIcon size={21} />
          </span>
          <div className="nav-instruction-copy">
            <p className="nav-kicker">
              {step.kicker} · Step {index + 1} of {journey.steps.length}
            </p>
            <h2>{step.title}</h2>
            <p className="nav-detail">{step.detail}</p>
          </div>
          <div className="nav-remaining">
            {isLast ? (
              <CircleCheck size={25} className="nav-done-icon" />
            ) : (
              <>
                <b>{step.remainingMins}</b>
                <span>min left</span>
              </>
            )}
          </div>
        </div>

        <div className="nav-next-hint">
          <CornerUpRight size={14} />
          <span>
            <b>Next:</b> {step.nextHint}
          </span>
        </div>

        <div className="nav-scroll">
          {step.type === 'walk' && <WalkBody step={step} />}
          {step.type === 'board' && <BoardBody step={step} />}
          {step.type === 'ride' && <RideBody step={step} />}
          {step.type === 'transfer' && <TransferBody step={step} />}
          {step.type === 'arrived' && <ArrivedBody journey={journey} />}
        </div>

        <div className="nav-actions">
          <button className="nav-exit-btn" onClick={onExit}>
            <X size={15} strokeWidth={2.6} /> Exit Navigation
          </button>
          <button className="btn-primary nav-next-btn" onClick={next}>
            {isLast ? <CircleCheck size={17} /> : <Navigation size={16} />}
            {isLast ? 'Finish' : 'Next Step'}
          </button>
        </div>
      </section>
    </div>
  );
}

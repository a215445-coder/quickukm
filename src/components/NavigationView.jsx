import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Bus,
  CircleCheck,
  Clock,
  CornerUpRight,
  Flag,
  MapPin,
  Navigation,
  Repeat,
  X,
} from 'lucide-react';
import CampusMap, { MapAttribution } from './CampusMap';
import { STOPS_BY_ID } from '../data/shuttleData';
import { buildJourney, stopPoint } from '../data/navigation';

const PHASES = [
  { key: 'board', label: 'Board', Icon: Bus },
  { key: 'ride', label: 'Ride', Icon: Navigation },
  { key: 'arrive', label: 'Arrive', Icon: Flag },
];

const SNAP_ORDER = ['collapsed', 'half', 'current', 'full'];
const COLLAPSED_HEIGHT = 108;
const FLING_PROJECTION_MS = 90;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function markerFor(step, journey) {
  if (step.type === 'board') {
    return stopPoint(STOPS_BY_ID[step.leg.boardId]);
  }
  if (step.type === 'ride') {
    return stopPoint(STOPS_BY_ID[step.leg.stopIds[step.stopIndex]]);
  }
  if (step.type === 'transfer') {
    return stopPoint(STOPS_BY_ID[step.leg.stopId]);
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

function BoardBody({ step }) {
  const line = step.leg.line;
  const direction = STOPS_BY_ID[step.leg.directionStopId];
  const board = STOPS_BY_ID[step.leg.boardId];
  return (
    <div className="nav-board-card">
      <div className="nav-line-row">
        <span className="line-pill" style={{ background: line.color }}>
          {line.id}
        </span>
        <span className="nav-towards">towards {direction.short}</span>
        <span className="nav-eta-pill">
          <Clock size={10} /> {line.days}
        </span>
      </div>
      <p className="nav-line-desc">{line.description}</p>
      <p className="map-note">The map shows approximate road sections. Follow the published stop list below.</p>
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
          {line.id}
        </span>
        <span className="nav-towards">towards {direction.short}</span>
        <span className="nav-stops-left">
          {step.isAlight
            ? 'Alighting stop'
            : `${step.remainingStops} stop${step.remainingStops === 1 ? '' : 's'} to go`}
        </span>
      </div>
      <StopTimeline leg={step.leg} currentIndex={step.stopIndex} />
      {step.isAlight && (
        <div className="nav-alight-banner">
          <Flag size={15} /> Alight at {alight.short}
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
              {nextBus.line.id}
            </span>
            <span className="nav-towards">towards {direction.short}</span>
            <span className="nav-eta-pill">
              <Clock size={10} /> {nextBus.line.days}
            </span>
          </div>
          <StopTimeline leg={nextBus} />
        </>
      )}
    </div>
  );
}

function ArrivedBody({ journey }) {
  const lineNames = journey.legs.map((leg) => leg.line.id).join(' + ');
  return (
    <div className="nav-arrived-card">
      <span className="nav-arrived-icon"><CircleCheck size={22} /></span>
      <div><b>{journey.toStop.name}</b><p>{lineNames}</p></div>
    </div>
  );
}

export default function NavigationView({ route, onExit }) {
  const journey = useMemo(() => buildJourney(route), [route]);
  const [index, setIndex] = useState(0);
  const step = journey.steps[index];
  const isLast = index === journey.steps.length - 1;
  const activePhase = PHASES.findIndex((p) => p.key === step.phase);
  const progress = ((index + 1) / journey.steps.length) * 100;

  const nav = {
    busPaths: journey.busPaths,
    focusPoints: journey.focusPoints,
    marker: markerFor(step, journey),
    board: stopPoint(journey.fromStop),
    alight: stopPoint(journey.toStop),
    destination: journey.destination,

  };

  const StepIcon = step.type === 'transfer'
    ? Repeat
    : step.type === 'arrived' ? CircleCheck : step.type === 'board' ? Bus : Navigation;

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

  const screenRef = useRef(null);
  const dragRef = useRef(null);
  const heightRef = useRef(null);
  const [screenH, setScreenH] = useState(0);
  const [sheetH, setSheetH] = useState(null);
  const [snap, setSnap] = useState('current');
  const [dragging, setDragging] = useState(false);

  // Sheet heights: collapsed peek, half screen, the current layout, and near full-screen.
  const snaps = useMemo(() => {
    if (!screenH) return null;
    return {
      collapsed: Math.min(COLLAPSED_HEIGHT, Math.round(screenH * 0.3)),
      half: Math.round(screenH * 0.5),
      current: Math.min(Math.round(screenH * 0.9), Math.round(screenH * 0.56 + 22)),
      full: Math.round(screenH * 0.9),
    };
  }, [screenH]);

  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return undefined;
    const measure = () => setScreenH(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!snaps || dragging) return;
    const height = snaps[snap];
    heightRef.current = height;
    setSheetH(height);
  }, [snaps, snap, dragging]);

  const startDrag = (e) => {
    if (!snaps || dragRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const startH = heightRef.current ?? snaps[snap];
    dragRef.current = {
      id: e.pointerId,
      startY: e.clientY,
      startH,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture unavailable */
    }
    setDragging(true);
  };

  const moveDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || !snaps || e.pointerId !== drag.id) return;
    e.preventDefault();
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT);
    drag.velocity = (drag.lastY - e.clientY) / dt;
    drag.lastY = e.clientY;
    drag.lastT = now;
    const nextH = clamp(
      drag.startH + (drag.startY - e.clientY),
      snaps.collapsed,
      snaps.full
    );
    heightRef.current = nextH;
    setSheetH(nextH);
  };

  const endDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || !snaps) return;
    if (e?.pointerId != null && e.pointerId !== drag.id) return;
    dragRef.current = null;
    if (e?.pointerId != null) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }

    const releaseY = typeof e?.clientY === 'number' ? e.clientY : drag.lastY;
    const height = clamp(
      drag.startH + (drag.startY - releaseY),
      snaps.collapsed,
      snaps.full
    );
    // ignore a flick that ended more than 120ms ago, then project momentum
    const velocity = performance.now() - drag.lastT > 120 ? 0 : drag.velocity;
    const projected = clamp(height + velocity * FLING_PROJECTION_MS, snaps.collapsed, snaps.full);
    const target = SNAP_ORDER.reduce(
      (best, key) =>
        Math.abs(snaps[key] - projected) < Math.abs(snaps[best] - projected) ? key : best,
      'collapsed'
    );

    setDragging(false);
    setSnap(target);
    heightRef.current = snaps[target];
    setSheetH(snaps[target]);
  };

  return (
    <div ref={screenRef} className={`nav-screen ${dragging ? 'sheet-dragging' : ''}`}>
      <div className="nav-map">
        <CampusMap navigation={nav} />
        <span className="nav-live">
          <span className="pulse-dot" /> Route preview
        </span>
        <MapAttribution />
      </div>

      <section
        className={`nav-panel ${snap === 'collapsed' ? 'is-collapsed' : ''}`}
        style={sheetH != null ? { height: `${sheetH}px` } : undefined}
        aria-live="polite"
      >
        <div
          className="nav-handle"
          role="separator"
          aria-label="Drag to resize navigation panel"
          aria-orientation="horizontal"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />

        <div className="nav-compact">
          <span className="nav-compact-icon" style={iconStyle}>
            <StepIcon size={18} />
          </span>
          <div className="nav-compact-copy">
            <b>{step.title}</b>
            <small>{step.nextHint}</small>
          </div>
          <span className="nav-compact-time">
            {isLast ? (
              <CircleCheck size={20} />
            ) : (
              <>
                <b>{index + 1}</b>
                <small>step</small>
              </>
            )}
          </span>
        </div>

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
                <b>{index + 1}</b>
                <span>step</span>
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
          {step.type === 'board' && <BoardBody step={step} />}
          {step.type === 'ride' && <RideBody step={step} />}
          {step.type === 'transfer' && <TransferBody step={step} />}
          {step.type === 'arrived' && <ArrivedBody journey={journey} />}
        </div>

        <div className="nav-actions">
          <button className="nav-exit-btn" onClick={onExit}>
            <X size={15} strokeWidth={2.6} /> Exit Preview
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

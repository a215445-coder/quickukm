import { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Bus,
  ChevronRight,
  Clock,
  Footprints,
  LocateFixed,
  Search,
  X,
} from 'lucide-react';
import CampusMap from '../components/CampusMap';
import StopSelect from '../components/StopSelect';
import { LINE_BY_ID, STOPS_BY_ID, getStopArrivals, tripSummary } from '../data/mockData';

const NEARBY = [
  { stopId: 'ffar', distance: '200 m', walk: '2 min' },
  { stopId: 'ftsm', distance: '300 m', walk: '4 min' },
  { stopId: 'fst', distance: '550 m', walk: '7 min' },
];

const POPULAR = [
  ['fssk', 'fst'],
  ['fep', 'ffar'],
  ['ffar', 'fper'],
  ['fst', 'fpend'],
];

export default function HomePage({ onTrip, onNavigate }) {
  const [from, setFrom] = useState('ffar');
  const [to, setTo] = useState('');
  const [selectedStop, setSelectedStop] = useState(null);
  const [tick, setTick] = useState(0);

  // refresh the simulated arrivals every 15 s so ETAs feel "live"
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };
  const go = () => {
    if (from && to && from !== to) onTrip(from, to);
  };
  const stop = selectedStop ? STOPS_BY_ID[selectedStop] : null;
  const arrivals = selectedStop ? getStopArrivals(selectedStop) : [];

  return (
    <>
      <section className="map-card" id="campus-map">
        <CampusMap selectedStop={selectedStop} onSelectStop={setSelectedStop} />

        <div className="trip-quick">
          <div className="trip-quick-head">
            <span>Plan a trip</span>
            <span className="live-pill">
              <span className="pulse-dot" /> LIVE
            </span>
          </div>
          <StopSelect dot="from" value={from} onChange={setFrom} placeholder="From…" />
          <div className="swap-row">
            <button className="swap-mini" onClick={swap} aria-label="Swap from and to">
              <ArrowRightLeft size={15} />
            </button>
          </div>
          <StopSelect dot="to" value={to} onChange={setTo} placeholder="To…" />
          <button className="go-btn" disabled={!from || !to || from === to} onClick={go}>
            <Search size={15} /> Find Routes
          </button>
        </div>

        <button
          className="locate-btn"
          onClick={() => setSelectedStop('ffar')}
          aria-label="Show nearest stop (FFAR)"
        >
          <LocateFixed size={18} />
        </button>

        {stop && (
          <div className="stop-sheet">
            <div className="stop-sheet-head">
              <div>
                <h3>{stop.name}</h3>
                <p>{stop.walk || 'Major stop — all lines stop here'}</p>
              </div>
              <button className="sheet-close" onClick={() => setSelectedStop(null)} aria-label="Close">
                <X size={15} />
              </button>
            </div>
            {arrivals.length === 0 && (
              <p className="muted" style={{ fontSize: 12.5, padding: '4px 0 8px' }}>
                No buses right now — try again soon.
              </p>
            )}
            {arrivals.map((a) => {
              const line = LINE_BY_ID[a.lineId];
              return (
                <div className="arrival-row" key={a.lineId}>
                  <span className="line-dot" style={{ background: line.color }} />
                  <b>{line.name}</b>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    next bus
                  </span>
                  <span className="eta-pill">{a.eta < 0.8 ? 'Arriving' : `~${Math.round(a.eta)} min`}</span>
                </div>
              );
            })}
            <div className="sheet-foot">
              <span>Simulated live arrivals</span>
              <button
                className="sheet-action"
                onClick={() => {
                  setTo(stop.id);
                  setSelectedStop(null);
                }}
              >
                Set as destination
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="legend">
        {Object.values(LINE_BY_ID).map((l) => (
          <span className="legend-chip" key={l.id}>
            <span className="line-dot" style={{ background: l.color }} />
            {l.name}
          </span>
        ))}
        <span className="legend-chip">
          <span className="pulse-dot" /> Tap a stop for arrivals
        </span>
      </div>

      <section className="section">
        <h2 className="section-title">
          Nearby stops{' '}
          <button className="link" onClick={() => onNavigate('timetable')}>
            See timetable
          </button>
        </h2>
        <div className="h-scroll">
          {NEARBY.map((n) => {
            const s = STOPS_BY_ID[n.stopId];
            const arrivalsHere = getStopArrivals(n.stopId);
            return (
              <button
                key={n.stopId}
                className="nearby-card"
                onClick={() => {
                  setSelectedStop(n.stopId);
                  document
                    .getElementById('campus-map')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <div className="nearby-head">
                  <b>{s.name}</b>
                  <span className="nearby-sub">{n.distance}</span>
                </div>
                <span className="nearby-sub">
                  <Footprints size={11} style={{ display: 'inline', marginRight: 3 }} />
                  {n.walk} walk
                </span>
                <div
                  className="arrival-row"
                  style={{ borderTop: '1px solid var(--line)', marginTop: 8, gap: 14 }}
                >
                  {arrivalsHere.slice(0, 2).map((a) => {
                    const line = LINE_BY_ID[a.lineId];
                    return (
                      <span
                        key={a.lineId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: 'var(--ink-2)',
                        }}
                      >
                        <span className="line-dot" style={{ background: line.color }} />
                        {a.eta < 0.8 ? 'Now' : `${Math.round(a.eta)} min`}
                      </span>
                    );
                  })}
                  {arrivalsHere.length === 0 && <span className="nearby-sub">No arrivals</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Popular routes</h2>
        {POPULAR.map(([f, t]) => {
          const sum = tripSummary(f, t);
          if (!sum) return null;
          return (
            <button key={`${f}-${t}`} className="pop-card" onClick={() => onTrip(f, t)}>
              <span className="pop-icon" style={{ background: sum.lineColor }}>
                <Bus size={19} />
              </span>
              <span className="pop-body">
                <b>
                  {STOPS_BY_ID[f].name} → {STOPS_BY_ID[t].name}
                </b>
                <span>
                  ≈ {sum.mins} min · {sum.lineName} · {sum.stops} stops
                </span>
              </span>
              <ChevronRight size={16} className="pop-arrow" />
            </button>
          );
        })}
      </section>

      <div className="status">
        <span className="pulse-dot" />
        All Zon services running normally
        <span className="muted">
          <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </>
  );
}

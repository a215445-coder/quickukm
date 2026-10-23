import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Bus, Clock, Footprints, Repeat, Search, Star } from 'lucide-react';
import StopSelect from '../components/StopSelect';
import { LINE_BY_ID, STOPS_BY_ID, findRoutes, nextDepartures } from '../data/mockData';

const SUGGESTIONS = [
  { fromId: 'fssk', toId: 'fst' },
  { fromId: 'fep', toId: 'ffar' },
  { fromId: 'fst', toId: 'fpend' },
  { fromId: 'ffar', toId: 'fper' },
];

function Steps({ stops, lineId, start, end }) {
  return (
    <ol className="route-steps">
      {stops.map((sid, i) => {
        const s = STOPS_BY_ID[sid];
        const cls = [
          start && i === 0 ? 'start' : '',
          end && i === stops.length - 1 ? 'end' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const time = i === 0 ? null : nextDepartures(lineId, sid, 1)[0];
        return (
          <li key={i} className={cls}>
            <span className="step-dot" />
            <span className="step-name">
              {s.name}
              {time && <small>{time}</small>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function walkTip(stopId) {
  return STOPS_BY_ID[stopId]?.walk || null;
}

function RouteCard({ route }) {
  if (route.kind === 'direct') {
    const line = LINE_BY_ID[route.lineId];
    const from = STOPS_BY_ID[route.fromId];
    const to = STOPS_BY_ID[route.toId];
    return (
      <article className="card route-card">
        <div className="route-card-head">
          <span className="line-pill" style={{ background: line.color }}>
            {line.name}
          </span>
          <span className="route-meta">Direct</span>
          <span className="route-meta">
            <Clock size={12} /> Every {line.freq} min
          </span>
          <span className="route-dur">
            {route.mins}
            <small> min</small>
          </span>
        </div>
        <Steps stops={route.stops} lineId={line.id} start end />
        <div className="route-foot">
          {walkTip(from.id) && (
            <span>
              <Footprints size={12} /> {walkTip(from.id)}
            </span>
          )}
          {to.id !== from.id && walkTip(to.id) && (
            <span>
              <Footprints size={12} /> {walkTip(to.id)}
            </span>
          )}
        </div>
      </article>
    );
  }

  const l1 = LINE_BY_ID[route.seg1.lineId];
  const l2 = LINE_BY_ID[route.seg2.lineId];
  return (
    <article className="card route-card">
      <div className="route-card-head">
        <span className="line-pill" style={{ background: l1.color }}>
          {l1.name}
        </span>
        <span className="route-meta">
          <Repeat size={12} />
        </span>
        <span className="line-pill" style={{ background: l2.color }}>
          {l2.name}
        </span>
        <span className="route-dur">
          {route.mins}
          <small> min</small>
        </span>
      </div>
      <Steps stops={route.seg1.stops} lineId={l1.id} start />
      <div className="transfer-row">
        <Repeat size={12} /> Transfer at {STOPS_BY_ID[route.via].name} · ~5 min wait
      </div>
      <Steps stops={route.seg2.stops.slice(1)} lineId={l2.id} end />
      <div className="route-foot">
        {walkTip(route.fromId) && (
          <span>
            <Footprints size={12} /> {walkTip(route.fromId)}
          </span>
        )}
        {walkTip(route.toId) && (
          <span>
            <Footprints size={12} /> {walkTip(route.toId)}
          </span>
        )}
      </div>
    </article>
  );
}

export default function RoutesPage({ plan, favs, onToggleFav }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searched, setSearched] = useState(false);

  // runs when another page (Home / Favourites) hands us a trip to plan
  useEffect(() => {
    if (plan.nonce > 0 && plan.fromId && plan.toId) {
      setFrom(plan.fromId);
      setTo(plan.toId);
      setSearched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.nonce]);

  const results = useMemo(
    () => (searched && from && to && from !== to ? findRoutes(from, to) : null),
    [searched, from, to]
  );

  const swap = () => {
    setFrom(to);
    setTo(from);
  };
  const isFav = from && to ? favs.includes(`${from}:${to}`) : false;
  const applySuggestion = (s) => {
    setFrom(s.fromId);
    setTo(s.toId);
    setSearched(true);
  };

  return (
    <>
      <section className="card planner">
        <div className="planner-row">
          <StopSelect dot="from" value={from} onChange={setFrom} placeholder="Choose start point…" />
        </div>
        <div className="planner-row">
          <StopSelect dot="to" value={to} onChange={setTo} placeholder="Choose destination…" />
        </div>
        <button className="swap-fab" onClick={swap} aria-label="Swap start and destination">
          <ArrowRightLeft size={17} />
        </button>
        <button
          className="btn-primary btn-block"
          disabled={!from || !to || from === to}
          onClick={() => setSearched(true)}
        >
          <Search size={16} /> Find Routes
        </button>
        {from && to && from === to && (
          <p className="hint">Start and destination are the same — pick two different stops.</p>
        )}
      </section>

      {!results && (
        <section className="section">
          <h2 className="section-title">Quick picks</h2>
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={`${s.fromId}-${s.toId}`} className="chip" onClick={() => applySuggestion(s)}>
                <Bus size={13} /> {STOPS_BY_ID[s.fromId].short} → {STOPS_BY_ID[s.toId].short}
              </button>
            ))}
          </div>
        </section>
      )}

      {results && from && to && (
        <section className="section">
          <div className="results-head">
            <div>
              <h2 className="section-title" style={{ display: 'block' }}>
                Trip options
              </h2>
              <p className="muted">
                {STOPS_BY_ID[from].name} → {STOPS_BY_ID[to].name} · {results.length} option
                {results.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              className={`fav-btn ${isFav ? 'on' : ''}`}
              onClick={() => onToggleFav(`${from}:${to}`)}
              aria-label="Save this trip to favourites"
            >
              <Star size={18} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          </div>
          {results.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
          {results.length === 0 && (
            <div className="empty">
              <div className="empty-icon">
                <Bus size={26} />
              </div>
              <b>No route found</b>
              <p>Try a different destination.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

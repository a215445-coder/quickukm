import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Bus,
  Navigation,
  Repeat,
  Search,
  Star,
} from 'lucide-react';
import StopSelect from '../components/StopSelect';
import { LINE_BY_ID, STOPS_BY_ID, SUGGESTED_TRIPS, findRoutes } from '../data/shuttleData';

function Steps({ stops }) {
  return (
    <ol className="route-steps">
      {stops.map((id, index) => (
        <li key={index} className={index === 0 ? 'start' : index === stops.length - 1 ? 'end' : ''}>
          <span className="step-dot" />
          <span className="step-name">{STOPS_BY_ID[id].name}</span>
        </li>
      ))}
    </ol>
  );
}

function RouteCard({ route, onStartNavigation }) {
  const direct = route.kind === 'direct';
  const legs = direct ? [route] : [route.seg1, route.seg2];
  const stopCount = legs.reduce((count, leg) => count + leg.stops.length - 1, 0);
  return (
    <article className="card route-card">
      <div className="route-card-head">
        {legs.map((leg) => {
          const line = LINE_BY_ID[leg.lineId];
          return <span key={line.id} className="line-pill" style={{ background: line.color }}>{line.name}</span>;
        })}
        <span className="route-meta">{direct ? 'Direct' : '1 transfer'}</span>
        <span className="route-meta">{stopCount} stops</span>
      </div>
      <button className="btn-primary start-nav-btn" onClick={() => onStartNavigation(route)}>
        <Navigation size={15} /> Preview Route
      </button>
      <Steps stops={legs[0].stops} />
      {!direct && (
        <>
          <div className="transfer-row"><Repeat size={12} /> Transfer at {STOPS_BY_ID[route.via].name}</div>
          <Steps stops={legs[1].stops} />
        </>
      )}
    </article>
  );
}

export default function RoutesPage({ plan, favs, onToggleFav, onStartNavigation }) {
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
  const applySuggestion = ({ fromId, toId }) => {
    setFrom(fromId);
    setTo(toId);
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
            {SUGGESTED_TRIPS.map(([fromId, toId]) => (
              <button key={`${fromId}-${toId}`} className="chip" onClick={() => applySuggestion({ fromId, toId })}>
                <Bus size={13} /> {STOPS_BY_ID[fromId].short} → {STOPS_BY_ID[toId].short}
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
            <RouteCard
              key={r.id}
              route={r}
              onStartNavigation={onStartNavigation}
            />
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

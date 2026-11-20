import { useState } from 'react';
import { ArrowRightLeft, Bus, ChevronRight, LocateFixed, Search, X } from 'lucide-react';
import CampusMap, { MapAttribution } from '../components/CampusMap';
import StopSelect from '../components/StopSelect';
import {
  LINES, OFFICIAL_BUS_APP, STOPS_BY_ID, SUGGESTED_TRIPS, linesAtStop, tripSummary,
} from '../data/shuttleData';

const NEARBY = ['pusanika', 'library', 'fep'];

export default function HomePage({ onTrip, onNavigate }) {
  const [from, setFrom] = useState('kpz');
  const [to, setTo] = useState('');
  const [selectedStop, setSelectedStop] = useState(null);
  const stop = STOPS_BY_ID[selectedStop];

  return (
    <>
      <section className="map-card" id="campus-map">
        <CampusMap selectedStop={selectedStop} onSelectStop={setSelectedStop} />

        <div className="trip-quick">
          <div className="trip-quick-head"><span>Plan a trip</span><span>UKM Bangi</span></div>
          <StopSelect dot="from" value={from} onChange={setFrom} placeholder="From…" />
          <div className="swap-row">
            <button className="swap-mini" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap from and to">
              <ArrowRightLeft size={15} />
            </button>
          </div>
          <StopSelect dot="to" value={to} onChange={setTo} placeholder="To…" />
          <button className="go-btn" disabled={!from || !to || from === to} onClick={() => onTrip(from, to)}>
            <Search size={15} /> Find Routes
          </button>
        </div>

        <button className="locate-btn" onClick={() => setSelectedStop('pusanika')} aria-label="Show Pusanika">
          <LocateFixed size={18} />
        </button>

        {stop && (
          <div className="stop-sheet">
            <div className="stop-sheet-head">
              <div>
                <h3>{stop.name}</h3>
                <p>{stop.code && `${stop.code} · `}{stop.location === 'mapped' ? 'Mapped bus stop' : 'Approximate stop area'}</p>
              </div>
              <button className="sheet-close" onClick={() => setSelectedStop(null)} aria-label="Close"><X size={15} /></button>
            </div>
            {linesAtStop(stop.id).map((line) => (
              <div className="arrival-row" key={line.id}>
                <span className="line-dot" style={{ background: line.color }} />
                <b>{line.name}</b><span className="muted">{line.days}</span>
              </div>
            ))}
            <div className="sheet-foot">
              <a href={OFFICIAL_BUS_APP} target="_blank" rel="noreferrer">Live arrivals in MyUKM</a>
              <button className="sheet-action" onClick={() => { setTo(stop.id); setSelectedStop(null); }}>Set as destination</button>
            </div>
          </div>
        )}
      </section>
      <MapAttribution />

      <div className="legend">
        {LINES.map((line) => (
          <span className="legend-chip" key={line.id}>
            <span className="line-dot" style={{ background: line.color }} /> {line.name}
          </span>
        ))}
      </div>
      <p className="map-note">Dashed lines show approximate road sections. Hollow markers show stop areas. See route lists for all stops.</p>

      <section className="section">
        <h2 className="section-title">
          Stops near Pusanika
          <button className="link" onClick={() => onNavigate('timetable')}>See timetable</button>
        </h2>
        <div className="h-scroll">
          {NEARBY.map((id) => (
            <button key={id} className="nearby-card" onClick={() => {
              setSelectedStop(id);
              document.getElementById('campus-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <div className="nearby-head"><b>{STOPS_BY_ID[id].name}</b></div>
              <span className="nearby-sub">{linesAtStop(id).map((line) => line.name).join(' · ')}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Suggested trips</h2>
        {SUGGESTED_TRIPS.map(([f, t]) => {
          const sum = tripSummary(f, t);
          if (!sum) return null;
          return (
            <button key={`${f}-${t}`} className="pop-card" onClick={() => onTrip(f, t)}>
              <span className="pop-icon" style={{ background: sum.lineColor }}><Bus size={19} /></span>
              <span className="pop-body">
                <b>{STOPS_BY_ID[f].short} → {STOPS_BY_ID[t].short}</b>
                <span>{sum.lineName} · {sum.stops} stops</span>
              </span>
              <ChevronRight size={16} className="pop-arrow" />
            </button>
          );
        })}
      </section>
    </>
  );
}

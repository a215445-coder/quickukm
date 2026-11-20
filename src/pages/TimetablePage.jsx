import { useState } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { LINES, STOPS_BY_ID } from '../data/shuttleData';

export default function TimetablePage() {
  const [filter, setFilter] = useState('all');
  const lines = filter === 'all' ? LINES : LINES.filter((line) => line.id === filter);

  return (
    <>
      <div className="filter-chips" role="group" aria-label="Filter by line">
        {[{ id: 'all', name: 'All lines' }, ...LINES].map((line) => (
          <button key={line.id} className={`f-chip ${filter === line.id ? 'active' : ''}`}
            aria-pressed={filter === line.id} onClick={() => setFilter(line.id)}
            style={filter === line.id && line.color ? { background: line.color } : undefined}>
            {line.name}
          </button>
        ))}
      </div>
      <p className="map-note">
        Moovit’s regular service hours in Malaysia time. Check the linked timetable for individual departures, breaks and changes.
      </p>
      {lines.map((line) => (
        <article className="card tt-card" key={line.id}>
          <div className="tt-head">
            <span className="line-pill" style={{ background: line.color }}>{line.name}</span>
            <div className="grow"><h3>{line.description}</h3><p>{line.days} · {line.first}–{line.last} MYT</p></div>
          </div>
          <div className="tt-meta"><span><Clock size={12} /> Typical interval: {line.freq} min</span></div>
          <a className="source-link" href={line.source} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> Check published timetable
          </a>
          <details className="shuttle-stop-list">
            <summary>Show published stop order</summary>
            <ol>
              {line.stopIds.map((id, index) => (
                <li key={index}>{STOPS_BY_ID[id].name}{STOPS_BY_ID[id].code && ` · ${STOPS_BY_ID[id].code}`}</li>
              ))}
            </ol>
          </details>
        </article>
      ))}
    </>
  );
}

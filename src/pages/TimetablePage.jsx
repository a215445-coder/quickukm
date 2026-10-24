import { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { LINES, STOPS_BY_ID, fmtTime, nextDepartures } from '../data/mockData';

const FILTERS = [{ id: 'all', label: 'All lines' }, ...LINES.map((l) => ({ id: l.id, label: l.name }))];

export default function TimetablePage() {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState('A');
  const lines = filter === 'all' ? LINES : LINES.filter((l) => l.id === filter);

  return (
    <>
      <div className="filter-chips" role="tablist" aria-label="Filter by line">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            className={`f-chip ${filter === f.id ? 'active' : ''}`}
            style={
              filter === f.id
                ? {
                    background:
                      f.id === 'all'
                        ? 'var(--primary)'
                        : LINES.find((l) => l.id === f.id).color,
                  }
                : undefined
            }
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {lines.map((line) => {
        const firstStop = STOPS_BY_ID[line.stopIds[0]];
        const lastStop = STOPS_BY_ID[line.stopIds[line.stopIds.length - 1]];
        const isOpen = open === line.id;
        return (
          <article
            key={line.id}
            className={`card tt-card ${isOpen ? 'open' : ''}`}
            onClick={() => setOpen(isOpen ? null : line.id)}
          >
            <div className="tt-head">
              <span className="line-pill" style={{ background: line.color }}>
                {line.name}
              </span>
              <div className="grow">
                <h3>{line.description}</h3>
                <p>
                  {firstStop.name} ⇄ {lastStop.name}
                </p>
              </div>
              <ChevronDown size={17} className="tt-chev" />
            </div>
            <div className="tt-meta">
              <span>
                <Clock size={12} /> Every {line.freq} min
              </span>
              <span>
                {fmtTime(line.first)} – {fmtTime(line.last)}
              </span>
            </div>
            <p className="tt-label">Next departures · {firstStop.name}</p>
            <div className="time-chips">
              {nextDepartures(line.id, line.stopIds[0], 4).map((t, i) => (
                <span className="time-chip" key={i}>
                  {t}
                </span>
              ))}
            </div>
            {isOpen && (
              <div className="tt-stops">
                {line.stopIds.map((sid) => (
                  <div className="tt-stop-row" key={sid}>
                    <span>{STOPS_BY_ID[sid].name}</span>
                    <span className="times">
                      {nextDepartures(line.id, sid, 2).map((t, k) => (
                        <span className="time-chip" key={k}>
                          {t}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}

      <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 14 }}>
        Schedules are simulated for this prototype.
      </p>
    </>
  );
}

import { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { LINES, STOPS_BY_ID } from '../data/shuttleData';
import { PUBLISHED_DEPARTURES } from '../data/publishedDepartures';

const DAY_OPTIONS = [
  ['weekday', 'Mon–Thu'],
  ['friday', 'Friday'],
  ['weekend', 'Sat–Sun'],
];

function PublishedTimetable({ line }) {
  const [day, setDay] = useState('weekday');
  const timetable = PUBLISHED_DEPARTURES[line.id];
  const origin = STOPS_BY_ID[line.stopIds[0]];
  const times = timetable.days[day];

  return (
    <details className="published-timetable">
      <summary>
        <Clock size={15} />
        <span>Check published timetable</span>
        <ChevronDown size={16} className="timetable-chevron" />
      </summary>
      <div className="published-timetable-content">
        <p className="timetable-origin"><b>Departures from {origin.name}</b>{origin.code && ` · ${origin.code}`}</p>
        <div className="timetable-days" role="group" aria-label={`Route ${line.id} service day`}>
          {DAY_OPTIONS.map(([value, label]) => (
            <button type="button" key={value} aria-pressed={day === value} onClick={() => setDay(value)}>
              {label}
            </button>
          ))}
        </div>
        {times.length > 0 ? (
          <ul className="published-departures" aria-label="Scheduled departures in Malaysia time">
            {times.map((time) => <li key={time}><time dateTime={time}>{time}</time></li>)}
          </ul>
        ) : (
          <p className="map-note">No regular weekend service is listed for this route.</p>
        )}
        <p className="timetable-source">Scheduled times in MYT. Source: <cite>{timetable.publisher}</cite>. Service may change.</p>
      </div>
    </details>
  );
}

export default function TimetablePage() {
  const [filter, setFilter] = useState('all');
  const lines = filter === 'all' ? LINES : LINES.filter((line) => line.id === filter);

  return (
    <>
      <div className="filter-chips" role="group" aria-label="Filter by line">
        {[{ id: 'all' }, ...LINES].map((line) => (
          <button key={line.id} className={`f-chip ${filter === line.id ? 'active' : ''}`}
            aria-label={line.id === 'all' ? 'All routes' : `Route ${line.id}`}
            aria-pressed={filter === line.id} onClick={() => setFilter(line.id)}
            style={filter === line.id && line.color ? { background: line.color } : undefined}>
            {line.id === 'all' ? 'All routes' : line.id}
          </button>
        ))}
      </div>
      <p className="map-note">
        Expand a timetable to see published departures from that route’s first stop.
      </p>
      {lines.map((line) => (
        <article className="card tt-card" key={line.id}>
          <div className="tt-head">
            <span className="line-pill" style={{ background: line.color }}>{line.id}</span>
            <div className="grow"><h3>{line.description}</h3><p>{line.days} · {line.first}–{line.last} MYT</p></div>
          </div>
          <div className="tt-meta"><span><Clock size={12} /> Typical interval: {line.freq} min</span></div>
          <PublishedTimetable line={line} />
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

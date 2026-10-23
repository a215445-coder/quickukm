import { Bus, ChevronRight, Star } from 'lucide-react';
import { STOPS_BY_ID, tripSummary } from '../data/mockData';

const SUGGESTED = [
  ['fst', 'fpend'],
  ['ffar', 'fper'],
  ['fssk', 'fpi'],
];

export default function FavouritesPage({ favs, onToggleFav, onOpenTrip, onBrowse }) {
  const rows = favs
    .map((key) => {
      const [f, t] = key.split(':');
      const sum = tripSummary(f, t);
      if (!sum || !STOPS_BY_ID[f] || !STOPS_BY_ID[t]) return null;
      return { key, f, t, sum };
    })
    .filter(Boolean);
  const suggestions = SUGGESTED.filter(([f, t]) => !favs.includes(`${f}:${t}`));

  return (
    <>
      {rows.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Star size={26} />
          </div>
          <b>No saved routes yet</b>
          <p>Tap the star on any trip result to save it here.</p>
          <button
            className="btn-primary btn-block"
            style={{ marginTop: 16, width: '80%', marginLeft: 'auto', marginRight: 'auto' }}
            onClick={onBrowse}
          >
            <Bus size={15} /> Browse Routes
          </button>
        </div>
      ) : (
        <>
          {rows.map(({ key, f, t, sum }) => (
            <button className="card fav-card" key={key} onClick={() => onOpenTrip(f, t)}>
              <span className="fav-line" style={{ background: sum.lineColor }} />
              <span className="fav-body">
                <span className="fav-title">
                  {STOPS_BY_ID[f].name} <span className="fav-arrow">→</span> {STOPS_BY_ID[t].name}
                </span>
                <span className="fav-sub">
                  ≈ {sum.mins} min · {sum.lineName} · {sum.stops} stops
                </span>
              </span>
              <span
                className="fav-heart"
                role="button"
                aria-label="Remove from favourites"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFav(key);
                }}
              >
                <Star size={18} fill="currentColor" />
              </span>
              <ChevronRight size={16} className="muted" style={{ marginRight: 12, flexShrink: 0 }} />
            </button>
          ))}
        </>
      )}

      {suggestions.length > 0 && (
        <section className="section">
          <h2 className="section-title">Suggested trips</h2>
          {suggestions.map(([f, t]) => {
            const sum = tripSummary(f, t);
            if (!sum) return null;
            return (
              <div className="card fav-card" key={`${f}-${t}`} style={{ cursor: 'default' }}>
                <span className="fav-line" style={{ background: sum.lineColor }} />
                <span className="fav-body">
                  <span className="fav-title">
                    {STOPS_BY_ID[f].name} <span className="fav-arrow">→</span> {STOPS_BY_ID[t].name}
                  </span>
                  <span className="fav-sub">
                    ≈ {sum.mins} min · {sum.lineName}
                  </span>
                </span>
                <span
                  className="fav-heart"
                  role="button"
                  aria-label="Add to favourites"
                  style={{ color: 'var(--ink-3)' }}
                  onClick={() => onToggleFav(`${f}:${t}`)}
                >
                  <Star size={18} />
                </span>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

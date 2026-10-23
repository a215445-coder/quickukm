import { STOPS } from '../data/mockData';

// Shared stop dropdown — dot: 'from' (green) or 'to' (red)
export default function StopSelect({ value, onChange, placeholder, dot }) {
  return (
    <label className="stop-select">
      {dot && <span className={`stop-select-dot ${dot}`} />}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          {placeholder}
        </option>
        {STOPS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

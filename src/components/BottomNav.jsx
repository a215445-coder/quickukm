import { CalendarClock, Home, Route, Star } from 'lucide-react';

const ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'timetable', label: 'Timetable', icon: CalendarClock },
  { id: 'favourites', label: 'Favourites', icon: Star },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav className="bottomnav" aria-label="Main navigation">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item ${active === id ? 'active' : ''}`}
          onClick={() => onSelect(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <span className="nav-icon">
            <Icon size={19} strokeWidth={active === id ? 2.4 : 2} />
          </span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

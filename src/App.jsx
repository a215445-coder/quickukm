import { useEffect, useState } from 'react';
import { Bell, Bus } from 'lucide-react';
import BottomNav from './components/BottomNav';
import NavigationView from './components/NavigationView';
import HomePage from './pages/HomePage';
import RoutesPage from './pages/RoutesPage';
import TimetablePage from './pages/TimetablePage';
import FavouritesPage from './pages/FavouritesPage';
import AlertsPage from './pages/AlertsPage';

const FAV_KEY = 'quickukm:favs';
const DEFAULT_FAVS = [];

const PAGE_META = {
  routes: { title: 'Routes', sub: 'Plan a trip using published stop sequences' },
  timetable: { title: 'Timetable', sub: 'Published regular service hours' },
  favourites: { title: 'Favourites', sub: 'Your saved trips' },
  alerts: { title: 'Service Updates', sub: 'UKM shuttle information' },
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [plan, setPlan] = useState({ fromId: null, toId: null, nonce: 0 });
  const [favs, setFavs] = useState(() => loadJSON(FAV_KEY, DEFAULT_FAVS));
  const [navRoute, setNavRoute] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [favs]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    /* inside the iPhone preview frame the app scrolls in .app-shell */
    document.querySelector('.app-shell')?.scrollTo({ top: 0 });
  }, [tab]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector('.app-shell')?.scrollTo({ top: 0 });
  }, [navRoute]);

  const runTrip = (fromId, toId) => {
    setPlan((p) => ({ fromId, toId, nonce: p.nonce + 1 }));
    setTab('routes');
  };

  const toggleFav = (key) =>
    setFavs((fs) => (fs.includes(key) ? fs.filter((k) => k !== key) : [key, ...fs]));

  const meta = PAGE_META[tab];

  return (
    <div className={`app-shell ${navRoute ? 'navigating' : ''}`}>
      <header className="topbar">
        <div className="topbar-blur" aria-hidden="true" />
        {tab === 'home' ? (
          <div className="brand">
            <div className="brand-logo">
              <Bus size={19} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <h1>QuickUKM</h1>
              <p>UKM Campus Bus</p>
            </div>
          </div>
        ) : (
          <div className="page-title">
            <h1>{meta.title}</h1>
            <p>{meta.sub}</p>
          </div>
        )}
        <button className="bell-btn" onClick={() => setTab('alerts')} aria-label="Service updates">
          <Bell size={20} />
        </button>
      </header>

      <main className="page">
        {tab === 'home' && <HomePage onTrip={runTrip} onNavigate={setTab} />}
        {tab === 'routes' && (
          <RoutesPage
            plan={plan}
            favs={favs}
            onToggleFav={toggleFav}
            onStartNavigation={setNavRoute}
          />
        )}
        {tab === 'timetable' && <TimetablePage />}
        {tab === 'favourites' && (
          <FavouritesPage
            favs={favs}
            onToggleFav={toggleFav}
            onOpenTrip={runTrip}
            onBrowse={() => setTab('routes')}
          />
        )}
        {tab === 'alerts' && <AlertsPage />}
      </main>

      <div className="bottom-blur" aria-hidden="true" />
      <BottomNav active={tab} onSelect={setTab} />

      {navRoute && (
        <NavigationView route={navRoute} onExit={() => setNavRoute(null)} />
      )}
    </div>
  );
}

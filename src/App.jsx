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
const ALERT_KEY = 'quickukm:alerts';
const DEFAULT_FAVS = ['fssk:fst', 'fep:ffar'];

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    kind: 'arrival',
    lineId: 'A',
    title: 'Bus A-14 arriving soon',
    body: 'Zon A bus arriving at FST in about 3 min.',
    time: 'Just now',
    read: false,
  },
  {
    id: 2,
    kind: 'arrival',
    lineId: 'C',
    title: 'Bus C-02 arriving soon',
    body: 'Zon C bus arriving at FFAR in about 7 min.',
    time: '2 min ago',
    read: false,
  },
  {
    id: 3,
    kind: 'service',
    title: 'Service update · Zon B',
    body: 'Zon B running about 5 min behind schedule near the main gate.',
    time: '15 min ago',
    read: false,
  },
];

const PAGE_META = {
  routes: { title: 'Routes', sub: 'Plan your trip across campus' },
  timetable: { title: 'Timetable', sub: 'Simulated live schedules' },
  favourites: { title: 'Favourites', sub: 'Your saved trips' },
  alerts: { title: 'Arrival Alerts', sub: 'Simulated notifications' },
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
  const [alertsOn, setAlertsOn] = useState(() => loadJSON(ALERT_KEY, true));
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [navRoute, setNavRoute] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [favs]);

  useEffect(() => {
    try {
      localStorage.setItem(ALERT_KEY, JSON.stringify(alertsOn));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [alertsOn]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    /* inside the iPhone preview frame the app scrolls in .app-shell */
    document.querySelector('.app-shell')?.scrollTo({ top: 0 });
  }, [tab]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector('.app-shell')?.scrollTo({ top: 0 });
  }, [navRoute]);

  useEffect(() => {
    if (tab === 'alerts') setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  }, [tab]);

  const runTrip = (fromId, toId) => {
    setPlan((p) => ({ fromId, toId, nonce: p.nonce + 1 }));
    setTab('routes');
  };

  const toggleFav = (key) =>
    setFavs((fs) => (fs.includes(key) ? fs.filter((k) => k !== key) : [key, ...fs]));

  const dismissNotification = (id) => setNotifications((ns) => ns.filter((n) => n.id !== id));
  const clearNotifications = () => setNotifications([]);
  const simulateNotification = () =>
    setNotifications((ns) => [
      {
        id: Date.now(),
        kind: 'arrival',
        lineId: 'D',
        title: 'Bus D-03 arriving soon',
        body: 'Zon D express arriving at FPER in about 5 min.',
        time: 'Just now',
        read: tab === 'alerts',
      },
      ...ns,
    ]);

  const unread = notifications.filter((n) => !n.read).length;
  const meta = PAGE_META[tab];

  return (
    <div className={`app-shell ${navRoute ? 'navigating' : ''}`}>
      <header className="topbar">
        {tab === 'home' ? (
          <div className="brand">
            <div className="brand-logo">
              <Bus size={19} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <h1>QuickUKM</h1>
              <p>UKM Campus Shuttle</p>
            </div>
          </div>
        ) : (
          <div className="page-title">
            <h1>{meta.title}</h1>
            <p>{meta.sub}</p>
          </div>
        )}
        <button className="bell-btn" onClick={() => setTab('alerts')} aria-label="Arrival alerts">
          <Bell size={20} />
          {unread > 0 && <span className="badge">{unread}</span>}
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
        {tab === 'alerts' && (
          <AlertsPage
            alertsOn={alertsOn}
            onToggleAlerts={setAlertsOn}
            notifications={notifications}
            onDismiss={dismissNotification}
            onClearAll={clearNotifications}
            onSimulate={simulateNotification}
          />
        )}
      </main>

      <BottomNav active={tab} onSelect={setTab} />

      {navRoute && (
        <NavigationView route={navRoute} onExit={() => setNavRoute(null)} />
      )}
    </div>
  );
}

/* ============================================================
   QuickUKM — application logic
   Vanilla JS, no build step, state persisted in localStorage.
   ============================================================ */
(function () {
  'use strict';

  const D = window.QDATA;
  const QMap = window.QMap;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const app = $('#app');

  const STORE_PREFIX = 'quickukm.';
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(STORE_PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    }
  };

  const TABS = ['home', 'routes', 'timetable', 'saved', 'more'];
  const SCREENS = {
    home: 'screen-map', routes: 'screen-routes', timetable: 'screen-timetable',
    saved: 'screen-saved', more: 'screen-more', planner: 'screen-planner',
    route: 'screen-route', trip: 'screen-map'
  };
  const ROUTE_TAGS = {
    A: ['hostel', 'faculty'], B: ['hostel', 'faculty'],
    C: ['hostel', 'faculty'], D: ['external', 'faculty']
  };
  const ROUTE_SHORT = { A: 'Fakulti', B: 'Main Gate', C: 'Ring', D: 'KTM Link' };

  const todayKey = () => {
    const d = new Date().getDay();
    return d === 0 ? 'sun' : d === 6 ? 'sat' : 'weekday';
  };

  const S = {
    view: 'home',
    prevView: 'home',
    plannerReturn: 'home',
    tripReturn: 'planner',
    returnView: 'home',
    routeFilter: 'all',
    selectedRoute: 'A',
    day: todayKey(),
    ttRoute: 'A',
    pickerMode: 'from',
    planner: { from: 'ktho', to: 'ftsm', results: null },
    favourites: store.get('favourites', JSON.parse(JSON.stringify(D.defaultFavourites))),
    savedStops: store.get('savedStops', D.defaultSavedStops.slice()),
    settings: Object.assign({ alerts: true, service: true, sound: false }, store.get('settings', {})),
    notifications: store.get('notifications', JSON.parse(JSON.stringify(D.seedNotifications))),
    trip: null,
    tripAlertTimer: 0,
    pushTimer: 0,
    toastTimer: 0
  };

  /* ------------------------------------------------------------
     small helpers
     ------------------------------------------------------------ */
  function esc(str) {
    return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function icon(id, cls) {
    return '<svg class="icon ' + (cls || '') + '"><use href="#' + id + '"/></svg>';
  }
  function etaLabel(seconds) {
    if (seconds === null || seconds === undefined) return '—';
    if (seconds < 35) return 'Now';
    return Math.max(1, Math.round(seconds / 60)) + ' min';
  }
  function etaMin(seconds) {
    return Math.max(1, Math.round((seconds || 0) / 60));
  }
  function walkMins(distUnits) {
    return Math.max(1, Math.round((distUnits * 1.9) / 75));
  }
  function stopDistance(stop) {
    return Math.hypot(stop.x - D.user.x, stop.y - D.user.y);
  }
  function shade(hex, percent) {
    const n = parseInt(hex.replace('#', ''), 16);
    const f = 1 + percent / 100;
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function routeVars(route) {
    return '--rc:' + route.color + ';--rc-soft:' + route.soft + ';--rc-dark:' + shade(route.color, -24);
  }
  function routePill(route, cls) {
    return '<span class="route-pill ' + (cls || '') + '" style="background:' + route.color + '">' + route.id + '</span>';
  }
  function miniRoutes(stopId) {
    return D.helpers.routesAtStop(stopId)
      .map(r => '<span class="mini-route" style="background:' + r.color + '">' + r.id + '</span>')
      .join('');
  }
  function planTimeLabel() {
    const d = new Date();
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function stopLine(stopId) {
    const stop = D.helpers.stop(stopId);
    return stop ? stop.short : '—';
  }

  /* ------------------------------------------------------------
     navigation
     ------------------------------------------------------------ */
  function go(view, opts) {
    opts = opts || {};
    if (S.trip && view !== 'trip') clearTrip();
    if (S.view === view && !opts.force) return;
    S.prevView = S.view;
    S.view = view;
    app.scrollTop = 0;
    app.dataset.view = view;

    $$('.screen').forEach(s => s.classList.remove('is-active'));
    const target = $('#' + SCREENS[view]);
    if (target) target.classList.add('is-active');

    $$('.tab').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.view === view || (view === 'trip' && tab.dataset.view === 'home'));
    });
    closeSheets();

    if (view === 'routes') renderRoutes();
    if (view === 'timetable') renderTimetable();
    if (view === 'saved') renderSaved();
    if (view === 'more') syncSettings();
    if (view === 'home') {
      $('#homeSheet').classList.remove('is-expanded');
      $('#btnSeeAll').textContent = 'See all';
      QMap.resetView();
    }
    if (view === 'planner') {
      syncPlannerFields();
      renderPlannerFavourites();
      renderPlannerResults();
      $('#plannerScroll').scrollTop = 0;
    }
    if (view === 'route') {
      renderRouteDetail();
      $('#screen-route .page-scroll').scrollTop = 0;
    }
  }

  function openPlanner(from, to, autoFind) {
    if (from) S.planner.from = from;
    if (to) S.planner.to = to;
    if (!S.planner.from || !S.planner.to) {
      S.planner.from = 'ktho'; S.planner.to = 'ftsm';
    }
    if (S.planner.from === S.planner.to) {
      S.planner.to = S.planner.from === 'ktho' ? 'ftsm' : 'ktho';
    }
    S.planner.results = null;
    S.plannerReturn = TABS.includes(S.view) ? S.view : 'home';
    go('planner');
    if (autoFind) setTimeout(() => runFind(true), 120);
  }

  /* ------------------------------------------------------------
     HOME — nearby stops + live buses
     ------------------------------------------------------------ */
  function renderNearby() {
    const nearest = D.stops
      .map(stop => ({ stop, dist: stopDistance(stop) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4);

    $('#nearbyStops').innerHTML = nearest.map(({ stop, dist }) => {
      const arrivals = QMap.arrivalsForStop(stop.id);
      const first = arrivals[0];
      return '<button class="stop-card" data-stop="' + stop.id + '">' +
        '<div class="stop-card__top">' +
          '<span class="stop-card__name">' + esc(stop.short) + '</span>' +
          '<span class="stop-card__walk">' + icon('i-walk') + walkMins(dist) + ' min</span>' +
        '</div>' +
        '<div class="stop-card__full">' + esc(stop.name) + '</div>' +
        '<div class="stop-card__routes">' + miniRoutes(stop.id) + '</div>' +
        '<div class="stop-card__eta"><span class="pulse-dot"></span>' +
          '<b data-stop-eta="' + stop.id + '">' + (first ? etaLabel(first.seconds) : '—') + '</b>' +
          '<em>' + (first ? '· ' + first.route.name : '') + '</em>' +
        '</div>' +
      '</button>';
    }).join('');

    $('#nearbyMeta').textContent = nearest.length + ' stops · ' + QMap.buses().length + ' buses on campus';
    $('#mapLegendText').textContent = QMap.buses().length + ' buses live';
  }

  function renderLiveBuses() {
    const rows = QMap.buses().map(bus => {
      const nextId = bus.nextStop ? bus.nextStop.id : bus.route.stops[0];
      const eta = QMap.nextArrival(bus.routeId, nextId);
      const target = bus.dir >= 0 ? bus.route.stops[bus.route.stops.length - 1] : bus.route.stops[0];
      return { bus, nextId, eta, target };
    }).filter(r => r.eta !== null).sort((a, b) => a.eta - b.eta).slice(0, 4);

    $('#liveBusList').innerHTML = rows.map(({ bus, nextId, eta, target }) => {
      return '<button class="bus-row" data-stop="' + nextId + '">' +
        routePill(bus.route) +
        '<div class="bus-row__body">' +
          '<strong>' + bus.route.name + ' · to ' + esc(stopLine(target)) + '</strong>' +
          '<small>Next stop: ' + esc(stopLine(nextId)) + ' · ' + bus.seats + '</small>' +
        '</div>' +
        '<span class="bus-row__eta" data-bus-eta="' + bus.id + '">' + etaLabel(eta) + '</span>' +
      '</button>';
    }).join('');
  }

  /* ------------------------------------------------------------
     ROUTES
     ------------------------------------------------------------ */
  function renderRoutes() {
    const list = D.routes.filter(route => {
      if (S.routeFilter === 'all') return true;
      return (ROUTE_TAGS[route.id] || []).includes(S.routeFilter);
    });

    $('#routesList').innerHTML = list.map(route => {
      const eta = QMap.nextArrival(route.id, route.stops[0]);
      const dots = route.stops.map((id, i) => {
        const end = i === 0 || i === route.stops.length - 1;
        return '<span class="mini-line__dot' + (end ? ' mini-line__dot--end' : '') + '" style="--rc:' + route.color + '"></span>' +
          (i < route.stops.length - 1 ? '<span class="mini-line__rail" style="--rc:' + route.color + '"></span>' : '');
      }).join('');

      return '<button class="route-card" data-route="' + route.id + '" style="' + routeVars(route) + '">' +
        '<div class="route-card__top">' +
          '<span class="route-badge" style="background:' + route.color + '">' + route.id + '</span>' +
          '<div class="route-card__title">' +
            '<strong>' + route.name + ' · ' + esc(route.title) + '</strong>' +
            '<span>' + esc(route.subtitle) + '</span>' +
          '</div>' +
          '<span class="route-card__eta" data-route-eta="' + route.id + '">' + etaLabel(eta) + '</span>' +
        '</div>' +
        '<p class="route-card__desc">Serves ' + route.stops.length + ' stops across campus</p>' +
        '<div class="mini-line">' + dots + '</div>' +
        '<div class="route-card__meta">' +
          '<span><b>' + route.stops.length + '</b> stops</span>' +
          '<span>Every <b>' + route.headway + '</b> min</span>' +
          '<span><b>' + D.service.weekday.first + '–' + D.service.weekday.last + '</b></span>' +
          '<span class="chev">' + icon('i-chev') + '</span>' +
        '</div>' +
      '</button>';
    }).join('');
  }

  function openRoute(id) {
    S.selectedRoute = id;
    S.returnView = 'routes';
    go('route');
  }

  function renderRouteDetail() {
    const route = D.helpers.route(S.selectedRoute) || D.routes[0];
    const first = D.helpers.stop(route.stops[0]);
    const last = D.helpers.stop(route.stops[route.stops.length - 1]);
    const hero = $('#routeHero');
    hero.style.background =
      'radial-gradient(340px 200px at 92% 0%, rgba(255,255,255,.26), transparent 68%), linear-gradient(145deg, ' +
      route.color + ' 0%, ' + shade(route.color, -26) + ' 100%)';
    $('#routeBadge').textContent = route.id;
    $('#routeTitle').textContent = route.title;
    $('#routeSubtitle').textContent = route.subtitle;
    $('#routeStats').innerHTML =
      '<div class="route-stat"><strong>' + route.stops.length + '</strong><span>STOPS</span></div>' +
      '<div class="route-stat"><strong>' + route.headway + ' min</strong><span>FREQUENCY</span></div>' +
      '<div class="route-stat"><strong>' + D.service.weekday.first + '–' + D.service.weekday.last + '</strong><span>SERVICE</span></div>';

    const next = QMap.nextArrival(route.id, first.id);
    const liveBusCount = QMap.buses().filter(b => b.routeId === route.id).length;
    $('#routeLive').innerHTML =
      '<span class="live-strip__icon">' + icon('i-bus') + '</span>' +
      '<div><strong>' + liveBusCount + ' buses running right now</strong>' +
      '<small>' + (next !== null ? 'Next at ' + esc(first.short) + ' in ' + etaLabel(next) : 'Next bus is on the way') + '</small></div>' +
      '<span class="live-chip">LIVE</span>';

    const timeline = route.stops.map((id, i) => {
      const stop = D.helpers.stop(id);
      const eta = QMap.nextArrival(route.id, id);
      const tag = i === 0 ? 'Start' : i === route.stops.length - 1 ? 'Terminus' : 'Stop ' + (i + 1);
      return '<div class="tl-row" data-stop="' + id + '">' +
        '<span class="tl-dot"></span>' +
        '<div class="tl-main"><strong>' + esc(stop.name) + '</strong><span>' + tag + ' · ' + esc(stop.zone) + '</span></div>' +
        '<div class="tl-eta"><strong>' + etaLabel(eta) + '</strong><span>next bus</span></div>' +
      '</div>';
    }).join('');
    $('#routeTimeline').innerHTML = timeline;
    $('#routeStopCount').textContent = route.stops.length + ' stops';
    $('#routeTimeline').style.setProperty('--rc', route.color);

    const saved = favouriteFor(first.id, last.id);
    const saveIcon = $('#saveRouteIcon');
    saveIcon.innerHTML = '<use href="' + (saved ? '#i-heart-fill' : '#i-heart') + '"/>';
    $('#btnSaveRoute').classList.toggle('is-saved', !!saved);
    $('#btnRideRoute').onclick = () => openPlanner(first.id, last.id, true);
  }

  function favouriteFor(from, to) {
    return S.favourites.find(f => f.from === from && f.to === to);
  }

  function toggleFavourite(from, to, alertOn) {
    const idx = S.favourites.findIndex(f => f.from === from && f.to === to);
    let added = false;
    if (idx >= 0) {
      S.favourites.splice(idx, 1);
    } else {
      S.favourites.push({ id: 'fav-' + from + '-' + to, from, to, alert: alertOn !== false });
      added = true;
    }
    store.set('favourites', S.favourites);
    renderSaved();
    return added;
  }

  /* ------------------------------------------------------------
     TIMETABLE
     ------------------------------------------------------------ */
  function renderTimetable() {
    const route = D.helpers.route(S.ttRoute) || D.routes[0];
    const service = D.service[S.day];
    const stop = D.helpers.stop(route.stops[0]);
    const departures = D.helpers.schedule(route.id, S.day);
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const isToday = S.day === todayKey();

    const dstr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#ttDate').textContent = isToday ? 'Today · ' + dstr : service.label + ' schedule';

    $('#daySeg').querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b.dataset.day === S.day));

    $('#ttRoutes').innerHTML = D.routes.map(r => {
      return '<button class="tt-route-chip' + (r.id === route.id ? ' is-active' : '') + '" data-tt-route="' + r.id + '" style="--rc:' + r.color + '">' +
        '<span class="route-pill" style="background:' + r.color + '">' + r.id + '</span>' + (ROUTE_SHORT[r.id] || r.title) +
      '</button>';
    }).join('');

    let startIdx = 0;
    let tomorrow = false;
    if (isToday) {
      startIdx = departures.findIndex(t => t >= nowMin);
      if (startIdx === -1) { startIdx = 0; tomorrow = true; }
    }

    const nextT = departures[startIdx] !== undefined ? departures[startIdx] : D.helpers.minutesFromHHMM(service.first);
    $('#ttNextTime').textContent = D.helpers.hhmm(nextT);
    $('#ttNextIn').textContent = tomorrow ? 'first bus tomorrow' : (isToday ? 'in ' + Math.max(0, nextT - nowMin) + ' min' : 'first departure');
    $('#ttNextFrom').textContent = 'from ' + stop.short;
    $('#ttNextLine').textContent = route.name;
    $('#ttHeadway').textContent = route.headway;
    $('#ttService').textContent = service.first + ' – ' + service.last;
    $('#ttStopLabel').textContent = 'from ' + stop.short;

    const rows = departures.slice(startIdx, startIdx + 6);
    $('#ttList').innerHTML = rows.map((t, i) => {
      const isNext = i === 0;
      const status = isNext ? (tomorrow ? 'First' : 'Next') : 'Scheduled';
      const terminus = D.helpers.stop(route.stops[route.stops.length - 1]);
      return '<div class="tt-row' + (isNext ? ' is-next' : '') + '">' +
        '<span class="tt-time">' + D.helpers.hhmm(t) + '</span>' +
        '<div class="tt-row__body"><strong>' + route.name + ' · towards ' + esc(terminus.short) + '</strong>' +
        '<span>' + (tomorrow ? 'Tomorrow' : service.label) + ' · departs ' + esc(stop.short) + '</span></div>' +
        '<span class="tt-status' + (isNext ? ' tt-status--next' : '') + '">' + status + '</span>' +
      '</div>';
    }).join('');

    if (!rows.length) {
      $('#ttList').innerHTML = '<div class="tt-row"><div class="tt-row__body"><strong>No departures today</strong><span>Service resumes tomorrow at ' + service.first + '</span></div></div>';
    }
  }

  /* ------------------------------------------------------------
     SAVED
     ------------------------------------------------------------ */
  function renderSaved() {
    const favs = S.favourites;
    const stops = S.savedStops;

    $('#savedMeta').textContent = favs.length + ' route' + (favs.length === 1 ? '' : 's') + ' · ' + stops.length + ' stop' + (stops.length === 1 ? '' : 's');

    $('#savedRoutes').innerHTML = favs.map(fav => {
      const from = D.helpers.stop(fav.from);
      const to = D.helpers.stop(fav.to);
      if (!from || !to) return '';
      const route = bestDirectRoute(fav.from, fav.to) || D.helpers.routesAtStop(fav.from)[0];
      const eta = route ? QMap.nextArrival(route.id, fav.from) : null;
      return '<div class="saved-route" data-fav="' + fav.id + '" data-from="' + fav.from + '" data-to="' + fav.to + '" role="button" tabindex="0">' +
        '<div class="saved-route__top">' +
          routePill(route || D.routes[0]) +
          '<div class="saved-route__title">' +
            '<strong>' + esc(from.short) + ' → ' + esc(to.short) + '</strong>' +
            '<span>' + esc(from.name) + ' → ' + esc(to.name) + '</span>' +
          '</div>' +
          '<label class="switch" aria-label="Arrival alerts">' +
            '<input type="checkbox" data-fav-alert="' + fav.id + '"' + (fav.alert ? ' checked' : '') + '><span></span>' +
          '</label>' +
        '</div>' +
        '<div class="saved-route__bottom">' +
          '<span class="next-pill" data-fav-eta="' + fav.id + '">Next ' + etaLabel(eta) + '</span>' +
          '<div class="saved-route__actions">' +
            '<button class="link-btn" data-fav-remove="' + fav.id + '">Remove</button>' +
            '<span class="chev">' + icon('i-chev') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    $('#savedStops').innerHTML = stops.map(id => {
      const stop = D.helpers.stop(id);
      if (!stop) return '';
      const arrivals = QMap.arrivalsForStop(id);
      const first = arrivals[0];
      return '<button class="saved-stop" data-stop="' + id + '">' +
        '<span class="saved-stop__pin">' + icon('i-pin') + '</span>' +
        '<div class="saved-stop__body"><strong>' + esc(stop.name) + '</strong>' +
          '<span>' + esc(stop.zone) + ' · ' + walkMins(stopDistance(stop)) + ' min walk</span></div>' +
        '<span class="saved-stop__eta" data-stop-eta="' + id + '">' + (first ? etaLabel(first.seconds) : '—') + '</span>' +
      '</button>';
    }).join('');

    const empty = !favs.length && !stops.length;
    $('#savedEmpty').hidden = !empty;
    if (empty) {
      $('#savedRoutes').innerHTML = '';
      $('#savedStops').innerHTML = '';
    }
  }

  function bestDirectRoute(from, to) {
    return D.routes.map(route => {
      const i = route.stops.indexOf(from);
      const j = route.stops.indexOf(to);
      return { route, span: (i >= 0 && j >= 0 && i !== j) ? Math.abs(i - j) : Infinity };
    }).filter(x => x.span !== Infinity).sort((a, b) => a.span - b.span)[0]?.route || null;
  }

  /* ------------------------------------------------------------
     PLANNER
     ------------------------------------------------------------ */
  function syncPlannerFields() {
    const from = D.helpers.stop(S.planner.from);
    const to = D.helpers.stop(S.planner.to);
    $('#fromValue').textContent = from ? from.name : 'Choose a stop';
    $('#toValue').textContent = to ? to.name : 'Choose a stop';
  }

  function renderPlannerFavourites() {
    const quick = S.favourites.slice(0, 3).map(f => {
      const from = D.helpers.stop(f.from);
      const to = D.helpers.stop(f.to);
      if (!from || !to) return '';
      return '<button class="quick-fav" data-quick-from="' + f.from + '" data-quick-to="' + f.to + '">' +
        icon('i-heart') + esc(from.short) + ' → ' + esc(to.short) +
      '</button>';
    }).join('');
    const extras = [
      '<button class="quick-fav" data-quick-from="ktho" data-quick-to="library">' + icon('i-pin') + 'Hostel → Library</button>',
      '<button class="quick-fav" data-quick-from="ktho" data-quick-to="ktm">' + icon('i-train') + 'Hostel → KTM</button>'
    ].join('');
    $('#plannerFavs').innerHTML = quick + extras;
  }

  function renderPlannerResults() {
    const wrap = $('#plannerResults');
    const tip = $('#plannerTip');
    if (tip) tip.hidden = !!S.planner.results;
    if (!S.planner.results) { wrap.innerHTML = ''; return; }
    if (!S.planner.results.length) {
      wrap.innerHTML = '<div class="result-empty"><strong>No direct campus bus</strong>' +
        '<p>These two stops are not on the same line. Try a trip via Pusanika, the central interchange.</p>' +
        '<button class="btn btn--soft btn--block" id="btnViaPusanika" style="margin-top:12px">Plan via Pusanika</button></div>';
      const btn = $('#btnViaPusanika');
      if (btn) btn.addEventListener('click', () => {
        S.planner.to = 'pusanika';
        syncPlannerFields();
        runFind(true);
      });
      return;
    }

    const from = D.helpers.stop(S.planner.from);
    const to = D.helpers.stop(S.planner.to);
    wrap.innerHTML = '<div class="results-head"><h2>' + S.planner.results.length + ' route' + (S.planner.results.length === 1 ? '' : 's') + ' found</h2>' +
      '<span>' + esc(from.short) + ' → ' + esc(to.short) + '</span></div>' +
      S.planner.results.map((opt, idx) => {
        const saved = !!favouriteFor(S.planner.from, S.planner.to);
        return '<div class="result-card" style="' + routeVars(opt.route) + '" data-result-index="' + idx + '">' +
          '<div class="result-card__top">' +
            '<span class="result-tag' + (idx === 0 ? '' : ' result-tag--alt') + '">' + opt.tag + '</span>' +
            '<span class="result-total">' + opt.totalMin + '<small>min</small></span>' +
          '</div>' +
          '<div class="legs">' + opt.legs.map(legHTML).join('') + '</div>' +
          '<div class="result-card__foot">' +
            '<span>Next bus <b>' + opt.waitMin + ' min</b> · ' + opt.stops + ' stops</span>' +
            '<div class="result-card__actions">' +
              '<button class="heart-btn' + (saved ? ' is-saved' : '') + '" data-save-result="' + idx + '" aria-label="Save this route">' +
                icon(saved ? 'i-heart-fill' : 'i-heart') + '</button>' +
              '<button class="btn btn--primary btn--sm" data-start-result="' + idx + '">Start</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

    $$('[data-start-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = S.planner.results[Number(btn.dataset.startResult)];
        if (opt) startTrip(opt.route.id, S.planner.from, S.planner.to);
      });
    });
    $$('[data-save-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        const added = toggleFavourite(S.planner.from, S.planner.to, true);
        toast(added ? 'Route saved — arrival alerts are on' : 'Removed from saved routes');
        renderPlannerResults();
      });
    });
  }

  function legHTML(leg) {
    if (leg.type === 'bus') {
      return '<div class="leg leg--bus" style="--rc:' + leg.route.color + ';--rc-soft:' + leg.route.soft + '">' +
        '<span class="route-pill" style="background:' + leg.route.color + '">' + leg.route.id + '</span>' +
        '<span>' + leg.label + '</span><em>' + leg.min + ' min</em></div>';
    }
    const iconName = leg.type === 'transfer' ? 'i-swap' : 'i-walk';
    return '<div class="leg leg--' + leg.type + '">' +
      '<span class="leg__icon">' + icon(iconName) + '</span>' +
      '<span>' + leg.label + '</span><em>' + leg.min + ' min</em></div>';
  }

  function runFind(scroll) {
    const fromId = S.planner.from;
    const toId = S.planner.to;
    if (fromId === toId) {
      toast('Choose two different stops');
      return;
    }
    const from = D.helpers.stop(fromId);
    const to = D.helpers.stop(toId);
    if (!from || !to) return;

    const walkTo = walkMins(stopDistance(from));
    const options = [];

    D.routes.forEach(route => {
      const i = route.stops.indexOf(fromId);
      const j = route.stops.indexOf(toId);
      if (i < 0 || j < 0 || i === j) return;
      const eta = QMap.nextArrival(route.id, fromId);
      const waitMin = eta === null ? 5 : Math.max(1, Math.round(eta / 60));
      const stops = Math.abs(i - j);
      const rideMin = Math.max(3, Math.round(stops * 1.4));
      const totalMin = walkTo + waitMin + rideMin + 2;
      options.push({
        route, stops, waitMin, rideMin, totalMin,
        legs: [
          { type: 'walk', label: 'Walk to <strong>' + esc(from.short) + '</strong>', min: walkTo },
          { type: 'bus', route, label: 'Ride <strong>' + stops + ' stops</strong> to <strong>' + esc(to.short) + '</strong>', min: rideMin },
          { type: 'walk', label: 'Walk to <strong>' + esc(to.short) + '</strong>', min: 2 }
        ]
      });
    });

    options.sort((a, b) => a.totalMin - b.totalMin);
    const top = options.slice(0, 2);
    const minStops = Math.min(...top.map(o => o.stops), Infinity);
    top.forEach((opt, idx) => {
      if (idx === 0) opt.tag = 'Fastest';
      else if (opt.stops < top[0].stops) opt.tag = 'Fewer stops';
      else opt.tag = 'Direct';
    });

    S.planner.results = top;
    renderPlannerResults();

  }

  function openPicker(mode) {
    S.pickerMode = mode;
    $('#pickerTitle').textContent = mode === 'from' ? 'Choose a starting point' : 'Choose a destination';
    $('#pickerSearch').value = '';
    renderPickerList('');
    openSheet('pickerSheet');
    setTimeout(() => $('#pickerSearch').focus(), 320);
  }

  function renderPickerList(query) {
    const q = query.trim().toLowerCase();
    const list = D.stops
      .filter(s => !q || (s.name + ' ' + s.short + ' ' + s.zone).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    $('#pickerList').innerHTML = list.map(stop => {
      return '<button class="picker-item" data-pick="' + stop.id + '">' +
        '<span class="picker-item__pin">' + icon('i-pin') + '</span>' +
        '<span class="picker-item__body"><strong>' + esc(stop.name) + '</strong>' +
          '<span>' + esc(stop.short) + ' · ' + esc(stop.zone) + '</span></span>' +
        '<span class="picker-item__routes">' + miniRoutes(stop.id) + '</span>' +
      '</button>';
    }).join('') || '<div class="tt-row"><div class="tt-row__body"><strong>No stops found</strong><span>Try another name</span></div></div>';
  }

  /* ------------------------------------------------------------
     LIVE TRIP
     ------------------------------------------------------------ */
  function startTrip(routeId, fromId, toId) {
    const route = D.helpers.route(routeId);
    const from = D.helpers.stop(fromId);
    const to = D.helpers.stop(toId);
    if (!route || !from || !to) return;

    clearTrip();
    const fromIdx = route.stops.indexOf(fromId);
    const toIdx = route.stops.indexOf(toId);
    const stopCount = Math.abs(toIdx - fromIdx);
    S.trip = {
      routeId, fromId, toId,
      fromIdx, toIdx,
      dir: toIdx >= fromIdx ? 1 : -1,
      stopCount,
      rideMin: Math.max(3, Math.round(stopCount * 1.4)),
      demoMsPerMin: 8000,
      startedAt: Date.now(),
      alerted: false
    };
    S.tripReturn = TABS.includes(S.view) ? S.view : (S.view === 'planner' ? 'planner' : 'home');

    app.scrollTop = 0;
    app.dataset.view = 'trip';
    S.view = 'trip';
    $$('.screen').forEach(s => s.classList.remove('is-active'));
    $('#screen-map').classList.add('is-active');
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === 'home'));
    closeSheets();

    $('#tripBadge').textContent = route.id;
    $('#tripBadge').style.background = route.color;
    $('#tripTitle').textContent = from.short + ' → ' + to.short;
    $('#tripLine').textContent = route.name + ' · ' + route.title;
    $('#tripTopSub').textContent = route.name + ' · ' + from.short + ' → ' + to.short;
    $('#tripBoard').textContent = from.short;
    $('#tripExit').textContent = to.short;
    $('#tripDest').textContent = to.short;
    $('#tripStopsLeft').textContent = stopCount + ' stops to go';
    $('#tripProgressBar').style.width = '4%';
    $('#tripEta').textContent = '—';
    updateTripUI();

    QMap.setTrip({ routeId, origin: fromId, destination: toId });

    clearTimeout(S.tripAlertTimer);
    S.tripAlertTimer = setTimeout(() => {
      if (!S.trip || S.trip.alerted) return;
      if (!$('#tripAlertToggle').checked || !S.settings.alerts) return;
      const currentRoute = D.helpers.route(S.trip.routeId);
      const destination = D.helpers.stop(S.trip.toId);
      S.trip.alerted = true;
      pushNotification(
        'Arrival reminder · ' + currentRoute.name,
        currentRoute.name + ' is 2 stops away from ' + destination.short + '. Get ready to get off.',
        'arrival'
      );
      if (S.settings.sound && navigator.vibrate) navigator.vibrate([90, 60, 90]);
    }, 9000);
  }

  function updateTripUI() {
    if (!S.trip) return;
    const trip = S.trip;
    const route = D.helpers.route(trip.routeId);
    const to = D.helpers.stop(trip.toId);
    const elapsedSec = (Date.now() - trip.startedAt) / 1000;
    const elapsedMin = elapsedSec / (trip.demoMsPerMin / 1000);
    const remaining = Math.max(0, trip.rideMin - elapsedMin);
    const mins = Math.max(1, Math.ceil(remaining));
    $('#tripEta').textContent = mins;
    $('#tripEtaNote').textContent = remaining <= 1 ? 'Arriving now — get ready' : 'Bus is on the way';

    const progressFrac = Math.max(0.04, Math.min(0.98, 1 - remaining / trip.rideMin));
    const travelled = Math.min(trip.stopCount, Math.floor(progressFrac * trip.stopCount));
    const nextOffset = Math.min(trip.stopCount, travelled + 1);
    const nextIdx = trip.fromIdx + trip.dir * nextOffset;
    const nextStopId = route.stops[nextIdx] || route.stops[trip.toIdx];
    const next = D.helpers.stop(nextStopId);
    $('#tripNextName').textContent = next ? next.name : to.name;
    $('#tripNextEta').textContent = Math.max(1, Math.round(remaining / Math.max(1, trip.stopCount - travelled))) + ' min';
    $('#tripProgressBar').style.width = Math.round(progressFrac * 100) + '%';
    $('#tripStopsLeft').textContent = Math.max(1, trip.stopCount - travelled) + ' stops to go';

    const firstStop = D.helpers.stop(route.stops[0]);
    $('#tripTopSub').textContent = route.name + ' · ' + firstStop.short + ' → ' + to.short;
  }

  function clearTrip() {
    clearTimeout(S.tripAlertTimer);
    S.tripAlertTimer = 0;
    S.trip = null;
    QMap.setTrip(null);
  }

  function endTrip() {
    const back = S.tripReturn || 'home';
    clearTrip();
    go(back, { force: true });
  }

  /* ------------------------------------------------------------
     STOP SHEET
     ------------------------------------------------------------ */
  function openStopSheet(stopId) {
    if (S.view === 'trip') return;
    const stop = D.helpers.stop(stopId);
    if (!stop) return;
    const arrivals = QMap.arrivalsForStop(stopId);
    const dist = Math.round(stopDistance(stop) * 1.9 / 10) * 10;
    const walk = walkMins(stopDistance(stop));
    const saved = S.savedStops.includes(stopId);

    $('#stopSheetBody').innerHTML =
      '<div class="stop-sheet__head">' +
        '<div class="stop-sheet__kicker">Campus stop</div>' +
        '<div class="sheet-head" style="padding:0;margin-top:0">' +
          '<div><h2>' + esc(stop.name) + '</h2><p>' + esc(stop.note) + '</p></div>' +
          '<button class="icon-btn icon-btn--plain" data-close-sheet="stopSheet" aria-label="Close stop details">' + icon('i-close') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="stop-sheet__scroll">' +
        '<div class="stop-sheet__stats">' +
          '<div class="stop-stat"><strong>' + walk + ' min</strong><span>WALK FROM YOU</span></div>' +
          '<div class="stop-stat"><strong>' + dist + ' m</strong><span>DISTANCE</span></div>' +
          '<div class="stop-stat"><strong>' + arrivals.length + '</strong><span>BUS LINES</span></div>' +
        '</div>' +
        '<div class="stop-sheet__label">Next arrivals</div>' +
        (arrivals.length ? arrivals.map(a =>
          '<div class="arrival-row">' + routePill(a.route) +
            '<div class="arrival-row__body"><strong>' + a.route.name + ' · ' + esc(a.route.title) + '</strong>' +
              '<span>towards ' + esc(stopLine(stopId === a.route.stops[0] ? a.route.stops[a.route.stops.length - 1] : a.route.stops[0])) + '</span></div>' +
            '<span class="arrival-row__eta">' + etaLabel(a.seconds) + '</span>' +
          '</div>'
        ).join('') : '<p class="fine-print">No buses scheduled right now.</p>') +
        '<div class="stop-sheet__label">At this stop</div>' +
        '<div class="stop-facilities">' + stop.facilities.map(f => '<span class="facility-chip">' + esc(f) + '</span>').join('') + '</div>' +
        '<div class="stop-sheet__actions">' +
          '<button class="btn btn--ghost" id="stopSaveToggle">' + (saved ? 'Saved stop' : 'Save stop') + '</button>' +
          '<button class="btn btn--primary" id="stopSetDest">Set as destination</button>' +
        '</div>' +
      '</div>';

    openSheet('stopSheet');

    $$('[data-close-sheet="stopSheet"]', $('#stopSheet')).forEach(btn => btn.addEventListener('click', closeSheets));

    $('#stopSetDest').addEventListener('click', () => {
      let from = S.planner.from;
      if (from === stopId) from = stopId === 'ktho' ? 'pusanika' : 'ktho';
      closeSheets();
      openPlanner(from, stopId, true);
    });

    $('#stopSaveToggle').addEventListener('click', () => {
      const i = S.savedStops.indexOf(stopId);
      if (i >= 0) { S.savedStops.splice(i, 1); toast('Stop removed from saved'); }
      else { S.savedStops.push(stopId); toast('Stop saved'); }
      store.set('savedStops', S.savedStops);
      renderSaved();
      $('#stopSaveToggle').textContent = S.savedStops.includes(stopId) ? 'Saved stop' : 'Save stop';
    });
  }

  /* ------------------------------------------------------------
     NOTIFICATIONS
     ------------------------------------------------------------ */
  function renderNotifications() {
    const unread = S.notifications.filter(n => n.unread).length;
    $('#notifMeta').textContent = unread ? unread + ' unread' : 'All caught up';
    $('#notifList').innerHTML = S.notifications.length ? S.notifications.map(n => {
      const iconName = n.type === 'arrival' ? 'i-bus' : n.type === 'service' ? 'i-alert' : 'i-info';
      return '<div class="notif-item' + (n.unread ? ' is-unread' : '') + '">' +
        '<span class="notif-item__icon notif-item__icon--' + n.type + '">' + icon(iconName) + '</span>' +
        '<div class="notif-item__body"><strong>' + esc(n.title) + '</strong><p>' + esc(n.body) + '</p><span class="notif-item__time">' + esc(n.time) + '</span></div>' +
        (n.unread ? '<span class="notif-item__unread"></span>' : '') +
      '</div>';
    }).join('') : '<div class="result-empty"><strong>You\'re all caught up</strong><p>Arrival reminders and service updates will appear here.</p></div>';
    updateNotifBadge();
  }

  function updateNotifBadge() {
    const unread = S.notifications.filter(n => n.unread).length;
    $('#notifDot').classList.toggle('is-empty', unread === 0);
  }

  function openNotifications() {
    renderNotifications();
    openSheet('notifSheet');
    S.notifications.forEach(n => { n.unread = false; });
    store.set('notifications', S.notifications);
    updateNotifBadge();
    $('#notifMeta').textContent = S.notifications.length ? 'All caught up' : 'No notifications';
    $$('.notif-item__unread').forEach(dot => dot.remove());
    $$('.notif-item').forEach(item => item.classList.remove('is-unread'));
  }

  function pushNotification(title, body, type) {
    const note = { id: 'n-' + Date.now(), type: type || 'arrival', title, body, time: 'Just now', unread: true };
    S.notifications.unshift(note);
    S.notifications = S.notifications.slice(0, 20);
    store.set('notifications', S.notifications);
    if ($('#notifSheet').classList.contains('is-open')) {
      renderNotifications();
    } else {
      updateNotifBadge();
    }
    $('#pushTitle').textContent = title;
    $('#pushBody').textContent = body;
    $('#pushToast').classList.add('is-show');
    clearTimeout(S.pushTimer);
    S.pushTimer = setTimeout(() => $('#pushToast').classList.remove('is-show'), 6200);
  }

  /* ------------------------------------------------------------
     SHEETS / TOAST
     ------------------------------------------------------------ */
  function openSheet(id) {
    closeSheets();
    $('#sheetBackdrop').classList.add('is-open');
    const sheet = $('#' + id);
    if (sheet) sheet.classList.add('is-open');
  }
  function closeSheets() {
    $('#sheetBackdrop').classList.remove('is-open');
    $$('.bottom-sheet').forEach(s => s.classList.remove('is-open'));
  }
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-show');
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(() => el.classList.remove('is-show'), 2400);
  }

  /* ------------------------------------------------------------
     LIVE DATA REFRESH (every second)
     ------------------------------------------------------------ */
  function updateLive() {
    if (S.view === 'trip') updateTripUI();

    $$('[data-stop-eta]').forEach(el => {
      const arr = QMap.arrivalsForStop(el.dataset.stopEta);
      el.textContent = arr[0] ? etaLabel(arr[0].seconds) : '—';
    });
    $$('[data-bus-eta]').forEach(el => {
      const bus = QMap.buses().find(b => b.id === el.dataset.busEta);
      if (!bus || !bus.nextStop) return;
      const sec = QMap.nextArrival(bus.routeId, bus.nextStop.id);
      el.textContent = etaLabel(sec);
    });
    $$('[data-route-eta]').forEach(el => {
      const route = D.helpers.route(el.dataset.routeEta);
      if (!route) return;
      el.textContent = etaLabel(QMap.nextArrival(route.id, route.stops[0]));
    });
    $$('[data-fav-eta]').forEach(el => {
      const fav = S.favourites.find(f => f.id === el.dataset.favEta);
      if (!fav) return;
      const route = bestDirectRoute(fav.from, fav.to);
      el.textContent = 'Next ' + (route ? etaLabel(QMap.nextArrival(route.id, fav.from)) : '—');
    });
    if (S.view === 'routes' && $('#routesList').children.length) {
      // route ETA spans already handled above
    }
  }

  /* ------------------------------------------------------------
     SETTINGS / MORE
     ------------------------------------------------------------ */
  function syncSettings() {
    $('#settingAlerts').checked = !!S.settings.alerts;
    $('#settingService').checked = !!S.settings.service;
    $('#settingSound').checked = !!S.settings.sound;
  }
  function saveSettings() {
    store.set('settings', S.settings);
  }

  /* ------------------------------------------------------------
     EVENT BINDING
     ------------------------------------------------------------ */
  function bind() {
    $$('.tab').forEach(tab => tab.addEventListener('click', () => go(tab.dataset.view)));

    /* map header + controls */
    $('#btnNotif').addEventListener('click', openNotifications);
    $('#btnPlan').addEventListener('click', () => openPlanner(S.planner.from, S.planner.to, false));
    $('#modeBus').addEventListener('click', () => go('home'));
    $('#modeTimetable').addEventListener('click', () => go('timetable'));
    $('#btnLocate').addEventListener('click', () => QMap.locate());
    $('#btnZoomIn').addEventListener('click', () => QMap.zoomIn());
    $('#btnZoomOut').addEventListener('click', () => QMap.zoomOut());

    $('#sheetGrab').addEventListener('click', toggleHomeSheet);
    $('#btnSeeAll').addEventListener('click', toggleHomeSheet);

    $('#nearbyStops').addEventListener('click', e => {
      const card = e.target.closest('[data-stop]');
      if (card) openStopSheet(card.dataset.stop);
    });
    $('#liveBusList').addEventListener('click', e => {
      const row = e.target.closest('[data-stop]');
      if (row) openStopSheet(row.dataset.stop);
    });

    /* trip */
    $('#btnEndTrip').addEventListener('click', endTrip);
    $('#btnCloseTrip').addEventListener('click', endTrip);
    $('#btnTripBack').addEventListener('click', endTrip);
    $('#tripAlertToggle').addEventListener('change', e => {
      if (e.target.checked && S.trip && !S.trip.alerted) {
        clearTimeout(S.tripAlertTimer);
        S.tripAlertTimer = setTimeout(() => {
          if (!S.trip || S.trip.alerted) return;
          S.trip.alerted = true;
          pushNotification('Arrival reminder · ' + D.helpers.route(S.trip.routeId).name,
            'Your stop is coming up. Get ready to get off.', 'arrival');
        }, 5000);
      } else {
        clearTimeout(S.tripAlertTimer);
      }
    });

    /* routes */
    $('#routeFilters').addEventListener('click', e => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      S.routeFilter = btn.dataset.filter;
      $$('#routeFilters .chip').forEach(c => c.classList.toggle('is-active', c === btn));
      renderRoutes();
    });
    $('#routesList').addEventListener('click', e => {
      const card = e.target.closest('[data-route]');
      if (card) openRoute(card.dataset.route);
    });
    $('#routeBack').addEventListener('click', () => go('routes'));
    $('#btnSaveRoute').addEventListener('click', () => {
      const route = D.helpers.route(S.selectedRoute);
      const added = toggleFavourite(route.stops[0], route.stops[route.stops.length - 1], true);
      toast(added ? 'Line ' + route.id + ' saved to favourites' : 'Removed from saved routes');
      renderRouteDetail();
    });
    $('#routeTimeline').addEventListener('click', e => {
      const row = e.target.closest('[data-stop]');
      if (row) openStopSheet(row.dataset.stop);
    });

    /* timetable */
    $('#daySeg').addEventListener('click', e => {
      const btn = e.target.closest('[data-day]');
      if (!btn) return;
      S.day = btn.dataset.day;
      renderTimetable();
    });
    $('#ttRoutes').addEventListener('click', e => {
      const btn = e.target.closest('[data-tt-route]');
      if (!btn) return;
      S.ttRoute = btn.dataset.ttRoute;
      renderTimetable();
    });

    /* saved */
    $('#savedRoutes').addEventListener('click', e => {
      if (e.target.closest('.switch') || e.target.closest('[data-fav-remove]')) return;
      const card = e.target.closest('[data-fav]');
      if (card) openPlanner(card.dataset.from, card.dataset.to, true);
    });
    $('#savedRoutes').addEventListener('change', e => {
      const input = e.target.closest('[data-fav-alert]');
      if (!input) return;
      const fav = S.favourites.find(f => f.id === input.dataset.favAlert);
      if (fav) { fav.alert = input.checked; store.set('favourites', S.favourites); toast(input.checked ? 'Arrival alerts on' : 'Arrival alerts off'); }
    });
    $('#savedRoutes').addEventListener('click', e => {
      const remove = e.target.closest('[data-fav-remove]');
      if (!remove) return;
      const idx = S.favourites.findIndex(f => f.id === remove.dataset.favRemove);
      if (idx >= 0) {
        S.favourites.splice(idx, 1);
        store.set('favourites', S.favourites);
        renderSaved();
        toast('Route removed');
      }
    });
    $('#savedStops').addEventListener('click', e => {
      const card = e.target.closest('[data-stop]');
      if (card) openStopSheet(card.dataset.stop);
    });
    $('#btnAddFav').addEventListener('click', () => {
      toast('Find a trip, then tap the heart to save it');
      openPlanner(S.planner.from, S.planner.to, false);
    });
    $('#btnSavedPlan').addEventListener('click', () => openPlanner('ktho', 'ftsm', false));

    /* more */
    $('#settingAlerts').addEventListener('change', e => { S.settings.alerts = e.target.checked; saveSettings(); });
    $('#settingService').addEventListener('change', e => { S.settings.service = e.target.checked; saveSettings(); });
    $('#settingSound').addEventListener('change', e => { S.settings.sound = e.target.checked; saveSettings(); });
    $('#btnTestAlert').addEventListener('click', () => {
      pushNotification('Test alert · Line A', 'Line A is 2 stops away from KTHO. This is how an arrival reminder will look.', 'arrival');
      toast('Test alert sent');
    });

    /* planner */
    $('#plannerBack').addEventListener('click', () => go(S.plannerReturn || 'home'));
    $('#fromField').addEventListener('click', () => openPicker('from'));
    $('#toField').addEventListener('click', () => openPicker('to'));
    $('#btnSwap').addEventListener('click', () => {
      const from = S.planner.from;
      S.planner.from = S.planner.to;
      S.planner.to = from;
      S.planner.results = null;
      syncPlannerFields();
      renderPlannerResults();
      const btn = $('#btnSwap');
      btn.classList.toggle('is-swapped');
      setTimeout(() => btn.classList.remove('is-swapped'), 260);
    });
    $('#btnFind').addEventListener('click', () => runFind(true));
    $('#plannerFavs').addEventListener('click', e => {
      const btn = e.target.closest('[data-quick-from]');
      if (!btn) return;
      S.planner.from = btn.dataset.quickFrom;
      S.planner.to = btn.dataset.quickTo;
      S.planner.results = null;
      syncPlannerFields();
      runFind(true);
    });

    $('#pickerSearch').addEventListener('input', e => renderPickerList(e.target.value));
    $('#pickerList').addEventListener('click', e => {
      const item = e.target.closest('[data-pick]');
      if (!item) return;
      const id = item.dataset.pick;
      if (S.pickerMode === 'from') S.planner.from = id;
      else S.planner.to = id;
      S.planner.results = null;
      syncPlannerFields();
      renderPlannerResults();
      closeSheets();
    });

    /* sheets */
    $('#sheetBackdrop').addEventListener('click', closeSheets);
    $$('[data-close-sheet]').forEach(btn => btn.addEventListener('click', closeSheets));

    /* push toast */
    $('#pushToast').addEventListener('click', () => {
      $('#pushToast').classList.remove('is-show');
      openNotifications();
    });

    /* notifications */
    $('#btnClearNotif').addEventListener('click', () => {
      S.notifications = [];
      store.set('notifications', S.notifications);
      renderNotifications();
      toast('Notifications cleared');
    });

    /* escape key for desktop */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if ($('.bottom-sheet.is-open')) closeSheets();
        else if (S.view === 'trip') endTrip();
        else if (S.view === 'planner') go(S.plannerReturn || 'home');
        else if (S.view === 'route') go('routes');
      }
    });
  }

  function toggleHomeSheet() {
    const sheet = $('#homeSheet');
    const expanded = sheet.classList.toggle('is-expanded');
    $('#btnSeeAll').textContent = expanded ? 'Show less' : 'See all';
    if (expanded) {
      const mapArea = $('#screen-map').clientHeight;
      setTimeout(() => { $('#liveBusList').scrollTop = 0; }, 350);
    }
  }

  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */
  function boot() {
    QMap.init({
      onStopTap: openStopSheet,
      onBusTap: bus => {
        if (S.view === 'trip') return;
        if (bus.nextStop) openStopSheet(bus.nextStop.id);
      }
    });

    bind();
    renderNearby();
    renderLiveBuses();
    renderRoutes();
    renderTimetable();
    renderSaved();
    renderNotifications();
    syncSettings();
    syncPlannerFields();
    renderPlannerFavourites();
    renderPlannerResults();

    QMap.setTickCallback(() => { /* positions are updated inside the map loop */ });

    setInterval(updateLive, 1000);

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

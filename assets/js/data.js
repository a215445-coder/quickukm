/* ============================================================
   QuickUKM — prototype data
   All locations are hand-placed for a stylised UKM Bangi campus
   map. Bus positions / ETAs are simulated, not live UKM data.
   ============================================================ */
window.QDATA = (function () {
  'use strict';

  const stops = [
    {
      id: 'ktho', name: 'Kolej Tun Hussein Onn', short: 'KTHO',
      x: 620, y: 880, zone: 'Kolej Kediaman',
      note: 'Hostel cluster · east campus',
      facilities: ['Hostel', 'Cafeteria', 'Sports court']
    },
    {
      id: 'kpz', name: 'Kolej Pendeta Za\'ba', short: 'KPZ',
      x: 650, y: 740, zone: 'Kolej Kediaman',
      note: 'Hostel cluster · east campus',
      facilities: ['Hostel', 'Mini market']
    },
    {
      id: 'kiz', name: 'Kolej Ibu Zain', short: 'KIZ',
      x: 680, y: 620, zone: 'Kolej Kediaman',
      note: 'Hostel cluster · east campus',
      facilities: ['Hostel', 'Cafeteria']
    },
    {
      id: 'keris', name: 'Kolej Keris Mas', short: 'KKM',
      x: 600, y: 480, zone: 'Kolej Kediaman',
      note: 'Hostel cluster · near Tasik UKM',
      facilities: ['Hostel', 'Laundry']
    },
    {
      id: 'pusanika', name: 'Pusanika', short: 'Pusanika',
      x: 400, y: 700, zone: 'Student Centre',
      note: 'Student centre · central campus',
      facilities: ['Food court', 'Banks', 'Post office']
    },
    {
      id: 'library', name: 'Perpustakaan Tun Seri Lanang', short: 'Library',
      x: 380, y: 560, zone: 'Academic',
      note: 'Main library · central campus',
      facilities: ['Library', 'Study rooms', 'Café']
    },
    {
      id: 'fep', name: 'Fakulti Ekonomi & Pengurusan', short: 'FEP',
      x: 388, y: 600, zone: 'Faculty',
      note: 'Faculty of Economics · central',
      facilities: ['Lecture halls', 'Cafeteria']
    },
    {
      id: 'ftsm', name: 'Fakulti Teknologi & Sains Maklumat', short: 'FTSM',
      x: 250, y: 770, zone: 'Faculty',
      note: 'Faculty of IT · west campus',
      facilities: ['Labs', 'Lecture halls', 'Café']
    },
    {
      id: 'fst', name: 'Fakulti Sains & Teknologi', short: 'FST',
      x: 230, y: 860, zone: 'Faculty',
      note: 'Faculty of Science · west campus',
      facilities: ['Labs', 'Lecture halls']
    },
    {
      id: 'stadium', name: 'Stadium UKM', short: 'Stadium',
      x: 200, y: 990, zone: 'Sports',
      note: 'Sports complex · south campus',
      facilities: ['Track', 'Field', 'Gym']
    },
    {
      id: 'gate', name: 'Pintu Utama UKM', short: 'Main Gate',
      x: 170, y: 1150, zone: 'Entrance',
      note: 'Main entrance · Jalan Bangi',
      facilities: ['Guard house', 'Taxi stand']
    },
    {
      id: 'ktm', name: 'KTM Bangi', short: 'KTM Bangi',
      x: 110, y: 1185, zone: 'Connection',
      note: 'Commuter rail · outside campus',
      facilities: ['Train', 'Parking']
    },
    {
      id: 'canselori', name: 'Bangunan Canselori', short: 'Canselori',
      x: 250, y: 380, zone: 'Administration',
      note: 'Chancellor\'s office · north campus',
      facilities: ['Admin', 'Auditorium']
    },
    {
      id: 'dectar', name: 'DECTAR', short: 'DECTAR',
      x: 500, y: 675, zone: 'Event Hall',
      note: 'Convention hall · central campus',
      facilities: ['Hall', 'Events']
    }
  ];

  const routes = [
    {
      id: 'A',
      name: 'Line A',
      title: 'Kolej ↔ Fakulti',
      subtitle: 'Hostels to the faculty belt via the library',
      color: '#2563EB',
      soft: '#E8F0FF',
      text: '#1D4ED8',
      stops: ['ktho', 'kpz', 'kiz', 'keris', 'library', 'fep', 'pusanika', 'ftsm'],
      waypoints: [
        [620, 880], [650, 740], [680, 620], [600, 480], [520, 500],
        [380, 560], [388, 600], [400, 700], [320, 745], [250, 770]
      ],
      loop: false,
      speed: 5.2,
      buses: 2,
      headway: 10
    },
    {
      id: 'B',
      name: 'Line B',
      title: 'Kolej ↔ Pintu Utama',
      subtitle: 'Express from the hostels to the main gate',
      color: '#0E9F6E',
      soft: '#E6F7F0',
      text: '#047857',
      stops: ['ktho', 'kpz', 'dectar', 'pusanika', 'ftsm', 'fst', 'stadium', 'gate'],
      waypoints: [
        [620, 880], [650, 740], [570, 700], [500, 675], [430, 690],
        [400, 700], [320, 740], [250, 770], [230, 860], [200, 990],
        [215, 1060], [170, 1150]
      ],
      loop: false,
      speed: 5.6,
      buses: 2,
      headway: 12
    },
    {
      id: 'C',
      name: 'Line C',
      title: 'Campus Ring',
      subtitle: 'Full loop around Tasik UKM and the hostels',
      color: '#F59E0B',
      soft: '#FFF5E0',
      text: '#B45309',
      stops: ['gate', 'pusanika', 'fep', 'library', 'canselori', 'keris', 'kiz', 'kpz', 'ktho'],
      waypoints: [
        [170, 1150], [240, 1010], [300, 870], [360, 750], [400, 700],
        [388, 600], [380, 560], [330, 430], [250, 380], [330, 330],
        [430, 300], [520, 320], [570, 350], [610, 380], [620, 440], [600, 480], [620, 540],
        [660, 580], [680, 620], [670, 680], [650, 740], [640, 800],
        [620, 880], [560, 920], [500, 950], [440, 970], [380, 990],
        [300, 1010], [230, 1060], [170, 1150]
      ],
      loop: true,
      speed: 5.0,
      buses: 3,
      headway: 8
    },
    {
      id: 'D',
      name: 'Line D',
      title: 'KTM Bangi ↔ Library',
      subtitle: 'Connects the commuter station to central campus',
      color: '#7C3AED',
      soft: '#F1EBFF',
      text: '#6D28D9',
      stops: ['ktm', 'gate', 'stadium', 'fst', 'ftsm', 'pusanika', 'fep', 'library'],
      waypoints: [
        [110, 1185], [140, 1170], [170, 1150], [215, 1060], [200, 990],
        [230, 860], [250, 770], [320, 740], [400, 700], [388, 600], [380, 560]
      ],
      loop: false,
      speed: 5.4,
      buses: 2,
      headway: 20
    }
  ];

  /* Service hours + headways shown in the timetable screen */
  const service = {
    weekday: { first: '07:00', last: '19:00', label: 'Mon – Fri', headway: { A: 10, B: 12, C: 8, D: 20 } },
    sat:     { first: '08:00', last: '18:00', label: 'Saturday',  headway: { A: 15, B: 18, C: 12, D: 30 } },
    sun:     { first: '09:00', last: '17:00', label: 'Sunday',    headway: { A: 20, B: 25, C: 15, D: 40 } }
  };

  const user = { x: 661, y: 902, label: 'You are here' };

  const defaultFavourites = [
    { id: 'fav-1', from: 'ktho', to: 'ftsm', alert: true },
    { id: 'fav-2', from: 'ktho', to: 'library', alert: true }
  ];

  const defaultSavedStops = ['ktho', 'pusanika'];

  const seedNotifications = [
    {
      id: 'n1',
      type: 'arrival',
      title: 'Line A is almost at KTHO',
      body: 'Your bus is 2 stops away. Get ready to board at Kolej Tun Hussein Onn.',
      time: 'Just now',
      unread: true
    },
    {
      id: 'n2',
      type: 'service',
      title: 'Service update · Line C',
      body: 'Line C is running about 5 minutes late near Tasik UKM due to heavy rain.',
      time: '18 min ago',
      unread: true
    },
    {
      id: 'n3',
      type: 'info',
      title: 'Welcome to QuickUKM',
      body: 'Save your hostel-to-faculty route to get arrival reminders before every class.',
      time: 'Yesterday',
      unread: false
    }
  ];

  const helpers = {
    stop(id) { return stops.find(s => s.id === id); },
    route(id) { return routes.find(r => r.id === id); },
    routesAtStop(id) { return routes.filter(r => r.stops.includes(id)); },
    minutesFromHHMM(t) {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    },
    hhmm(min) {
      const m = ((min % 1440) + 1440) % 1440;
      return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    },
    /* schedule times (minutes since midnight) for a route + day */
    schedule(routeId, dayKey) {
      const day = service[dayKey] || service.weekday;
      const headway = day.headway[routeId] || 15;
      const start = helpers.minutesFromHHMM(day.first);
      const end = helpers.minutesFromHHMM(day.last);
      const out = [];
      for (let t = start; t <= end; t += headway) out.push(t);
      return out;
    },
    /* "07:30" -> "7:30 AM" */
    prettyTime(min) {
      const m = ((min % 1440) + 1440) % 1440;
      const h24 = Math.floor(m / 60);
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h = h24 % 12 === 0 ? 12 : h24 % 12;
      return h + ':' + String(m % 60).padStart(2, '0') + ' ' + ampm;
    },
    walkMinutes(from, to) {
      const a = helpers.stop(from), b = helpers.stop(to);
      if (!a || !b) return 1;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      return Math.max(1, Math.round(d / 85));
    },
    metres(fromStop, toPoint) {
      const a = helpers.stop(fromStop);
      if (!a) return 0;
      const p = toPoint || user;
      return Math.round(Math.hypot(a.x - p.x, a.y - p.y) * 1.9 / 10) * 10;
    }
  };

  return { stops, routes, service, user, defaultFavourites, defaultSavedStops, seedNotifications, helpers };
})();

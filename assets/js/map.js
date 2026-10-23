/* ============================================================
   QuickUKM — stylised, interactive UKM campus map
   - hand-drawn SVG campus
   - animated buses along real route paths
   - simulated ETA engine (used across every screen)
   ============================================================ */
window.QMap = (function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const D = window.QDATA;
  const state = {
    k: 0.6, tx: 0, ty: 0, W: 390, H: 780,
    minK: 0.42, maxK: 2.4,
    selectedRoute: null,
    trip: null,
    ready: false
  };

  let svg, world, gDecor, gRoutes, gStops, gStopLabels, gUser, gBuses;
  const stopMarkers = {};
  const busMarkers = [];
  const routeMetrics = {};
  const busRecords = [];
  let raf = 0;
  let lastTs = 0;
  let tickCb = null;
  let callbacks = {};
  let pan = null;
  const pointers = new Map();
  let pinchStart = null;
  let baseView = { k: 0.6, tx: 0, ty: 0 };

  /* ---------- tiny DOM helpers ---------- */
  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    if (attrs) {
      for (const key in attrs) {
        if (attrs[key] === undefined || attrs[key] === null) continue;
        node.setAttribute(key, attrs[key]);
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(str, x, y, parent, cls, extra) {
    const t = el('text', Object.assign({ x, y, class: cls || '' }, extra || {}), parent);
    t.textContent = str;
    return t;
  }

  /* ---------- path builders ---------- */
  function smoothPath(points, closed) {
    let pts = points.map(p => ({ x: p[0], y: p[1] }));
    if (closed && pts.length > 2) {
      const a = pts[0], b = pts[pts.length - 1];
      if (Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01) pts = pts.slice(0, -1);
    }
    const n = pts.length;
    const at = i => {
      if (closed) return pts[((i % n) + n) % n];
      return pts[Math.max(0, Math.min(n - 1, i))];
    };
    let d = 'M ' + pts[0].x + ' ' + pts[0].y;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C ' + r(c1x) + ' ' + r(c1y) + ', ' + r(c2x) + ' ' + r(c2y) + ', ' + p2.x + ' ' + p2.y;
    }
    if (closed) d += ' Z';
    return d;
  }
  function r(v) { return Math.round(v * 100) / 100; }

  /* ---------- map artwork ---------- */
  const buildings = [
    { x: 150, y: 292, w: 134, h: 62, label: '', type: 'admin' },
    { x: 398, y: 518, w: 104, h: 64, label: 'PSTL', type: 'academic' },
    { x: 424, y: 724, w: 104, h: 58, label: '', type: 'student' },
    { x: 128, y: 736, w: 106, h: 58, label: '', type: 'academic' },
    { x: 126, y: 836, w: 98, h: 56, label: '', type: 'academic' },
    { x: 282, y: 560, w: 82, h: 52, label: '', type: 'academic' },
    { x: 526, y: 618, w: 74, h: 48, label: '', type: 'hall' },
    { x: 700, y: 714, w: 86, h: 54, label: '', type: 'hostel' },
    { x: 714, y: 590, w: 80, h: 54, label: '', type: 'hostel' },
    { x: 668, y: 856, w: 92, h: 54, label: '', type: 'hostel' },
    { x: 616, y: 408, w: 92, h: 52, label: '', type: 'hostel' },
    { x: 60, y: 1148, w: 62, h: 30, label: 'KTM', type: 'station' },
    { x: 132, y: 1112, w: 76, h: 26, label: '', type: 'station' }
  ];

  const greens = [
    { cx: 120, cy: 640, rx: 78, ry: 130 },
    { cx: 700, cy: 1000, rx: 105, ry: 90 },
    { cx: 450, cy: 1030, rx: 140, ry: 70 },
    { cx: 660, cy: 250, rx: 110, ry: 60 },
    { cx: 180, cy: 200, rx: 100, ry: 60 }
  ];

  const trees = [
    [105, 570], [128, 600], [96, 700], [118, 745], [92, 800], [140, 940],
    [300, 940], [330, 980], [270, 1010], [360, 1040], [430, 1060], [560, 1010],
    [690, 960], [720, 930], [700, 1080], [640, 270], [700, 290], [740, 340],
    [600, 250], [520, 270], [330, 480], [300, 460], [720, 470], [748, 520],
    [170, 250], [210, 230], [95, 1040], [250, 1090], [580, 620], [700, 800]
  ];

  const roads = [
    { pts: [[170, 1150], [240, 1010], [300, 870], [360, 750], [400, 700], [395, 650], [380, 560], [365, 490], [330, 430], [280, 390], [250, 380]], width: 16 },
    { pts: [[400, 700], [340, 730], [290, 750], [250, 770], [235, 810], [230, 860], [215, 930], [200, 990], [215, 1060], [170, 1150]], width: 13 },
    { pts: [[250, 380], [330, 330], [430, 300], [520, 320], [570, 350], [610, 380], [620, 440], [600, 480], [620, 540], [660, 580], [680, 620], [670, 680], [650, 740], [640, 800], [620, 880]], width: 13 },
    { pts: [[620, 880], [600, 820], [560, 770], [520, 720], [480, 700], [440, 690], [400, 700]], width: 10 },
    { pts: [[650, 740], [570, 700], [500, 675], [430, 690], [400, 700]], width: 10 },
    { pts: [[620, 880], [560, 920], [500, 950], [440, 970], [380, 990], [300, 1010], [230, 1060], [170, 1150]], width: 12 },
    { pts: [[250, 380], [190, 440], [165, 520], [160, 600], [180, 680], [220, 730], [260, 750]], width: 9 },
    { pts: [[250, 770], [180, 782], [128, 790]], width: 7 },
    { pts: [[620, 880], [668, 856]], width: 7 },
    { pts: [[650, 740], [700, 742]], width: 7 }
  ];

  function renderBase() {
    const defs = el('defs', null, svg);
    defs.innerHTML = `
      <filter id="bldShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2.2" stdDeviation="2" flood-color="#334155" flood-opacity="0.12"/>
      </filter>
      <filter id="busShadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#0F172A" flood-opacity="0.28"/>
      </filter>
      <pattern id="mapDots" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="1.4" cy="1.4" r="1.1" fill="#E5E3EF"/>
      </pattern>
      <linearGradient id="lakeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#DDEBF8"/>
        <stop offset="100%" stop-color="#CBE2F3"/>
      </linearGradient>
      <linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#EAF1E6"/>
        <stop offset="100%" stop-color="#DFEADB"/>
      </linearGradient>
    `;

    el('rect', { x: -400, y: -400, width: 1800, height: 2400, fill: '#F1F0F7' }, world);
    el('rect', { x: -400, y: -400, width: 1800, height: 2400, fill: 'url(#mapDots)', opacity: 0.55 }, world);

    const decor = el('g', { id: 'mapDecor' }, world);
    gDecor = decor;

    /* soft green areas */
    greens.forEach(g => {
      el('ellipse', { cx: g.cx, cy: g.cy, rx: g.rx, ry: g.ry, fill: 'url(#greenGrad)', opacity: 0.85 }, decor);
    });

    /* lake */
    const lake = el('g', { class: 'lake' }, decor);
    el('path', {
      d: 'M 372 386 C 380 340 428 316 486 316 C 552 316 596 342 600 384 C 604 424 568 452 512 460 C 452 468 400 454 378 428 C 366 414 366 400 372 386 Z',
      fill: 'url(#lakeGrad)', stroke: '#B8D7EB', 'stroke-width': 2
    }, lake);
    el('path', { d: 'M 402 398 C 432 386 466 386 494 394', fill: 'none', stroke: '#B8D7EB', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, lake);
    el('path', { d: 'M 440 424 C 470 414 500 414 526 422', fill: 'none', stroke: '#B8D7EB', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, lake);
    text('TASIK UKM', 486, 374, lake, 'water-label', { 'text-anchor': 'middle' });

    /* trees */
    const treeG = el('g', { opacity: 0.9 }, decor);
    trees.forEach(([x, y], i) => {
      const rr = 4 + (i % 3) * 2;
      el('circle', { cx: x + 4, cy: y + 3, r: rr, fill: '#D3E2CB' }, treeG);
      el('circle', { cx: x, cy: y, r: rr, fill: '#C6DBBD' }, treeG);
      el('circle', { cx: x - 3, cy: y - 2, r: rr * 0.55, fill: '#DDEBD5' }, treeG);
    });

    /* roads */
    const roadG = el('g', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, decor);
    roads.forEach(rd => {
      const d = smoothPath(rd.pts, false);
      el('path', { d, stroke: '#E2E0EB', 'stroke-width': rd.width + 5 }, roadG);
      el('path', { d, stroke: '#FFFFFF', 'stroke-width': rd.width }, roadG);
    });

    /* rail line */
    el('path', { d: 'M 10 1200 L 380 1200', stroke: '#CBD5E1', 'stroke-width': 6, fill: 'none' }, decor);
    el('path', { d: 'M 10 1200 L 380 1200', stroke: '#F8FAFC', 'stroke-width': 2.4, fill: 'none', 'stroke-dasharray': '12 9' }, decor);
    text('KTM SEREMBAN LINE', 300, 1216, decor, 'road-label', { 'text-anchor': 'middle' });

    /* stadium */
    const stadium = el('g', null, decor);
    el('ellipse', { cx: 160, cy: 962, rx: 66, ry: 44, fill: '#E8F0E3', stroke: '#D8E4D1', 'stroke-width': 2 }, stadium);
    el('ellipse', { cx: 160, cy: 962, rx: 46, ry: 28, fill: 'none', stroke: '#CBA98C', 'stroke-width': 7, opacity: 0.8 }, stadium);
    el('ellipse', { cx: 160, cy: 962, rx: 32, ry: 16, fill: '#E3EDDD' }, stadium);

    /* buildings */
    const bldG = el('g', { filter: 'url(#bldShadow)' }, decor);
    buildings.forEach(b => {
      const g = el('g', { class: 'bld bld--' + b.type }, bldG);
      el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 7, fill: b.type === 'hostel' ? '#F9EBDD' : (b.type === 'station' ? '#EDF1F5' : '#F7F2E7'), stroke: b.type === 'hostel' ? '#EAD4BE' : '#E6DDCB', 'stroke-width': 1.4 }, g);
      el('rect', { x: b.x + 6, y: b.y + 6, width: b.w - 12, height: 4, rx: 2, fill: b.type === 'hostel' ? '#EAD3BC' : '#E9DFCD', opacity: 0.8 }, g);
      if (b.label) text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6, g, 'bld-label', { 'text-anchor': 'middle' });
    });

    /* area + road labels */
    text('FAKULTI', 78, 812, decor, 'area-label', { transform: 'rotate(-90 78 812)', 'text-anchor': 'middle' });
    text('KOLEJ KEDIAMAN', 764, 790, decor, 'area-label', { transform: 'rotate(90 764 790)', 'text-anchor': 'middle' });
    text('JALAN BANGI', 232, 1128, decor, 'road-label', { transform: 'rotate(-27 232 1128)', 'text-anchor': 'middle' });
  }

  function renderRouteLines() {
    D.routes.forEach(route => {
      const g = el('g', { class: 'route-line-group', 'data-route': route.id, opacity: 0 }, gRoutes);
      const d = smoothPath(route.waypoints, route.loop);
      el('path', { d, class: 'route-casing', fill: 'none', stroke: '#ffffff', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
      el('path', { d, class: 'route-color', fill: 'none', stroke: route.color, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
      el('path', { d, class: 'route-flow', fill: 'none', stroke: '#ffffff', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-dasharray': '1 11', opacity: 0.75, 'vector-effect': 'non-scaling-stroke' }, g);
      const path = g.querySelector('.route-color');
      const metrics = {
        el: g,
        path,
        len: path.getTotalLength(),
        stopOffsets: {}
      };
      route.stops.forEach(id => {
        metrics.stopOffsets[id] = nearestOffset(path, D.helpers.stop(id));
      });
      routeMetrics[route.id] = metrics;
    });
  }

  function nearestOffset(path, stop) {
    const len = path.getTotalLength();
    let best = Infinity, bestS = 0;
    for (let s = 0; s <= len; s += 2) {
      const p = path.getPointAtLength(s);
      const d = (p.x - stop.x) ** 2 + (p.y - stop.y) ** 2;
      if (d < best) { best = d; bestS = s; }
    }
    return bestS;
  }

  function labelSide(id) {
    const sides = {
      ktho: 'left', kpz: 'left', kiz: 'left', keris: 'left',
      pusanika: 'right', library: 'left', fep: 'right',
      ftsm: 'top', fst: 'right', stadium: 'left', gate: 'right', ktm: 'top',
      canselori: 'right', dectar: 'right'
    };
    return sides[id] || 'right';
  }

  function renderStops() {
    D.stops.forEach(stop => {
      const routesAt = D.helpers.routesAtStop(stop.id);
      const g = el('g', {
        class: 'marker stop-marker' + (stop.id === 'fep' ? ' stop-marker--minor' : ''),
        'data-stop': stop.id,
        transform: `translate(${stop.x} ${stop.y})`
      }, gStops);
      el('circle', { class: 'stop-halo', r: 15, fill: 'none' }, g);
      el('circle', { class: 'stop-dot', r: routesAt.length > 1 ? 7.4 : 6.4, fill: '#ffffff', stroke: '#0B1B33', 'stroke-width': 2.4 }, g);
      el('circle', { class: 'stop-core', r: 2.4, fill: '#0B1B33' }, g);
      el('circle', { class: 'stop-hit', r: 20, fill: 'transparent' }, g);
      g.addEventListener('click', e => {
        e.stopPropagation();
        if (callbacks.onStopTap) callbacks.onStopTap(stop.id);
      });

      const side = labelSide(stop.id);
      const label = el('g', {
        class: 'stop-label stop-label--' + side + (stop.id === 'fep' ? ' stop-label--minor' : ''),
        transform: `translate(${stop.x} ${stop.y})`
      }, gStopLabels);
      const w = Math.max(26, stop.short.length * 5.3 + 12);
      let x = 0, y = 0;
      if (side === 'right') { x = 11; y = -8; }
      else if (side === 'left') { x = -11 - w; y = -8; }
      else { x = -w / 2; y = -26; }
      el('rect', { x, y, width: w, height: 16, rx: 5, class: 'stop-label-bg' }, label);
      const t = text(stop.short, 0, 0, label, 'stop-label-text', { 'text-anchor': side === 'right' ? 'start' : 'end' });
      t.setAttribute('x', side === 'right' ? x + 6 : (side === 'left' ? x + w - 6 : x + w / 2));
      t.setAttribute('y', y + 11.2);
      stopMarkers[stop.id] = { g, labelGroup: label, x: stop.x, y: stop.y, stop };
    });

    const u = D.user;
    const ug = el('g', { class: 'marker user-marker', transform: `translate(${u.x} ${u.y})` }, gUser);
    el('circle', { class: 'user-pulse', r: 16, fill: '#2563EB', opacity: 0.18 }, ug);
    el('circle', { r: 7, fill: '#2563EB', stroke: '#ffffff', 'stroke-width': 2.6 }, ug);
    el('circle', { r: 2.2, fill: '#ffffff' }, ug);
    stopMarkers.__user = { g: ug, x: u.x, y: u.y };
  }

  function renderBuses() {
    D.routes.forEach(route => {
      const n = route.buses;
      for (let i = 0; i < n; i++) {
        const rec = {
          id: route.id + i,
          routeId: route.id,
          route,
          phase: route.loop ? i * (1 / n) : i * (2 / n),
          speed: route.speed,
          seats: ['Seats available', 'Filling up', 'Standing room'][i % 3],
          s: 0,
          dir: 1,
          nextStop: null
        };
        busRecords.push(rec);

        const g = el('g', {
          class: 'marker bus-marker',
          'data-bus': rec.id,
          style: `--bus-color:${route.color}`
        }, gBuses);
        const inner = el('g', { class: 'bus-inner', filter: 'url(#busShadow)' }, g);
        el('rect', { x: -16, y: -11, width: 32, height: 22, rx: 7, fill: route.color, stroke: '#ffffff', 'stroke-width': 1.5 }, inner);
        const icon = el('g', { transform: 'translate(-13 -5.4) scale(0.43)', fill: 'none', stroke: '#ffffff', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, inner);
        el('rect', { x: 1.5, y: 2, width: 15, height: 15, rx: 3 }, icon);
        el('path', { d: 'M 1.5 8.5 h 15 M 1.5 13.5 h 15' }, icon);
        el('circle', { cx: 5, cy: 18.5, r: 1.4, fill: '#ffffff', stroke: 'none' }, icon);
        el('circle', { cx: 13, cy: 18.5, r: 1.4, fill: '#ffffff', stroke: 'none' }, icon);
        text(route.id, 5.5, 4.3, inner, 'bus-letter', { 'text-anchor': 'middle' });
        el('circle', { class: 'bus-hit', r: 23, fill: 'transparent' }, inner);
        inner.addEventListener('click', e => {
          e.stopPropagation();
          if (callbacks.onBusTap) callbacks.onBusTap(rec);
        });
        rec.el = g;
        rec.inner = inner;
        busMarkers.push(rec);
      }
    });
  }

  /* ---------- transforms / view ---------- */
  function applyTransform() {
    world.setAttribute('transform', `translate(${r(state.tx)} ${r(state.ty)}) scale(${state.k})`);
    const inv = 1 / state.k;
    Object.keys(stopMarkers).forEach(id => {
      const m = stopMarkers[id];
      m.g.setAttribute('transform', `translate(${m.x} ${m.y}) scale(${inv})`);
      if (m.labelGroup) m.labelGroup.setAttribute('transform', `translate(${m.x} ${m.y}) scale(${inv})`);
    });
    busMarkers.forEach(b => {
      b.el.setAttribute('transform', `translate(${r(b.x)} ${r(b.y)}) scale(${inv})`);
    });
    svg.classList.toggle('is-zoomed', state.k > 0.82);
  }

  function clampView() {
    const W = state.W, H = state.H, k = state.k;
    const bounds = { minX: 20, maxX: 820, minY: 190, maxY: 1240 };
    const pad = 30;
    let minTx = W - bounds.maxX * k - pad;
    let maxTx = -bounds.minX * k + pad;
    if (minTx > maxTx) { const c = (minTx + maxTx) / 2; minTx = maxTx = c; }
    /* In live-trip mode the bottom sheet covers the map, so allow
       the campus to be nudged further up to keep the route visible. */
    const extraBottom = state.trip ? 430 : 190;
    let minTy = H - bounds.maxY * k - pad - extraBottom;
    let maxTy = -bounds.minY * k + pad;
    if (minTy > maxTy) { const c = (minTy + maxTy) / 2; minTy = maxTy = c; }
    state.tx = Math.max(minTx, Math.min(maxTx, state.tx));
    state.ty = Math.max(minTy, Math.min(maxTy, state.ty));
  }

  function setView(k, tx, ty) {
    state.k = Math.max(state.minK, Math.min(state.maxK, k));
    state.tx = tx;
    state.ty = ty;
    clampView();
    applyTransform();
  }

  function resetView(animate) {
    const W = state.W;
    /* Fit the full width of campus, then anchor Tasik UKM just below
       the floating search bar. Tall phones reveal more of south campus. */
    const k = Math.max(0.46, Math.min(0.51, W / 810));
    const tx = W / 2 - 400 * k;
    const ty = 12 - 300 * k;
    if (animate) animateTo(k, tx, ty, 420);
    else setView(k, tx, ty);
  }

  function animateTo(k, tx, ty, dur) {
    const from = { k: state.k, tx: state.tx, ty: state.ty };
    const start = performance.now();
    cancelAnimationFrame(state.viewAnim);
    const step = now => {
      let p = Math.min(1, (now - start) / (dur || 400));
      p = 1 - Math.pow(1 - p, 3);
      state.k = from.k + (k - from.k) * p;
      state.tx = from.tx + (tx - from.tx) * p;
      state.ty = from.ty + (ty - from.ty) * p;
      applyTransform();
      if (p < 1) state.viewAnim = requestAnimationFrame(step);
      else { clampView(); applyTransform(); }
    };
    state.viewAnim = requestAnimationFrame(step);
  }

  function focusRoute(routeId) {
    const metrics = routeMetrics[routeId];
    if (!metrics) return;
    const bbox = metrics.path.getBBox();
    const sheetEl = document.getElementById('tripSheet');
    const sheetH = state.trip ? (sheetEl ? sheetEl.offsetHeight : 350) : 0;
    const topPad = state.trip ? 100 : 70;
    const availH = Math.max(220, state.H - sheetH - topPad - 12);
    const k = Math.max(0.45, Math.min(1.2, Math.min((state.W - 50) / Math.max(bbox.width, 1), availH / Math.max(bbox.height, 1))));
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const tx = state.W / 2 - cx * k;
    const ty = topPad + availH / 2 - cy * k;
    animateTo(k, tx, ty, 520);
  }

  function locateUser() {
    const k = Math.min(1.15, Math.max(0.8, state.k));
    const tx = state.W / 2 - D.user.x * k;
    const ty = (state.H - 240) / 2 - D.user.y * k;
    animateTo(k, tx, ty, 450);
  }

  function zoomBy(factor, cx, cy) {
    const px = cx === undefined ? state.W / 2 : cx;
    const py = cy === undefined ? state.H / 2 : cy;
    const k2 = Math.max(state.minK, Math.min(state.maxK, state.k * factor));
    const wx = (px - state.tx) / state.k;
    const wy = (py - state.ty) / state.k;
    setView(k2, px - wx * k2, py - wy * k2);
  }

  /* ---------- simulation ---------- */
  function busPositions(dt) {
    busRecords.forEach(bus => {
      const metrics = routeMetrics[bus.routeId];
      const len = metrics.len;
      const advance = (dt * bus.speed) / len;
      bus.phase += advance;
      if (bus.route.loop) {
        if (bus.phase >= 1) bus.phase -= 1;
        bus.s = bus.phase * len;
        bus.dir = 1;
      } else {
        if (bus.phase >= 2) bus.phase -= 2;
        if (bus.phase < 1) { bus.s = bus.phase * len; bus.dir = 1; }
        else { bus.s = (2 - bus.phase) * len; bus.dir = -1; }
      }
      const p = metrics.path.getPointAtLength(bus.s);
      bus.x = p.x;
      bus.y = p.y;
      bus.nextStop = nextStopOf(bus);
    });
  }

  function nextStopOf(bus) {
    const route = bus.route;
    const offsets = route.stops.map(id => ({ id, off: routeMetrics[route.id].stopOffsets[id] }));
    const L = routeMetrics[route.id].len;
    if (route.loop) {
      const ahead = offsets
        .map(o => ({ ...o, delta: (o.off - bus.s + L) % L }))
        .filter(o => o.delta > 6)
        .sort((a, b) => a.delta - b.delta);
      return ahead[0] || offsets[0];
    }
    if (bus.dir >= 0) {
      const ahead = offsets.filter(o => o.off > bus.s + 2).sort((a, b) => a.off - b.off);
      return ahead[0] || offsets[offsets.length - 1];
    }
    const ahead = offsets.filter(o => o.off < bus.s - 2).sort((a, b) => b.off - a.off);
    return ahead[0] || offsets[0];
  }

  function secondsToStop(bus, offset) {
    const L = routeMetrics[bus.routeId].len;
    let delta;
    if (bus.route.loop) delta = (offset - bus.s + L) % L;
    else if (bus.dir >= 0) delta = offset >= bus.s ? offset - bus.s : (L - bus.s) + (L - offset);
    else delta = offset <= bus.s ? bus.s - offset : bus.s + offset;
    return delta / bus.speed;
  }

  function nextArrival(routeId, stopId) {
    const metrics = routeMetrics[routeId];
    if (!metrics || metrics.stopOffsets[stopId] === undefined) return null;
    const off = metrics.stopOffsets[stopId];
    let best = Infinity;
    busRecords.filter(b => b.routeId === routeId).forEach(bus => {
      best = Math.min(best, secondsToStop(bus, off));
    });
    return best === Infinity ? null : best;
  }

  function arrivalsForStop(stopId) {
    return D.routes
      .filter(route => route.stops.includes(stopId))
      .map(route => ({ route, seconds: nextArrival(route.id, stopId) }))
      .filter(x => x.seconds !== null)
      .sort((a, b) => a.seconds - b.seconds);
  }

  function busesForRoute(routeId) {
    return busRecords.filter(b => b.routeId === routeId).map(b => {
      const seconds = nextArrival(routeId, b.nextStop ? b.nextStop.id : b.route.stops[0]);
      return { ...b, etaNext: seconds };
    });
  }

  function bestBusTo(routeId, stopId) {
    const metrics = routeMetrics[routeId];
    if (!metrics) return null;
    const off = metrics.stopOffsets[stopId];
    let best = null;
    busRecords.filter(b => b.routeId === routeId).forEach(bus => {
      const s = secondsToStop(bus, off);
      if (!best || s < best.seconds) best = { bus, seconds: s };
    });
    return best;
  }

  /* ---------- animation loop ---------- */
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.12, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    busPositions(dt);
    busMarkers.forEach(b => {
      if (b.x === undefined) return;
      b.el.setAttribute('transform', `translate(${r(b.x)} ${r(b.y)}) scale(${1 / state.k})`);
    });
    if (tickCb) tickCb();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- pointer interactions ---------- */
  function bindInteractions() {
    svg.addEventListener('pointerdown', e => {
      if (e.target.closest('.bus-inner') || e.target.closest('.stop-marker')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      svg.setPointerCapture(e.pointerId);
      if (pointers.size === 1) {
        pan = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty, moved: false };
        svg.classList.add('is-dragging');
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStart = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          k: state.k,
          cx: (pts[0].x + pts[1].x) / 2,
          cy: (pts[0].y + pts[1].y) / 2,
          tx: state.tx,
          ty: state.ty
        };
        pan = null;
      }
    });

    svg.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinchStart) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const factor = dist / Math.max(1, pinchStart.dist);
        const k = Math.max(state.minK, Math.min(state.maxK, pinchStart.k * factor));
        const wx = (pinchStart.cx - pinchStart.tx) / pinchStart.k;
        const wy = (pinchStart.cy - pinchStart.ty) / pinchStart.k;
        state.k = k;
        state.tx = (pts[0].x + pts[1].x) / 2 - wx * k;
        state.ty = (pts[0].y + pts[1].y) / 2 - wy * k;
        clampView();
        applyTransform();
      } else if (pan) {
        const dx = e.clientX - pan.x;
        const dy = e.clientY - pan.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
        state.tx = pan.tx + dx;
        state.ty = pan.ty + dy;
        clampView();
        applyTransform();
      }
    });

    const end = e => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0) {
        pan = null;
        svg.classList.remove('is-dragging');
      }
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    svg.addEventListener('dblclick', e => {
      const rect = svg.getBoundingClientRect();
      zoomBy(1.5, e.clientX - rect.left, e.clientY - rect.top);
    });

    let lastW = 0;
    const ro = new ResizeObserver(() => {
      const rect = svg.getBoundingClientRect();
      const widthChanged = Math.abs((rect.width || 0) - lastW) > 2;
      const first = lastW === 0;
      resizeMap();
      lastW = rect.width || 0;
      if (first || widthChanged) {
        resetView();
      } else if (state.trip) {
        focusRoute(state.trip.routeId);
      }
    });
    ro.observe(svg);
  }

  function resizeMap() {
    const rect = svg.getBoundingClientRect();
    state.W = rect.width || 390;
    state.H = rect.height || 780;
    svg.setAttribute('viewBox', `0 0 ${state.W} ${state.H}`);
  }

  /* ---------- public ---------- */
  const api = {
    init(opts) {
      callbacks = opts || {};
      svg = document.getElementById('campusMap');
      world = el('g', { id: 'mapWorld' }, svg);
      resizeMap();
      renderBase();
      gRoutes = el('g', { id: 'mapRoutes' }, world);
      renderRouteLines();
      gStops = el('g', { id: 'mapStops' }, world);
      gBuses = el('g', { id: 'mapBuses' }, world);
      gStopLabels = el('g', { id: 'mapStopLabels' }, world);
      gUser = el('g', { id: 'mapUser' }, world);
      renderStops();
      renderBuses();
      bindInteractions();
      busPositions(0);
      applyTransform();
      resetView();
      state.ready = true;
      raf = requestAnimationFrame(loop);
      return api;
    },
    setTickCallback(cb) { tickCb = cb; },
    resetView: () => resetView(true),
    locate: locateUser,
    zoomIn: () => zoomBy(1.35),
    zoomOut: () => zoomBy(0.74),
    nextArrival,
    arrivalsForStop,
    busesForRoute,
    bestBusTo,
    routeMetrics: () => routeMetrics,
    buses: () => busRecords,
    focusRoute,
    highlightRoute(id) {
      state.selectedRoute = id;
      D.routes.forEach(route => {
        const m = routeMetrics[route.id];
        if (!m) return;
        const on = id === route.id;
        m.el.style.opacity = on ? '1' : '0';
      });
      if (id) {
        const m = routeMetrics[id];
        m.el.parentNode.appendChild(m.el);
      }
    },
    setTrip(trip) {
      state.trip = trip;
      ['origin', 'destination'].forEach(kind => {
        const id = trip ? trip[kind] : null;
        Object.keys(stopMarkers).forEach(sid => {
          if (sid === '__user') return;
          stopMarkers[sid].g.classList.toggle('is-' + kind, sid === id);
        });
      });
      if (trip) {
        api.highlightRoute(trip.routeId);
        setTimeout(() => focusRoute(trip.routeId), 60);
      } else {
        api.highlightRoute(null);
        Object.keys(stopMarkers).forEach(sid => {
          if (sid === '__user') return;
          stopMarkers[sid].g.classList.remove('is-origin', 'is-destination');
        });
      }
    },
    focusStop(id) {
      const stop = D.helpers.stop(id);
      if (!stop) return;
      const k = Math.max(0.95, state.k);
      animateTo(k, state.W / 2 - stop.x * k, (state.H - 250) / 2 - stop.y * k, 420);
    },
    showRoute(id) {
      api.highlightRoute(id);
      focusRoute(id);
    },
    destroy() { cancelAnimationFrame(raf); }
  };

  return api;
})();

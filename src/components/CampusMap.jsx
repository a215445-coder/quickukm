import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import campusMapSvg from '../assets/ukm-bangi-map.svg?raw';
import { LINES, STOPS, roadPaths } from '../data/shuttleData';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const LOCAL_MAP_URL = `data:image/svg+xml,${encodeURIComponent(campusMapSvg)}`;
const MAP_STOPS = STOPS.filter((stop) => stop.location);
const LABELLED_STOPS = new Set(['kpz', 'ftsm', 'fkab', 'fpend', 'pusanika', 'dectar', 'krk', 'ktho', 'fssk', 'library', 'fep', 'fst', 'kkm', 'driving']);

// Undo the local coordinate transform used to build the offline campus map.
const toLatLng = (x, y) => [2.9355 - y / 20025, 101.767 + x / 20000];
const stopLatLng = ({ x, y }) => toLatLng(x, y);
const campusBounds = L.latLngBounds(toLatLng(28, 377), toLatLng(476, -123));
const localBounds = L.latLngBounds(toLatLng(-45, 500), toLatLng(530, -135));

function buildMotion(points) {
  let metres = 0;
  const cumulative = points.map((point, i) => {
    if (i) metres += L.latLng(points[i - 1]).distanceTo(point);
    return metres;
  });
  return { points, cumulative, metres };
}

const routes = LINES.map((line) => {
  const sections = roadPaths(line.stopIds).map(({ points }) => points.map(([x, y]) => toLatLng(x, y)));
  return { ...line, sections, motion: sections.length ? buildMotion(sections[0]) : null };
});

function busPosition({ points, cumulative, metres }, phase) {
  const distance = phase * metres;
  let low = 1;
  let high = points.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] < distance) low = mid + 1;
    else high = mid;
  }

  const from = points[low - 1];
  const to = points[low];
  const length = cumulative[low] - cumulative[low - 1];
  const ratio = length ? (distance - cumulative[low - 1]) / length : 0;
  return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio];
}

function drawPath(container, points, color, weight, opacity) {
  const common = { interactive: false, pane: 'routes', smoothFactor: 0.5 };
  L.polyline(points, { ...common, color: '#fff', weight: weight + 2, opacity: opacity * 0.85 }).addTo(container);
  L.polyline(points, { ...common, color, weight, opacity }).addTo(container);
}

function createBus(line, phase) {
  const badge = document.createElement('span');
  badge.className = 'bus-map-badge';
  badge.style.background = line.color;
  badge.textContent = line.id;
  const icon = L.divIcon({ className: 'bus-map-icon', html: badge, iconSize: [30, 20] });
  return L.marker(busPosition(line.motion, phase), { icon, interactive: false, keyboard: false, zIndexOffset: 120 });
}

function addStop(container, stop, isNavigation, active, onClick) {
  const icon = L.divIcon({
    className: `map-stop-icon ${stop.location === 'mapped' ? 'mapped' : 'approximate'}${active ? ' selected' : ''}`,
    iconSize: [22, 22],
  });
  const marker = L.marker(stopLatLng(stop), {
    icon, title: stop.name, keyboard: !isNavigation, interactive: !isNavigation, zIndexOffset: active ? 100 : 0,
  });
  if (!isNavigation) {
    marker.on('click', () => onClick?.(stop.id));
    marker.on('add', () => {
      const element = marker.getElement();
      element.setAttribute('aria-label', `Show ${stop.name} stop details`);
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onClick?.(stop.id);
        }
      });
    });
  }
  marker.bindTooltip(stop.short, {
    permanent: LABELLED_STOPS.has(stop.id) || active, direction: 'top', offset: [0, -6], className: 'campus-stop-label',
  });
  marker.addTo(container);
  return marker;
}

export default function CampusMap({ selectedStop, onSelectStop, navigation, pauseBusMotion = false, focusedLine = null }) {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayer = useRef(null);
  const busLayer = useRef(null);
  const stopLayer = useRef(null);
  const focusLayer = useRef(null);
  const elapsed = useRef(0);
  const stopCallback = useRef(onSelectStop);
  const [mapMode, setMapMode] = useState('loading');
  const isNavigation = Boolean(navigation);
  const focusPoints = navigation?.focusPoints;
  const busPaths = navigation?.busPaths;
  const markerPoint = navigation?.marker;
  const boardPoint = navigation?.board;
  const destinationPoint = navigation?.destination;

  useLayoutEffect(() => { stopCallback.current = onSelectStop; }, [onSelectStop]);

  useLayoutEffect(() => {
    const element = canvasRef.current;
    const map = L.map(element, {
      minZoom: 3, maxZoom: 19, zoomControl: false, attributionControl: false,
      scrollWheelZoom: false, worldCopyJump: true, zoomAnimation: false,
    });
    mapRef.current = map;
    map.createPane('local-base').style.zIndex = '190';
    map.createPane('routes').style.zIndex = '420';
    map.fitBounds(campusBounds, { padding: [16, 16], maxZoom: 16, animate: false });
    L.imageOverlay(LOCAL_MAP_URL, localBounds, { pane: 'local-base', interactive: false }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    stopLayer.current = L.layerGroup().addTo(map);
    focusLayer.current = L.layerGroup().addTo(map);
    busLayer.current = L.layerGroup().addTo(map);

    // Wheel zoom starts when the map is focused, so ordinary page scrolling
    // still works as the cursor moves over the campus card.
    function enableWheel() { map.scrollWheelZoom.enable(); }
    function disableWheel(event) {
      if (!element.contains(event.relatedTarget)) map.scrollWheelZoom.disable();
    }
    element.addEventListener('focusin', enableWheel);
    element.addEventListener('focusout', disableWheel);
    const updateDetail = () => element.classList.toggle('campus-overview', map.getZoom() < 14);
    map.on('zoomend', updateDetail);
    updateDetail();

    const remoteAllowed = window.location.protocol !== 'file:' || navigator.userAgent.includes('QuickUKM/');
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, updateWhenIdle: true, keepBuffer: 2 });
    let tilesLoaded = 0;
    let triedHelp = false;
    const showLocal = () => {
      setMapMode('local');
      if (!localBounds.contains(map.getCenter())) map.fitBounds(campusBounds, { animate: false, maxZoom: 16 });
      map.setMinZoom(14);
      map.setMaxBounds(localBounds.pad(0.45));
    };
    const useOnline = () => {
      if (!remoteAllowed || !navigator.onLine) {
        showLocal();
        return;
      }
      tilesLoaded = 0;
      triedHelp = false;
      setMapMode('loading');
      map.setMinZoom(3);
      map.setMaxBounds(null);
      if (!map.hasLayer(tiles)) tiles.addTo(map);
    };

    tiles.on('loading', () => { tilesLoaded = 0; });
    tiles.on('tileload', () => {
      tilesLoaded++;
      setMapMode('online');
      map.setMinZoom(3);
      map.setMaxBounds(null);
    });
    tiles.on('load', () => {
      if (!tilesLoaded && !triedHelp) {
        triedHelp = true;
        showLocal();
      }
    });
    const offline = () => { tiles.remove(); showLocal(); };
    window.addEventListener('online', useOnline);
    window.addEventListener('offline', offline);
    useOnline();

    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize.observe(element);
    return () => {
      resize.disconnect();
      element.removeEventListener('focusin', enableWheel);
      element.removeEventListener('focusout', disableWheel);
      window.removeEventListener('online', useOnline);
      window.removeEventListener('offline', offline);
      tiles.off();
      map.stop().remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!focusPoints?.length) return;
    const map = mapRef.current;
    map.fitBounds(focusPoints.map(stopLatLng), {
      paddingTopLeft: [30, 86], paddingBottomRight: [30, Math.round(map.getSize().y * 0.52)],
      maxZoom: 18, animate: false,
    });
  }, [focusPoints]);

  useEffect(() => {
    const layer = routeLayer.current;
    layer.clearLayers();
    const ordered = focusedLine
      ? [...routes.filter((line) => line.id !== focusedLine), ...routes.filter((line) => line.id === focusedLine)]
      : routes;
    for (const line of ordered) {
      const highlighted = line.id === focusedLine;
      const opacity = isNavigation || (focusedLine && !highlighted) ? 0.2 : 0.9;
      for (const section of line.sections) drawPath(layer, section, line.color, highlighted ? 4.5 : 3, opacity);
    }
    for (const path of busPaths || []) {
      drawPath(layer, path.points.map(([x, y]) => toLatLng(x, y)), path.color, 5, 1);
    }
  }, [busPaths, focusedLine, isNavigation]);

  useEffect(() => {
    const layer = stopLayer.current;
    layer.clearLayers();
    for (const stop of MAP_STOPS) {
      addStop(layer, stop, isNavigation, selectedStop === stop.id, (id) => stopCallback.current?.(id));
    }
    const activeStop = MAP_STOPS.find((stop) => stop.id === selectedStop);
    if (activeStop) {
      const map = mapRef.current;
      if (map.getZoom() < 14) map.setView(stopLatLng(activeStop), 16, { animate: false });
      else map.panInside(stopLatLng(activeStop), { padding: [35, 40], animate: false });
    }
  }, [isNavigation, selectedStop]);

  useEffect(() => {
    const layer = focusLayer.current;
    layer.clearLayers();
    for (const [point, color, label] of [
      [boardPoint, '#0e9f6e', 'Board'],
      [destinationPoint, '#e5484d', 'Destination'],
      [markerPoint, '#2b59ff', null],
    ]) {
      if (!point) continue;
      const circle = L.circleMarker(stopLatLng(point), { color, radius: label ? 9 : 6, weight: 3,
        fillColor: '#fff', fillOpacity: label ? 0.25 : 1, interactive: false }).addTo(layer);
      if (label) circle.bindTooltip(label, { permanent: true, direction: 'right', className: 'campus-stop-label' });
    }
  }, [boardPoint?.x, boardPoint?.y, destinationPoint?.x, destinationPoint?.y, markerPoint?.x, markerPoint?.y]);

  useEffect(() => {
    const layer = busLayer.current;
    layer.clearLayers();
    if (isNavigation) return;
    const buses = routes.flatMap((line, i) => {
      if (!line.motion || (focusedLine && line.id !== focusedLine)) return [];
      const duration = Math.max(24000, line.motion.metres * 10);
      const offset = 0.16 + i * 0.19;
      const position = () => ((elapsed.current / duration) + offset) % 1;
      return [{ line, position, icon: createBus(line, position()).addTo(layer) }];
    });
    if (pauseBusMotion) return;
    let last = null;
    let frame;
    const tick = (time) => {
      if (last !== null) elapsed.current += Math.min(time - last, 100);
      last = time;
      for (const { line, position, icon } of buses) icon.setLatLng(busPosition(line.motion, position()));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [focusedLine, isNavigation, pauseBusMotion]);

  function resetView() {
    const map = mapRef.current;
    if (focusPoints?.length) {
      map.fitBounds(focusPoints.map(stopLatLng), {
        paddingTopLeft: [30, 86], paddingBottomRight: [30, Math.round(map.getSize().y * 0.52)], maxZoom: 18,
      });
    } else {
      map.fitBounds(campusBounds, { padding: [16, 16], maxZoom: 16 });
    }
  }

  return (
    <div className={`campus-map-view ${isNavigation ? 'campus-map-navigation' : ''}`}>
      <div ref={canvasRef} className="map-viewport" aria-label={isNavigation ? 'Interactive route map' : 'Interactive UKM Bangi map'} />
      <button className="map-reset" type="button" onClick={resetView} aria-label={isNavigation ? 'Fit route to map' : 'Reset map to UKM campus'}>
        {isNavigation ? 'Fit route' : 'UKM campus'}
      </button>
      {mapMode === 'local' && <span className="map-offline" role="status">Offline campus map</span>}
      <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
  );
}

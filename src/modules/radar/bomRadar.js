// BoM radar — static PNG overlay loop.
//
// Replaces the prior tile-based implementation, which hit BoM's
// "Zoom Level Not Supported" error PNG outside the tile service's narrow
// valid zoom range. Static PNGs are full-extent, fixed-bounds overlays —
// no zoom restriction.
//
// IDR product code convention (trailing digit = range):
//   IDR<NN>1 = 512 km   IDR<NN>2 = 256 km
//   IDR<NN>3 = 128 km   IDR<NN>4 = 64 km
// Default: IDR712 = Sydney (Terrey Hills) 256 km — Northern Beaches coverage
// with regional context.
//
// PNG URL pattern (HTTPS, verified live 2026-05-28):
//   https://www.bom.gov.au/radar/<IDR>.T.<YYYYMMDDHHMM>.png
//   timestamp is UTC, aligned to a 6-minute boundary.
//
// Bounds are computed from radar site centre + range (azimuthal equidistant
// approximated as a lat/lng rectangle). At Sydney's latitude over 256 km
// the edge misregistration is small single-digit km — acceptable for v1.
// Refinement path: pixel-match against IDR712.background.png.

const BOM_RADAR_HOST = 'https://www.bom.gov.au';
const BOM_RADAR_PATH = '/radar/';
const DEFAULT_BOM_PANE = 'atmos-radar-pane';

const DEFAULT_IDR = 'IDR712';
const DEFAULT_CADENCE_MINUTES = 6;
const DEFAULT_FRAME_COUNT = 10;
const DEFAULT_FRAME_INTERVAL_MS = 500;
const DEFAULT_LOOP_PAUSE_MS = 1000;
const DEFAULT_REDISCOVER_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_PRELOAD_TIMEOUT_MS = 8000;
const DEFAULT_OPACITY = 0.6;

// Terrey Hills radar site (BoM site 71), conventional coordinates as used
// across community BoM scraper projects.
const TERREY_HILLS_LAT = -33.7008;
const TERREY_HILLS_LON = 151.2094;

const RANGE_KM_BY_IDR_SUFFIX = { '1': 512, '2': 256, '3': 128, '4': 64 };

function rangeKmForIdr(idr) {
  const suffix = String(idr).slice(-1);
  return RANGE_KM_BY_IDR_SUFFIX[suffix] || 256;
}

function computeRectangularBoundsKm(centerLat, centerLon, rangeKm) {
  const latDelta = rangeKm / 111.32;
  const lonDelta = rangeKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  return [
    [centerLat - latDelta, centerLon - lonDelta],
    [centerLat + latDelta, centerLon + lonDelta]
  ];
}

const DEFAULT_BOUNDS = computeRectangularBoundsKm(
  TERREY_HILLS_LAT,
  TERREY_HILLS_LON,
  rangeKmForIdr(DEFAULT_IDR)
);

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatUtcTimestamp(date) {
  return (
    date.getUTCFullYear().toString() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes())
  );
}

function roundDownToCadence(date, cadenceMinutes) {
  const ms = cadenceMinutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

function buildFrameUrl(idr, timestampStr) {
  return `${BOM_RADAR_HOST}${BOM_RADAR_PATH}${idr}.T.${timestampStr}.png`;
}

function probeFrameUrl(url, timeoutMs) {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => { clearTimeout(timer); finish(true); };
    img.onerror = () => { clearTimeout(timer); finish(false); };
    img.src = url;
  });
}

export async function fetchRecentBomFrames({
  idr = DEFAULT_IDR,
  cadenceMinutes = DEFAULT_CADENCE_MINUTES,
  count = DEFAULT_FRAME_COUNT,
  now = Date.now(),
  probeTimeoutMs = DEFAULT_PRELOAD_TIMEOUT_MS
} = {}) {
  const cadenceMs = cadenceMinutes * 60 * 1000;
  const start = roundDownToCadence(new Date(now), cadenceMinutes);
  const maxAttempts = count * 2;
  const frames = [];

  for (let i = 0; i < maxAttempts && frames.length < count; i++) {
    const ts = new Date(start.getTime() - i * cadenceMs);
    const stamp = formatUtcTimestamp(ts);
    const url = buildFrameUrl(idr, stamp);
    const ok = await probeFrameUrl(url, probeTimeoutMs);
    if (ok) frames.push({ timestamp: ts, url });
  }

  if (!frames.length) {
    throw new Error('No reachable BoM radar frames found');
  }

  frames.sort((a, b) => a.timestamp - b.timestamp);
  return frames;
}

export function preloadFrames(frames, perFrameTimeoutMs = DEFAULT_PRELOAD_TIMEOUT_MS) {
  return Promise.all(frames.map((f) => new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error(`Preload timeout: ${f.url}`)), perFrameTimeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error(`Preload failed: ${f.url}`)); };
    img.src = f.url;
  })));
}

export function createBomStaticRadarLayer({
  map,
  pane = DEFAULT_BOM_PANE,
  opacity = DEFAULT_OPACITY,
  idr = DEFAULT_IDR,
  bounds = null,
  cadenceMinutes = DEFAULT_CADENCE_MINUTES,
  frameCount = DEFAULT_FRAME_COUNT,
  onFrameChange = null
} = {}) {
  if (!map) {
    throw new Error('createBomStaticRadarLayer: map is required');
  }

  const effectiveBounds = bounds
    || computeRectangularBoundsKm(TERREY_HILLS_LAT, TERREY_HILLS_LON, rangeKmForIdr(idr));

  let overlay = null;
  let frames = [];
  let currentIdx = 0;
  let advanceHandle = null;
  let rediscoverHandle = null;
  let stopped = false;
  let currentOpacity = opacity;

  function notifyFrame() {
    if (!onFrameChange || !frames.length) return;
    try { onFrameChange(frames[currentIdx]); } catch (err) {
      console.warn('[Atmos radar] onFrameChange threw:', err);
    }
  }

  function showFrame(idx) {
    if (!frames.length || !overlay) return;
    const wrapped = ((idx % frames.length) + frames.length) % frames.length;
    currentIdx = wrapped;
    overlay.setUrl(frames[wrapped].url);
    notifyFrame();
  }

  function clearAdvanceHandle() {
    if (advanceHandle !== null) {
      clearTimeout(advanceHandle);
      clearInterval(advanceHandle);
      advanceHandle = null;
    }
  }

  function scheduleAdvance() {
    if (stopped || !frames.length) return;
    clearAdvanceHandle();
    advanceHandle = setInterval(() => {
      if (stopped) return;
      const next = currentIdx + 1;
      if (next >= frames.length) {
        clearAdvanceHandle();
        advanceHandle = setTimeout(() => {
          if (stopped) return;
          showFrame(0);
          scheduleAdvance();
        }, DEFAULT_LOOP_PAUSE_MS);
      } else {
        showFrame(next);
      }
    }, DEFAULT_FRAME_INTERVAL_MS);
  }

  async function discoverAndPaint() {
    const fresh = await fetchRecentBomFrames({ idr, cadenceMinutes, count: frameCount });
    // Best-effort preload — tolerate partial failures.
    await preloadFrames(fresh).catch((err) => {
      console.warn('[Atmos radar] partial preload failure:', err?.message || err);
    });
    frames = fresh;
    currentIdx = 0;
    if (!overlay) {
      overlay = L.imageOverlay(frames[0].url, effectiveBounds, {
        pane,
        opacity: currentOpacity,
        interactive: false,
        attribution: 'Radar (c) Australian Bureau of Meteorology'
      });
      overlay.addTo(map);
    } else {
      overlay.setBounds(L.latLngBounds(effectiveBounds));
      overlay.setUrl(frames[0].url);
    }
    notifyFrame();
  }

  function scheduleRediscover() {
    if (rediscoverHandle !== null) return;
    rediscoverHandle = setInterval(() => {
      if (stopped) return;
      fetchRecentBomFrames({ idr, cadenceMinutes, count: frameCount })
        .then((fresh) => preloadFrames(fresh).catch(() => null).then(() => fresh))
        .then((fresh) => {
          frames = fresh;
          currentIdx = 0;
          if (overlay) overlay.setUrl(frames[0].url);
          notifyFrame();
        })
        .catch((err) => {
          console.warn('[Atmos radar] frame rediscovery failed:', err?.message || err);
        });
    }, DEFAULT_REDISCOVER_INTERVAL_MS);
  }

  async function start() {
    stopped = false;
    await discoverAndPaint();
    scheduleAdvance();
    scheduleRediscover();
    return controller;
  }

  function stop() {
    stopped = true;
    clearAdvanceHandle();
    if (rediscoverHandle !== null) {
      clearInterval(rediscoverHandle);
      rediscoverHandle = null;
    }
    if (overlay && map) {
      map.removeLayer(overlay);
      overlay = null;
    }
  }

  function setOpacity(n) {
    currentOpacity = n;
    if (overlay) overlay.setOpacity(n);
  }

  function getCurrentFrame() {
    if (!frames.length) return null;
    return frames[currentIdx];
  }

  const controller = { start, stop, setOpacity, getCurrentFrame };
  return controller;
}

// ─── Deprecated shims ────────────────────────────────────────────────────────
// Preserved so any stray caller fails loudly instead of silently doing nothing.

function deprecated(name) {
  throw new Error(
    `${name}: deprecated — tile-based BoM radar removed. ` +
    `Use createBomStaticRadarLayer({ map, pane }).start() instead.`
  );
}

export function fetchBomRadarFrames() { deprecated('fetchBomRadarFrames'); }
export function buildBomRadarTileUrl() { deprecated('buildBomRadarTileUrl'); }
export function getBomRadarFrameCandidates() { deprecated('getBomRadarFrameCandidates'); }
export function createBomRadarTileLayer() { deprecated('createBomRadarTileLayer'); }
export function createAvailableBomRadarLayer() { deprecated('createAvailableBomRadarLayer'); }
export function isBomRadarHostAvailable() { deprecated('isBomRadarHostAvailable'); }
export function startBomRadarUpdateLoop() { deprecated('startBomRadarUpdateLoop'); }

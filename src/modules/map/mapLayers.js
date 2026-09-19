// Esri World Light Gray Canvas: base tiles plus a separate reference-label layer.
// Esri's URL template is {z}/{y}/{x} (row before column), not Leaflet's usual {z}/{x}/{y}.
// Esri serves blank tiles above zoom 16; maxNativeZoom makes Leaflet upscale instead.
// CARTO was dropped 19/09/2026: its tiles now carry an "API KEY REQUIRED" watermark.
const ESRI_LIGHT_GRAY_BASE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_LIGHT_GRAY_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_BASE_TILE_URL = ESRI_LIGHT_GRAY_BASE_URL;
const DEFAULT_BASE_TILE_OPTIONS = {
  attribution: 'Tiles (c) Esri',
  maxNativeZoom: 16,
  maxZoom: 19
};
const BASE_LABELS_PANE_NAME = 'basemap-labels-pane';
const BASE_LABELS_PANE_Z_INDEX = 455;   // above the radar pane (450), below markers (600)
const RADAR_PANE_NAME = 'atmos-radar-pane';
const RADAR_PANE_Z_INDEX = 450;

export function addAtmosBaseLayer(map, {
  L,
  tileUrl = DEFAULT_BASE_TILE_URL,
  tileOptions = {},
  labelsUrl = ESRI_LIGHT_GRAY_LABELS_URL
}) {
  const base = L.tileLayer(tileUrl, {
    ...DEFAULT_BASE_TILE_OPTIONS,
    ...tileOptions
  }).addTo(map);
  if (labelsUrl) {
    const pane = map.getPane(BASE_LABELS_PANE_NAME) || map.createPane(BASE_LABELS_PANE_NAME);
    pane.style.zIndex = String(BASE_LABELS_PANE_Z_INDEX);
    pane.style.pointerEvents = 'none';
    base.labelsLayer = L.tileLayer(labelsUrl, {
      ...DEFAULT_BASE_TILE_OPTIONS,
      ...tileOptions,
      attribution: '',
      pane: BASE_LABELS_PANE_NAME
    }).addTo(map);
  }
  return base;
}

export function ensureAtmosRadarPane(map, {
  paneName = RADAR_PANE_NAME,
  zIndex = RADAR_PANE_Z_INDEX
} = {}) {
  const pane = map.getPane(paneName) || map.createPane(paneName);
  pane.style.zIndex = String(zIndex);
  pane.style.pointerEvents = 'none';
  return paneName;
}

// Golden test — station normalisation (stationLoader.js).
//
// Imports the ESM module directly (no Playwright, no browser). Constructs a
// synthetic ctx and exercises normaliseConsolidatedRainfallStation across
// MHL, BoM, missing-coords, wrong-type, and inactive scenarios.
//
// Usage:
//   node tests/golden/runners/station_normaliser.mjs            # verify
//   node tests/golden/runners/station_normaliser.mjs --capture  # rewrite expected
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO       = resolve(__dirname, '..', '..', '..');
const EXPECTED   = resolve(__dirname, '..', 'expected');

const CAPTURE = process.argv.includes('--capture');

// Import the ESM module under test.
const { normaliseConsolidatedRainfallStation } = await import(
  resolve(REPO, 'src/modules/stations/stationLoader.js').replace(/\\/g, '/').replace(/^([A-Z]):/, 'file:///$1:')
);

// Synthetic ctx — minimal surface needed by the BOM normaliser.
const ctx = {
  bomIfdCache: {
    '-33.85000,151.20000': { '60': { '50%': 6.0 } },
  },
  getBomStationNumber: (s) => String(s.bom_id || '').replace(/^bom-/, '') || '',
  getBomIfdKey: (lat, lon) => `${lat.toFixed(5)},${lon.toFixed(5)}`,
  formatLgaBoundaryName: (name) => String(name || '').trim() || 'Unknown',
};

const TEST_INPUTS = [
  {
    label: 'mhl_normal',
    input: {
      station_id: 'mhl-12345', station_type: 'rainfall', source: 'mhl',
      station_name: 'TEST MHL Station', station_no: 'TEST-001',
      lat: -33.81, lon: 151.00, ts_id: '12345', data_identifier: 'mhl:12345'
    },
  },
  {
    label: 'bom_with_ifd_match',
    input: {
      station_id: 'bom-067114', station_type: 'rainfall', source: 'bom',
      station_name: 'TEST BOM 1', bom_id: '067114',
      lat: -33.85, lon: 151.20, element: 'Rainfall', data_identifier: 'bom:067114'
    },
  },
  {
    label: 'bom_without_ifd_match',
    input: {
      station_id: 'bom-099999', station_type: 'rainfall', source: 'bom',
      station_name: 'TEST BOM 2', bom_id: '099999',
      lat: -34.50, lon: 150.50, element: 'Rainfall', data_identifier: 'bom:099999'
    },
  },
  {
    label: 'missing_coords_returns_null',
    input: { station_id: 'mhl-bad', station_type: 'rainfall', source: 'mhl', station_name: 'X', lat: null, lon: null },
  },
  {
    label: 'invalid_lat_string_returns_null',
    input: { station_id: 'mhl-bad2', station_type: 'rainfall', source: 'mhl', station_name: 'X', lat: 'not-a-number', lon: 151 },
  },
  {
    label: 'wrong_station_type_returns_null',
    input: { station_id: 'mhl-water', station_type: 'water_level', source: 'mhl', station_name: 'X', lat: -33, lon: 151 },
  },
  {
    label: 'unknown_source_returns_null',
    input: { station_id: 'unknown', station_type: 'rainfall', source: 'satellite', station_name: 'X', lat: -33, lon: 151 },
  },
  {
    label: 'mhl_data_identifier_fallback_for_ts_id',
    input: {
      station_id: 'mhl-fb', station_type: 'rainfall', source: 'mhl',
      station_name: 'MHL Fallback', station_no: 'FB-1', lat: -33.5, lon: 151.5, data_identifier: 'mhl:67890'
    },
  },
];

const results = {};
for (const tc of TEST_INPUTS) {
  const out = normaliseConsolidatedRainfallStation(tc.input, ctx);
  results[tc.label] = { input: tc.input, output: out };
}

const output = {
  _description: 'Golden output of normaliseConsolidatedRainfallStation across source / type / coords scenarios.',
  _module: 'src/modules/stations/stationLoader.js',
  _function: 'normaliseConsolidatedRainfallStation',
  _ctx_summary: 'synthetic ctx with bomIfdCache for one lat/lon, getBomStationNumber, getBomIfdKey, formatLgaBoundaryName',
  test_cases: results,
};

const expectedPath = resolve(EXPECTED, 'station_normaliser.json');

if (CAPTURE) {
  await writeFile(expectedPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`✓ CAPTURED → ${expectedPath}`);
  process.exit(0);
}

if (!existsSync(expectedPath)) {
  console.error(`FAIL: ${expectedPath} missing`); process.exit(1);
}
const expected = JSON.parse(await readFile(expectedPath, 'utf-8'));
let mismatches = 0;
for (const label of Object.keys(output.test_cases)) {
  const a = JSON.stringify(output.test_cases[label].output);
  const e = JSON.stringify(expected.test_cases[label]?.output);
  if (a !== e) {
    console.error(`FAIL: station_normaliser[${label}]`);
    console.error('  Expected:', e);
    console.error('  Actual:  ', a);
    mismatches++;
  }
}
if (mismatches > 0) { console.error(`FAIL: ${mismatches} mismatches.`); process.exit(1); }
console.log(`✓ station_normaliser PASS — ${Object.keys(output.test_cases).length} cases verified.`);

// Golden test — rolling rainfall (calcRollingMax).
//
// Exercises the inline-monolith function calcRollingMax with the fixed
// rainfall fixture and edge-case inputs. Verifies output is byte-identical
// to the captured expected values.
//
// Usage:
//   node tests/golden/runners/rolling_rainfall.mjs            # verify
//   node tests/golden/runners/rolling_rainfall.mjs --capture  # rewrite expected (operator only)
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO       = resolve(__dirname, '..', '..', '..');
const FIXTURES   = resolve(__dirname, '..', 'fixtures');
const EXPECTED   = resolve(__dirname, '..', 'expected');

const CAPTURE = process.argv.includes('--capture');
const PORT = 9101;

const TYPES = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.geojson':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon',
  '.xlsm':'application/vnd.ms-excel.sheet.macroEnabled.12','.tiff':'image/tiff',
};

async function startServer() {
  const server = http.createServer(async (req, res) => {
    let p = normalize(join(REPO, decodeURIComponent(req.url.split('?')[0])));
    if (!p.startsWith(REPO)) { res.writeHead(403); res.end(); return; }
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(await readFile(p));
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  return server;
}

const ROLLING_WINDOWS = [
  { key: '5min',  duration: 5,     interval: 5 },
  { key: '30min', duration: 30,    interval: 5 },
  { key: '1h',    duration: 60,    interval: 5 },
  { key: '6h',    duration: 360,   interval: 5 },
  { key: '24h',   duration: 1440,  interval: 5 },
  { key: '72h',   duration: 4320,  interval: 5 },
  { key: '168h',  duration: 10080, interval: 5 },
];

const EDGE_CASES = [
  {
    key: 'empty_array',
    readings: [],
    duration: 60,
    expected_meta: 'must return null',
  },
  {
    key: 'all_zero',
    readings: Array.from({length: 12}, (_, i) => ({
      timestamp: `2025-01-01T00:${String(i*5).padStart(2,'0')}:00Z`, value: 0
    })),
    duration: 60,
    expected_meta: 'must return zeroes (no division by anything)',
  },
  {
    key: 'duration_exceeds_data',
    readings: [
      {timestamp: '2025-01-01T00:00:00Z', value: 5},
      {timestamp: '2025-01-01T00:05:00Z', value: 5},
    ],
    duration: 60, // 12 ticks, only have 2
    expected_meta: 'count > readings.length — should still produce a result or null',
  },
  {
    key: 'count_less_than_one',
    readings: [
      {timestamp: '2025-01-01T00:00:00Z', value: 5},
    ],
    duration: 1, // count = floor(1/5) = 0
    expected_meta: 'count < 1 — should return null',
  },
  {
    key: 'non_finite_values_NaN',
    readings: [
      {timestamp: '2025-01-01T00:00:00Z', value: 1},
      {timestamp: '2025-01-01T00:05:00Z', value: NaN},
      {timestamp: '2025-01-01T00:10:00Z', value: 2},
    ],
    duration: 15, // 3 ticks
    expected_meta: 'NaN propagates through sum — capture observed behaviour',
  },
];

async function run() {
  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();

  // Mock the heavy external endpoints so the page loads without sandbox network drama.
  await page.route('https://nsw-rainfall-analyser-api.onrender.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(/data\.pluviometrics\.com\.au\/.*\.json/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stations: [] }) }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => window.switchPage && window.switchPage('aep'));

  // Load fixture
  const fixturePath = resolve(FIXTURES, 'rainfall_series_synthetic_7d.json');
  const fixtureRaw = await readFile(fixturePath, 'utf-8');
  const fixture = JSON.parse(fixtureRaw);
  const readings = fixture.series;

  // Verify calcRollingMax is on window
  const fnExists = await page.evaluate(() => typeof window.calcRollingMax === 'function');
  if (!fnExists) {
    console.error('FATAL: window.calcRollingMax is not a function. The inline monolith may not have loaded.');
    await browser.close();
    server.close();
    process.exit(2);
  }

  // Fixed-fixture windows
  const main_results = {};
  for (const w of ROLLING_WINDOWS) {
    const r = await page.evaluate(([readings, dur, ival]) =>
      window.calcRollingMax(readings, dur, ival), [readings, w.duration, w.interval]);
    main_results[w.key] = r;
  }

  // Edge cases
  const edge_results = {};
  for (const ec of EDGE_CASES) {
    // NaN doesn't survive JSON round-trip — re-inject via page.evaluate factory
    const r = await page.evaluate(([readings_arg, dur, ival, hasNaN]) => {
      const readings = readings_arg.map((rec) => {
        if (rec.value === null) return { timestamp: rec.timestamp, value: NaN };
        return rec;
      });
      const result = window.calcRollingMax(readings, dur, ival);
      // Convert NaN result fields to a sentinel string for JSON-safety
      if (result && typeof result === 'object') {
        const sanitised = {};
        for (const [k, v] of Object.entries(result)) {
          sanitised[k] = (typeof v === 'number' && !Number.isFinite(v)) ? `__nonfinite_${v}__` : v;
        }
        return sanitised;
      }
      return result;
    }, [
      // Replace NaN values with null (JSON-safe), the page-side will re-inject NaN
      ec.readings.map((r) => Number.isNaN(r.value) ? { ...r, value: null } : r),
      ec.duration,
      ec.interval || 5,
      ec.readings.some((r) => Number.isNaN(r.value)),
    ]);
    edge_results[ec.key] = { result: r, expected_meta: ec.expected_meta };
  }

  await browser.close();
  server.close();

  const output = {
    _description: 'Golden output of calcRollingMax for fixed fixture + edge cases.',
    _fixture: 'rainfall_series_synthetic_7d.json',
    _function: 'window.calcRollingMax (defined in index.html inline monolith, ~line 2740)',
    rolling_windows: main_results,
    edge_cases: edge_results,
  };

  const expectedPath = resolve(EXPECTED, 'rolling_rainfall.json');

  if (CAPTURE) {
    await writeFile(expectedPath, JSON.stringify(output, null, 2) + '\n');
    console.log(`✓ CAPTURED expected output → ${expectedPath}`);
    process.exit(0);
  }

  // Verify mode
  if (!existsSync(expectedPath)) {
    console.error(`FAIL: expected file does not exist: ${expectedPath}`);
    console.error('     Run with --capture to create it (operator-approved baseline).');
    process.exit(1);
  }
  const expectedRaw = await readFile(expectedPath, 'utf-8');
  const expected = JSON.parse(expectedRaw);

  // Strict equality on the substantive fields
  const actualSerialised = JSON.stringify(output.rolling_windows);
  const expectedSerialised = JSON.stringify(expected.rolling_windows);

  if (actualSerialised !== expectedSerialised) {
    console.error('FAIL: rolling_rainfall — calcRollingMax output diverged from expected.');
    console.error('  Expected:', expectedSerialised);
    console.error('  Actual:  ', actualSerialised);
    process.exit(1);
  }

  // Edge cases: compare result fields only (expected_meta is a label)
  const actualEdges  = JSON.stringify(Object.fromEntries(Object.entries(output.edge_cases).map(([k, v]) => [k, v.result])));
  const expectedEdges = JSON.stringify(Object.fromEntries(Object.entries(expected.edge_cases).map(([k, v]) => [k, v.result])));
  if (actualEdges !== expectedEdges) {
    console.error('FAIL: rolling_rainfall edge cases — calcRollingMax behaviour diverged.');
    console.error('  Expected:', expectedEdges);
    console.error('  Actual:  ', actualEdges);
    process.exit(1);
  }

  console.log('✓ rolling_rainfall PASS — calcRollingMax matches captured expected output exactly.');
  console.log(`  ${ROLLING_WINDOWS.length} rolling windows + ${EDGE_CASES.length} edge cases verified.`);
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exit(2);
});

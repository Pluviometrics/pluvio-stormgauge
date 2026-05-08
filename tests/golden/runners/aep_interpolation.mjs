// Golden test — AEP interpolation (calcAEP).
//
// Populates synthetic ifdCache + allStations globals on the page, then
// exercises calcAEP across every bracket: below-all, mid-bracket, above-all,
// missing-duration, missing-station. Verifies output is byte-identical.
//
// Usage:
//   node tests/golden/runners/aep_interpolation.mjs            # verify
//   node tests/golden/runners/aep_interpolation.mjs --capture  # rewrite expected
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
const PORT = 9102;

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

async function run() {
  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, locale: 'en-AU' });
  const page = await ctx.newPage();

  await page.route('https://nsw-rainfall-analyser-api.onrender.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(/data\.pluviometrics\.com\.au\/.*\.json/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stations: [] }) }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => window.switchPage && window.switchPage('aep'));

  const fixturePath = resolve(FIXTURES, 'aep_test_inputs.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf-8'));
  const station = fixture.synthetic_station;

  // Verify calcAEP exists; it is defined as a top-level function so it should be on window.
  const fnExists = await page.evaluate(() => typeof window.calcAEP === 'function');
  if (!fnExists) {
    console.error('FATAL: window.calcAEP is not a function.');
    await browser.close(); server.close();
    process.exit(2);
  }

  // Inject the synthetic station + IFD into the page's ifdCache and allStations.
  // ifdCache and allStations are top-level `const`/`let` in the inline classic script;
  // they're in the script's lexical scope, accessible by bare identifier from page.evaluate.
  await page.evaluate(([stn, ifd]) => {
    // bare identifiers — these are top-level lexical bindings from index.html
    ifdCache[stn.station_id] = ifd;
    allStations.push(stn);
    return { ifdCacheKeys: Object.keys(ifdCache), allStationsLen: allStations.length };
  }, [station, fixture.synthetic_ifd]);

  // Run each test case
  const results = {};
  for (const tc of fixture.test_cases) {
    const stationId = tc.station_override || station.station_id;
    const out = await page.evaluate(([sid, dur, depth]) => {
      const r = calcAEP(sid, dur, depth);
      return r;
    }, [stationId, tc.duration, tc.depth_mm]);
    results[tc.label] = { input: { duration: tc.duration, depth_mm: tc.depth_mm, station_id: stationId }, output: out };
  }

  await browser.close();
  server.close();

  const output = {
    _description: 'Golden output of calcAEP for synthetic IFD + ' + fixture.test_cases.length + ' bracket scenarios.',
    _fixture: 'aep_test_inputs.json',
    _function: 'window.calcAEP (defined in index.html inline monolith, ~line 4600)',
    test_cases: results,
  };

  const expectedPath = resolve(EXPECTED, 'aep_interpolation.json');

  if (CAPTURE) {
    await writeFile(expectedPath, JSON.stringify(output, null, 2) + '\n');
    console.log(`✓ CAPTURED expected output → ${expectedPath}`);
    process.exit(0);
  }

  if (!existsSync(expectedPath)) {
    console.error(`FAIL: expected file does not exist: ${expectedPath}`);
    console.error('     Run with --capture to create it.');
    process.exit(1);
  }
  const expected = JSON.parse(await readFile(expectedPath, 'utf-8'));

  // Compare: each test case's output object must match exactly
  let mismatches = 0;
  for (const label of Object.keys(output.test_cases)) {
    const actualS = JSON.stringify(output.test_cases[label].output);
    const expectedS = JSON.stringify(expected.test_cases[label]?.output);
    if (actualS !== expectedS) {
      console.error(`FAIL: aep_interpolation[${label}]`);
      console.error(`  Expected: ${expectedS}`);
      console.error(`  Actual:   ${actualS}`);
      mismatches++;
    }
  }
  if (mismatches > 0) {
    console.error(`FAIL: ${mismatches} of ${Object.keys(output.test_cases).length} AEP test cases diverged.`);
    process.exit(1);
  }
  console.log(`✓ aep_interpolation PASS — calcAEP matches captured expected output across ${Object.keys(output.test_cases).length} bracket scenarios.`);
}

run().catch((e) => { console.error('FATAL:', e); process.exit(2); });

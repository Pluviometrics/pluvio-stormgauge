// Golden test — QC functions (applyRainfallQc, applyBomQc,
// _isBomCumulative, _bomCumulativeToIncrements).
//
// Locks down the behaviour of all four QC functions, including the
// well-known no-op stub status of applyRainfallQc (per CLAUDE.md
// lessons-learned).
//
// Usage:
//   node tests/golden/runners/qc_functions.mjs            # verify
//   node tests/golden/runners/qc_functions.mjs --capture  # rewrite expected
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
const PORT = 9103;

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

  const fixture = JSON.parse(await readFile(resolve(FIXTURES, 'qc_test_inputs.json'), 'utf-8'));

  const results = {};
  for (const [label, tc] of Object.entries(fixture.test_cases)) {
    const fn = tc._function;
    const readings = tc.readings;
    let out;
    if (fn === 'applyRainfallQc') {
      out = await page.evaluate(([r, m, n]) => applyRainfallQc(r, m, n), [readings, tc.intervalMinutes, tc.stationName]);
    } else if (fn === 'applyBomQc') {
      out = await page.evaluate(([r, m, n, b]) => applyBomQc(r, m, n, b), [readings, tc.intervalMinutes, tc.stationName, tc.bomId]);
    } else if (fn === '_isBomCumulative') {
      out = await page.evaluate(([r]) => _isBomCumulative(r), [readings]);
    } else if (fn === '_bomCumulativeToIncrements') {
      out = await page.evaluate(([r, n, b]) => _bomCumulativeToIncrements(r, n, b), [readings, tc.stationName, tc.bomId]);
    }
    results[label] = { _function: fn, output: out };
  }

  await browser.close();
  server.close();

  const output = {
    _description: 'Golden output of the four protected QC functions.',
    _fixture: 'qc_test_inputs.json',
    _functions: ['applyRainfallQc', 'applyBomQc', '_isBomCumulative', '_bomCumulativeToIncrements'],
    test_cases: results,
  };

  const expectedPath = resolve(EXPECTED, 'qc_functions.json');

  if (CAPTURE) {
    await writeFile(expectedPath, JSON.stringify(output, null, 2) + '\n');
    console.log(`✓ CAPTURED → ${expectedPath}`);
    process.exit(0);
  }
  if (!existsSync(expectedPath)) {
    console.error(`FAIL: ${expectedPath} missing — run with --capture`); process.exit(1);
  }
  const expected = JSON.parse(await readFile(expectedPath, 'utf-8'));
  let mismatches = 0;
  for (const label of Object.keys(output.test_cases)) {
    const a = JSON.stringify(output.test_cases[label].output);
    const e = JSON.stringify(expected.test_cases[label]?.output);
    if (a !== e) {
      console.error(`FAIL: qc_functions[${label}] (${output.test_cases[label]._function})`);
      console.error('  Expected:', e);
      console.error('  Actual:  ', a);
      mismatches++;
    }
  }
  if (mismatches > 0) { console.error(`FAIL: ${mismatches} mismatches.`); process.exit(1); }
  console.log(`✓ qc_functions PASS — ${Object.keys(output.test_cases).length} QC test cases verified across 4 protected functions.`);
}
run().catch((e) => { console.error('FATAL:', e); process.exit(2); });

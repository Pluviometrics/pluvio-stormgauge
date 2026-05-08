// Golden-test orchestrator.
//
// Runs every runner in tests/golden/runners/ in sequence and aggregates
// PASS/FAIL. Fails LOUDLY (non-zero exit) if any runner returns non-zero.
//
// Usage:
//   node tests/golden/run_golden_tests.mjs               # verify all
//   node tests/golden/run_golden_tests.mjs --capture-all # rewrite expected for all (operator-approved baseline)
//
// Individual runners can be run directly:
//   node tests/golden/runners/<runner>.mjs
//   node tests/golden/runners/<runner>.mjs --capture
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const RUNNERS    = resolve(__dirname, 'runners');

const CAPTURE_ALL = process.argv.includes('--capture-all');

const runners = readdirSync(RUNNERS)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .sort();

if (runners.length === 0) {
  console.error('FAIL: no runners found in tests/golden/runners/');
  process.exit(2);
}

const runOne = (runner) =>
  new Promise((resolveOne) => {
    const args = [resolve(RUNNERS, runner)];
    if (CAPTURE_ALL) args.push('--capture');
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.on('exit', (code) => resolveOne({ runner, code }));
  });

const results = [];
console.log(`\nRunning ${runners.length} golden runners${CAPTURE_ALL ? ' in CAPTURE-ALL mode' : ''}:\n`);
for (const r of runners) {
  console.log(`────── ${r} ──────`);
  const res = await runOne(r);
  results.push(res);
  console.log('');
}

const passed = results.filter((r) => r.code === 0);
const failed = results.filter((r) => r.code !== 0);

console.log('\n══════════════════ Summary ══════════════════');
console.log(`Total:  ${results.length}`);
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);
if (failed.length > 0) {
  console.log('\nFailed runners:');
  for (const f of failed) console.log(`  ✗ ${f.runner} (exit ${f.code})`);
  process.exit(1);
}

console.log('\n✓ All golden tests passed. No drift detected from captured baseline.');

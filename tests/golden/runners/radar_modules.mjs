// Golden test — radar modules.
//
// The radar surface already has unit tests in src/modules/radar/*.test.js
// authored against the protected archive-bound + cumulative-rainfall +
// gauge-validation-export logic. This runner executes them with
// `node --test` and treats their pass/fail as the golden signal:
// any change that breaks them flags a regression.
//
// Usage:
//   node tests/golden/runners/radar_modules.mjs   # verify (no --capture mode; tests are self-asserting)
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO       = resolve(__dirname, '..', '..', '..');
const RADAR_DIR  = resolve(REPO, 'src/modules/radar');

const testFiles = readdirSync(RADAR_DIR).filter((f) => f.endsWith('.test.js')).sort();

if (testFiles.length === 0) {
  console.error('FAIL: no *.test.js files found in src/modules/radar');
  process.exit(1);
}

console.log(`Running ${testFiles.length} radar test file(s) via node --test:`);
for (const f of testFiles) console.log(`  - ${f}`);
console.log('');

const args = ['--test', ...testFiles.map((f) => resolve(RADAR_DIR, f))];

const child = spawn(process.execPath, args, { cwd: REPO, stdio: 'inherit' });
child.on('exit', (code) => {
  if (code === 0) {
    console.log(`\n✓ radar_modules PASS — ${testFiles.length} test files all passed under node --test.`);
    process.exit(0);
  }
  console.error(`\nFAIL: radar_modules — at least one test file failed (exit code ${code}).`);
  process.exit(1);
});

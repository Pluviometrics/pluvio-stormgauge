#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load fixtures
const fixturesPath = path.join(__dirname, 'fixtures', 'sg_core_fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

let passCount = 0;
let failCount = 0;

// ─── calcAEP verifier ───────────────────────────────────────────────────────
// Re-implements the log-linear interpolation and extrapolation logic
function verifyAEP(testCase) {
  const { stationId, durationMinutes, depthMm, ifd, expected } = testCase;

  const baseRow = ifd[String(durationMinutes)];
  if (!baseRow) {
    console.log(`  FAIL: No IFD row for duration ${durationMinutes}`);
    return false;
  }

  // AEP columns and their probability values
  const AEP_ORDER = ['63.2%','50%','20%','10%','5%','2%','1%','1 in 200','1 in 500','1 in 1000'];
  const AEP_VALS  = [0.632, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01,
                     1-Math.exp(-1/200), 1-Math.exp(-1/500), 1-Math.exp(-1/1000)];

  const available = AEP_ORDER.filter(a => baseRow[a] != null);
  if (!available.length) {
    console.log(`  FAIL: No available AEP columns in IFD`);
    return false;
  }

  const depths = available.map(a => baseRow[a]);
  const probs  = available.map(a => AEP_VALS[AEP_ORDER.indexOf(a)]);

  // Case 1: Below all thresholds
  if (depthMm < depths[0]) {
    if (expected.aep !== '>63.2%') {
      console.log(`  FAIL: Below threshold, expected '>63.2%' but got '${expected.aep}'`);
      return false;
    }
    return true;
  }

  // Case 2: Above all thresholds (extrapolation)
  if (depthMm >= depths[depths.length - 1]) {
    const n = depths.length;
    const slope = (Math.log(probs[n-1]) - Math.log(probs[n-2])) / (depths[n-1] - depths[n-2]);
    const lnP   = Math.log(probs[n-1]) + slope * (depthMm - depths[n-1]);
    const p     = Math.exp(lnP);
    const pct   = Math.round(p * 100000) / 1000;
    const ari   = Math.round(1 / (-Math.log(1 - p)));

    const expectedAep = expected.aep.replace(/[~%]/g, '');
    const expectedPct = parseFloat(expectedAep);

    if (Math.abs(pct - expectedPct) > 0.001) {
      console.log(`  FAIL: AEP mismatch. Expected ${expectedPct}%, got ${pct}%`);
      return false;
    }
    if (ari !== expected.ari) {
      console.log(`  FAIL: ARI mismatch. Expected ${expected.ari}, got ${ari}`);
      return false;
    }
    return true;
  }

  // Case 3: Interpolation between columns
  for (let i = 0; i < depths.length - 1; i++) {
    if (depthMm >= depths[i] && depthMm < depths[i+1]) {
      const frac = (depthMm - depths[i]) / (depths[i+1] - depths[i]);
      const lnA  = Math.log(probs[i]);
      const lnB  = Math.log(probs[i+1]);
      const lnP  = lnA + frac * (lnB - lnA);
      const p    = Math.exp(lnP);
      const pct  = Math.round(p * 100000) / 1000;
      const ari  = Math.round(1 / (-Math.log(1 - p)));

      const expectedAep = expected.aep.replace(/[~%]/g, '');
      const expectedPct = parseFloat(expectedAep);

      if (Math.abs(pct - expectedPct) > 0.001) {
        console.log(`  FAIL: AEP mismatch. Expected ${expectedPct}%, got ${pct}%`);
        return false;
      }
      if (ari !== expected.ari) {
        console.log(`  FAIL: ARI mismatch. Expected ${expected.ari}, got ${ari}`);
        return false;
      }
      return true;
    }
  }

  console.log(`  FAIL: Depth not found in any bracket`);
  return false;
}

// ─── calcRollingMax verifier ────────────────────────────────────────────────
// Re-implements the sliding window + prefix sum logic
function verifyRollingMax(testCase) {
  const { readings, durationMinutes, intervalMinutes, expected } = testCase;

  if (!readings || !readings.length) {
    console.log(`  FAIL: No readings provided`);
    return false;
  }

  const n = readings.length;
  const vals = readings.map(r => r.value);
  const interval = Math.max(1, Number(intervalMinutes) || 5);
  const count = Math.floor(Number(durationMinutes) / interval);

  if (count < 1) {
    console.log(`  FAIL: Window size is < 1 (duration=${durationMinutes}, interval=${interval})`);
    return false;
  }

  // Prefix sums for O(n) sliding window
  const prefix = [0];
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + vals[i]);

  let maxDepth = 0, peakStart = null, peakEnd = null;

  for (let right = count - 1; right < n; right++) {
    const left = right - count + 1;
    const windowSum = prefix[right + 1] - prefix[left];
    if (windowSum > maxDepth) {
      maxDepth  = windowSum;
      peakStart = readings[left].timestamp;
      peakEnd   = readings[right].timestamp;
    }
  }

  const totalDepth = vals.reduce((a, b) => a + b, 0);
  const max_depth_mm = Math.floor(maxDepth * 100) / 100;
  const total_depth_mm = Math.round(totalDepth * 100) / 100;
  const reading_count = n;

  // Verify
  if (Math.abs(max_depth_mm - expected.max_depth_mm) > 0.01) {
    console.log(`  FAIL: max_depth_mm mismatch. Expected ${expected.max_depth_mm}, got ${max_depth_mm}`);
    return false;
  }
  if (peakStart !== expected.peak_start) {
    console.log(`  FAIL: peak_start mismatch. Expected ${expected.peak_start}, got ${peakStart}`);
    return false;
  }
  if (peakEnd !== expected.peak_end) {
    console.log(`  FAIL: peak_end mismatch. Expected ${expected.peak_end}, got ${peakEnd}`);
    return false;
  }
  if (Math.abs(total_depth_mm - expected.total_depth_mm) > 0.01) {
    console.log(`  FAIL: total_depth_mm mismatch. Expected ${expected.total_depth_mm}, got ${total_depth_mm}`);
    return false;
  }
  if (reading_count !== expected.reading_count) {
    console.log(`  FAIL: reading_count mismatch. Expected ${expected.reading_count}, got ${reading_count}`);
    return false;
  }

  return true;
}

// ─── Main test runner ──────────────────────────────────────────────────────
console.log('Running Stormgauge Core Fixtures (sg_core_fixtures.json)\n');

console.log('━━━ calcAEP Cases ━━━\n');
for (const testCase of fixtures.calcAEP_cases) {
  process.stdout.write(`[calcAEP] ${testCase.name}: `);
  if (verifyAEP(testCase)) {
    console.log('PASS');
    passCount++;
  } else {
    console.log('');
    failCount++;
  }
}

console.log('\n━━━ calcRollingMax Cases ━━━\n');
for (const testCase of fixtures.calcRollingMax_cases) {
  process.stdout.write(`[Rolling] ${testCase.name}: `);
  if (verifyRollingMax(testCase)) {
    console.log('PASS');
    passCount++;
  } else {
    console.log('');
    failCount++;
  }
}

console.log(`\n━━━ Summary ━━━`);
console.log(`PASS: ${passCount}`);
console.log(`FAIL: ${failCount}`);
console.log(`Total: ${passCount + failCount}`);

if (failCount > 0) {
  console.log('\nExit code: 1 (FAILURE)');
  process.exit(1);
} else {
  console.log('\nExit code: 0 (SUCCESS)');
  process.exit(0);
}

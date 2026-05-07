#!/usr/bin/env node
/* Stormgauge — rainfall-day grouping + NaN-display unit tests.
   Covers:
     - midnight-mode day key (default behaviour)
     - 9am-mode day key (BOM rainfall day)
     - groupReadingsByRainfallDay produces the right buckets in each mode
     - formatRainfallMm guards against NaN / undefined / null / Infinity
     - rainTodaySinceLabel pairs with the active mode

   Run:
     node tests/rainfall_day_grouping.test.mjs
*/

import {
  rainfallDayKey,
  groupReadingsByRainfallDay,
  formatRainfallMm,
  rainTodaySinceLabel,
  RAINFALL_DAY_MODES,
  RAINFALL_DAY_PERIOD_LABEL,
} from '../src/modules/rainfall/dailyGrouping.js';

let pass = 0, fail = 0;
const failures = [];

function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else    { fail++; failures.push({ label, actual, expected });
    console.log(`  FAIL  ${label}\n        actual:   ${JSON.stringify(actual)}\n        expected: ${JSON.stringify(expected)}`);
  }
}

function assert(label, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else      { fail++; failures.push({ label, detail }); console.log(`  FAIL  ${label} ${detail || ''}`); }
}

// ── midnight-mode day key ───────────────────────────────────────────────
console.log('rainfallDayKey — midnight mode:');
// Sydney is UTC+11 in January (AEDT). 13:00 UTC = 00:00 Sydney next day.
eq('Sydney just-after-midnight', rainfallDayKey('2024-01-15T13:00:00Z', 'midnight'), '2024-01-16');
eq('Sydney just-before-midnight', rainfallDayKey('2024-01-15T12:59:00Z', 'midnight'), '2024-01-15');
eq('Sydney midday',               rainfallDayKey('2024-01-15T03:00:00Z', 'midnight'), '2024-01-15'); // 14:00 Sydney
// Sydney is UTC+10 in July (AEST).
eq('AEST midday',                 rainfallDayKey('2024-07-15T04:00:00Z', 'midnight'), '2024-07-15'); // 14:00 Sydney
// Reading-style timestamp string ("YYYY-MM-DD HH:MM:SS"): treated as local-naive but
// constructor parses as ISO. Acceptable for current callers.
eq('reading-style timestamp',     rainfallDayKey('2024-01-15T03:00:00', 'midnight'), '2024-01-15');

// ── 9am-mode day key ───────────────────────────────────────────────────
console.log('\nrainfallDayKey — 9am mode (BOM):');
// 9am Sydney = 22:00 UTC previous day in AEDT (Jan).
// 8:59am Sydney = 21:59 UTC previous day. Both should belong to the SAME
// 9am day, labelled by its START date.
eq('Sydney 8:59am Jan 15',  rainfallDayKey('2024-01-14T21:59:00Z', '9am'), '2024-01-14');  // 8:59am Jan 15 → start Jan 14
eq('Sydney 9:00am Jan 15',  rainfallDayKey('2024-01-14T22:00:00Z', '9am'), '2024-01-15');  // 9:00am Jan 15 → start Jan 15
eq('Sydney 11:59pm Jan 15', rainfallDayKey('2024-01-15T12:59:00Z', '9am'), '2024-01-15');  // 11:59pm Jan 15 → still day Jan 15
eq('Sydney 12:00am Jan 16', rainfallDayKey('2024-01-15T13:00:00Z', '9am'), '2024-01-15');  // midnight Jan 16 → still day Jan 15
eq('Sydney 8:59am Jan 16',  rainfallDayKey('2024-01-15T21:59:00Z', '9am'), '2024-01-15');  // 8:59am Jan 16 → still day Jan 15
eq('Sydney 9:00am Jan 16',  rainfallDayKey('2024-01-15T22:00:00Z', '9am'), '2024-01-16');  // 9:00am Jan 16 → start Jan 16

// AEST (winter, UTC+10): 9am Sydney = 23:00 UTC previous day.
eq('AEST 8:59am Jul 15',    rainfallDayKey('2024-07-14T22:59:00Z', '9am'), '2024-07-14');
eq('AEST 9:00am Jul 15',    rainfallDayKey('2024-07-14T23:00:00Z', '9am'), '2024-07-15');

// ── groupReadingsByRainfallDay ─────────────────────────────────────────
console.log('\ngroupReadingsByRainfallDay:');
const readings = [
  { timestamp: '2024-01-14T22:00:00Z', value: 1.5 },  // Sydney  9:00am Jan 15
  { timestamp: '2024-01-15T03:00:00Z', value: 2.5 },  // Sydney  2:00pm Jan 15
  { timestamp: '2024-01-15T12:30:00Z', value: 3.0 },  // Sydney 11:30pm Jan 15
  { timestamp: '2024-01-15T13:00:00Z', value: 4.0 },  // Sydney 12:00am Jan 16
  { timestamp: '2024-01-15T21:30:00Z', value: 5.0 },  // Sydney  8:30am Jan 16
  { timestamp: '2024-01-15T22:00:00Z', value: 6.0 },  // Sydney  9:00am Jan 16
];

eq('midnight buckets', groupReadingsByRainfallDay(readings, 'midnight'), {
  '2024-01-15': 1.5 + 2.5 + 3.0,        // first three readings fall on Sydney Jan 15
  '2024-01-16': 4.0 + 5.0 + 6.0,        // remaining three fall on Sydney Jan 16
});

eq('9am buckets', groupReadingsByRainfallDay(readings, '9am'), {
  '2024-01-15': 1.5 + 2.5 + 3.0 + 4.0 + 5.0,    // 9am Jan 15 → 8:59am Jan 16
  '2024-01-16': 6.0,                            // starts at 9am Jan 16
});

eq('non-finite values are skipped', groupReadingsByRainfallDay([
  { timestamp: '2024-01-15T03:00:00Z', value: 1.0 },
  { timestamp: '2024-01-15T03:00:00Z', value: NaN },
  { timestamp: '2024-01-15T03:00:00Z', value: 'oops' },
  { timestamp: '2024-01-15T03:00:00Z', value: null },
  { timestamp: '2024-01-15T03:00:00Z', value: 2.0 },
], 'midnight'), { '2024-01-15': 3.0 });

eq('empty input', groupReadingsByRainfallDay([], 'midnight'), {});
eq('null input',  groupReadingsByRainfallDay(null, 'midnight'), {});

// ── formatRainfallMm — NaN-display fix ─────────────────────────────────
console.log('\nformatRainfallMm — NaN/null/undefined guards:');
eq('finite number',              formatRainfallMm(12.345),         '12.3 mm');
eq('zero',                       formatRainfallMm(0),               '0.0 mm');
eq('two decimals',               formatRainfallMm(1.234, 2),       '1.23 mm');
eq('NaN → fallback',             formatRainfallMm(NaN),             '-');
eq('Infinity → fallback',        formatRainfallMm(Infinity),        '-');
eq('-Infinity → fallback',       formatRainfallMm(-Infinity),       '-');
eq('undefined → fallback',       formatRainfallMm(undefined),       '-');
eq('null → fallback',            formatRainfallMm(null),            '-');
eq('non-numeric string → fb',    formatRainfallMm('hello'),         '-');
eq('numeric string parses',      formatRainfallMm('5.5'),           '5.5 mm');
eq('explicit fallback',          formatRainfallMm(NaN, 1, 'n/a'),   'n/a');

// ── rainTodaySinceLabel ────────────────────────────────────────────────
console.log('\nrainTodaySinceLabel:');
eq('midnight label', rainTodaySinceLabel('midnight'), 'since midnight');
eq('9am label',      rainTodaySinceLabel('9am'),      'since 9am');
eq('default label',  rainTodaySinceLabel(),           'since midnight');

// ── exposed constants ─────────────────────────────────────────────────
console.log('\nconstants:');
assert('two modes exposed', RAINFALL_DAY_MODES.length === 2 &&
  RAINFALL_DAY_MODES.includes('midnight') &&
  RAINFALL_DAY_MODES.includes('9am'));
assert('period label has midnight key', typeof RAINFALL_DAY_PERIOD_LABEL.midnight === 'string');
assert('period label has 9am key',      typeof RAINFALL_DAY_PERIOD_LABEL['9am']   === 'string');

// ── Summary ────────────────────────────────────────────────────────────
console.log('\nsummary:');
console.log(`  ${pass} pass · ${fail} fail`);
if (fail > 0) {
  console.log('\nfailures:');
  for (const f of failures) console.log(`  - ${f.label}`);
  process.exit(1);
}
process.exit(0);

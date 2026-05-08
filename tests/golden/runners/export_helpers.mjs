// Golden test — export helpers (csvEscape, csvRow, csvSlug).
//
// Pure ESM utilities — direct Node import. Locks down the CSV escape rules
// and the slug rule used in export filenames.
//
// Usage:
//   node tests/golden/runners/export_helpers.mjs            # verify
//   node tests/golden/runners/export_helpers.mjs --capture  # rewrite expected
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO       = resolve(__dirname, '..', '..', '..');
const EXPECTED   = resolve(__dirname, '..', 'expected');
const CAPTURE = process.argv.includes('--capture');

const { csvEscape, csvRow, csvSlug } = await import(
  resolve(REPO, 'src/modules/exports/exportHelpers.js').replace(/\\/g, '/').replace(/^([A-Z]):/, 'file:///$1:')
);

const ESCAPE_CASES = [
  ['plain string', 'plain string'],
  ['has, comma', 'comma'],
  ['has "quote', 'quote'],
  ['has\nnewline', 'newline'],
  ['has\r\ncrlf', 'crlf'],
  [null, 'null'],
  [undefined, 'undefined'],
  [42, 'number'],
  ['', 'empty'],
  ['   ', 'whitespace'],
  ['"already quoted"', 'pre-quoted'],
  [`a,b\n"c\n"d`, 'all-edge'],
];

const ROW_CASES = [
  [['a', 'b', 'c'], 'simple'],
  [['has,comma', 'plain', 'has"quote'], 'mixed-escapes'],
  [[1, 2, 3.14, null], 'numeric-and-null'],
  [[], 'empty-row'],
];

const SLUG_CASES = [
  ['Hello World',         'simple'],
  ['BoM Station 067114',  'station-name-with-numbers'],
  ['SYDNEY (OBSERVATORY HILL)', 'parens-and-caps'],
  ['  trim me  ',         'leading-trailing-whitespace'],
  ['multiple --- dashes', 'collapse-dashes'],
  ['unicode é à ñ',       'non-ascii'],
  ['',                    'empty'],
  [null,                  'null-input'],
  ['---',                 'all-dashes'],
];

const escape_results = ESCAPE_CASES.map(([inp, label]) => ({ label, input: inp, output: csvEscape(inp) }));
const row_results = ROW_CASES.map(([inp, label]) => ({ label, input: inp, output: csvRow(...inp) }));
const slug_results = SLUG_CASES.map(([inp, label]) => ({ label, input: inp, output: csvSlug(inp) }));

const output = {
  _description: 'Golden output of export helpers (csvEscape, csvRow, csvSlug).',
  _module: 'src/modules/exports/exportHelpers.js',
  csv_escape: escape_results,
  csv_row: row_results,
  csv_slug: slug_results,
};

const expectedPath = resolve(EXPECTED, 'export_helpers.json');

if (CAPTURE) {
  await writeFile(expectedPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`✓ CAPTURED → ${expectedPath}`);
  process.exit(0);
}
if (!existsSync(expectedPath)) { console.error(`FAIL: ${expectedPath} missing`); process.exit(1); }
const expected = JSON.parse(await readFile(expectedPath, 'utf-8'));

const a = JSON.stringify({ csv_escape: output.csv_escape, csv_row: output.csv_row, csv_slug: output.csv_slug });
const e = JSON.stringify({ csv_escape: expected.csv_escape, csv_row: expected.csv_row, csv_slug: expected.csv_slug });

if (a !== e) {
  console.error('FAIL: export_helpers — output diverged.');
  // Find which sub-set diverged
  for (const k of ['csv_escape', 'csv_row', 'csv_slug']) {
    const aS = JSON.stringify(output[k]);
    const eS = JSON.stringify(expected[k]);
    if (aS !== eS) {
      console.error(`  Section: ${k}`);
      console.error(`    Expected: ${eS}`);
      console.error(`    Actual:   ${aS}`);
    }
  }
  process.exit(1);
}
console.log(`✓ export_helpers PASS — ${ESCAPE_CASES.length + ROW_CASES.length + SLUG_CASES.length} cases verified.`);

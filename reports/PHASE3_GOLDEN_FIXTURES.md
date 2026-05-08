# PHASE3_GOLDEN_FIXTURES

**Branch:** `feature/phase3-golden-fixtures-stormgauge`
**Base:** synthetic merge of `feature/phase1-safe-hardening-stormgauge` into `feature/phase2b-safe-cleanup-stormgauge` (which is off `origin/staging`). The user prompt specified base "staging after Phase 1 and Phase 2B are merged"; since those PRs aren't yet merged, this synthetic merge approximates the post-merge state. Once both PRs land on `staging`, the harness can be re-baselined off real `staging` with no expected change in captured values (the protected algorithms are unchanged across all three branches).
**Date:** 2026-05-08.

---

## What this delivers

A reproducibility harness that proves future changes do not silently alter trusted Stormgauge outputs. **142 individual test cases across 6 runners**, covering the protected scientific algorithms (AEP, IFD, rolling rainfall, QC, BOM cumulative handling) and the active-runtime support modules (station normalisation, export helpers, radar availability).

This is the work that `MODULE_SPLIT_REPORT.md` and `DATASET_EXTERNALISATION.md` flagged as a Phase 2 prerequisite. With this harness in place, the high-risk architectural items in the audit punch list (monolith split, dataset externalisation, Render API migration) can be attempted **with byte-exact safety on the protected scientific surface**.

---

## Layout

```
tests/golden/
├── fixtures/
│   ├── build_rainfall_series.py            # Deterministic generator (no randomness)
│   ├── rainfall_series_synthetic_7d.json   # 2,016 readings × 5-min intervals × 7 days, 129.1 mm total
│   ├── aep_test_inputs.json                # Synthetic IFD + 12 bracket scenarios
│   └── qc_test_inputs.json                 # 10 QC scenarios across 4 protected functions
├── expected/                               # Captured baseline outputs
│   ├── rolling_rainfall.json
│   ├── aep_interpolation.json
│   ├── qc_functions.json
│   ├── station_normaliser.json
│   └── export_helpers.json
├── runners/
│   ├── rolling_rainfall.mjs        # Playwright + window.calcRollingMax
│   ├── aep_interpolation.mjs       # Playwright + window.calcAEP
│   ├── qc_functions.mjs            # Playwright + 4 protected QC functions
│   ├── station_normaliser.mjs      # Direct ESM import
│   ├── export_helpers.mjs          # Direct ESM import
│   └── radar_modules.mjs           # node --test wrapper for src/modules/radar/*.test.js
├── run_golden_tests.mjs            # Top-level orchestrator
└── README.md                       # Operator documentation
```

---

## Coverage breakdown

### Protected scientific algorithms (CLAUDE.md mandates)

| Function | Source | Cases | Method |
|---|---|---|---|
| `calcRollingMax` | `index.html:2740` (inline classic block) | 7 windows + 5 edge cases | Playwright `page.evaluate(() => window.calcRollingMax(...))` |
| `calcAEP` | `index.html:4600` | 12 bracket scenarios | Playwright; populates synthetic `ifdCache` + `allStations` first |
| `applyRainfallQc` | `index.html:2793` | 3 cases | Playwright. **Locks down the no-op stub status** flagged in CLAUDE.md lessons-learned. |
| `applyBomQc` | `index.html:2908` | 4 cases | Playwright |
| `_isBomCumulative` | `index.html:2871` | 2 cases | Playwright |
| `_bomCumulativeToIncrements` | `index.html:2886` | 1 case | Playwright |
| `normaliseConsolidatedRainfallStation` | `src/modules/stations/stationLoader.js` | 8 cases | Direct ESM (Node) |

**Total protected-algorithm cases: 42.**

### Active runtime support

| Module | Cases | Method |
|---|---|---|
| `src/modules/exports/exportHelpers.js` (`csvEscape`, `csvRow`, `csvSlug`) | 25 | Direct ESM (Node) |
| `src/modules/radar/*.js` via `*.test.js` | 75 | `node --test` wrapper |

**Total support-surface cases: 100.**

---

## Why these specific functions

| Function | Reason |
|---|---|
| `calcRollingMax` | Lessons-learned: `Math.floor` not `Math.round`; `>` not `>=` in window. Most-cited protected algorithm in CLAUDE.md. |
| `calcAEP` | The core IFD interpolation. Any drift here produces wrong rarity classifications. |
| `applyRainfallQc` | CLAUDE.md flags this as a no-op stub that must hard-reject in future. The golden test locks down current behaviour so an "improvement" isn't shipped silently. |
| `applyBomQc` | Active QC logic; rejects invalid + isolated spikes. Behaviour-defining. |
| `_isBomCumulative` + `_bomCumulativeToIncrements` | BOM gauge handling — lessons-learned: `BOM daily totals can appear in 30-min timestamped series; classify by non-zero reading spacing, not mode delta alone.` These are the classifiers that protect against that. |
| `normaliseConsolidatedRainfallStation` | Single station normaliser — input shape gate before everything downstream. |
| `exportHelpers` | CSV escape rules are easy to get wrong; locking them ensures CSV exports remain spec-correct. |
| `radar_modules` (existing tests) | 75 prior assertions — wrapping them treats each test failure as a Phase 3 regression. |

---

## What's NOT covered (acknowledged limitations)

| Surface | Why deferred | Suggested follow-up |
|---|---|---|
| `exportXLSX` (XLSX file generation) | Output is a binary blob with embedded creation-timestamps that are not byte-deterministic. A structural-schema test (sheet names, row/column counts, sampled cell values) is doable but requires a Playwright runner that actually triggers the export and unzips the resulting blob. | New runner `xlsx_export.mjs` with structural assertions. |
| `exportPNG` (`html2canvas`) | Output depends on browser font rasterisation — not byte-deterministic across machines. | Either skip or assert metadata only. |
| Packaging algorithm (condition 7/8 filter, diameter-first grouping, value/count packages, ZIP manifest) | Substantial fixture (synthetic asset register CSV) required; logic spans multiple inline functions including `runAnalysis` paths. | New runner `packaging.mjs` + `packaging_pipes_mini.csv` fixture. Out of scope for first golden harness. |
| Future Works backlog row shape | UI-driven; depends on rendered DOM and the new operator-config mechanism. | New runner `future_works.mjs` once the underlying flow is more stable. |
| Top durations ordering / Top per site | Depends on full station load + analysis flow; needs mocked Render API responses. | New runner `top_durations.mjs`. |
| 500 m proximity dedup (MHL preferred over BoM) | **Not currently in the codebase** — `git grep` finds no such logic. The Phase 2A audit listed it speculatively. | If the behaviour is ever added, add a runner alongside it. |
| DST boundary handling | Stormgauge does not currently special-case DST; timestamps are treated as UTC throughout. There is no DST-related code path to capture. | If DST handling is added in future, capture then. |
| Live external services (Render API, MHL KiWIS, BOM radar tiles, `data.pluviometrics.com.au`) | Unstable in test environments. | Already mocked at Playwright `route` level. |

These deferrals are intentional. The current scope captures the most-cited and most-protected logic; later additions can extend the harness without disrupting the existing baseline.

---

## How to run

No top-level `package.json` was created — Stormgauge has not had one to date and adding `"type": "module"` could change the resolution behaviour of any sibling `.js` script that expected CommonJS. The exact commands are:

```bash
# Verify all (default — fail loudly on any drift)
node tests/golden/run_golden_tests.mjs

# Re-baseline ALL (only with operator approval; commits a new expected/ set)
node tests/golden/run_golden_tests.mjs --capture-all

# Run an individual runner
node tests/golden/runners/rolling_rainfall.mjs
node tests/golden/runners/rolling_rainfall.mjs --capture
```

Runtime requirements:
- **Node ≥ 18** with built-in `node:test` (verified on Node 24.14.1 in this development environment).
- **Playwright** with Chromium installed — already in this repo's `node_modules` from prior work. The Playwright-based runners spin up an in-process HTTP server on ports 9101/9102/9103 and load Stormgauge against `http://127.0.0.1:<port>/`.

---

## Determinism guarantees

- The 7-day rainfall series (`rainfall_series_synthetic_7d.json`) is generated by a Python script with **no randomness** — re-running `build_rainfall_series.py` produces a byte-identical fixture.
- Synthetic IFD coefficients are integer / one-decimal values to avoid IEEE-754 last-digit drift.
- Playwright contexts pin `locale: 'en-AU'` to keep `Number.toLocaleString()` outputs in `calcAEP`'s interpretation strings consistent.
- All Playwright route handlers mock the external endpoints so capture/verify outputs do not depend on Render API state, MHL KiWIS uptime, or BOM tile reachability.
- The `expected/` JSON files are formatted with `JSON.stringify(value, null, 2)` for diff-friendly review.

---

## Files added (Phase 3)

| Path | Purpose |
|---|---|
| `tests/golden/README.md` | Operator documentation |
| `tests/golden/run_golden_tests.mjs` | Orchestrator |
| `tests/golden/fixtures/build_rainfall_series.py` | Fixture generator |
| `tests/golden/fixtures/rainfall_series_synthetic_7d.json` | 7-day synthetic series (2,016 readings) |
| `tests/golden/fixtures/aep_test_inputs.json` | AEP synthetic IFD + 12 cases |
| `tests/golden/fixtures/qc_test_inputs.json` | QC synthetic series + 10 cases |
| `tests/golden/expected/rolling_rainfall.json` | Captured rolling output |
| `tests/golden/expected/aep_interpolation.json` | Captured AEP output |
| `tests/golden/expected/qc_functions.json` | Captured QC output |
| `tests/golden/expected/station_normaliser.json` | Captured normaliser output |
| `tests/golden/expected/export_helpers.json` | Captured export-helper output |
| `tests/golden/runners/rolling_rainfall.mjs` | calcRollingMax runner |
| `tests/golden/runners/aep_interpolation.mjs` | calcAEP runner |
| `tests/golden/runners/qc_functions.mjs` | QC functions runner |
| `tests/golden/runners/station_normaliser.mjs` | normaliser runner |
| `tests/golden/runners/export_helpers.mjs` | export helpers runner |
| `tests/golden/runners/radar_modules.mjs` | radar tests wrapper |
| `reports/PHASE3_GOLDEN_FIXTURES.md` | This file |
| `reports/PHASE3_VALIDATION.md` | Validation log |

**Production-code edits in Phase 3: zero.** Verified via `git diff --name-status HEAD` (empty modification list — only additions).

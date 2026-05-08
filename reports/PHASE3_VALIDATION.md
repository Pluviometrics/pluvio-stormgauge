# PHASE3_VALIDATION

**Branch:** `feature/phase3-golden-fixtures-stormgauge`
**Date:** 2026-05-08.

## Verdict

**6 runners, 142 individual test cases, all PASS.** Zero production code modified. The harness is reproducible end-to-end.

## Run log

```text
$ node tests/golden/run_golden_tests.mjs

Running 6 golden runners:

────── aep_interpolation.mjs ──────
✓ aep_interpolation PASS — calcAEP matches captured expected output across 12 bracket scenarios.

────── export_helpers.mjs ──────
✓ export_helpers PASS — 25 cases verified.

────── qc_functions.mjs ──────
✓ qc_functions PASS — 10 QC test cases verified across 4 protected functions.

────── radar_modules.mjs ──────
ℹ tests 75
ℹ pass 75
ℹ fail 0
✓ radar_modules PASS — 4 test files all passed under node --test.

────── rolling_rainfall.mjs ──────
✓ rolling_rainfall PASS — calcRollingMax matches captured expected output exactly.
  7 rolling windows + 5 edge cases verified.

────── station_normaliser.mjs ──────
✓ station_normaliser PASS — 8 cases verified.

══════════════════ Summary ══════════════════
Total:  6
Passed: 6
Failed: 0

✓ All golden tests passed. No drift detected from captured baseline.
```

## Test-case totals

| Runner | Cases | Method |
|---|---|---|
| `rolling_rainfall.mjs` | 12 (7 windows + 5 edges) | Playwright |
| `aep_interpolation.mjs` | 12 brackets | Playwright |
| `qc_functions.mjs` | 10 (across 4 protected fns) | Playwright |
| `station_normaliser.mjs` | 8 | Node ESM |
| `export_helpers.mjs` | 25 | Node ESM |
| `radar_modules.mjs` | 75 (4 test files) | `node --test` wrapper |
| **Total** | **142** | |

## Pre-existing test integration

The runner `radar_modules.mjs` wraps the existing 75 tests in `src/modules/radar/*.test.js` (radarArchiveIndex, radarAvailability, radarCumulativeRainfall, radarGaugeValidationExport). They had no formal "run all" command before Phase 3; the harness now treats their pass/fail as part of the golden contract.

## No-runtime-change confirmation

```text
$ git diff --name-status HEAD
(empty)
```

Only additions under `tests/golden/` and two reports. No `index.html`, `src/modules/`, `data/`, or `Assets/` content was modified.

## Reproducibility check

Each runner was run twice — once in `--capture` mode to write the baseline, once in default verify mode to confirm the captured output is reproducible. All 6 verify runs passed without any byte-level drift.

The fixture generator (`build_rainfall_series.py`) was run multiple times during development; its output was confirmed byte-stable across runs.

## How a future regression would surface

A change to (for example) `calcRollingMax` that altered the rolling-window math would produce, on the next CI / pre-merge `node tests/golden/run_golden_tests.mjs` invocation:

```text
FAIL: rolling_rainfall — calcRollingMax output diverged from expected.
  Expected: {"5min":{"max_depth_mm":8,...}}
  Actual:   {"5min":{"max_depth_mm":8.5,...}}
```

The merge is blocked; the operator inspects the change. Three resolutions:
1. Revert the source change.
2. Apply with operator approval and re-baseline via `--capture`.
3. Investigate environment drift (Node major-version bump, browser font change).

## Known caveats

- **External services are mocked.** The Playwright runners do not test real Render API / MHL / BOM behaviour. They cannot detect upstream-API contract changes; they only protect Stormgauge's local computation against drift.
- **`--capture-all` is dangerous.** Running it without operator approval would silence any failing test by re-baselining to the new (potentially wrong) output. The README calls this out explicitly.
- **`exportXLSX`, `exportPNG`, and packaging are NOT covered.** See `PHASE3_GOLDEN_FIXTURES.md` "What's NOT covered" for the deferred list.

## Recommendation

Approve and merge `feature/phase3-golden-fixtures-stormgauge`. Once landed on `staging`, the harness becomes the gating signal for future Phase 2-style architectural work (monolith split, dataset externalisation): no PR that breaks `node tests/golden/run_golden_tests.mjs` should reach `staging`.

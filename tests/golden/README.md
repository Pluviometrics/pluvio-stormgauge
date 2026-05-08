# Golden test harness — Stormgauge

Reproducibility harness that locks in the current behaviour of Stormgauge's protected algorithms. The intent is operational: **any change that produces different output for a captured fixture must FAIL the test loudly**, so accidental drift in AEP / IFD / rolling rainfall / radar availability / station normalisation / export helpers cannot reach `staging`.

This is the artefact that `MODULE_SPLIT_REPORT.md` and `DATASET_EXTERNALISATION.md` flagged as a Phase 2 prerequisite. With this harness in place, future architectural work (monolith split, dataset externalisation) becomes safe to attempt.

---

## Layout

```
tests/golden/
├── fixtures/              # Fixed input data (do NOT regenerate without operator approval)
│   ├── rainfall_series_synthetic_7d.json
│   ├── build_rainfall_series.py        # Deterministic generator for the above
│   ├── aep_test_inputs.json
│   └── qc_test_inputs.json
├── expected/              # Captured expected outputs (do NOT edit by hand)
│   ├── rolling_rainfall.json
│   ├── aep_interpolation.json
│   ├── qc_functions.json
│   ├── station_normaliser.json
│   └── export_helpers.json
├── runners/
│   ├── rolling_rainfall.mjs       # protected: calcRollingMax (Playwright)
│   ├── aep_interpolation.mjs      # protected: calcAEP, getIfdDepthForAep (Playwright)
│   ├── qc_functions.mjs           # protected: applyRainfallQc, applyBomQc, _isBomCumulative, _bomCumulativeToIncrements (Playwright)
│   ├── station_normaliser.mjs     # protected: normaliseConsolidatedRainfallStation (Node ESM)
│   ├── export_helpers.mjs         # csvEscape, csvRow, csvSlug (Node ESM)
│   └── radar_modules.mjs          # wraps src/modules/radar/*.test.js (node --test)
├── run_golden_tests.mjs           # Top-level orchestrator
└── README.md                      # this file
```

---

## How to run

```bash
# verify all
node tests/golden/run_golden_tests.mjs

# capture / re-baseline ALL — only when an algorithm change is intentional and operator-approved
node tests/golden/run_golden_tests.mjs --capture-all

# run an individual runner
node tests/golden/runners/rolling_rainfall.mjs
node tests/golden/runners/rolling_rainfall.mjs --capture
```

The Playwright-based runners (`rolling_rainfall`, `aep_interpolation`, `qc_functions`) require Stormgauge's existing `node_modules/playwright` — already installed in this repo from prior work.

The Node-only runners (`station_normaliser`, `export_helpers`, `radar_modules`) need just Node ≥ 18 with built-in `node:test`.

---

## What's covered

### Protected scientific algorithms (CLAUDE.md mandates)

| Function | Runner | Cases | Notes |
|---|---|---|---|
| `calcRollingMax` | `rolling_rainfall.mjs` | 7 windows + 5 edge cases | 5 min / 30 min / 1 h / 6 h / 24 h / 72 h / 168 h plus empty / all-zero / count-too-small / non-finite / duration-exceeds-data. Uses `Math.floor` per CLAUDE.md lessons-learned. |
| `calcAEP` | `aep_interpolation.mjs` | 12 bracket scenarios | Below-all-thresholds, exact thresholds, mid-bracket log-linear interpolation, above-all (tail extrapolation), missing-duration, missing-station. |
| `applyRainfallQc` | `qc_functions.mjs` | 3 cases | **Locks down the no-op stub behaviour** noted in CLAUDE.md lessons-learned. Function returns input unchanged; only logs. |
| `applyBomQc` | `qc_functions.mjs` | 4 cases | Cleaned vs rejected partitioning (invalid values, isolated spikes >10× neighbour AND >20 mm). |
| `_isBomCumulative` | `qc_functions.mjs` | 2 cases | Cumulative-detection heuristic. |
| `_bomCumulativeToIncrements` | `qc_functions.mjs` | 1 case | Negative diffs discarded; first reading skipped. |
| `normaliseConsolidatedRainfallStation` | `station_normaliser.mjs` | 8 cases | MHL / BOM / wrong-type / missing-coords / unknown-source / data_identifier-fallback. |

### Active runtime surfaces

| Module | Runner | Cases | Notes |
|---|---|---|---|
| `src/modules/exports/exportHelpers.js` | `export_helpers.mjs` | 25 cases | csvEscape (12), csvRow (4), csvSlug (9). |
| `src/modules/radar/*.js` | `radar_modules.mjs` | 75 tests across 4 files | Wraps existing `*.test.js` runs via `node --test`. |

---

## What's NOT covered (acknowledged limitations)

| Surface | Why deferred | Suggested follow-up |
|---|---|---|
| `exportXLSX` | Output is a binary blob with embedded timestamps that are not byte-deterministic; a structural-schema test (sheet names, row count, column count, sampled cell values) is doable but needs a Playwright runner that triggers the export. | Add `xlsx_export.mjs` capturing structural schema, not bytes. |
| `exportPNG` (`html2canvas`) | Output depends on browser font rasterisation — not byte-deterministic across machines. | Either skip entirely or capture a metadata-only test (image dimensions, presence of expected DOM under capture). |
| Packaging condition 7/8 / diameter-first / value/count packages / ZIP manifest | The packaging logic ingests a CSV of pipes and produces an in-browser ZIP. Substantial fixture (synthetic asset register) required. | Add `packaging.mjs` runner + `packaging_pipes_mini.csv` fixture in a follow-up. Out of scope for first golden harness. |
| Future Works backlog row shape | UI-driven; depends on rendered DOM. | Add `future_works.mjs` with structural assertions on the populated DOM. |
| Top durations ordering | Same — needs full analysis flow with mocked station data and live Render API or mocked equivalent. | Add `top_durations.mjs` once the dependent fixtures are in place. |
| 500 m proximity dedup (MHL preferred over BoM) | **Not currently in the codebase** — Phase 2A audit noted this as a candidate behaviour but `git grep` finds no implementation. Capturing a test for non-existent code would mislead future operators. | If the behaviour is added in future, add a runner alongside it. |
| Live MHL KiWIS / BOM radar tile fetches | External services; unstable in test environments. | Mock at Playwright `route` level — already done for the Render API and `data.pluviometrics.com.au` in the harness. |

---

## How to interpret a failure

When `run_golden_tests.mjs` fails, the runner prints the diverging output:

```
FAIL: rolling_rainfall — calcRollingMax output diverged from expected.
  Expected: {"5min":{"max_depth_mm":8,...}}
  Actual:   {"5min":{"max_depth_mm":8.5,...}}
```

This means a change in source code has altered a captured output. Three possibilities:

1. **Bug introduced.** Revert the source change.
2. **Intentional algorithm change with operator approval.** Re-capture with `--capture` for the specific runner. Commit the new expected file with a message that explains the intentional change.
3. **Browser / Node version drift.** Check that `node --version` and `playwright` versions match the runner's expectations.

**Never `--capture-all` to silence a failing test without first understanding why it failed.**

---

## Determinism considerations

The Playwright-based runners pin browser locale to `en-AU` to avoid `toLocaleString` drift in `calcAEP`'s `interpretation` text. The fixture rainfall series is generated by a deterministic Python script (no random seed needed; values are coded). Synthetic IFD tables avoid floats that round to different last-digit values across IEEE-754 implementations.

Despite these precautions, expected outputs may shift on a Node major-version bump or a Chromium font-rendering change. If the harness fails on CI but passes locally, suspect environment drift before suspecting source drift.

---

## Adding a new runner

1. Drop a new `.mjs` file in `runners/`. Implement `--capture` and verify modes.
2. The orchestrator picks it up automatically.
3. On first capture, commit the new `expected/<name>.json` alongside the runner.
4. Add an entry to the table in this README.

Naming convention: `<surface_or_function>.mjs`. Skip `_` prefixed files (reserved for shared helpers).

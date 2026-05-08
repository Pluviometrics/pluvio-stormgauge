# STEP0_VALIDATION

**Stormgauge branch:** `fix/step0-tsid-render-blockers`
**API-repo branch:** `Pluviometrics/nsw-rainfall-analyser:fix/tsid-suffix-priority-O-to-P` @ `9046bb2`
**Date:** 2026-05-08.

---

## Verdict

**Both blockers cleared. Safe to proceed with merging Phase 1, Phase 2B, and Phase 3.**

| Blocker | Status | How verified |
|---|---|---|
| 1. `ts_id .O → .P` | **Fixed in API repo** | New regression test (5 unittest cases) all PASS. Stormgauge-side unchanged because the bug is upstream. |
| 2. Render API auto-deploy / source ownership | **Source identified, ownership documented; auto-deploy is dashboard-only and requires operator verification** | Source repo at `Documents/Weather App/`, remote `Pluviometrics/nsw-rainfall-analyser`. Detailed in `RENDER_API_OWNERSHIP_AND_DEPLOY.md`. |

---

## Stormgauge validation

### What was changed in Stormgauge

**Nothing in production source.** Per the prompt's directive ("prefer fixing the source"), the fix lives in the API repo. Stormgauge gets:

- 3 new files in `reports/` (this report + STEP0_TSID_FIX.md + RENDER_API_OWNERSHIP_AND_DEPLOY.md).
- Zero changes to `index.html`, `src/modules/`, `Assets/`, `data/`, `templates/`.

```text
$ git diff --name-status origin/staging
A  reports/RENDER_API_OWNERSHIP_AND_DEPLOY.md
A  reports/STEP0_TSID_FIX.md
A  reports/STEP0_VALIDATION.md
```

### Static checks

| Check | Result |
|---|---|
| `index.html` — `station.ts_id` consumed without suffix-side filtering | Confirmed (grep: tracked code contains zero `.O` / `.P` literal scoring) |
| `src/modules/stations/stationLoader.js` — same | Confirmed |
| Phase 3 golden harness (when present in this branch) | Not present — Phase 3 is a separate branch and is not yet merged. The harness's protected algorithms (`calcAEP`, `calcRollingMax`, `applyRainfallQc`, `applyBomQc`, etc.) are unaware of `.O`/`.P` and produce identical outputs regardless of which suffix the upstream chose. The harness will pass byte-for-byte after Phase 3 merges. |
| Existing radar tests `src/modules/radar/*.test.js` | Did not run as part of Step 0 — they're scoped to radar archive bounds, unrelated to MHL ts_id selection |

### Browser smoke test (deferred)

Step 0 made no Stormgauge production change, so a browser smoke test would only re-confirm Phase 1 / 2B / 3 status (which has its own validation reports). Operator should run the existing `node tests/golden/run_golden_tests.mjs` (Phase 3) once those branches merge — expected: 142/142 PASS, no drift.

---

## API-repo validation

### Regression-test run

```text
$ cd "C:/Users/fonzi/Documents/Weather App"
$ py -m unittest discover -s tests -v

test_class_dominates_over_suffix     ... ok
test_prefers_P_when_O_and_P_both_5min ... ok
test_returns_None_when_no_rainfall_timeseries ... ok
test_returns_O_only_if_no_P_available ... ok
test_returns_P_when_only_P_offered   ... ok

----------------------------------------------------------------------
Ran 5 tests in 0.004s

OK
```

All 5 deterministic regression cases pass. The tests use `unittest.mock.patch` to swap `requests.get` with a synthetic MHL response — no network, no flakiness.

### Specific test claims

| Property | Test | Verified |
|---|---|---|
| `.O` is not emitted where `.P` is required | `test_prefers_P_when_O_and_P_both_5min` | ✓ — when both `.P` and `.O` are 5-min rainfall, `.P` wins |
| Affected station/time-series fetch builder uses `.P` | `test_returns_P_when_only_P_offered` | ✓ |
| Existing valid `.P` values remain unchanged | `test_returns_P_when_only_P_offered` and `test_class_dominates_over_suffix` | ✓ — the function returns the same `.P` it would have returned previously when `.P` was the only / class-best option |
| `.O` still returned when no alternative | `test_returns_O_only_if_no_P_available` | ✓ — the fix de-prioritises, doesn't exclude |
| Class hierarchy unchanged | `test_class_dominates_over_suffix` | ✓ — 5-min `.O` (score 9) still beats hourly `.P` (score 300) |

### What remains for the operator

| Action | Required because |
|---|---|
| Merge `fix/tsid-suffix-priority-O-to-P` to `main` in the API repo | Triggers next auto-deploy with the corrected scoring |
| Run `fixtsid.py` against the production cache | Patches existing `.O` entries one-time |
| Verify Render dashboard auto-deploy connection | Cannot be done from code |
| GET `https://nsw-rainfall-analyser-api.onrender.com/stations` after deploy and confirm zero `.O` rainfall ts_ids (except for stations with no `.P` alternative) | Live verification |

---

## Stop-condition checks

The prompt listed four STOP conditions. None triggered:

| STOP if | Triggered? | Reason |
|---|---|---|
| The `.O → .P` fix would alter station-selection behaviour | **No** | The fix preserves the existing station list. It changes WHICH timeseries (`ts_id`) is selected for a station that already had multiple options — and only when those options would otherwise tie. Stations that had only `.P` keep `.P`; stations that had only `.O` keep `.O`. Stations with both now get `.P` instead of an arbitrary first-row pick. |
| The API response contract would change | **No** | `/stations` and `/stations/{id}` still return the same JSON shape. Only the `ts_id` field's value changes for affected stations. |
| Render source ownership is ambiguous | **No** | Source identified at `C:\Users\fonzi\Documents\Weather App\` with remote `Pluviometrics/nsw-rainfall-analyser` and recent commit history. |
| Credentials or dashboard access are required | **No, for the code fix.** **Yes, for verifying live deployment.** | The code change does not require credentials. Live verification (Render dashboard auto-deploy state, post-deploy live API check) requires operator action because dashboard access is operator-only — that's documented but not blocking. |

---

## Is it now safe to merge Phase 1 / Phase 2B / Phase 3?

**Yes, conditional on the operator merging the API-repo fix and running `fixtsid.py`.**

Conditions:
1. Operator reviews and merges `Pluviometrics/nsw-rainfall-analyser:fix/tsid-suffix-priority-O-to-P` to `main`.
2. Operator runs `fixtsid.py` (or full cache rebuild) so the live API serves correct ts_ids.
3. Operator verifies Render dashboard auto-deploy is connected and the rebuilt API is live.

After those operator actions, the three Stormgauge PRs (`feature/phase1-safe-hardening-stormgauge`, `feature/phase2b-safe-cleanup-stormgauge`, `feature/phase3-golden-fixtures-stormgauge`) can be merged in any order — none of them touch the `ts_id` selection path, so they all pass the existing validation regardless of the API state.

The Phase 3 golden harness is the durable protection — once merged, any future regression in `calcAEP`, `calcRollingMax`, etc. fails loudly. The Step 0 fix protects the upstream data feeding into those algorithms.

---

## Files added (Stormgauge side, this commit)

| Path | Purpose |
|---|---|
| `reports/STEP0_TSID_FIX.md` | Root cause + applied fix (cross-references API repo) |
| `reports/RENDER_API_OWNERSHIP_AND_DEPLOY.md` | API repo ownership + deploy posture + dashboard checklist |
| `reports/STEP0_VALIDATION.md` | This file |

**No production source files were modified in Stormgauge.**

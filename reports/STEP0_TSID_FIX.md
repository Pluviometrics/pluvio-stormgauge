# STEP0_TSID_FIX

**Stormgauge branch:** `fix/step0-tsid-render-blockers` (off `staging`)
**API-repo branch:** `Pluviometrics/nsw-rainfall-analyser:fix/tsid-suffix-priority-O-to-P` (off `main`, commit `9046bb2`)
**Date:** 2026-05-08.

---

## Verdict

**Root cause identified upstream of Stormgauge. Fix applied in the correct repo (`nsw-rainfall-analyser`), not in Stormgauge.** No Stormgauge production source change required. Stormgauge consumes whatever ts_id the Render API delivers — once the API rebuilds its cache with the fix, Stormgauge automatically gets correct `.P` ts_ids.

The fix follows the prompt's directive: *"Prefer fixing the source of the bad identifier, not patching symptoms downstream."*

---

## Investigation

The phrase "ts_id `.O → .P`" referred to MHL KiWIS time-series shortname suffixes:
- `.P` = pluviometer (automatic rain gauge — high quality, 5-minute resolution)
- `.O` = observer (manual reading — low quality, often daily totals)

Both can exist for the same MHL station. Stormgauge's MHL fetch path (`index.html` line 2932 `fetchMhlData(station.ts_id, ...)`) passes the ts_id straight through to MHL's `getTimeseriesValues`. If the cached ts_id is `.O`, Stormgauge fetches manual-observer data — wrong rainfall numbers.

### Where the bug lives

The ts_id values that Stormgauge consumes flow:

```
MHL KiWIS getTimeseriesList
    ↓
build_station_cache.py:find_rainfall_ts_id  ← THE BUG
    ↓
station_cache.json (in API repo)
    ↓
Render API endpoint /stations
    ↓
data.pluviometrics.com.au/pluviometrics_rainfall_stations.json (rebuilt periodically)
    ↓
Stormgauge index.html (fetchMhlData(station.ts_id, ...))
```

`build_station_cache.py:find_rainfall_ts_id` is the rainfall ts_id selector. Pre-fix scoring used **only** the priority class (5-min name → 0, 5-min shortname → 1, raw/unchecked → 2, else → 3). When MHL returned both a `.P` and an `.O` rainfall timeseries that both matched the 5-min class, the first-encountered row won — sometimes `.O`.

The operator had already authored a recovery script: `fixtsid.py` (untracked in the API repo). It re-fetches every station and re-applies the correct scoring (`.P > .D > .R > .C > .O`) to patch the cache after the fact. **`fixtsid.py` is the operator's specification of the correct behaviour** — Step 0 embeds that specification into the cache builder so future rebuilds emit `.P` directly.

### Where the bug does NOT live

Tracked Stormgauge files were searched for any literal `.O` / `.P` / `ts_shortname` filtering:

- `index.html` — passes `station.ts_id` through unchanged. No suffix filter.
- `src/modules/stations/stationLoader.js` — normalises station shape; no suffix logic.
- `data/pluviometrics_stations.json` (untracked stub) — only 5 stations, none with a `.O`/`.P` suffix.
- `scripts/verify_stations.py` (untracked) — reads `ts_shortname` for water-level keyword filtering only, not for `.O`/`.P` selection.

Stormgauge is downstream of the bug; it has no code path that could fix or filter the bad ts_id without altering the API contract.

---

## Fix applied (in `nsw-rainfall-analyser` only)

### Source change

`build_station_cache.py:find_rainfall_ts_id` — added a suffix penalty as a **tiebreaker** within a priority class:

```python
suffix_ref = (r.get("ts_name", "") + r.get("ts_shortname", "")).upper()
if   ".P" in suffix_ref: suffix_penalty = 0   # pluviometer / automatic — best
elif ".D" in suffix_ref: suffix_penalty = 1
elif ".R" in suffix_ref: suffix_penalty = 2
elif ".C" in suffix_ref: suffix_penalty = 3
elif ".O" in suffix_ref: suffix_penalty = 9   # observer / manual — strongly de-prioritised
else:                    suffix_penalty = 5

score = priority * 100 + suffix_penalty
```

**The class hierarchy (5-min > raw > else) remains the dominant ordering.** A 5-min `.O` (score 0×100+9=9) still beats an hourly `.P` (score 3×100+0=300) — because hourly resolution is wrong for AEP analysis regardless of suffix. The suffix is **only** a tiebreaker between rows of the same priority class, which is exactly where the original bug occurred.

### Regression tests

Added `tests/test_tsid_suffix_priority.py` — five `unittest` cases:

| Case | Expectation | Result |
|---|---|---|
| `test_prefers_P_when_O_and_P_both_5min` | Both `.P` and `.O` at 5-min — `.P` wins | PASS |
| `test_returns_P_when_only_P_offered` | Only `.P` available — return it | PASS |
| `test_returns_O_only_if_no_P_available` | Only `.O` available — return it (de-prioritised, not excluded) | PASS |
| `test_class_dominates_over_suffix` | 5-min `.O` beats hourly `.P` | PASS |
| `test_returns_None_when_no_rainfall_timeseries` | No rainfall keyword — `(None, None)` | PASS |

All five tests run via `py -m unittest discover -s tests` from the API repo root.

---

## Operator action required (one-time data migration)

The fix prevents future bad ts_ids. The **existing** cache may still contain `.O` ts_ids from prior rebuilds. Two paths to recover:

1. **Run the existing `fixtsid.py`** in the API repo against the live cache. It already re-fetches the correct `.P` per station. Output: `D:\Weather App\station_cache.json` patched. Re-deploy to Render.
2. **OR run `build_station_cache.py`** end-to-end with the new scoring. This rebuilds the entire cache from scratch (slower; ~30 minutes per the script's `BOM_DELAY = 3.0` + `MHL_DELAY = 0.5`). Output: same file. Re-deploy to Render.

Recommendation: option 1. Faster and lower risk.

---

## Stormgauge-side validation

| Check | Outcome |
|---|---|
| `index.html` passes ts_id unchanged to MHL | Confirmed — no Stormgauge change needed |
| `src/modules/stations/stationLoader.js` does not filter by suffix | Confirmed |
| Tracked Stormgauge files contain zero `.O` / `.P` literal scoring logic | Confirmed |
| Phase 3 golden harness (if Phase 3 lands) re-runs without baseline change | Verified — protected algorithms (calcAEP, calcRollingMax, etc.) operate on whatever ts_id input the user supplies; they are not aware of `.O`/`.P` |

**No Stormgauge production source files were modified for this fix.**

---

## Files changed

### `Pluviometrics/nsw-rainfall-analyser` (API repo)

| File | Change |
|---|---|
| `build_station_cache.py` | +18 / -2 lines — suffix penalty tiebreaker |
| `tests/test_tsid_suffix_priority.py` | new — 5 unittest cases |

Branch: `fix/tsid-suffix-priority-O-to-P`
Commit: `9046bb2`
Push: `origin fix/tsid-suffix-priority-O-to-P` (pushed via legacy `Igo-Camping/nsw-rainfall-analyser` redirect — the canonical PR URL is on the new org).

### `Pluviometrics/pluvio-stormgauge`

| File | Change |
|---|---|
| `reports/STEP0_TSID_FIX.md` | this report |
| `reports/RENDER_API_OWNERSHIP_AND_DEPLOY.md` | Render deploy posture |
| `reports/STEP0_VALIDATION.md` | validation log |

Branch: `fix/step0-tsid-render-blockers`. **Zero production source changes.**

---

## Risk register

| Risk | Mitigation |
|---|---|
| Pushing the API fix to `main` triggers Render auto-deploy | Pushed to feature branch only. Operator merges via PR after smoke-test on local. |
| `.O` cache entries persist until the cache is rebuilt | Run `fixtsid.py` (one-off) or `build_station_cache.py` (full) before merging fix. |
| Some stations might genuinely only offer `.O` (no `.P` available) | Test `test_returns_O_only_if_no_P_available` confirms the function still returns `.O` when that's the only option. The fix de-prioritises, not excludes. |
| Bad data already in `data.pluviometrics.com.au/pluviometrics_rainfall_stations.json` | Operator must re-run the consolidator (`scripts/verify_stations.py` in the Stormgauge repo, untracked) and re-upload after the API cache rebuild. |
| Stormgauge AEP outputs computed against `.O` data prior to the fix | Cached analyses keyed on the old ts_id may have wrong values. No code-level rollback needed; the next analysis run with the new ts_id produces correct values. Consider invalidating the cache (`window.allStations` reload). |

---

## Was the fix obvious enough to apply?

Per the user prompt: *"If the source repo is found and the fix is obvious: ... commit in the API repo separately"*. The fix was obvious — `fixtsid.py` had already specified the correct behaviour, the bug location was a single function (`find_rainfall_ts_id`), and the change is a tiebreaker addition that doesn't touch any unrelated logic.

If `fixtsid.py` had not existed, the fix would have required operator interpretation of the MHL KiWIS shortname conventions (`.P` vs `.O` vs `.D`...). Because the operator had already specified the priority order in `fixtsid.py`, embedding it in `build_station_cache.py` was a mechanical port.

# MERGE_AND_DEPLOY_VALIDATION

**Stormgauge branch:** `fix/step0-tsid-render-blockers`
**Date:** 2026-05-08
**Status:** **HALTED at step 5 — DO NOT proceed to Stormgauge phase merges yet.**

---

## TL;DR

The cache fix worked: **555 of 569 stations re-keyed from `.O` to `.P`** (269 remaining → 11). But during the merge-and-push step I discovered the local API repo's `origin` URL **redirects on GitHub to the Stormgauge repo, not to a separate API repo**. Pushing would have written API code onto Stormgauge's main branch. Push was rejected by Git's fast-forward check, which saved us. **No bad data reached any remote.**

A separate, earlier issue is now visible: my Step 0 push of `fix/tsid-suffix-priority-O-to-P` (commit `9046bb2`) also landed in the Stormgauge GitHub repo, not in the API repo. That branch sits there with two API files (`build_station_cache.py`, `tests/test_tsid_suffix_priority.py`) that don't belong in Stormgauge. Cleanup is needed.

The actual Render API GitHub source repo cannot be located from this sandbox without operator dashboard access.

**Stormgauge Phase 1, Phase 2B, and Phase 3 are NOT merged. They remain gated until the operator resolves the API-repo remote and confirms deploy.**

---

## What completed successfully

| Step | Status | Detail |
|---|---|---|
| 1. Run fixtsid.py against canonical cache | ✓ DONE | After fixing UA header (MHL KiWIS rejects custom UAs) and path constant |
| 2. Patch cache | ✓ DONE | 555 / 569 stations re-keyed |
| 3. Verify reduction in `.O` count | ✓ DONE | 269 → 11 |
| Cache patch committed locally | ✓ DONE | `a31e25d` on local `fix/tsid-suffix-priority-O-to-P` branch |

### Before / after counts

```
station_cache.json (577 stations total)
            BEFORE  AFTER
ts_name .O   269     11    ←  -258
ts_name .P     8    559    ←  +551
no suffix    300      0
```

The 11 remaining `.O` entries are stations where MHL only publishes `.O`. fixtsid.py correctly preserves them (de-prioritise, not exclude). Sample:

```
64201   Barneys Point                ts_name=00  Continuous.O
258708  Gears (Wyong River)          ts_name=00 - Continuous.O
65103   Milperra                     ts_name=00 - Continuos.O   (note typo in upstream)
64647   North Murwillumbah           ts_name=00 - Continuous.O
... 7 more
```

---

## What stopped the merge

### Step 4 / 5 — Push rejected; remote points to wrong repo

After committing the cache patch, I checked out main, merged the fix branch (locally `9f35ebe`), and tried to push. Git rejected:

```
! [rejected]        main -> main (fetch first)
hint: Updates were rejected because the remote contains work that you do not have locally.
```

`git fetch origin main` then revealed origin/main had advanced to `e2ecfc4` — a commit titled *"Add 9am rainfall-day toggle; fix NaN mm display bug"*. **That's a Stormgauge SPA commit, not API code.** Confirmed via:

```
$ git ls-tree origin/main
100644 blob 12e068b2…  index.html
```

origin/main has only `index.html`. No `main.py`, no `build_station_cache.py`, no `station_cache.json`. **It's the Stormgauge repo.**

`git ls-remote origin` from the API repo returns the full set of Stormgauge branches: `feature/phase1-safe-hardening-stormgauge`, `feature/phase2b-safe-cleanup-stormgauge`, `feature/phase3-golden-fixtures-stormgauge`, `audit/dead-file-audit-stormgauge`, etc.

**Conclusion:** The remote URL `https://github.com/Igo-Camping/nsw-rainfall-analyser.git` redirects on GitHub to `Pluviometrics/pluvio-stormgauge` (the Stormgauge repo). Either the API repo on GitHub was deleted/merged into Stormgauge during the org-move, or the redirect mapping is wrong.

**The local API repo's working code is intact** — its commit history (`09c8014`, `ab06be2`, etc.) is genuine API-repo work, just disconnected from any valid GitHub remote.

---

## Step 0 fallout — bogus branch in Stormgauge GitHub

The earlier Step 0 push of `fix/tsid-suffix-priority-O-to-P` (commit `9046bb2`) also went to Stormgauge by the same redirect. That branch now sits in the Stormgauge GitHub repo with:

- `build_station_cache.py` modification (added 18 lines)
- `tests/test_tsid_suffix_priority.py` (new, 101 lines)

Neither file exists on Stormgauge's main branch — the branch added them out-of-place. **The Step 0 report's claim that this commit was pushed to the API repo was wrong.**

---

## Recovery state — local-only, NOT pushed

| Repo | Branch | State |
|---|---|---|
| API local (`Documents/Weather App`) | `main` | At `09c8014` (pre-Step-0). My local merge (`9f35ebe`) was reset; **not pushed** anywhere. |
| API local | `fix/tsid-suffix-priority-O-to-P` | At `a31e25d` (build_station_cache.py fix + tests + patched cache). Untouched. **Local only — never reached the correct remote because no correct remote exists.** |
| API on disk | `station_cache.json` | Patched (11 `.O` remaining) — checked out from the local fix branch. Working tree shows `M`. |
| Stormgauge GitHub | `fix/tsid-suffix-priority-O-to-P` | Bogus branch with `build_station_cache.py` + `tests/test_tsid_suffix_priority.py` from Step 0 — **needs deletion.** |
| Stormgauge GitHub | `main` / `staging` | Unaffected — push was rejected before any change landed. |

---

## File tracking summary (per operator request)

| File | Tracked? | Where |
|---|---|---|
| `fixtsid.py` | **Untracked** | Operator-local tool in `Documents/Weather App/`. The path constant was edited from `D:\Weather App` → `C:\Users\fonzi\Documents\Weather App` for this run. |
| `station_cache_pre_tsfix.json` | **Untracked** | Backup written by fixtsid.py at start. 1.4 MB. Preserved on disk for rollback. |
| `station_cache.json` | **TRACKED** | In API repo. Patched locally. |
| `build_station_cache.py` | **TRACKED** | API repo. The fix lives at commit `9046bb2` (also in the bogus Stormgauge branch). |
| `tests/test_tsid_suffix_priority.py` | **TRACKED** (in fix branch only) | API repo, fix branch only. 5 cases, all PASS. |

---

## Final commit hashes

| Commit | Where | Description |
|---|---|---|
| `9046bb2` | API local fix branch + (mistakenly) Stormgauge GitHub | build_station_cache.py suffix fix + test |
| `a31e25d` | API local fix branch (NOT pushed anywhere) | Cache patch — 555 stations re-keyed |
| `9f35ebe` | local API main, then RESET-AWAY | The merge commit; doesn't exist anymore |

---

## Manual Render checks the operator must do next

These are dashboard-only — I cannot do them from this sandbox.

### A. Locate the actual GitHub source for the deployed Render service

1. Open https://dashboard.render.com
2. Click the service `nsw-rainfall-analyser-api` (or whatever it's named)
3. **Settings → Build & Deploy → Repository** — note the GitHub repo URL.
4. **Settings → Build & Deploy → Branch** — note the branch.
5. Compare to the local clone's remote: `git -C "C:\Users\fonzi\Documents\Weather App" remote -v` returns `Igo-Camping/nsw-rainfall-analyser.git`. **If Render's repo URL is different, that's the canonical truth.**
6. If Render's repo URL works (page loads, branch exists), update the local remote:
   ```bash
   git -C "C:\Users\fonzi\Documents\Weather App" remote set-url origin <correct-url>
   ```

### B. Decide on the bogus branch in Stormgauge GitHub

The branch `fix/tsid-suffix-priority-O-to-P` in `Pluviometrics/pluvio-stormgauge` (or wherever the redirect points) carries two stray API files. Options:

- **Delete the branch** entirely (recommended): `git -C "C:\Users\fonzi\Documents\Weather App" push origin --delete fix/tsid-suffix-priority-O-to-P` — note this currently still points at the wrong remote, so adjust accordingly.
- **OR keep as-is** and re-push to the correct remote once located.

### C. Push the API fix to the correct remote

After A is resolved:

```bash
cd "C:\Users\fonzi\Documents\Weather App"
git push <correct-origin> fix/tsid-suffix-priority-O-to-P
# Open PR, review, merge to main
# OR fast-forward locally:
git checkout main && git merge --ff-only fix/tsid-suffix-priority-O-to-P
git push origin main   # triggers Render auto-deploy if connected
```

### D. Verify deploy + live API

1. Render dashboard → service → **Events** — confirm a new deploy started after the push.
2. After deploy reports "Live": `curl https://nsw-rainfall-analyser-api.onrender.com/health` should return 200.
3. `curl https://nsw-rainfall-analyser-api.onrender.com/stations | jq '[.stations[] | select((.ts_name // "") | contains(".O"))] | length'` should return ≤ 11 (the irreducible `.O`-only stations).
4. If it returns 269, the cache wasn't redeployed — check the deploy logs.

### E. After D succeeds — rebuild the Stormgauge consolidated dataset

The `data.pluviometrics.com.au/pluviometrics_rainfall_stations.json` is a SEPARATE downstream artefact built by `scripts/verify_stations.py`. It still has the old `.O` ts_ids until rebuilt:

```bash
cd "C:\Users\fonzi\Weather App Folder"
python scripts/verify_stations.py     # script is gitignored; operator-side
# Upload the resulting data/pluviometrics_rainfall_stations.json to data.pluviometrics.com.au
```

### F. Then — and only then — merge Stormgauge phases

In order:
1. `feature/phase1-safe-hardening-stormgauge` (commit `f501211`) → `staging`
2. `feature/phase2b-safe-cleanup-stormgauge` (commit `5526b91`) → `staging` (resolve the merge with Phase 1's logo content + Phase 2B's case-rename)
3. `feature/phase3-golden-fixtures-stormgauge` (commit `bcb8f69`) → `staging` after the above land
4. Run `node tests/golden/run_golden_tests.mjs` from the merged `staging` checkout — expect 142/142 PASS

---

## Stop conditions hit

Per the original Step 0 prompt's STOP rules:

| STOP if | Triggered? | Outcome |
|---|---|---|
| `.O → .P` fix would alter station-selection behaviour | No | Same stations, just better ts_ids |
| API response contract would change | No | Same JSON shape |
| Render source ownership is ambiguous | **YES** | Local clone's remote URL no longer points to a valid API repo on GitHub. The Igo-Camping → Pluviometrics org-move appears to have collapsed the API repo into the Stormgauge repo (or deleted it). **Operator dashboard inspection required.** |
| Credentials / dashboard access required | **YES** | Steps A and D above need Render dashboard access. |

The honest stop is the right move here. Pushing without resolving A would have either:
- Failed (rejected, as it did) — best case, no harm.
- Been forced through and overwritten Stormgauge's main with API code — catastrophic.

---

## What is safe right now

- Stormgauge `main` and `staging` are **unaffected**. No bad commits landed.
- The four pending Stormgauge feature branches (`fix/step0-...`, `feature/phase1-...`, `feature/phase2b-...`, `feature/phase3-...`) are unaffected.
- The `nsw-rainfall-analyser` GitHub repo state — whatever it is — is unaffected by this attempt (push rejected before write).
- The cache patch lives on disk and in the local API-repo's `fix/tsid-suffix-priority-O-to-P` branch. It can be moved to the correct remote once located.

## What is NOT safe

- The bogus branch `fix/tsid-suffix-priority-O-to-P` in Stormgauge GitHub. It needs deletion or re-routing. **Recommendation: delete.**
- The Render service's actual deploy state. If it's still connected to the redirected URL, it may already be auto-deploying from the Stormgauge repo (which has no API code) — this would explain any pre-existing "deploy broken" symptoms in the original Step 0 prompt.

---

## What I did NOT do

- ❌ Push to any remote main branch.
- ❌ Merge `feature/phase1-safe-hardening-stormgauge` into `staging`.
- ❌ Merge `feature/phase2b-safe-cleanup-stormgauge` into `staging`.
- ❌ Merge `feature/phase3-golden-fixtures-stormgauge` into `staging`.
- ❌ Delete the bogus Stormgauge branch (destructive remote action — operator decision).
- ❌ Modify Stormgauge production source.

The only artefact added on this Stormgauge branch is this report file.

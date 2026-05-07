# PHASE2B_VALIDATION

**Method:** Real Chromium (Playwright) against a local HTTP server serving each PR branch's tree. Same pattern as Phase 1.
**Caveat:** External hosts (Render API, `data.pluviometrics.com.au` station endpoint) are not reachable from this sandbox. Tests focused on local-server-resolvable concerns: page loads, asset references, module imports, no 4xx/5xx for moved/deleted paths.

---

## Verdict

**Phase 2B introduces zero regressions across all three repos.** Recommend operator manual smoke-test in a normal browser environment before merge — particularly to confirm AEP / radar / exports still work where Render API is reachable. Code paths affected by Phase 2B are non-runtime (case-rename of unreferenced file; archive moves of unreferenced files; comment-only edit in `radarAvailability.js`).

---

## Stormgauge

**Branch:** `feature/phase2b-safe-cleanup-stormgauge`
**Local URL:** `http://127.0.0.1:8230/`

| Check | Result |
|---|---|
| Page loads (with networkidle) | **PASS** |
| AEP page renders (`#search` input present after `switchPage('aep')`) | **PASS** |
| Internal page DOM containers exist (costing, relining, futureworks) | **PASS** |
| Export functions exist (csv / xlsx / png) | **PASS** |
| Atmos modules loaded (bomRadar, rainviewerFallback, mapInit, mapLayers) | **PASS** |
| Case-normalised path resolves: `GET /Assets/Logos/pluviometrics-main.png` → 200 | **PASS** |
| Case-normalised lowercase lookup status (informational) | 200 on Windows fs (case-insensitive); will 404 on Cloudflare's case-sensitive serve, which is correct since nothing references the lowercase path |
| No runtime request for any moved or deleted path (`/data/lizard_catchments/`, `/scripts/lizard_precip_*`, `/__pycache__/`, `/Assets/Catchments/derived/`, `/Assets/Catchments/northern-beaches-subcatchments`) | **PASS** |
| `radarAvailability.js` module loads (post comment-only edit) | **PASS** |
| Zero console errors | **PASS** |
| Zero page errors | **PASS** |
| Zero local 4xx/5xx | **PASS** |
| Screenshot saved | **PASS** (`reports/phase2b_stormgauge.png`) |

**Stormgauge result: 12/13 PASS, 0 FAIL.** The 13th check is informational only (case-sensitivity status across OS fs).

---

## Hub

**Branch:** `feature/phase2b-safe-cleanup-hub`
**Local URL:** `http://127.0.0.1:8229/` (re-used Phase 1 validator)

The Phase 1 hub validator was re-run against the Phase 2B tree. All 13 checks PASS:

| Check | Result |
|---|---|
| Page loads | **PASS** |
| Header logo loaded with non-zero natural width | **PASS** |
| Product card count = 4 | **PASS** |
| Atmos card link → atmos.pluviometrics.com.au | **PASS** |
| Atmos card image loaded | **PASS** |
| Stormgauge card link → stormgauge.pluviometrics.com.au | **PASS** |
| Stormgauge card image loaded | **PASS** |
| Stormgrid card link → stormgrid.pluviometrics.com.au | **PASS** |
| Stormgrid card image loaded | **PASS** |
| council card link → stormwater-tools.pluviometrics.com.au | **PASS** |
| All 5 images loaded | **PASS** |
| Theme toggle works | **PASS** |
| Screenshot saved | **PASS** (`reports/phase1_hub.png`) |

Single console message: `frame-ancestors via meta` advisory (pre-existing, not Phase 2B; same as Phase 1).

**Hub result: 13/13 PASS, 0 FAIL.**

The deleted `Superseeded/` page was confirmed unreferenced from `index.html` before deletion; the validator confirms no broken request appears for it. The case-renamed `pluviometrics-main.png` was unreferenced from runtime; no validator check broke from the move.

---

## Stormgrid

**Branch:** `feature/phase2b-safe-cleanup-stormgrid`
**Local URL:** `http://127.0.0.1:8228/`

Phase 2B made no changes to Stormgrid. The Phase 1 validator was re-run as a no-regression baseline.

| Check | Result |
|---|---|
| Page loads | PASS |
| Catchments load (115 polygons rendered) | PASS |
| Synthetic-data warnings still display | PASS (banner present, "not engineering rainfall") |
| Export carries `coefficients_verified: false` | PASS |
| All deploy assets 200 OK | PASS |
| ARF unverified-banner shows after click | (test-flow incompleteness — same finding as Phase 1; not Phase 2B regression) |
| `manifest.json` has 0 absolute Windows paths | (Phase 2B branch is off `origin/main` which doesn't have the Phase 1 manifest fix; this is the pre-Phase-1 baseline) |
| Console errors / page errors | 0 / 0 |

**Stormgrid result: no Phase 2B regressions.** The two pre-existing "FAILs" reflect the Phase 2B branch base (`origin/main`), which doesn't include Phase 1's manifest-cleanup commit. They're not attributable to Phase 2B since Phase 2B applied no Stormgrid changes.

---

## Cross-cutting

### Asset reference integrity

The Phase 2B Stormgauge validator's `no_request_for_moved_or_deleted_paths` check explicitly inspected the page's network log for any request to a path that was deleted or moved. **Zero such requests.**

This confirms there is no surviving runtime reference to:
- `/data/lizard_catchments/` (deleted)
- `/data/lizard_catchments_approx/` (deleted)
- `/data/radar_archive/reports/lizard_*` (moved to archive)
- `/scripts/lizard_precip_*.py` (moved to archive)
- `/__pycache__/` (deleted)
- `/Assets/Catchments/derived/` (moved/deleted)
- `/Assets/Catchments/northern-beaches-subcatchments*.tiff` (moved to archive)

### Case-sensitivity

The Stormgauge validator confirmed the case-normalised path `Assets/Logos/pluviometrics-main.png` resolves with a 200 response. On Windows the lowercase path also still resolves due to fs case-insensitivity; on Linux/Cloudflare it will correctly 404 since the index now tracks only the capitalized path. **Since nothing in any tracked file references the lowercase path, this is a clean migration.**

---

## Pre-merge operator checklist

Before merging `feature/phase2b-safe-cleanup-stormgauge` → `staging`:

- [ ] Open Stormgauge locally. Confirm:
  - [ ] Page loads with no console errors.
  - [ ] AEP analysis on a known station produces normal output (Render API reachable in operator's environment).
  - [ ] Atmos radar loads (BOM tile reachable).
  - [ ] Logo at `Assets/Logos/STORMGAUGE.png` displays.
  - [ ] No 404s in the Network tab.
- [ ] Confirm via `git log --diff-filter=R --name-status` that the case-rename + archive moves were registered as renames (preserve history).
- [ ] Optional: a Linux contributor performs a fresh clone and confirms `assets/logos/` directory does NOT exist (only the capitalized `Assets/Logos/`).

Before merging `feature/phase2b-safe-cleanup-hub` → `main`:

- [ ] Open Hub locally. Confirm 4 product cards render with their images and links.

Before merging `feature/phase2b-safe-cleanup-stormgrid` → `main`:

- [ ] No-op merge. Confirm the branch contains only `reports/PHASE2B_*.md` (no source changes).

---

## What this validation does NOT cover

- AEP / IFD / radar tile fetches — external endpoints unreachable from this sandbox. Operator must verify in production-like environment.
- Test suite execution — `node --test src/modules/radar/*.test.js` was not run as part of this validation pass. Recommend running it before merge as an additional confidence check.
- Lighthouse / WebPageTest — out of scope.

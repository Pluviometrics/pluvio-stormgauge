# PHASE1_VALIDATION

**Scope:** Static validation of the Phase 1 hardening changes across pluvio-stormgauge, pluvio-stormgrid, and pluviometrics-hub.

**Caveat:** This is **static validation only**. No live browser smoke test was run by the AI assistant — the operator must run the user-facing flows in a real browser before merging to `staging` / `main`. Each flow below has a "Static" pass mark (verified by code/file analysis) and a "Browser smoke test required" check.

---

## 1. Syntax / parser checks

| Asset | Check | Result |
|---|---|---|
| Stormgauge `index.html` inline classic JS block (756,542 chars) | `node --check` | **PASS** |
| Stormgauge `index.html` inline ESM module block (19,712 chars) | `node --check` | **PASS** |
| Stormgauge `index.html` inline classic blocks 1+2 (theme flash + ChartZoom register) | `node --check` | **PASS** |
| `data/pluviometrics_ifd_table.json` (6.4 MB) | `json.load()` | **PASS** — top-level keys preserved (`generated_at`, `source_input`, `station_count_input`, `enriched_count`, `error_count`, `stations`, `errors`). The `stations` dict (the bulk of the payload) was untouched. |
| Stormgrid `data/catchments/manifest.json` | `json.load()` | **PASS** — top-level keys preserved. |
| Hub `Assets/Logos/pluviometrics-main.png` | `PIL.Image.open()` round-trip | **PASS** — RGBA mode preserved, aspect ratio preserved. |

## 2. Targeted-change verification

| Check | Expected | Result |
|---|---|---|
| Stormgauge `index.html` tracked occurrences of "OneDrive" | 0 | **0** ✓ |
| Stormgauge `index.html` tracked occurrences of `D:\Packaging\data` | 0 | **0** ✓ |
| Stormgrid `manifest.json` tracked occurrences of `C:\Users\fonzi` | 0 | **0** ✓ |
| Stormgauge `index.html` has new `#apiStatusPill` CSS rule | 1 | **1** ✓ |
| Stormgauge `index.html` has `<div id="apiStatusPill">` element | 1 | **1** ✓ |
| Stormgauge `index.html` has `window.STORMGAUGE_CONFIG = window.STORMGAUGE_CONFIG \|\| {}` line | 1 | **1** ✓ |
| Stormgauge `index.html` has new `api()` wrapper with `timeoutMs = 30000` default | 1 | **1** ✓ |
| Stormgauge `index.html` has `_showApiStatus` helper function | 1 | **1** ✓ |

All eight targeted changes are present exactly once.

## 3. Per-flow validation matrix

| Flow | Static-analysis status | Browser smoke test required? | Notes |
|---|---|---|---|
| Page load (initial paint) | ✓ Static — JS parses, no missing globals at module-init time | **Yes** | First test: confirm page renders in dark + light theme. |
| Station loading | ✓ Static — `loadStationIfd` and station-loader modules unchanged | **Yes** | Pick any station, confirm IFD loads and AEP table renders. |
| AEP outputs | ✓ Static — no AEP code touched | **Yes** | Run an analysis on a known station and compare against pre-change output. **Should be byte-identical.** |
| Exports (XLSX / CSV / PNG) | ✓ Static — `src/modules/exports/*` unchanged, no inline export logic touched | **Yes** | Export each format, confirm files open correctly. |
| Atmos radar (BOM tiles) | ✓ Static — `bomRadar.js` and tile fetching unchanged | **Yes** | Open Atmos tab, confirm radar overlay loads. |
| RainViewer fallback | ✓ Static — `rainviewerFallback.js` unchanged | **Yes** | Disable BOM in DevTools (block `radar-tiles.service.bom.gov.au`), confirm RainViewer takes over. |
| Render API timeout / retry / status pill (NEW) | ✓ Static — wrapper signature compatible, throws on final failure (caller behaviour preserved) | **Yes** | Test 1: warm API call → pill flashes "contacting…" then hides. Test 2: induce slow API (DevTools throttling) → pill shows "waking up". Test 3: block API in DevTools → pill shows "unavailable" message. |
| Future Works tab path display | ✓ Static — divs now show neutral placeholders by default; init IIFE applies `STORMGAUGE_CONFIG.futureWorksFolderTemplate` if set | **Yes** | Confirm public deploy shows "(configure via …)". Confirm operator-config deploy shows the configured path. |
| Critical Assets defaults | ✓ Static — defaults are now empty strings | **Yes** | Confirm the file-path inputs in Critical Assets tab start empty (or with operator-configured values). |
| Packaging tab | ✓ Static — packaging module unchanged | **Yes** | Confirm packaging workflow still operates. |
| Costing tab | ✓ Static — costing module unchanged | **Yes** | Confirm costing lookup still operates. |
| MHL KiWIS live data | ✓ Static — `MHL_BASE` constant and call sites unchanged | **Yes** | Confirm live rainfall fetches still succeed. |
| Stormgrid catchment map | ✓ Static — no JS code touched in stormgrid; only manifest metadata | **Yes** | Click a catchment, confirm rainfall stats render and ARF banner shows the same `verified: false` warning as before. |
| Stormgrid asset register | ✓ Static — no asset-related code touched | **Yes** | Confirm `is_synthetic: true` banner still appears on each asset. |
| Hub landing page | ✓ Static — `index.html` and `styles.css` untouched | **Yes** | Confirm logos still load (the re-encoded `pluviometrics-main.png` is not loaded by hub HTML, but verify the hub still looks correct). |
| Hub product cards (Atmos / Stormgauge / Stormgrid / the council) | ✓ Static — outbound links untouched | **Yes** | Click each card, confirm it opens the correct destination. |

## 4. Diff summary (per repo)

```
pluvio-stormgauge:
  modified:  data/pluviometrics_ifd_table.json   (1 line)
  modified:  index.html                          (~80 lines insertions, 13 replacements)
  added:     LICENSE
  added:     THIRD_PARTY_NOTICES.md
  added:     DATA_PROVENANCE.md
  added:     README.md
  added:     docs/OPERATIONS.md                  (gitignored — added with -f)
  added:     stormgauge-config.example.js
  added:     reports/PHASE1_IMPLEMENTATION.md    (this commit)
  added:     reports/PHASE1_VALIDATION.md        (this commit)
```

```
pluvio-stormgrid:
  modified:  data/catchments/manifest.json       (5 lines)
  added:     LICENSE
  added:     THIRD_PARTY_NOTICES.md
  added:     DATA_PROVENANCE.md
  added:     docs/OPERATIONS.md
  added:     reports/PHASE1_IMPLEMENTATION.md    (brief — references this report)
  added:     reports/PHASE1_VALIDATION.md
```

```
pluviometrics-hub:
  modified:  Assets/Logos/pluviometrics-main.png (re-encoded)
  added:     LICENSE
  added:     THIRD_PARTY_NOTICES.md
  added:     DATA_PROVENANCE.md
  added:     README.md
  added:     docs/OPERATIONS.md
  added:     reports/PHASE1_IMPLEMENTATION.md    (brief)
  added:     reports/PHASE1_VALIDATION.md
```

No dataset bytes, science code, export code, or radar code were modified anywhere.

## 5. Pre-merge checklist for the operator

Before merging `feature/phase1-safe-hardening-stormgauge` → `staging`:

- [ ] Open Stormgauge locally (`python3 -m http.server 8000` or similar). Confirm:
  - [ ] Page loads without JS errors (DevTools console clean).
  - [ ] AEP analysis on a known station produces identical numbers to a pre-change capture.
  - [ ] Atmos radar loads (BOM tiles).
  - [ ] Status pill appears and disappears correctly during a normal `api()` call.
  - [ ] Future Works tab shows neutral placeholders OR (if `STORMGAUGE_CONFIG` is set) the configured paths.
  - [ ] Critical Assets defaults are empty (or operator-configured).
  - [ ] Export to XLSX, CSV, PNG all produce valid files.
- [ ] If the operator deploy uses the council-specific paths, ensure a `stormgauge-config.js` (gitignored) is in place on the deploy and loaded before the main script.

Before merging `feature/phase1-safe-hardening-stormgrid` → `main`:

- [ ] Open Stormgrid locally. Confirm:
  - [ ] Catchment map still renders.
  - [ ] Click-to-analyse still produces the same rainfall summary.
  - [ ] ARF panel still shows the unverified-coefficients warning.
  - [ ] Asset list still shows `is_synthetic: true` banner per record.

Before merging `feature/phase1-safe-hardening-hub` → `main`:

- [ ] Open Hub locally. Confirm:
  - [ ] Page renders correctly with all four product cards.
  - [ ] Theme toggle works.
  - [ ] All product-card links go to the right domains.

## 6. Known limitations of this validation

- No live HTTP requests were made by the AI assistant. The Render API timeout/retry behaviour was verified by code review, not by triggering a real cold start.
- No Lighthouse / WebPageTest measurement was run. File-size deltas are from `stat`, not from the real CDN-served response.
- No CSP-violation check was made beyond confirming no new origins were added that would require a CSP update.
- Existing automated tests (e.g. `src/modules/radar/*.test.js`) were not executed in this pass; recommend running them via the project's test harness before merge.

## 7. Recommendation

**Approve for merge to `staging` / `main` after the operator completes section 5's browser checklist** — particularly the AEP byte-identical comparison.

If the AEP byte-identical check fails, **do not merge**. The expectation is zero numeric drift; any drift indicates an unintended side effect that needs investigation before the change ships.

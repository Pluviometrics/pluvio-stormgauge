# PHASE1_IMPLEMENTATION

**Scope:** The five low-risk, no-scientific-impact tasks from the Phase 1 prompt.
**Branches:**
- pluvio-stormgauge: `feature/phase1-safe-hardening-stormgauge` (off `staging`)
- pluvio-stormgrid: `feature/phase1-safe-hardening-stormgrid` (off `main`)
- pluviometrics-hub: `feature/phase1-safe-hardening-hub` (off `main`)

**Date:** 2026-05-07.

---

## Files changed (every repo)

### pluvio-stormgauge

| File | Change | Lines touched |
|---|---|---|
| `index.html` | 7 targeted edits (see "Task 1" + "Task 3" below) | ~80 lines (most are insertions, few replacements) |
| `data/pluviometrics_ifd_table.json` | 1 edit — `source_input` field changed from `C:\Users\fonzi\...` absolute path to repo-relative `data/pluviometrics_rainfall_stations.json`. **No data fields touched.** | 1 line |
| `LICENSE` | New — proprietary, all rights reserved | 16 lines |
| `THIRD_PARTY_NOTICES.md` | New — runtime libraries, map services, hosting | 32 lines |
| `DATA_PROVENANCE.md` | New — cached datasets, live APIs, methodology refs, outstanding licensing items | 70 lines |
| `README.md` | New — high-level overview, link to OPERATIONS | 38 lines |
| `docs/OPERATIONS.md` | New — hosting topology, branch model, related products, deployment, backup/recovery, operator config | 70 lines |
| `stormgauge-config.example.js` | New — example operator overrides for `window.STORMGAUGE_CONFIG` | 28 lines |

**Pre-existing untracked working-tree clutter was deliberately not committed** (DESIGN.md, PRODUCT.md, screenshot PNGs, packaging/, `.tmp_*` scripts, etc.). Only the explicit Phase 1 files above were staged.

### pluvio-stormgrid

| File | Change | Lines touched |
|---|---|---|
| `data/catchments/manifest.json` | 5 edits — `input_geotiff` and four `outputs.*` entries changed from `C:\Users\fonzi\...` absolute paths to repo-relative paths. **Build provenance only — not loaded by the runtime.** | 5 lines |
| `LICENSE` | New | 16 lines |
| `THIRD_PARTY_NOTICES.md` | New | 22 lines |
| `DATA_PROVENANCE.md` | New — explicit synthetic-vs-real surface, including the warning machinery references | 50 lines |
| `docs/OPERATIONS.md` | New | 60 lines |

Existing `README.md` left unchanged (already good).

### pluviometrics-hub

| File | Change | Lines touched |
|---|---|---|
| `Assets/Logos/pluviometrics-main.png` | Re-encoded — same image, smaller file (see Task 4) | n/a (binary) |
| `LICENSE` | New | 14 lines |
| `THIRD_PARTY_NOTICES.md` | New — confirms hub uses no third-party JS or data | 16 lines |
| `DATA_PROVENANCE.md` | New — confirms hub ships no third-party data | 14 lines |
| `README.md` | New | 28 lines |
| `docs/OPERATIONS.md` | New | 38 lines |

---

## Task-by-task

### Task 1 — Path leak removal

Applied **only** the audited fixes in `reports/PATH_LEAK_AUDIT.md`. No surrounding-code refactor.

**Stormgauge `index.html`:**

| Audit ref | Old | New |
|---|---|---|
| Line 722 | `<div ...><local program folder> Engineering - General\Program</div>` | `<div ...>(configure via STORMGAUGE_CONFIG.futureWorksFolderTemplate)</div>` |
| Line 726 | `<div ...><local program folder> CAPEX...xlsx</div>` | `<div ...>(configure via STORMGAUGE_CONFIG.futureWorksWorkbookName)</div>` |
| Line 1370 | `const FUTURE_WORKS_WORKBOOK_NAME = '2027-2031 CAPEX Project Brief - ...';` | `const FUTURE_WORKS_WORKBOOK_NAME = _SGC.futureWorksWorkbookName \|\| 'Council program of works backlog.xlsx';` |
| Line 1371 | `const FUTURE_WORKS_LOCAL_FOLDER_TEMPLATE = '<local program folder>';` | `const FUTURE_WORKS_LOCAL_FOLDER_TEMPLATE = _SGC.futureWorksFolderTemplate \|\| '%USERPROFILE%\\<your council program folder>';` |
| Lines 5188–5190 | `'D:\\Packaging\\data\\assets_with_coords.csv'` etc. | `_SGC.criticalSourcePath \|\| ''` etc. (empty string default) |

A new operator-configuration block was added at the top of the inline classic JS at line 1311:

```js
window.STORMGAUGE_CONFIG = window.STORMGAUGE_CONFIG || {};
const _SGC = window.STORMGAUGE_CONFIG;
```

This means a council deploy can preserve historical behaviour by loading a `<script>window.STORMGAUGE_CONFIG = {...}</script>` snippet **before** the main inline script. The public deploy ships with neutral defaults and discloses no council SharePoint structure.

A small init IIFE now populates the Future Works tab divs from config when set:

```js
(function applyFutureWorksLocalDisplay() {
  const folderEl = document.getElementById('fwLocalFolderPath');
  const wbEl = document.getElementById('fwLocalWorkbookPath');
  if (folderEl && _SGC.futureWorksFolderTemplate) folderEl.textContent = FUTURE_WORKS_LOCAL_FOLDER_TEMPLATE;
  if (wbEl && _SGC.futureWorksWorkbookName) wbEl.textContent = FUTURE_WORKS_LOCAL_FOLDER_TEMPLATE + '\\' + FUTURE_WORKS_WORKBOOK_NAME;
})();
```

The `copyFutureWorksLocalPath` button reads from the DOM, so it inherits the configured value automatically.

**Stormgauge `data/pluviometrics_ifd_table.json`:**

`"source_input"` field changed from absolute Windows path to repo-relative path. Only build metadata; not consumed by runtime code.

**Stormgrid `data/catchments/manifest.json`:**

Five absolute path fields rewritten as repo-relative. Build provenance only — `manifest.json` is documentation about how the GeoJSON was generated, not data the runtime consumes.

**Out of scope (deliberately not changed):**

- `Superseeded/before-blank-screen-fix-20260430/index.html` and `Superseeded/direct-calculator-route-before-fix/index.html` — the audit recommended a separate housekeeping pass to remove `Superseeded/` from the deployed branch entirely. Phase 1 left it alone.
- `scripts/build_asset_snapshot.py:25` and `scripts/build_catchment_ifd.py:18` in stormgrid — these are operator-side build scripts, not deployed. Same rationale.

### Task 2 — LICENSE + THIRD_PARTY_NOTICES + DATA_PROVENANCE

Three files added to each of the three repos. The LICENSE is **proprietary, all rights reserved** — the conservative choice that preserves all options, per the prompt's "DO NOT invent legal permissions" directive.

THIRD_PARTY_NOTICES inventories every runtime JS library with version, source, licence, and upstream licence URL. Map / tile services are listed separately with their terms-of-use links.

DATA_PROVENANCE tabulates every cached dataset, live API, and methodology reference. Items where the maintainer cannot make a confident statement are tagged **"Requires confirmation"** per the prompt's directive — this language is reproduced in the report exactly.

The hub variants are slim because the hub uses no JS libraries and ships no third-party data.

### Task 3 — Render API UX hardening (Stormgauge only)

`api()` was a 4-line wrapper that propagated network failures with no UX feedback:

```js
async function api(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
```

Replaced with a wrapper that:

- **Preserves the original signature and return shape.** Callers that pass `api(path)` work unchanged.
- Adds optional `{ timeoutMs = 30000, retries = 1 }` second argument.
- Wraps each attempt in an `AbortController` with a 30-second timeout.
- Retries once after a 1.5-second pause on any failure (timeout, abort, network, non-2xx).
- Calls `_showApiStatus(state)` to surface the cold-start UX:
  - `loading` → "Rainfall service: contacting…"
  - `retrying` → "Rainfall service: waking up (cold start, ~30 s)…"
  - `ok` → pill auto-hides after 600 ms
  - `error` → "Rainfall service unavailable. Cached/local results only." auto-hides after 8 s
- Logs informational messages (not errors) on failed attempts to avoid console-spam.
- Throws on final failure (preserves caller-side `try/catch` semantics — `loadStationIfd` already does this and continues to work).

The status-pill DOM element is a fixed-position overlay added once at end-of-body:

```html
<div id="apiStatusPill" role="status" aria-live="polite" hidden></div>
```

with CSS that matches the existing dark theme, sits at bottom-right, and uses `aria-live="polite"` so screen-readers pick up the cold-start message. **No layout impact** — it overlays existing content and is hidden by default.

**API payload structure unchanged. Returned values unchanged. Caller behaviour unchanged.**

### Task 4 — Logo / asset optimisation

`Assets/Logos/pluviometrics-main.png` re-encoded:

| Metric | Before | After | Change |
|---|---|---|---|
| Pixel dimensions | 18,751 × 14,584 (300 DPI) | 2,000 × 1,556 | −89% by area |
| File size | 1,963,871 B (1.87 MiB) | 315,598 B (308 KiB) | **−84%** |
| PNG mode | RGBA | RGBA (preserved) | unchanged |
| Aspect ratio | 1.286 : 1 | 1.286 : 1 | preserved |
| Visual content | Same logo | Same logo | preserved |

**Process:** PIL/Pillow LANCZOS down-scale + `optimize=True` PNG re-encode. No redraw, no recolour, no restyle.

**Note:** the hub's `index.html` does not actually `<img src>` this file — it loads the smaller `PLUVIOMETRICS.png` (376 KB) for display. `pluviometrics-main.png` appears to be a master/archive file. It is kept in the repo (smaller) in case any external Pluviometrics property links to it. Removing it entirely would be the bigger win for the hub deploy size, but that's a content decision out of scope for this hardening pass.

The other logos in the hub (`ATMOS.png` 723 KB, `STORMGAUGE.png` 555 KB, `PLUVIOMETRICS.png` 376 KB) are also larger than typical web display dimensions. Not touched in Phase 1 because they were not in the audited target list — flagged as a follow-up.

### Task 5 — Documentation

`README.md`, `docs/OPERATIONS.md`, and the example config script were added. Existing `README.md` files in stormgrid (good) were left unchanged. Each `OPERATIONS.md` documents:

- Hosting (Cloudflare Pages — corrected from the assessment's Render misframe).
- Branch model — particularly that **Stormgauge deploys from `staging`, not `main`**. This was flagged in the audit and is now in writing.
- Related Pluviometrics products (Stormgauge ↔ Stormgrid separation; Atmos relationship; council legacy).
- Hosting topology (per-product domain, deploy branch).
- External dependencies (Render API for Stormgauge with the cold-start caveat).
- Local preview procedure.
- Deployment procedure.
- Backup and recovery (Cloudflare dashboard re-link).

---

## Before / after summary

| Metric | Before | After |
|---|---|---|
| Stormgauge `index.html` tracked path-leak lines | 9 | 0 |
| Stormgauge `data/pluviometrics_ifd_table.json` path leaks | 1 | 0 |
| Stormgrid `data/catchments/manifest.json` path leaks | 5 | 0 |
| Stormgauge inline JS size (block 4) | 753,920 chars | 756,542 chars (+2.6 KB for the api wrapper + status helper + config block) |
| Hub `pluviometrics-main.png` size | 1.87 MiB | 308 KiB |
| Hub total deploy size (logos) | ~3.6 MiB | ~2.0 MiB |
| Repos with `LICENSE` | 0 | 3 |
| Repos with `THIRD_PARTY_NOTICES.md` | 0 | 3 |
| Repos with `DATA_PROVENANCE.md` | 0 | 3 |
| Repos with `docs/OPERATIONS.md` | 0 | 3 |
| Render API UX on cold start | silent 30-60 s hang | status pill, 30 s timeout, 1 retry, graceful "service unavailable" message |

---

## What was deliberately NOT touched

| Concern | Reason |
|---|---|
| AEP interpolation, IFD lookup logic | Protected per CLAUDE.md and prompt. |
| Rolling-rainfall calc (`>` not `>=`, `Math.floor`) | Same. |
| MHL KiWIS QC / fetch logic | Same. |
| BoM gauge handling, ts_id discriminator | Same. |
| Radar science (`bomRadar.js`, `rainviewerFallback.js`, `radarCumulativeRainfall.js`) | Same. |
| Export logic (XLSX / CSV / PNG) | Same — only the API wrapper was hardened, not the export path. |
| Packaging / costing / Future Works algorithms | Same. |
| BoM IFD cache, Northern Beaches gauges, NSW LGA boundaries | Externalisation is Phase 2, requires golden fixtures. |
| The 4,800-line inline classic JS monolith | Module split is Phase 2, requires golden fixtures. |
| Stormgrid synthetic-data warning machinery | Explicitly preserved per `STORMGRID_DATA_STATUS.md`. |
| Brand assets (Stormgauge / Stormgrid logos, Atmos logo, in-repo SVGs) | "DO NOT modify branding" — only the unused `pluviometrics-main.png` master was re-encoded. |

---

## Remaining blockers (from `FINAL_AUDIT_SUMMARY.md` punch list)

| Item | Status |
|---|---|
| 1. Path-leak edits | ✓ Done in Phase 1 |
| 2. LICENSE files | ✓ Done in Phase 1 |
| 3. Render API UX wrapper | ✓ Done in Phase 1 |
| 4. THIRD_PARTY_NOTICES + DATA_PROVENANCE | ✓ Done in Phase 1 |
| 5. Hub logo re-encode | ✓ Done in Phase 1 |
| 6. Stormgrid manifest path leak | ✓ Done in Phase 1 |
| 7. `_headers` files for cache hygiene | Pending (deferred to Phase 2) |
| 8. ENV / OPERATIONS / DEPLOYMENT skeletons | ✓ Done (consolidated into `docs/OPERATIONS.md`) |
| 9. AEP / rolling-rainfall / MHL QC golden fixtures | **Pending (Phase 2 prerequisite)** |
| 10. Hub commercial-positioning rewrite | Pending (separate copy/UX session) |
| 11. Dataset externalisation (3 blobs) | **Pending (Phase 2 — requires #9 done first)** |
| 12. Monolith split | **Pending (Phase 3 — requires #9 done first)** |
| 13. Stormgrid real gauge-fetcher implementation | Pending (engineering team) |
| 14. ARR2019 ARF coefficients transcription | Pending (operator) |
| 15. Render API paid tier OR migration | Pending (vendor decision) |
| 16. Source / org confirmation for `nsw-rainfall-analyser-api.onrender.com` repo | **Open question to owner** |
| 17. `data.pluviometrics.com.au` ownership / topology | **Open question to owner** |

---

## Risk assessment for Phase 1 changes

| Risk | Severity | Mitigation |
|---|---|---|
| The Future Works tab Future Works divs will display "(configure via STORMGAUGE_CONFIG.futureWorksFolderTemplate)" instead of an the council-specific path on the **public** deploy. | Low (intentional) | The council-deployed copies can ship a `<script>window.STORMGAUGE_CONFIG = {...}</script>` before the main script to restore historical paths. See `stormgauge-config.example.js`. |
| The api() wrapper changes timing semantics. A caller relying on a near-instant fail (no retry) would now wait ~31.5 s before throwing on a hard outage. | Low | Existing callers either `try/catch` and degrade gracefully (`loadStationIfd`) or are user-initiated actions where a longer wait with status feedback is preferable to the silent fail. |
| Status pill could conflict with existing fixed-position UI. | Very low | bottom-right placement, z-index 9999, hidden by default; layout-neutral. |
| Logo re-encode could change visual fidelity at very large display dimensions. | Very low | 2000 × 1556 is still well above any web display size. The original was a 300 DPI print master. |
| `manifest.json` rewrite could break a downstream consumer expecting absolute paths. | Very low | The file is documentation about a build output; no Stormgrid runtime code reads it. Verified by grep. |

---

## Validation

See `reports/PHASE1_VALIDATION.md`.

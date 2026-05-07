# MODULE_SPLIT_REPORT

**Scope:** Stormgauge `index.html` is a 5,263-line file with a single ~736 KB inline `<script>` block. This report measures the monolith, maps what's already been extracted, and identifies the remaining inline code that would need to move — without doing the move.
**Status:** Analysis only.

---

## Stormgauge — current measurements

| Metric | Value |
|---|---|
| `index.html` total size | 815,857 chars (~796 KB) |
| `index.html` total lines | 5,263 |
| Inline `<script>` blocks | 4 |
| Inline JS bytes (sum) | 773,852 chars (~756 KB) |
| External `<script src=...>` tags | 10 (3 local data blobs + 7 CDN libs) |
| Existing ES modules under `src/modules/` | 22 files across 5 subfolders |

### The 4 inline blocks broken out

| # | Lines | Bytes | Type | Content (first line) | Where it should go |
|---|---|---|---|---|---|
| 1 | ~6 | 167 | classic | `try{var _t=localStorage.getItem('sgTheme');document.documentElement.dataset.theme=...}` | Keep inline — pre-paint theme flash prevention. Standard pattern. |
| 2 | 1 | 53 | classic | `if(window.ChartZoom)Chart.register(window.ChartZoom);` | Move into the inline ESM block once Chart.js is module-loaded. |
| 3 | ~340 | 19,712 | `type="module"` | `import { buildExportModel } from './src/modules/exports/buildExportModel.js';` | Already an ESM bridge — does the extraction-glue work. |
| 4 | **~4,800** | **753,920** | **classic** | `// Config ...` | **The monolith. The whole task.** |

Block #4 is what the assessment refers to as "the inline JS bundle". It's classic (non-module) JavaScript that defines configuration constants, all the rainfall/AEP calculation functions, the Future Works tab, the Critical Assets tab, the Costing tab, the Packaging tab, the Atmos radar UI, all DOM event handlers, and the boot sequence.

---

## What's already been extracted (good news)

`src/modules/` already exists with a real structure. These are imported by inline block #3:

```
src/modules/
  exports/
    buildExportModel.js
    exportCsv.js
    exportHelpers.js
    exportPng.js
    exportXlsx.js
    workbookSheet.js
  map/
    mapInit.js
    mapLayers.js
  radar/
    bomRadar.js
    radarArchiveIndex.js  + .test.js
    radarAvailability.js  + .test.js
    radarCumulativeRainfall.js  + .test.js
    radarGaugeValidationExport.js  + .test.js
    rainviewerFallback.js
  stations/
    stationLoader.js
    stationMarkers.js
  ui/
    controls.js
    theme.js
```

This is a healthy starting point. **The protected scientific paths the assessment is most worried about are already in modules** — radar, exports, station loading. The monolith block #4 is mostly UI orchestration, tab wiring, and the AEP/IFD computation core that has not yet been extracted.

---

## What remains in block #4 (estimated, by reading)

A line-by-line categorisation requires the implementation pass, but reading the file shows roughly:

| Concern | Approx lines | Risk if moved | Notes |
|---|---|---|---|
| Config constants (`API`, `PLUVIOMETRICS_RAINFALL_STATION_DATA_URL`, `ALL_DURATIONS`, etc.) | ~100 | Trivial | Pure data; move first as `src/modules/config.js`. |
| AEP / IFD interpolation | ~600 | **HIGH** | CLAUDE.md: protected. Numeric parity must be byte-exact. Recommend extracting into `src/modules/rainfall/aep.js` with the same `tests/golden/` fixture pattern Stormgrid uses. |
| Rolling-window rainfall (`calcRollingMax`, `>` not `>=`, `Math.floor`) | ~200 | **HIGH** | Lessons-learned items in CLAUDE.md called out specifically. Same fixture treatment. |
| MHL KiWIS fetch/QC | ~400 | Medium-high | `applyRainfallQc` lessons-learned: this used to be a no-op stub. Move with care. |
| BOM gauge handling (ts_id discriminator, daily-totals classification) | ~300 | Medium-high | Lessons-learned in CLAUDE.md. |
| Future Works tab UI + LGA filter | ~700 | Low-medium | Pure UI + a polygon test against `NSW_LGA_BOUNDARIES`. Easier extraction. |
| Critical Assets tab | ~400 | Low | Mostly DOM + CSV ingest. |
| Costing tab | ~400 | Low | DOM + lookup table. |
| Packaging tab | ~500 | Low-medium | Calls `cost_engine.py` API on Render. |
| Atmos radar tab UI | ~300 | Low | Most logic already in `src/modules/radar/`. Block #4 wires it up. |
| Export wiring | ~200 | Low | Most logic in `src/modules/exports/`. Block #4 calls it. |
| Boot / DOM-ready sequence | ~100 | Medium | Order matters — this is the "wait for datasets" gate. |

Estimates from spot-reading; actual numbers require the implementation phase.

---

## Stormgrid — for comparison (no work needed)

Stormgrid is already split. `index.html` is 2,451 chars, one tiny inline `<script type="module">` that mounts a shell from `src/stormgridUi.js`. Twenty-six well-named ES modules under `src/`. CSP is strict (`script-src 'self'`). **The assessment's monolith criticism does not apply to Stormgrid.**

## Hub — for comparison (no work needed)

Hub `index.html` is 4,889 chars. Two small inline scripts (theme flash + a 1.2 KB IIFE for nav). No work needed.

---

## Why the monolith is not a one-shot refactor

| Constraint | Implication |
|---|---|
| `window.*` shims required | The inline block #3 explicitly does `window.rainviewerFallback = rainviewerFallback;` — block #4 then reads `window.rainviewerFallback`. Any extraction has to preserve the global surface or audit every `window.*` consumer. |
| AEP / rolling-rainfall logic is protected | Per CLAUDE.md, these cannot be touched without numeric-parity tests captured first. The Stormgauge repo has zero golden fixtures for these paths today (only Stormgrid has `tests/golden/`). **Capturing the fixtures is the first ~half-day of work** before any extraction. |
| No build step | Stormgauge ships the raw `index.html` to Cloudflare Pages. No bundler, no tree-shake. Splitting one inline block into N modules adds N HTTP requests unless an HTTP/2 server-push or `<link rel="modulepreload">` strategy is added (Cloudflare Pages supports HTTP/2). |
| Boot ordering | Block #4 currently runs after the three blocking `<script src>` data tags. Splitting it requires the dataset gate from `DATASET_EXTERNALISATION.md` to land first, otherwise modules race the data. |

---

## Recommended phasing (analysis only)

1. **Capture golden fixtures** for AEP, rolling-rainfall, MHL QC. Ship as `tests/golden/*.json` with a `node scripts/check_golden.mjs` runner. **No production code change.**
2. **Extract config first** (~100 lines, zero risk). `src/modules/config.js`. Validates the build/load story.
3. **Extract Costing + Critical Assets + Packaging tabs** (~1,300 lines, low risk). UI-only.
4. **Extract Future Works tab** (~700 lines, low-medium). Includes the LGA filter — needs `NSW_LGA_BOUNDARIES` available. Sequence after dataset externalisation Phase A.
5. **Extract AEP / IFD** (~600 lines, HIGH). Only after fixtures pass on the existing inline code.
6. **Extract rolling-window** (~200 lines, HIGH). Same.
7. **Extract MHL/BOM data fetchers** (~700 lines, medium-high). Same.
8. **Atmos radar UI wiring** (~300 lines, low). Most code already extracted.
9. **Boot sequence + window.* shims** (~100 lines, medium). Last, because it's the integration test.

Total estimated effort, conservatively: **3–5 working days**, half of it being fixture capture and parity verification, not the moves themselves.

---

## What this report does NOT do

- Does not move a single line.
- Does not capture fixtures (separate task).
- Does not introduce a build step.
- Does not introduce a framework — explicitly forbidden by the prompt and unnecessary; ESM imports work natively.

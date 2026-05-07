# DATASET_EXTERNALISATION

**Scope:** Three large `<script>`-tag-loaded data blobs in Stormgauge that block initial page render.
**Goal of this report:** quantify the problem, identify load-time semantics, propose a CDN/lazy strategy, and surface the timing risks that make this a multi-step refactor — **not** a one-shot conversion.
**Status:** Analysis only. **No files moved, no code changed.**

---

## Current state — exact measurements (Stormgauge `staging`)

| File | Size on disk | Type | Defines | Loaded how |
|---|---|---|---|---|
| `bom_ifd_cache.js` | 13,929,665 B (13.3 MiB) | JS literal | `window.BOM_IFD_CACHE = { "lat,lon": { duration: { aep: mm } } }` | `<script src="./bom_ifd_cache.js"></script>` at `index.html:21`, **synchronous, blocks parse** |
| `bom_northern_beaches_all_gauges.js` | 7,341,795 B (7.0 MiB) | JS literal | `window.BOM_NORTHERN_BEACHES_GAUGES = FeatureCollection` | Same pattern, synchronous |
| `nsw_lga_boundaries.js` | 1,362,032 B (1.3 MiB) | JS literal | `window.NSW_LGA_BOUNDARIES = FeatureCollection` | Same pattern, synchronous |
| **Subtotal** | **22,633,492 B (~22.6 MiB)** | | | **All three block the inline 736 KB module bundle from running** |

Additional async-loaded data already deferred (no action needed):

| File | Size | Loader | Loaded when |
|---|---|---|---|
| `data/pluviometrics_ifd_table.json` | 6.4 MiB | `fetch()` at `index.html:4428` with `cache:'no-store'` | After page parse, fire-and-forget Promise |

Cold-load over a typical Cloudflare Pages connection: ~22.6 MiB compressed gzip ≈ ~3–5 MiB on the wire (the IFD cache and gauge GeoJSON compress well — repetitive numeric keys/values). On a residential Australian ADSL/4G connection that's still 1–4 seconds of blocking before the inline JS module executes.

---

## What depends on these globals (call-site map)

I traced every reference in `index.html`:

| Global | First reference | Module-level vs deferred |
|---|---|---|
| `window.BOM_IFD_CACHE` | `index.html:1723, 2040, 4446, 4449, 4490` | Mostly inside functions called after user interaction. **However** `1723` and `2040` are inside `setupAtmosTab()` and `setupRainfallTab()` style initialisers that may run during DOM-ready. |
| `window.BOM_NORTHERN_BEACHES_GAUGES` | `index.html:1724, 2041` | Same initialiser blocks. Used to seed the gauge list. |
| `window.NSW_LGA_BOUNDARIES` | (need full trace before refactor) | Used by Future Works LGA filter; mid-load. |

**Critical:** before externalising, every consumer must be audited. If any consumer reads `window.BOM_IFD_CACHE` synchronously at module-init time, async loading silently produces `undefined` and AEP outputs become wrong (no crash — quietly missing data).

---

## Why this is not a one-shot refactor

| Risk | Detail |
|---|---|
| **AEP correctness** | `BOM_IFD_CACHE` is a fallback path for AEP interpolation when the enriched table doesn't have a station. If it loads after the first interpolation runs, results drift. The fallback at `index.html:4490` (`"falling back to BOM_IFD_CACHE + live MHL API"`) confirms this is on the AEP critical path. CLAUDE.md mandates: "Never change ranking logic and rolling window in the same commit" — this carries the same constraint. |
| **Initialisation order** | Three separate fetches must all resolve before the inline module bundle assumes the globals exist. Need a `Promise.all` gate with a real loading skeleton — not just hide-the-page. |
| **CSP impact** | Stormgauge already has a strict CSP at `index.html:6` with `connect-src` enumerating allowed origins. The new fetch URLs must be added to `connect-src` BEFORE the script change ships, or the fetch fails silently. |
| **No module-init reliance** | All consumers must defer access to `window.X` until the load promise resolves. This means wrapping `setupRainfallTab()` etc. in `await datasetReady` or refactoring the init sequence. |
| **Cache invalidation** | Current `<script src>` benefits from immutable URL caching by version (none today, but trivial to add). The async fetch needs explicit cache-versioning (`?v=<hash>`) or it stales. The async IFD-table fetch already uses `?v=${Date.now()}` (no caching) — that's the wrong end of the spectrum. |

---

## Recommended architecture — analysis only

### Phase A (low-risk, ship first)

1. **Convert blob format**: change `bom_ifd_cache.js` (13.3 MiB) to `bom_ifd_cache.json` (~13 MiB JSON, smaller without the `window.X = ` wrapper and trailing `;`). Strip JS, write JSON. Same for the other two.
2. **Loader module**: create `src/modules/data/datasetLoader.js` exporting:
   ```
   loadIfdCache() : Promise<object>
   loadNorthernBeachesGauges() : Promise<FeatureCollection>
   loadNswLgaBoundaries() : Promise<FeatureCollection>
   ```
   Each uses `fetch()` with `cache: 'force-cache'`, exposes the resolved value via a memoised promise, and assigns to `window.BOM_IFD_CACHE` etc. so legacy consumers see the same global once loaded.
3. **Init gate**: replace the three `<script src="./bom_*.js">` tags with a single inline `<script type="module">` that awaits all three loaders, then dispatches a `datasetsReady` custom event. The existing inline module bundle listens for that event before mounting interactive UI.
4. **Loading UI**: render a skeleton in `<main>` until `datasetsReady`. Existing UI flickers blank for ~3 s today; a real skeleton is a UX improvement on top of the perf win.
5. **CSP update**: if datasets stay at the same origin (Cloudflare Pages root), no CSP change needed. If they move to `data.pluviometrics.com.au` (already CSP-allowed), no change needed. **This means we can ship without touching CSP** — recommend keeping datasets at the same origin.

### Phase B (CDN, optional, only after A is stable)

1. Move the three datasets to `data.pluviometrics.com.au` (already in `connect-src`). Cloudflare R2 with public read, custom domain, immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`), version pinned via filename hash.
2. Build script computes content hash and writes the URL into a generated `data/manifest.json` shipped with the SPA. Loader reads the manifest first, then the hashed URLs.
3. Same-origin fallback for outage tolerance.

### Out of scope (do not externalise)

- `data/pluviometrics_ifd_table.json` (6.4 MiB) — already async-loaded, behaviour is fine. Recommend only switching `cache:'no-store'` to a versioned cache strategy (small win).
- BOM tile images — already CDN-served from `radar-tiles.service.bom.gov.au`.
- Logos — under 2 MiB total, fine on Cloudflare Pages.

---

## Estimated impact (analysis, not benchmarked)

| Metric | Now | After Phase A | After Phase B |
|---|---|---|---|
| Blocking JS before paint | 22.6 MiB raw / ~5 MiB gzip | ~10 KB (inline boot) | ~10 KB (inline boot) |
| Time-to-interactive on cable | ~3–5 s | ~1–2 s (parallel fetch) | ~1–2 s (warm CDN) |
| Memory ceiling (parsed JSON) | ~70 MB | ~70 MB (unchanged — same data) | Same |
| Repeat-visit cost | Full re-download (no cache hint) | Browser cache hit (~0 ms) | Edge cache hit + immutable (~0 ms) |

The memory ceiling is unchanged because the data still gets parsed into JS objects. The win is **time-to-first-meaningful-paint and parallelism**, not memory.

---

## Scientific-output parity guarantees needed before this fix lands

Before any byte of this changes, the test plan must:

1. **Snapshot AEP outputs** for ≥10 stations across all durations, save to `tests/golden/aep_pre_externalisation.json`.
2. **Snapshot the Future Works LGA filter** result set for a known polygon.
3. **Run identical inputs after the change** and diff. Zero tolerance on numeric drift.
4. **Verify the CSP with an actual browser** (DevTools console) — no `Refused to connect` warnings.
5. **Verify the offline / slow-3G case** in DevTools throttling — datasets eventually arrive, no infinite spinner.

CLAUDE.md rule: "Diagnose before fixing" — this report is the diagnosis. The implementation needs its own design pass with the test fixtures captured first.

---

## What this report does NOT do

- Does not move any file.
- Does not split the inline JS bundle (separate report: `MODULE_SPLIT_REPORT.md`).
- Does not benchmark — sizes above are file-system measurements, not WebPageTest runs.
- Does not change CSP.
- Does not touch any AEP / IFD / radar / export logic.

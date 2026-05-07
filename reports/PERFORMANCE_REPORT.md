# PERFORMANCE_REPORT

**Scope:** Cold-load and runtime characteristics of Stormgauge, Stormgrid, Hub.
**Status:** Static analysis from file sizes and load patterns. **No live benchmarks (no Lighthouse, no WebPageTest)** — those need a live load against the deployed sites and a defined network profile, which is out of scope for an audit-only pass. Numbers below are file-on-disk and load-pattern derived.

---

## Stormgauge — initial payload

### What blocks first paint / interactive (ordered by `<head>` position)

| # | Resource | Size on disk | Origin | Cache today |
|---|---|---|---|---|
| 1 | Leaflet CSS + JS | ~150 KB | cdnjs.cloudflare.com | CDN, immutable |
| 2 | Chart.js + chartjs-plugin-zoom + Hammer | ~280 KB | cdn.jsdelivr.net | CDN, immutable |
| 3 | html2canvas | ~210 KB | cdn.jsdelivr.net | CDN, immutable |
| 4 | `nsw_lga_boundaries.js` | **1.36 MB** | self | none |
| 5 | `bom_northern_beaches_all_gauges.js` | **7.34 MB** | self | none |
| 6 | `bom_ifd_cache.js` | **13.93 MB** | self | none |
| 7 | xlsx + xlsx-js-style | ~1.2 MB | cdn.sheetjs.com / jsdelivr | CDN, immutable |
| 8 | Inline ESM bridge | 19.7 KB | inline | n/a |
| 9 | Inline classic monolith | **753.9 KB** | inline | n/a |
| | **Total blocking before interactive** | **~25.2 MB raw** | | |

### What loads after first paint

| Resource | Size | Loader |
|---|---|---|
| `data/pluviometrics_ifd_table.json` | 6.4 MB | `fetch()` with `cache:'no-store'` |
| Pluviometrics rainfall stations JSON | unknown (live) | `fetch()` from `data.pluviometrics.com.au` |
| Per-station IFD data (on demand) | small per call | `fetch()` to `nsw-rainfall-analyser-api.onrender.com` |
| MHL KiWIS rainfall (on demand) | small per call | `fetch()` to `wiski.mhl.nsw.gov.au` |
| BOM radar tiles (on demand) | tiny per tile | `radar-tiles.service.bom.gov.au` |
| RainViewer tiles (fallback) | tiny per tile | `tilecache.rainviewer.com` |

### Estimated cold-load time (analysis, not measured)

Using realistic gzip ratios (~3.5× on JSON-heavy data, ~3× on the inline JS):

| Network | Total transfer | Time to interactive (rough) |
|---|---|---|
| Office fibre (50 Mbps) | ~7 MB | ~2–3 s |
| Home cable (10 Mbps) | ~7 MB | ~6–10 s |
| 4G mobile (5 Mbps real) | ~7 MB | ~12–20 s |

The dominant blocker is the synchronous fetch of `bom_ifd_cache.js` (13.9 MB raw, ~4 MB gzip). This is what `DATASET_EXTERNALISATION.md` addresses.

---

## Stormgauge — runtime characteristics

| Concern | Status |
|---|---|
| Memory after datasets parse | ~70 MB (rough, all three globals as JS objects) |
| Map viewport station loading | **Not implemented** — all northern-beaches gauges load eagerly. For a Sydney-wide future, this becomes a problem. |
| Memoisation of expensive calcs | Per-station IFD has a `ifdCache` and `ifdLoadPromises` (`index.html:4422`); good. AEP interpolation is not memoised — small per call, probably fine. |
| Request deduplication | Yes for IFD (`ifdLoadPromises`), implicit elsewhere. |
| Loading skeletons | None — page goes blank during cold load. |
| Timeout handling | None visible on `fetch(API + path)` at line 4412. A free-tier Render cold start can take 30+ s; the UI has no timeout, no retry, no graceful "service waking up" message. |
| API retry strategy | None for the Render API. RainViewer fallback exists for radar but only when BOM radar fails, not when it's slow. |

---

## Stormgrid — initial payload

| # | Resource | Size | Notes |
|---|---|---|---|
| 1 | Leaflet | ~150 KB | CDN |
| 2 | html2canvas | ~210 KB | CDN |
| 3 | `stormgrid.css` | small | self |
| 4 | Inline ESM bootstrap | 369 chars | mounts `stormgridUi.js` |
| 5 | `src/stormgridUi.js` + 25 imports | total unknown but lean (each module ~5–30 KB) | self, modular |

### What loads after first paint

| Resource | Size | Loader |
|---|---|---|
| `data/catchment_rainfall_<window>.json` | 121 KB (30d), smaller for 24h/7d | `stormgridDataLoader.js` with cache + dedup |
| `data/assets/stormwater_assets.geojson` | **15.3 MB** | on-demand for Assets tab |
| `data/catchments/catchments_dissolved.geojson` | **6.2 MB** | on-demand for catchment map |
| `data/catchments/catchments_parts.geojson` | 6.4 MB | on-demand |
| Event archive JSON | ~110–210 KB each | on-demand |

Stormgrid's initial payload (before any tab interaction) is **under 500 KB** — excellent.

The 15.3 MB `stormwater_assets.geojson` is synthetic/placeholder data per `STORMGRID_DATA_STATUS.md`. When real data lands it should be split by catchment or tile, not shipped whole.

---

## Hub — initial payload

| Resource | Size |
|---|---|
| `index.html` | 4.9 KB |
| `styles.css` | small |
| `Assets/Logos/pluviometrics-main.png` | **1.96 MB** |
| `Assets/Logos/PLUVIOMETRICS.png` | 376 KB |
| `Assets/Logos/STORMGAUGE.png` | 555 KB |
| `Assets/Logos/ATMOS.png` | 723 KB |

**Total: ~3.6 MB**, mostly logos. The `pluviometrics-main.png` at 1.96 MB is the only real concern — it's a hero/landing graphic. Easy win: re-export at typical web resolution (720p–1080p), expect 80–90 % size cut. **No code change needed; pure asset re-encode.** Not action-required for this audit.

---

## Recommended next fixes (NOT applied)

Ranked by impact-per-effort:

1. **Stormgauge: add a timeout + retry + "API waking up" UX to the Render fetch wrapper** (`index.html:4411`). 30 lines of code, eliminates the silent-hang user complaint when the free tier cold-starts. Risk: zero — wraps existing call.
2. **Stormgauge: add `cache: 'force-cache'` (or remove `cache: 'no-store'`) on `pluviometrics_ifd_table.json` fetch** (`index.html:4428`). Use a content-hash version pin. Risk: low if the version pin is correct.
3. **Hub: re-export `Assets/Logos/pluviometrics-main.png`** to ~300 KB. Pure image re-encode. Risk: zero (logos are SOURCE OF TRUTH per project rules — but re-encoding the same image at lower file size doesn't change branding or design).
4. **Stormgauge: dataset externalisation** per `DATASET_EXTERNALISATION.md`. Biggest win, biggest risk. Wait for fixture capture.
5. **Stormgauge: viewport-bound station rendering**. Defer until station coverage actually expands beyond Northern Beaches.
6. **Stormgauge: loading skeleton** — adds perceived performance even if real time-to-interactive doesn't change. Easy after the dataset gate is in place.

---

## What this report does NOT do

- No Lighthouse run, no WebPageTest, no real-user measurement.
- No memoisation work.
- No code changes.
- No image re-encoding.

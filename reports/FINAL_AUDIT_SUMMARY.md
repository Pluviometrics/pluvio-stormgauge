# FINAL_AUDIT_SUMMARY

**Audit pass:** 2026-05-07
**Scope:** Three repos — `pluvio-stormgauge` (audit branch off `staging`), `stormgrid` (off `main`), `pluviometrics-hub` (off `main`).
**Mandate:** Audit only. No production code changed.

---

## What was actually delivered

| Report | Repo | Status |
|---|---|---|
| `reports/PATH_LEAK_AUDIT.md` | pluvio-stormgauge | ✓ |
| `reports/DATASET_EXTERNALISATION.md` | pluvio-stormgauge | ✓ |
| `reports/MODULE_SPLIT_REPORT.md` | pluvio-stormgauge | ✓ |
| `reports/PERFORMANCE_REPORT.md` | pluvio-stormgauge | ✓ |
| `reports/HOSTING_HARDENING_PLAN.md` | pluvio-stormgauge | ✓ |
| `reports/LEGAL_AND_LICENSING_AUDIT.md` | pluvio-stormgauge | ✓ |
| `reports/STORMGRID_DATA_STATUS.md` | stormgrid | ✓ |
| `reports/HUB_AUDIT_NOTES.md` | pluviometrics-hub | ✓ |
| `reports/FINAL_AUDIT_SUMMARY.md` | pluvio-stormgauge | this file |

No production source files modified. No data moved. No CSP changed. No fix applied.

---

## What we found vs what the assessment claimed

| Assessment claim | Verified? | Notes |
|---|---|---|
| "Hard-coded personal/council paths leak into public code" | **Partly** | Stormgauge `index.html` has 9 lines of leaks (high+medium severity). Stormgrid has 5 lines in a non-shipped manifest. Hub is clean. The assessment did not specify line counts; ours are exact. |
| "Massive inline data blobs (~22 MB) block client load" | **Yes — 22.6 MB exact** | `bom_ifd_cache.js` 13.9 MB, `bom_northern_beaches_all_gauges.js` 7.3 MB, `nsw_lga_boundaries.js` 1.36 MB, all loaded synchronously. |
| "Monolithic ~5,000-line `index.html` with ~758 KB inline JS" | **Yes — 5,263 lines, 753.9 KB inline block** | Plus 19.7 KB ESM bridge plus tiny boot scripts. Total inline JS ~756 KB. |
| "Render free-tier sleeping" | **Partly — and misframed** | All three SPAs are on **Cloudflare Pages**, not Render — always-on, no sleep. The Render service is a single API (`nsw-rainfall-analyser-api.onrender.com`) used for per-station rainfall fetches. The cold-start UX problem is real but is a single endpoint, not the whole platform. |
| "Stormgrid has synthetic gauges and placeholder ARF" | **Yes — by design** | Every synthetic record carries an explicit `is_synthetic: true` and a UI warning banner. Exports carry `verified: false`. The flags are a methodology-honest fail-loud guard, not a defect. The defect is that real-data wiring isn't done — and even that is gated by `scripts/build_gauge_observations.py` returning `None` so the synthetic data cannot be silently overwritten. |
| "Hub undersells the platform" | **Out of scope for this audit** | Copy/positioning is subjective; this audit did not rewrite the hub. |
| "Render hosting issues" | **See HOSTING_HARDENING_PLAN.md** | Real for the Render API; not real for Stormgauge/Stormgrid/Hub themselves. |

---

## Key facts to share with anyone reviewing this audit

1. **Hosting topology — not what the assessment said.** All three SPAs are Cloudflare Pages. There is exactly one Render service (a Python API for per-station rainfall) and it has no source visible in any of the three audited repos.
2. **Path leaks are limited.** Only Stormgauge `index.html` (and two Superseeded copies of it) leak council SharePoint paths to public users. Stormgrid and Hub are clean of tracked leaks.
3. **The 22 MB blob problem is the single biggest perf issue.** Three `<script src>` tags blocking initial page parse. The fix is well-scoped but needs golden fixtures captured first because `bom_ifd_cache` is on the AEP fallback path.
4. **Stormgrid is more mature than the assessment implies.** Strict CSP, modular ESM, fail-loud synthetic-data flags, async data loader with cache + dedup. Most of the architectural advice in the assessment was already followed there.
5. **No `LICENSE` file in any repo.** This is the single biggest commercial-readiness gap that's purely paperwork.
6. **The Stormgauge monolith is the largest residual technical-debt item** — but `src/modules/exports/`, `src/modules/radar/`, `src/modules/stations/` show the team has already started the split. The remaining ~4,800 lines of inline classic JS are the next ~3–5 days of work, half of it being parity-test capture.

---

## Risk register (post-audit)

| Risk | Severity | Owner action |
|---|---|---|
| Personal / council SharePoint paths visible in public DOM | High | Apply 3 small `index.html` edits per `PATH_LEAK_AUDIT.md` recommended fix #1. |
| Render API cold-start hangs the UI | Medium-High | Apply 30-line timeout/retry/UX wrapper per `HOSTING_HARDENING_PLAN.md` interim fix. |
| 22 MB sync blob load on every cold visit | Medium | Phase A externalisation per `DATASET_EXTERNALISATION.md`. Requires fixture capture first. |
| BOM tile API is undocumented and may break | Medium | Confirm commercial path with BOM, or fall back fully to RainViewer. |
| No `LICENSE` files | Medium (commercial blocker) | Author choice; add files. |
| Synthetic Stormgrid asset register could be misused if banners are removed | Low (well-defended today) | **Do not remove the warning machinery.** Wire real council export to replace the synthetic data. |
| Stormgauge has zero golden fixtures for AEP / rolling-rainfall / MHL QC | Medium (blocks safe refactor) | Capture fixtures BEFORE any monolith split. Stormgrid's `tests/golden/` pattern is a good template. |
| `Superseeded/` ships ~1.6 MB of dead HTML on every Cloudflare Pages deploy | Low | Housekeeping pass — remove from `staging` branch. |

---

## Commercial-readiness assessment (subjective, evidence-based)

| Dimension | Verdict |
|---|---|
| Static hosting reliability | **Good.** Cloudflare Pages, three sites, no cold start. |
| Backend reliability | **Weak.** Single Render free-tier service, no UX timeout, single point of failure. |
| Performance (cold load) | **Poor for Stormgauge** (22 MB blocking), **excellent for Stormgrid and Hub.** |
| Code modularity | **In progress for Stormgauge** (5 module folders extracted, monolith remaining), **strong for Stormgrid**, **n/a for Hub**. |
| Data provenance & methodology honesty | **Strong for Stormgrid** (every flag, every banner), **moderate for Stormgauge** (data sources cited inline only), **clean for Hub.** |
| Licensing posture | **Weak across the board.** No `LICENSE` files. No `THIRD_PARTY_NOTICES`. No `DATA_PROVENANCE`. |
| Operational documentation | **Minimal.** No `docs/OPERATIONS.md`, no `docs/DEPLOYMENT.md`, no `.env.example`. |
| Path / leak hygiene | **Good in 2 of 3 repos**, easy fix in Stormgauge. |
| Brand assets | **Good.** Logos protected and source-of-truth in `Assets/Logos/`. |

**Net assessment:** The platform is closer to production-ready than the assessment suggests on architecture grounds (Stormgrid in particular), and further from production-ready on paperwork grounds (licensing, ops docs). The "show-stopper" items in any honest go-to-market checklist are:

1. **Add LICENSE + THIRD_PARTY_NOTICES + DATA_PROVENANCE** (1 working day).
2. **Confirm commercial-licence terms with BOM, MHL, RainViewer, CARTO/ArcGIS, Lizard, OSM Nominatim** (operator/owner — weeks of correspondence).
3. **Move the Render API off the free tier OR ship the timeout/retry/UX wrapper** (one day either way).
4. **Apply path-leak fixes in Stormgauge `index.html`** (30 minutes).
5. **Capture AEP / rolling-rainfall golden fixtures** so the externalisation + module-split work can proceed without numeric drift risk (half a day).

Items 1, 3, 4, 5 are all single-day or sub-day tasks. The platform's actual technical readiness is healthier than the licensing/paperwork readiness.

---

## Recommended next fixes — consolidated punch list

Ordered by impact-per-effort, **not yet applied**:

| # | Fix | Effort | Risk | Touches protected logic? |
|---|---|---|---|---|
| 1 | Stormgauge `index.html` path-leak edits (lines 722, 726, 1371, 5188–5190) | 30 min | Low | No |
| 2 | Add `LICENSE` to all three repos | 30 min | Zero | No |
| 3 | Stormgauge: add timeout + retry + "API waking up" UX to Render fetch wrapper | 1 hour | Low | No (wraps existing call) |
| 4 | Add `THIRD_PARTY_NOTICES.md` and `DATA_PROVENANCE.md` to each repo | 2 hours | Zero | No |
| 5 | Stormgauge: re-export `Assets/Logos/pluviometrics-main.png` at 720p (1.96 MB → ~300 KB) | 15 min | Zero | No (same logo, smaller file) |
| 6 | Stormgrid: sanitise `data/catchments/manifest.json` path leaks | 15 min | Zero | No (provenance metadata only) |
| 7 | Add `_headers` file to each Cloudflare Pages repo for cache-control hygiene | 30 min | Low | No |
| 8 | Add `docs/OPERATIONS.md`, `docs/DEPLOYMENT.md`, `.env.example` skeletons | 2 hours | Zero | No |
| 9 | Stormgauge: capture AEP / rolling-rainfall / MHL QC golden fixtures | 4 hours | Low | Touches them but only to read; no behaviour change |
| 10 | Stormgauge: hub-style positioning rewrite | 1 day | Zero (copy only) | No |
| 11 | Stormgauge: Phase A dataset externalisation (3 blobs → JSON + async loader) | 1–2 days | **High** | Borderline — `bom_ifd_cache` is on AEP fallback path. Requires #9 done first. |
| 12 | Stormgauge: monolith split (config → tabs → AEP → rolling → fetchers → boot) | 3–5 days | **High** for the AEP/rolling parts | Yes — requires #9 done first |
| 13 | Stormgrid: implement `scripts/build_gauge_observations.py` real fetchers | 2–3 days | Low (script self-protects) | No |
| 14 | Stormgrid: transcribe ARR2019 ARF coefficients | 1 day (engineer) | Low | No (data only) |
| 15 | Render API: paid tier OR migration | Vendor-dependent | Low if paid tier | No |

**Recommendation:** ship items 1–8 in a single small PR per repo (low risk, high cleanup value). Hold items 9–12 for a planning conversation — they're the substantial engineering work and benefit from a Plan-mode design pass.

---

## Outstanding questions for owner

1. Where is the source repo for `nsw-rainfall-analyser-api.onrender.com`? Not in the three audited repos.
2. What's the bucket / origin for `data.pluviometrics.com.au`? Cloudflare R2? Public read?
3. Has the operator chosen a licence (MIT, Apache-2.0, proprietary) for the three repos?
4. What's the commercial-licence status with BOM, MHL, RainViewer, CARTO, Lizard, OSM Nominatim?
5. Is `Superseeded/` in `pluvio-stormgauge:staging` something you want kept (historical reference) or removed (it ships to Pages)?

---

## What this audit deliberately did NOT do

- Did not modify any production source.
- Did not move or rename any file.
- Did not change Cloudflare configuration.
- Did not contact any data provider.
- Did not capture any golden fixture.
- Did not run any benchmark.
- Did not push to `staging`, `main`, or any production branch — all reports are on `audit/assessment-hardening-*` branches.
- Did not touch protected scientific logic (AEP / rolling-rainfall / radar / exports / packaging).
- Did not violate Stormgauge ↔ Stormgrid product boundaries.

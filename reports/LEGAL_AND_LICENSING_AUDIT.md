# LEGAL_AND_LICENSING_AUDIT

**Scope:** Third-party data, services, and code that the three pluviometrics products depend on. Identifies licence terms, redistribution risk, and gaps.
**Status:** Report only. **No legal conclusions are drawn — this report identifies what an actual licensing review needs to cover.** A solicitor or commercial-licence-aware review is needed before any "commercial readiness" claim is made.

---

## Headline gaps

1. **No `LICENSE` file in any of the three repos.** All three are public on GitHub. Without a licence, default copyright applies — which makes "commercial readiness" ambiguous to anyone reading the source.
2. **No `THIRD_PARTY_NOTICES.md` in any repo.** The libraries (Leaflet, Chart.js, html2canvas, SheetJS, xlsx-js-style) all carry attribution requirements that aren't currently surfaced.
3. **No `DATA_PROVENANCE.md` in any repo.** Data sources are referenced inline in code comments only.
4. **At least three datasets are derivative works of public data — redistribution terms are not documented.**

---

## Third-party JavaScript (CDN-loaded)

Libraries loaded by Stormgauge `index.html`:

| Library | Version | Source | Licence (per upstream — please verify) | Attribution required? |
|---|---|---|---|---|
| Leaflet | 1.9.4 | cdnjs | BSD-2-Clause | Yes — copyright notice |
| Chart.js | 4.4.1 | cdnjs | MIT | Yes |
| chartjs-plugin-zoom | 2.2.0 | jsdelivr | MIT | Yes |
| Hammer.js | 2.0.8 | jsdelivr | MIT | Yes |
| html2canvas | 1.4.1 | jsdelivr | MIT | Yes |
| SheetJS (xlsx) | 0.20.2 | cdn.sheetjs.com | Apache-2.0 (community edition) | Yes — NOTICE preserved |
| xlsx-js-style | 1.2.0 | jsdelivr | MIT | Yes |

Stormgrid loads only Leaflet 1.9.4 + html2canvas 1.4.1 (same as above).
Hub loads no JS libraries.

**Action required (NOT applied):** generate `THIRD_PARTY_NOTICES.md` per repo with the upstream LICENSE text for each dependency. Tooling: a one-shot script that reads npm metadata or pulls from cdnjs/jsdelivr API.

---

## Third-party data and APIs

Each row needs solicitor confirmation. The "Risk" column is **author's read of public guidance**, not a legal opinion.

### Government data sources

| Source | Used for | Endpoint / cache | Public terms (as published) | Redistribution risk (rough) |
|---|---|---|---|---|
| **BOM rainfall radar tiles** | Atmos radar background, Stormgrid radar layer | `radar-tiles.service.bom.gov.au/tiles/{time}/{z}/{x}/{y}.png` | BOM does not formally publish a public tile API. The `radar-tiles.service.bom.gov.au` service is a known-but-undocumented endpoint widely used by hobbyist apps. **Officially, BOM imagery is reusable for non-commercial purposes under [Creative Commons BY 4.0](https://reg.bom.gov.au/other/copyright.shtml) for most products, with attribution.** Commercial use requires a commercial agreement. | **HIGH for commercial use.** Reusing the unpublished tile endpoint commercially is operationally and legally fragile. Mitigation: enter a commercial data agreement with BOM, or fall back fully to RainViewer (which is licensed for commercial use under their plan). |
| **BOM IFD design rainfall** | Cached as `bom_ifd_cache.js` (13.9 MB), used in AEP fallback | Originally fetched from BOM IFD design-rainfall portal; cached locally | BOM IFD outputs are **published under Creative Commons BY 4.0** for most public products — **but** commercial redistribution of the bulk dataset (vs use of derived results) needs explicit clarification with BOM. | **MEDIUM-HIGH for redistribution.** Caching the bulk IFD dataset and shipping it to every browser visit may exceed the spirit of the licence. Recommended: cite BOM as the source in the UI, in `DATA_PROVENANCE.md`, and confirm bulk-redistribution terms with BOM. |
| **MHL KiWIS rainfall / river / tide** | Stormgauge live data | `wiski.mhl.nsw.gov.au/KiWIS/KiWIS` (public, no auth) | NSW DCCEEW publishes MHL data under various open-government terms. Specific KiWIS API has no published rate limit or commercial-use clause. | **MEDIUM.** Commercial reuse may need a data-supply agreement with MHL/DCCEEW. Live API calls (per-user, on demand) are typical hobbyist use; bulk caching is a bigger ask. |
| **NSW LGA boundaries** | Cached as `nsw_lga_boundaries.js` (1.36 MB), Future Works tab filter | Originally from NSW Spatial portal (`portal.spatial.nsw.gov.au`) | NSW Spatial Services data is generally CC BY 4.0 with mandatory attribution. | **LOW** with proper attribution. |
| **NSW BOM gauge metadata for Northern Beaches** | Cached as `bom_northern_beaches_all_gauges.js` (7.3 MB) | BOM CDO station list | Public gauge metadata. CC BY-4.0 attribution. | **LOW** with attribution. |

### Commercial/third-party data sources

| Source | Used for | Terms |
|---|---|---|
| **RainViewer** | Atmos radar fallback (`api.rainviewer.com`, `tilecache.rainviewer.com`) | Free tier: non-commercial only. Commercial use requires a paid plan. **Stormgauge's CSP allows it, the code uses it, the attribution `Radar (c) RainViewer` is set in `rainviewerFallback.js`.** Commercial-readiness step: confirm the licence tier matches deployment use. |
| **Lizard (Nelen & Schuurmans)** | Stormgrid radar archive (precomputed catchment rainfall in `data/catchment_rainfall_*.json`, catchment polygons derived from Lizard raster export) | Lizard data licensing depends on the specific dataset. The `lizard_precipitation_australia` dataset and the catchment raster need explicit licence confirmation. **Stormgrid UI already labels outputs as "Lizard radar (precomputed) — uncalibrated, non-engineering"** — this is methodologically honest but does not substitute for a licence check on the underlying data. |
| **Open-Meteo** (in CSP only) | `api.open-meteo.com` allowed in Stormgauge `connect-src` | Open-Meteo is CC BY 4.0 for non-commercial use; commercial requires an account. Need to confirm whether/where Stormgauge actually calls it. |
| **Cloudflare basemaps (`*.basemaps.cartocdn.com`)** | Map tiles in both Stormgauge and Stormgrid | CARTO basemap usage terms apply. Free tier acceptable for low-volume non-commercial; commercial requires a CARTO plan. |
| **OpenStreetMap Nominatim** | Stormgrid address search | OSM Nominatim has a strict usage policy (max 1 req/s, no heavy use). Commercial address geocoding needs a paid alternative. |
| **ArcGIS Online tile servers** (`server.arcgisonline.com`) | Stormgauge map alternative basemap | Esri Terms of Use — generally non-commercial only without a licence. |

### Council/operator-internal sources (referenced only — not redistributed)

| Source | Status |
|---|---|
| TechnologyOne CiA asset register | Referenced in docs/comments only. Operator imports their own data. **Not redistributed.** |
| Intramaps | Same. |
| Master_Costing_Tool / Panel_Rates | `costing_lookup.json` is built FROM this internal council workbook. The cached lookup ships to public. Most lookup values are unit rates that council has historically not treated as confidential, but this needs explicit council sign-off before "commercial readiness". |

---

## Code provenance — author-original

The following are author-original code (no third-party licence concern):

- All `src/modules/*` and `src/stormgrid*` JavaScript.
- All build scripts (`scripts/*.py`, `scripts/*.mjs`).
- All inline JS in `index.html`.
- All Python tooling under `excel_vba/` and `packaging/`.

The author can choose any licence (MIT / Apache-2.0 / proprietary). **Recommendation: pick one and add `LICENSE` to each repo before claiming commercial readiness.**

---

## Recommended next fixes (NOT applied)

1. **Add `LICENSE` to each of the three repos.** Author choice — MIT or Apache-2.0 are common defaults; a proprietary "All Rights Reserved" with a usage clause is also valid for commercial software.
2. **Add `THIRD_PARTY_NOTICES.md` to each repo** listing the JS libraries and their LICENSE texts.
3. **Add `DATA_PROVENANCE.md` to each repo** that ships data, listing source, licence, attribution, and rebuild procedure.
4. **Visible attribution in UI:**
   - Footer line in Stormgauge crediting BOM, MHL, NSW Spatial, Cloudflare basemaps, RainViewer.
   - Stormgrid already credits Lizard. Add the same for Cloudflare basemaps and OSM Nominatim.
5. **Commercial-licence confirmations needed before public commercial launch:**
   - BOM (radar tile API + IFD bulk redistribution).
   - MHL/DCCEEW (KiWIS commercial use).
   - RainViewer (paid plan if commercial).
   - CARTO basemaps (paid plan if commercial).
   - Esri ArcGIS tiles (remove or licence).
   - OSM Nominatim (replace with paid geocoder if commercial volume).
   - Lizard (Stormgrid).
   - Open-Meteo (if used).
   - council sign-off on `costing_lookup.json` redistribution.
6. **Block until resolved:**
   - The undocumented BOM tile endpoint is the highest-risk single dependency. A commercial product cannot rely on an unpublished API.

---

## What this report does NOT do

- Does not give legal advice. Every "Risk" rating is an author-author best-guess and **must** be confirmed by a solicitor or qualified data-licensing reviewer.
- Does not add a `LICENSE` file.
- Does not add notices.
- Does not contact any data provider.

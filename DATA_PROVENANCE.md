# Data Provenance — Stormgauge

Source-of-truth notes for every data input Stormgauge depends on. The
"Licensing status" column reflects the maintainer's current
understanding and does not constitute legal advice. Items marked
**"Requires confirmation"** must be verified in writing with the
publisher before commercial redistribution or commercial-volume use.

## Cached datasets shipped with the repo

| Dataset | Source | Cache file | Last refreshed | Licensing status |
|---|---|---|---|---|
| BoM IFD design rainfall | Bureau of Meteorology IFD portal | `bom_ifd_cache.js` | (see file metadata) | **Requires confirmation before commercial redistribution.** BoM IFD outputs are publicly released under various Crown copyright terms; bulk caching and redistribution is not the same as derived use. |
| BoM rainfall gauge metadata (Northern Beaches) | BoM CDO station list | `bom_northern_beaches_all_gauges.js` | (see file metadata) | **Requires confirmation.** Metadata generally reusable with attribution; bulk redistribution should be confirmed with BoM. |
| NSW LGA boundary polygons | NSW Spatial Services portal | `nsw_lga_boundaries.js` | (see file metadata) | NSW Spatial Services data is generally CC BY 4.0 with mandatory attribution. **Confirm specific dataset terms.** |
| Pluviometrics enriched IFD station table | Internal build (`scripts/enrich_ifd.py`) | `data/pluviometrics_ifd_table.json` | See `generated_at` field | Proprietary first-party derivative product. |
| Rainfall AEP Calculator template | Internal council workbook | `templates/Rainfall AEP Calculator.xlsm` | n/a | Council-owned. **Requires council sign-off for redistribution.** |
| Costing lookup table | Built from internal Master Costing Tool / Panel Rates workbook | `costing_lookup.json` (generated, gitignored) | n/a | Council-owned values. **Requires council sign-off for redistribution.** |

## Live API dependencies

| Service | Endpoint | Use | Licensing status |
|---|---|---|---|
| Pluviometrics rainfall API | `https://nsw-rainfall-analyser-api.onrender.com` | Per-station rainfall fetches | Proprietary first-party. |
| Pluviometrics rainfall stations | `https://data.pluviometrics.com.au/pluviometrics_rainfall_stations.json` | Station inventory | Proprietary first-party. |
| MHL KiWIS | `https://wiski.mhl.nsw.gov.au/KiWIS/KiWIS` | Live rainfall, river, tide, estuary readings | Public, no auth. **Requires confirmation for commercial-volume use.** |
| BoM radar tiles | `https://radar-tiles.service.bom.gov.au` | Atmos radar overlay (primary) | **Requires confirmation.** Endpoint is not formally published as a public API. Commercial reuse needs a commercial agreement with BoM. |
| RainViewer | `https://api.rainviewer.com`, `https://tilecache.rainviewer.com` | Atmos radar fallback | Free tier is non-commercial only. **Commercial use requires a paid plan.** |
| Cloudflare basemaps | `*.basemaps.cartocdn.com` | Map basemap | **Requires confirmation.** Free tier acceptable for low non-commercial volume; commercial volume needs a CARTO plan. |
| ArcGIS Online tiles | `server.arcgisonline.com` | Alternative basemap | **Requires confirmation.** Esri Terms of Use generally non-commercial without a licence. |
| Open-Meteo | `https://api.open-meteo.com` | (allowed in CSP; verify usage) | CC BY 4.0 for non-commercial; **commercial requires an account.** |
| Google Public DNS | `https://dns.google` | DNS-over-HTTPS for resolver test | Public, free, attribution not required. |

## Methodology references

The Stormgauge tool implements rainfall analysis derived from openly
published methodologies. References are listed for transparency; they
do not constitute endorsement by the issuing bodies, and do not imply
that Stormgauge has been certified or audited by them.

| Reference | Used for |
|---|---|
| Australian Rainfall and Runoff (ARR) 2019 | IFD interpretation, AEP labelling |
| BoM IFD design rainfall publications | IFD lookup behaviour |

## Outstanding items before commercial release

1. Written confirmation from Bureau of Meteorology on commercial reuse of the unpublished radar tile endpoint and on bulk IFD redistribution.
2. Written confirmation from NSW DCCEEW / MHL on commercial KiWIS API use.
3. Selection of a commercial RainViewer plan if RainViewer continues to be used in production.
4. CARTO and (if applicable) Esri ArcGIS commercial plan selection.
5. council sign-off on `costing_lookup.json` and `templates/Rainfall AEP Calculator.xlsm` redistribution rights.
6. Open-Meteo account creation if usage is commercial.

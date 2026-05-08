# Stormgauge

Rainfall analysis tool for stormwater asset management. AEP and IFD interpretation, MHL/BoM live data, BoM radar with RainViewer fallback, packaging and costing workflows, exports to XLSX/CSV/PNG.

Live at **https://stormgauge.pluviometrics.com.au** (served by Cloudflare Pages from the `staging` branch).

## Layout

```
.
├── index.html              Single-page application (Cloudflare Pages serves this at /)
├── src/modules/            ES modules — radar, exports, map, stations, ui
├── data/                   Cached datasets shipped with the SPA
├── scripts/                Local build / refresh helpers
├── docs/                   Operator and architecture notes
├── reports/                Audit reports (never merged to staging/main)
├── Assets/                 Brand artwork (source of truth)
├── templates/              Spreadsheet templates (council legacy)
├── CNAME                   stormgauge.pluviometrics.com.au
└── .nojekyll               Disable Jekyll on Pages
```

## Quick start (local preview)

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Operator configuration

Stormgauge reads optional overrides from `window.STORMGAUGE_CONFIG`. Default configuration is neutral — no operator-specific paths are shipped with the public deploy. To customise for a deployment, copy `stormgauge-config.example.js` and load it via a `<script>` tag **before** the main inline script.

See `docs/OPERATIONS.md` for the deploy and branch model.

## Documents

- `LICENSE` — proprietary, all rights reserved.
- `THIRD_PARTY_NOTICES.md` — runtime libraries.
- `DATA_PROVENANCE.md` — data sources and licensing posture.
- `docs/OPERATIONS.md` — hosting, branches, related products, deployment.

## Related products

Stormgauge is one of several Pluviometrics products. Stormgauge and Stormgrid are **separate products** with separate repos, domains, and scopes. See `docs/OPERATIONS.md`.

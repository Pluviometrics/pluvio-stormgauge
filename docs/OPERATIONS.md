# Stormgauge — Operations

## Hosting

- **Platform:** Cloudflare Pages.
- **Custom domain:** stormgauge.pluviometrics.com.au
- **Deploy branch:** `staging` (Pages serves whatever lives at the root of `staging`).
- **`main` branch is NOT auto-deployed.** Pushing to `main` will not change what users see at the production URL.
- Cloudflare Pages serves directly from the branch root — no build step, no bundler. The `.nojekyll` marker disables Jekyll processing, the `CNAME` file pins the custom domain.

## Branch model

| Branch | Purpose |
|---|---|
| `staging` | Production. What stormgauge.pluviometrics.com.au serves. |
| `main` | Development trunk. Periodically merged into `staging` once stable. |
| `feature/*` | Work-in-progress branches; merge to `main` first. |
| `audit/*` | Read-only audit reports — never merged. |

## Related Pluviometrics products (deliberate separation)

| Product | Repo | Domain | Deploy branch |
|---|---|---|---|
| Stormgauge (this repo) | pluvio-stormgauge | stormgauge.pluviometrics.com.au | `staging` |
| Stormgrid | pluvio-stormgrid (was `stormgrid`) | stormgrid.pluviometrics.com.au | `main` |
| Atmos | (consolidated repo TBA) | atmos.pluviometrics.com.au | tba |
| Hub (landing) | pluviometrics-hub | pluviometrics.com.au | `main` |
| council legacy | stormwater-tools | stormwater-tools.pluviometrics.com.au | `main` |

**Stormgauge and Stormgrid are completely separate products.** They share branding and a domain root, nothing else. Stormgauge owns the AEP / IFD / rolling-rainfall / radar / MHL-KiWIS path. Stormgrid is a precomputed catchment-rainfall preview built on the Lizard archive — it deliberately does not import any Stormgauge logic.

## External dependencies

- Render API: `nsw-rainfall-analyser-api.onrender.com` — per-station rainfall fetches. Free tier sleeps after ~15 min idle. Stormgauge's `api()` wrapper handles the cold-start with a 30 s timeout, one retry, and a status pill UX. The wrapper degrades gracefully (returns null per-call) so the app stays usable when the service is down or slow.
- MHL KiWIS: `wiski.mhl.nsw.gov.au/KiWIS/KiWIS` — public API, no auth.
- BoM radar tiles: `radar-tiles.service.bom.gov.au` (primary) with RainViewer fallback.
- Cloudflare basemaps + ArcGIS Online tiles for map display.

See `DATA_PROVENANCE.md` for licensing posture.

## Local preview

Stormgauge is a single static `index.html` plus modules under `src/`. To preview:

```bash
# any static server works — the app expects relative paths from index.html
python3 -m http.server 8000
# then open http://localhost:8000
```

Or use Cloudflare's `wrangler pages dev`:

```bash
npx wrangler pages dev .
```

## Operator configuration

Stormgauge reads optional operator overrides from `window.STORMGAUGE_CONFIG`,
which can be set by a separate `<script>` tag loaded **before** the main
inline script. Defaults are deliberately neutral so a public deploy ships
no operator-specific paths.

See `docs/STORMGAUGE_CONFIG.md` for the schema and `stormgauge-config.example.js`
for a copy-paste starting point.

## Deployment procedure

1. Merge feature work to `main` via PR.
2. Smoke-test on `main` (manual: open page, run AEP for one station, confirm radar loads, export to XLSX).
3. Merge `main` → `staging` (this triggers the production deploy).
4. Verify https://stormgauge.pluviometrics.com.au/ within ~2 min.

## Backup and recovery

- Source code: GitHub (`Pluviometrics/pluvio-stormgauge`). `git clone` is the recovery path.
- Cloudflare Pages config: managed via Cloudflare dashboard. To recover after a project-delete: re-link the repo, re-add the `staging` branch as the deploy branch, re-add the `stormgauge.pluviometrics.com.au` custom domain. The `CNAME` file in the branch root is the pinning record.
- Render API: separate repo (not in this audit's scope). Document the env vars and re-deploy procedure in that repo.

## Key references

- `LICENSE` — copyright and reuse terms.
- `THIRD_PARTY_NOTICES.md` — runtime libraries.
- `DATA_PROVENANCE.md` — data sources and licensing posture.
- `reports/` — audit reports (do not merge to staging/main; live on `audit/*` branches).

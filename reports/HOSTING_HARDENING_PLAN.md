# HOSTING_HARDENING_PLAN

**Scope:** Verify the assessment's hosting claims, document the actual hosting topology, and propose a migration/hardening path for the parts that are genuinely fragile.
**Status:** Analysis only.

---

## Major correction to the assessment

The assessment frames the hosting issue as **"Render free-tier sleeping"** affecting the SPAs themselves. This is **incorrect** for the public-facing apps.

**Actual hosting (verified):**

| Site | Hosting | Evidence |
|---|---|---|
| stormgauge.pluviometrics.com.au | **Cloudflare Pages** | `CNAME` file in `pluvio-stormgauge` repo + `.nojekyll` marker; deploys from `staging` branch root. |
| stormgrid.pluviometrics.com.au | **Cloudflare Pages** | `CNAME` file in `stormgrid` repo; deploys from `main` branch root. |
| pluviometrics.com.au | **Cloudflare Pages** | `CNAME` file in `pluviometrics-hub` repo; deploys from `main` branch root. |

All three sites are **always-on, edge-cached, no cold start**. Cloudflare Pages free tier has no sleep behaviour and serves static assets globally.

**The Render service that does exist:**

`https://nsw-rainfall-analyser-api.onrender.com` — referenced exactly twice in tracked Stormgauge code:

- `index.html:6` — listed in CSP `connect-src`.
- `index.html:1313` — `const API = 'https://nsw-rainfall-analyser-api.onrender.com';`
- `index.html:4411` — used by `async function api(path) { const r = await fetch(API + path); ... }`

Used for: per-station rainfall data fetches that aren't cached locally. Falls back to (or supplements) the inline `BOM_IFD_CACHE` and the live MHL KiWIS API.

**This** is the free-tier service that cold-starts. Symptoms the user would see:

- First request after ~15 min idle: 30–60 s wait, no UI feedback today.
- Eventual `503` or timeout if the cold start exceeds the browser/proxy timeout.
- Subsequent requests are fast.

The radar, AEP local interpolation, IFD lookups, and Stormgrid/Hub functionality are unaffected.

---

## Stormgauge — Cloudflare Pages assessment

| Aspect | Status |
|---|---|
| Always-on edge | ✓ |
| Custom domain | ✓ stormgauge.pluviometrics.com.au |
| HTTPS | ✓ Cloudflare-managed |
| Branch deploy | ✓ from `staging` |
| HTTP/2 / HTTP/3 | ✓ default on Cloudflare |
| Brotli compression | ✓ default |
| Cache-Control headers | ⚠ default — `<script src>` and `<link>` get sensible defaults; the heavy JS blobs are not version-pinned (no `?v=hash`), so cache invalidation requires URL change. |
| `_headers` / `_redirects` config | ✗ not present |
| `wrangler.toml` | ✗ not present |
| Health endpoint | n/a — static site |
| Build logs | external (Cloudflare dashboard) |

### Recommendations (analysis only)

1. **Add `_headers` file** to set `Cache-Control: public, max-age=31536000, immutable` for hashed assets and `Cache-Control: public, max-age=300, must-revalidate` for `index.html`. Risk: low.
2. **Add `_redirects` file** if any vanity routes are needed (none currently).
3. **Pin asset URLs by content hash** when the dataset externalisation lands.

---

## Render — `nsw-rainfall-analyser-api.onrender.com`

This is where the assessment's complaint actually lives. **The service repo is not in the three repos audited here** (Stormgauge, Stormgrid, Hub). Its source must be located before any change can be designed.

### Audit-side actions (no code changes)

1. **Confirm the repo and tier.** Owner needs to share the Render service repo URL.
2. **Document the exact endpoints called.** The single `api(path)` wrapper at `index.html:4411` means every consumer is reachable from the call sites that call it — list them in a follow-up grep.
3. **Identify which calls are critical-path vs convenience.** If AEP can degrade gracefully to local-only when the API is down, the cold-start UX problem becomes a "slower, not broken" problem.

### Migration options (ranked, no decision implied)

| Option | Always-on | Monthly cost (estimate) | Migration effort | Notes |
|---|---|---|---|---|
| **Render Starter** ($7/mo) | Yes | ~A$11 | Zero — paid tier on existing service | Simplest. Removes the cold-start problem entirely. |
| **Cloudflare Workers + R2** | Yes (edge) | ~A$0–5 (free tier covers low traffic) | High — port the API to Workers | Same vendor as the SPAs, lowest latency. Requires rewriting in JS/Worker form. |
| **Fly.io shared CPU** | Yes (with always-on) | ~A$3–8 | Medium — Dockerise existing service | Region choice (`syd`) matches user base. |
| **Railway / Heroku Eco** | Yes | ~A$8–10 | Low — similar deploy model to Render | Drop-in replacement. |
| **Stay on Render free + add UX timeout** | No (still cold-starts) | $0 | 30 min | Doesn't fix the problem; just makes the wait visible to users. **Recommended interim** while a migration decision is pending. |

### Always-on UX without migration (interim, low risk)

In Stormgauge `index.html:4411`, wrap the `api()` function with:

- `AbortController` with 60 s timeout
- One automatic retry with 5 s backoff
- During the wait, surface a status pill: `"Rainfall service waking up — usually takes 30 seconds."`
- After two failed retries, fall back to local-only data and show: `"Rainfall service unavailable — showing cached data only."`

This is **30–50 lines of code** in one file. It does not migrate hosting; it makes the cold-start non-broken from the user's perspective. Recommend this as the first hosting-related fix to ship after the audit.

---

## Stormgrid — Cloudflare Pages

Same topology as Stormgauge. Strict CSP at `index.html:6` (`script-src 'self'` plus a single trusted CDN — Leaflet/html2canvas). No external API dependencies — everything ships as static JSON.

**No hosting hardening required.** The data loader (`src/stormgridDataLoader.js`) already has fetch error handling, caching, and a `null`-on-failure contract that lets the UI degrade gracefully.

---

## Hub — Cloudflare Pages

Pure static landing page. **No hosting hardening required.**

---

## Backup / recovery posture (cross-cutting)

| Asset | Backup state | Restore path |
|---|---|---|
| Stormgauge source code | GitHub (`Igo-Camping/pluvio-stormgauge`) | git clone |
| Stormgrid source code | GitHub (`Igo-Camping/stormgrid`) | git clone |
| Hub source code | GitHub (`Igo-Camping/pluviometrics-hub`) | git clone |
| Cloudflare Pages config | Cloudflare dashboard only | re-link branch + custom domain (manual, ~10 min per site) |
| Cloudflare DNS records | Cloudflare account | export zone file (one-off) |
| Render service code | unknown (not in audited repos) | locate before next audit |
| Render service env vars | Render dashboard | document in 1Password / similar |
| `data.pluviometrics.com.au` (R2 or similar bucket) | not audited | requires owner clarification |
| BOM IFD cache, gauge GeoJSON, NSW LGA GeoJSON | only in `pluvio-stormgauge:staging` | Build scripts in same repo? Need verification. |

### Recommended (analysis only)

1. **Document Cloudflare Pages re-link procedure** in `docs/OPERATIONS.md`.
2. **Export Cloudflare zone file** quarterly to a separate storage location.
3. **Identify and audit the Render service repo** — it's a critical dependency that's not in scope today.
4. **Document `data.pluviometrics.com.au`** — what's the bucket, who owns it, what's the rebuild path?

---

## What this report does NOT do

- Does not migrate any service.
- Does not add `_headers` or `_redirects`.
- Does not add timeout/retry logic to the Render API wrapper.
- Does not export DNS or take any backup action.

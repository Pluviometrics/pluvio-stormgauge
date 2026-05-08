# RENDER_API_OWNERSHIP_AND_DEPLOY

**Endpoint:** `https://nsw-rainfall-analyser-api.onrender.com`
**Date:** 2026-05-08.

---

## 1. Source repo — found

| Property | Value |
|---|---|
| **Local path** | `C:\Users\fonzi\Documents\Weather App` |
| **Local path (Backend nested copy)** | `C:\Users\fonzi\Documents\Weather App\Backend` (older snapshot — same `main.py` minus recent commits; see "Risks" below) |
| **Local path (Backend/Backend nested copy)** | `C:\Users\fonzi\Documents\Weather App\Backend\Backend` (older still) |
| **GitHub remote (current local)** | `https://github.com/Igo-Camping/nsw-rainfall-analyser.git` |
| **GitHub remote (post org-move, expected)** | `https://github.com/Pluviometrics/nsw-rainfall-analyser.git` (per org-move memory dated 2026-05-07; push succeeds via redirect) |
| **Branch** | `main` |
| **Recent commits** | `09c8014 Implement tail extrapolation beyond 1% AEP, fix best duration comparison` (most recent), 7 prior visible |
| **Local working tree** | Clean of tracked changes besides one bytecode artefact (`Backend/__pycache__/main.cpython-311.pyc`) which should be gitignored. |

The Phase 2A audit "Open question 1 — Where is the source repo for `nsw-rainfall-analyser-api.onrender.com`?" is now answered.

## 2. Repo structure (verified)

```
C:\Users\fonzi\Documents\Weather App\
├── .git/
├── main.py                    # FastAPI app, 18 KB
├── requirements.txt           # 4 deps: fastapi 0.111.0, uvicorn[standard] 0.29.0, httpx 0.27.0, python-multipart 0.0.9
├── build_station_cache.py     # Cache builder — the fixed bug lives here
├── tests/                     # NEW — added by Step 0
│   └── test_tsid_suffix_priority.py
├── (untracked operator scripts: fixtsid.py, fix_active_status.py, addlga.py, etc.)
├── Backend/                   # Older snapshot — same files, different commit
│   ├── .git/
│   ├── main.py (pre-recent)
│   ├── build_station_cache.py
│   ├── requirements.txt
│   └── station_cache.json     # 2.5 MB — example cached output
└── Backend/Backend/           # Even older snapshot
    ├── main.py
    └── requirements.txt
```

The triple-nested `Backend/Backend/Backend/` artefact appears to be old development cruft. **The top-level `C:\Users\fonzi\Documents\Weather App\` is the canonical clone** — its remote is correct and its `main` is the deployed branch.

## 3. Endpoints exposed (from `main.py`)

| Path | Purpose |
|---|---|
| `GET /health` | Liveness check |
| `GET /stations` | Station list — Stormgauge's main consumer endpoint |
| `GET /stations/{station_id}` | Per-station detail (incl. IFD) |
| `GET /rainfall` | Rainfall fetch passthrough |
| `GET /aep` | AEP calc passthrough |
| `GET /temperature` | Open-Meteo passthrough |
| `GET /analyse` | Full analysis |

## 4. Deployment configuration

| Aspect | Status |
|---|---|
| `render.yaml` in repo | **Not present** |
| `Procfile` | **Not present** |
| `.github/workflows/` | **Not present** |
| `.env.example` | **Not present** |
| Build command | Default — Render auto-detects `requirements.txt` and runs `pip install -r requirements.txt` |
| Start command | Default — Render auto-detects FastAPI/uvicorn and runs `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Deploy branch | **Set in Render dashboard only** — likely `main` (default for new services) |
| Auto-deploy on push | **Set in Render dashboard only** — typically on by default |
| Environment variables | **Set in Render dashboard only** — `main.py` reads no `os.environ.*` other than `$PORT` (Render-injected) |
| CORS | `allow_origins=["*"]` — wide open. Comment in source: *"tighten this in production"*. |

**There is no in-repo deploy configuration to fix.** Whatever Render does for this service is governed by the dashboard, not by code.

## 5. Is auto-deploy code-fixable or dashboard-only?

**Dashboard-only** — there is no code change that affects deployment for this service in its current configuration. To change anything about HOW it deploys, the operator must use the Render dashboard.

To make the deployment **code-driven** (recommended for ops hardening), the operator can add a `render.yaml` per the [Infrastructure as Code spec](https://render.com/docs/infrastructure-as-code). Sample (operator-approved values needed for plan, region, env vars):

```yaml
services:
  - type: web
    name: nsw-rainfall-analyser-api
    runtime: python
    plan: starter            # or "free" — see Phase 2 hosting plan for the cold-start trade-off
    region: oregon           # or sydney; check current Render region
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    branch: main
    autoDeploy: true
    envVars:
      - key: PYTHON_VERSION
        value: "3.11"
```

With `render.yaml` in place, dashboard changes can be replaced by repo changes. **Out of scope for Step 0** — this is operator infrastructure choice, not a blocker fix.

## 6. Required dashboard verification

Before merging the `fix/tsid-suffix-priority-O-to-P` PR in the API repo, the operator must confirm in the Render dashboard:

| Check | Why |
|---|---|
| Service "nsw-rainfall-analyser-api" exists and is connected to the correct GitHub repo | Confirms which fork is deployed. Memory notes the GitHub org moved from `Igo-Camping/*` to `Pluviometrics/*` on 2026-05-07. Render may still be linked to the old org URL via the redirect; if so, Render still pulls correctly but the dashboard might show stale repo info. |
| Deploy branch is `main` | Default. Confirm. |
| Auto-deploy is enabled | If disabled, the fix won't go live on merge to main. |
| Environment variables — none required | `main.py` does not read env vars other than `$PORT`. |
| Build / start commands | Default OK. If overridden in the dashboard, ensure they match `pip install -r requirements.txt` and `uvicorn main:app --host 0.0.0.0 --port $PORT`. |
| Plan tier | Free tier sleeps after ~15 min idle. Phase 1 added a UI status pill to mitigate the cold-start UX; longer-term the plan should move to Starter ($7/mo) per `HOSTING_HARDENING_PLAN.md`. |
| HTTPS + custom domain | The endpoint is `*.onrender.com` (no custom domain). No action needed unless the operator wants to vanity-host. |

## 7. Credentials / secrets

**No credentials are required to redeploy.** The API:
- Calls MHL KiWIS at `wiski.mhl.nsw.gov.au` — public, no auth.
- Calls BoM IFD at `www.bom.gov.au/water/designRainfalls/...` — public, no auth.
- Has no database connection.
- Uses no API keys.

Render dashboard access (a Pluviometrics admin account) is the only credential required to trigger / monitor a deploy. **Out of scope for any AI assistant — operator action only.**

## 8. Is auto-deploy currently broken?

**Cannot verify without dashboard access.** Symptoms reported in the prompt:
- "Render API auto-deploy / source ownership uncertainty"

Possible failure modes that fit:
1. **Auto-deploy disabled** — dashboard toggle. Re-enable.
2. **Repo redirect causes Render to lose link** — after the org-move from `Igo-Camping` to `Pluviometrics`, Render may need re-linking via dashboard (disconnect, reconnect to the new org URL).
3. **Failed last build** — Render holds the prior known-good revision live but stops auto-deploying further pushes. Dashboard logs would show the failure.
4. **Branch mismatch** — Render set to a branch that no longer receives pushes.

The Step 0 code fix (the `.O → .P` patch) does not require auto-deploy to go live to take effect — once the operator merges and runs `fixtsid.py` (or rebuilds the cache), the live API serves correct ts_ids regardless of when the auto-deploy mechanism is restored.

## 9. Impact if API stays down

| Stormgauge feature | Impact |
|---|---|
| Per-station rainfall analysis | Live MHL fetch fails → Stormgauge falls back to MHL KiWIS direct (already implemented) for stations with `ts_id`, and to local `bom_ifd_cache.js` for BoM stations. |
| Station list at startup | Falls back to `data.pluviometrics.com.au/pluviometrics_rainfall_stations.json` (separate origin, not Render). |
| Analysis on a station that requires the API for IFD | Returns `null` → `calcAEP` returns `null` → UI shows no AEP classification but rolling rainfall still displays. |
| Phase 1 status pill | Surfaces *"Rainfall service unavailable. Cached/local results only."* — already implemented, already validated. |

**Stormgauge degrades gracefully when the Render API is down.** The Step 0 fix is therefore not a hard blocker for Stormgauge availability; it's a correctness blocker for the subset of stations whose cached ts_id is `.O`.

## 10. Rollback plan

If the API fix has unintended consequences after merge:

1. `cd C:\Users\fonzi\Documents\Weather App && git revert <commit-hash> && git push origin main` — rolls back the fix.
2. Render auto-deploy re-deploys the reverted main.
3. The cache itself is unchanged by the code change — only future rebuilds would have used the new scoring. So no data restore is needed unless `fixtsid.py` was also run; in which case the operator can restore from `station_cache_pre_tsfix.json` (which `fixtsid.py` creates as a backup automatically).

## 11. Action items for operator

In priority order:

1. ✅ **Stormgauge-side**: nothing — the fix is upstream.
2. **API repo**: review the fix branch `fix/tsid-suffix-priority-O-to-P` (commit `9046bb2`), open a PR, run `py -m unittest discover -s tests` locally, merge to `main`.
3. **Cache migration**: run `fixtsid.py` against the production `station_cache.json` to patch existing `.O` entries. The script self-backs-up to `station_cache_pre_tsfix.json`.
4. **Render dashboard**: verify auto-deploy is connected and enabled; trigger a manual deploy if needed.
5. **Verify live API**: after deploy, GET `https://nsw-rainfall-analyser-api.onrender.com/stations` and confirm no rainfall station returns a ts_id ending in `.O` (unless that station has no `.P` alternative).
6. **Stormgauge cache invalidation**: if any browser users have a cached analysis for a re-keyed station, clear localStorage `sgTheme`-adjacent keys for analysis cache. Most users will hit fresh data on next load.
7. **Phase 1 / 2B / 3 merges**: now unblocked.

## 12. Outstanding (not in Step 0 scope)

- **Triple-nested `Backend/Backend/Backend/` clutter** in the API repo working tree — a separate housekeeping pass. Not a blocker.
- **Untracked operator scripts** (`fixtsid.py`, `fix_active_status.py`, `addlga.py`, `add_allambie.py`, `extract_boundary.py`, `embed_boundary.py`, `clean_cache.py`) — should be tracked in the API repo on their own branches. Not a blocker.
- **`render.yaml`** addition for IaC deploy — recommended but optional.
- **CORS lockdown** to specific Pluviometrics origins instead of `*` — a security hardening item for a separate phase.

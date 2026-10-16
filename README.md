# Pluvio Stormgauge

Rainfall event analysis for NSW rain gauges. Stormgauge fetches a gauge's
observed series, finds the peak rolling-window totals across standard
durations, and compares them against BoM IFD design rainfall to give the
AEP of an event. It is a static, browser-only app: `index.html` plus the
supporting scripts and data in this repo.

## Data sources

- MHL KiWIS (`wiski.mhl.nsw.gov.au`). Any part of a requested range older
  than 7 days is read from the MHL history mirror at
  `gauge-data.pluviometrics.com.au`: `mhl/{ts_id}/{YYYY}.json` in the KiWIS
  response shape, indexed by `mhl/manifest.json`. The mirror is built and kept
  current by `scripts/mhl_mirror.py` in the pluvio-data repo, running from
  scheduled tasks on SKYNET. The last 7 days, and any ts_id or year the
  manifest doesn't have, are fetched from MHL directly in the browser. The two
  are merged, de-duplicated on timestamp and sorted (`fetchKiwisSeries`).
- BoM Water Data Online, through the `/wdo/timeseries` proxy on the
  backend API.
- The station catalogue at `data.pluviometrics.com.au`.

## Serving

GitHub Pages serves the `main` branch from the repo root. The custom domain is
`stormgauge.pluviometrics.com.au` (see `CNAME`), behind the Cloudflare
proxy. `.nojekyll` turns off Jekyll processing.

## Deploying

Push to `main`. GitHub Pages republishes automatically, so pushing to
`main` ships to production.

## Tests

`node --test "tests/*.test.mjs"`

# Apex Domain Pointed at Stormgauge

## What changed

`CNAME` was changed from:

```
stormgauge.pluviometrics.com.au
```

to:

```
pluviometrics.com.au
```

Done on branch `claude/landing-page-stormgauge-aWV4E`, commit `a90407e`.

## Why

For a few days of heavy rain, `pluviometrics.com.au` (previously a 4-tile landing
page hosted separately) should go straight to Stormgauge instead of the tile
chooser. Higher traffic, fewer clicks to the rainfall calculator.

## DNS that must be in place

At the DNS provider for `pluviometrics.com.au`, the apex (`@`) record must point
at GitHub Pages:

```
A  @  185.199.108.153
A  @  185.199.109.153
A  @  185.199.110.153
A  @  185.199.111.153
```

Optionally, `www` as a CNAME to `pluviometrics.github.io` so the www redirect
works.

GitHub Pages allows only one custom domain per repo, so while this CNAME is in
place, `stormgauge.pluviometrics.com.au` will **stop resolving to this site**.

## How to undo (restore the old 4-tile landing page)

1. **Revert the CNAME** in this repo back to the subdomain:

   ```
   stormgauge.pluviometrics.com.au
   ```

   Either:
   - `git revert a90407e` on the deploy branch, or
   - edit `CNAME` directly and commit.

2. **Restore DNS** for `pluviometrics.com.au` apex back to whatever it pointed
   at before (the 4-tile landing page's host — A records, ALIAS, or CNAME as
   appropriate).

3. **Re-confirm** `stormgauge.pluviometrics.com.au` resolves to this repo's
   Pages site (DNS for the subdomain should already be a CNAME to
   `pluviometrics.github.io`; nothing to change there unless it was removed).

4. In GitHub repo Settings → Pages, re-enter `stormgauge.pluviometrics.com.au`
   as the custom domain if the field is empty after the revert.

## Verifying

- `dig pluviometrics.com.au +short` — should return the four `185.199.x.153` IPs
  while pointing at Stormgauge, or the old host's records after revert.
- Browser: `https://pluviometrics.com.au` should serve the Stormgauge home
  screen during the redirect window; the 4-tile page after undo.

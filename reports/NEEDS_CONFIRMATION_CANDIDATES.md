# NEEDS_CONFIRMATION_CANDIDATES — Stormgauge

**Audit branch:** `audit/dead-file-audit-stormgauge`.
**No files have been deleted, moved, or edited.**

This report lists files where the tracer found weak or no references AND there is a plausible reason for the operator to want to keep them. Each item carries an exact question for the operator and a suggested commit group if the answer is "delete".

---

## Cluster A — Superseeded UI snapshots (4 files)

| File | Tracer findings |
|---|---|
| `Superseeded/index.html` | strong refs only from .gitignore and historical reports |
| `Superseeded/before-blank-screen-fix-20260430/index.html` | strong refs only from .gitignore and historical reports |
| `Superseeded/direct-calculator-route-before-fix/index.html` | strong refs only from .gitignore and historical reports |
| `Superseeded/direct-calculator-route-before-fix/controls.js` | strong refs only from Superseeded copies of itself + historical reports |

**Live `index.html` does NOT reference any `Superseeded/*` path.** Runtime impact of deletion: zero.

**Why they're flagged:** these ship publicly to Cloudflare Pages and contain the same council SharePoint path leaks that were fixed in Phase 1's live `index.html`. Per `reports/PATH_LEAK_AUDIT.md`, lines 717, 721, 1366, 5183-5185 of these old copies still leak `<local program folder>` strings.

**Question for operator:**
> *Should the `Superseeded/` directory and all 4 files be deleted from the deployed branch? They're not routed to (live `index.html` doesn't link them), but they ship to Cloudflare Pages and contain the same council SharePoint path strings that Phase 1 fixed in the live file. Recovery via `git checkout <pre-cleanup-commit>` is always available.*

**Why it cannot be safely classified without operator input:** the directory name (`Superseeded`) explicitly signals the operator's intention to retain the content for reference. Whether that intent extends to the deployed branch or only to git history is a judgement the operator must make.

**Suggested commit group if approved:** `commit-A: drop Superseeded/ directory (4 files, ~1.6 MiB on Cloudflare Pages deploy)`

---

## Cluster B — Lizard backfill / catchment exploration (12 files)

These artifacts capture work that has since moved to the Stormgrid repo. Stormgrid now owns the Lizard precipitation archive (`scripts/build_static_rainfall.py`) and the catchment polygons (`data/catchments/catchments_*.geojson`).

| File | Tracer findings | Notes |
|---|---|---|
| `scripts/lizard_precip_aoi_backfill.py` | strong refs only from runner + historical reports | Lizard backfill operator script |
| `scripts/lizard_precip_full_backfill_runner.py` | unreferenced | Lizard runner |
| `data/lizard_catchments/discovery_candidates.json` | unreferenced | Catchment discovery output |
| `data/lizard_catchments/discovery_log.txt` | unreferenced | Catchment discovery log |
| `data/lizard_catchments/wms_capabilities_probe.json` | unreferenced | WMS probe output |
| `data/lizard_catchments/wms_probe_log.txt` | unreferenced | WMS probe log |
| `data/lizard_catchments_approx/approximation_log.txt` | unreferenced | Approximation experiment log |
| `data/lizard_catchments_approx/catchments_approx_manifest.json` | unreferenced | Approximation manifest |
| `data/lizard_catchments_approx/validation_report.json` | unreferenced | Approximation validation |
| `data/lizard_catchments_approx/validation_report.md` | unreferenced | Approximation validation MD |
| `data/radar_archive/reports/lizard_backfill_validation_JAN2024.md` | unreferenced | Historical validation |
| `data/radar_archive/reports/lizard_full_backfill_final_report.md` | strong refs from runner (above) + comment in `src/modules/radar/radarAvailability.js:15` | Final report; the runtime comment is documentation only |
| `data/radar_archive/reports/lizard_full_backfill_progress.md` | strong refs only from runner | Progress report |

**Question for operator:**
> *The Lizard precipitation archive work moved from Stormgauge to Stormgrid (Stormgrid `scripts/build_static_rainfall.py` + `data/catchments/*` are now the live surface). Should this 12-file Stormgauge cluster be deleted? `radarAvailability.js:15` has a `// see ... lizard_full_backfill_final_report.md` doc comment that would become a dangling reference; the comment can either be deleted alongside or left as a stub.*

**Why it cannot be safely classified without operator input:**
1. The Lizard backfill represented substantial work; the operator may want to keep it as repo-internal historical record rather than only in git history.
2. The `radarAvailability.js:15` comment treats the final report as a methodological reference. Deleting the report invalidates the comment.
3. There may be other Pluviometrics workflows (not in these three repos) that consume the AOI backfill script.

**Suggested commit groups if approved:**
- `commit-B1: drop data/lizard_catchments/` (4 files)
- `commit-B2: drop data/lizard_catchments_approx/` (4 files)
- `commit-B3: drop scripts/lizard_precip_*.py` (2 files) + the 3 lizard reports under `data/radar_archive/reports/`
- `commit-B4: update src/modules/radar/radarAvailability.js:15 comment to reflect the new reality`

---

## Cluster C — Catchment derivation outputs (4 files)

The catchment polygons that derive from the source TIFF are now lived in the Stormgrid repo (`data/catchments/catchments_dissolved.geojson`, `catchments_parts.geojson`).

| File | Tracer findings |
|---|---|
| `Assets/Catchments/derived/extraction_log.txt` | unreferenced |
| `Assets/Catchments/derived/extraction_report.md` | unreferenced |
| `Assets/Catchments/derived/manifest.json` | unreferenced |
| `Assets/Catchments/northern-beaches-subcatchmentsZ_2026-05-04T00_05_35Z.tiff` | strong refs only from the 3 derived/ files above + 1 weak ref (basename only) |

**Question for operator:**
> *The catchment polygons live in Stormgrid now. Should the Stormgauge `Assets/Catchments/` directory (3 derived outputs + 1 source TIFF, ~220 KiB total) be deleted? The TIFF is a source raster — keeping it preserves the ability to re-derive in Stormgauge from scratch; deleting it commits to Stormgrid as the single source of catchment data.*

**Why it cannot be safely classified without operator input:** archival source-data retention is a policy decision. The TIFF is small (220 KB) so the storage argument is weak in either direction.

**Suggested commit group if approved:** `commit-C: drop Assets/Catchments/` (4 files, ~220 KiB)

---

## Cluster D — Unused logo files (3 files)

| File | Tracer findings | Notes |
|---|---|---|
| `Assets/Logos/ATMOS.png` | 2 strong refs (only from historical inventory reports) | Loaded by hub (separate repo); not loaded by Stormgauge `index.html` |
| `Assets/Logos/PLUVIOMETRICS.png` | 2 strong refs (only from historical inventory reports) | Same |
| `assets/logos/pluviometrics-main.png` | unreferenced | Phase 1 finding; lowercased path duplicate of the master logo file |

The hub repo has its own copies of these logos (`pluviometrics-hub/Assets/Logos/`). Stormgauge's copies aren't loaded by Stormgauge's `index.html`.

`Assets/Logos/STORMGAUGE.png` IS loaded (`index.html:274`, `index.html:296`) and is in `ACTIVE_RUNTIME_DEPENDENCIES.md` — **do not delete**.

**Question for operator:**
> *The hub repo owns these brand assets. Should Stormgauge's `Assets/Logos/ATMOS.png`, `Assets/Logos/PLUVIOMETRICS.png`, and `assets/logos/pluviometrics-main.png` (none referenced by Stormgauge runtime) be deleted? Keeping them gives operators the convenience of having all brand assets in every repo; deleting them shifts the single source of truth to the hub repo.*

**Why it cannot be safely classified without operator input:** brand-asset duplication is a deliberate convenience or a wasteful duplication depending on team policy.

**Note on case duplication:** `Assets/Logos/` and `assets/logos/` are separate paths to git on case-sensitive filesystems but the same path on Windows. `pluviometrics-main.png` is tracked under the lowercase variant. This is a separate issue worth flagging — see *cross-cutting* below.

**Suggested commit group if approved:** `commit-D: drop unused brand assets in Stormgauge (3 files)`

---

## Cluster E — Manual diagnostic toolchain (3 files)

| File | Tracer findings | Notes |
|---|---|---|
| `scripts/radar_vs_gauge_sanity.js` | strong ref from runtime module's doc comment | Standalone Node script for offline radar-vs-gauge validation |
| `reports/RADAR_VS_GAUGE_SANITY.md` | weak ref (basename) from `scripts/radar_vs_gauge_sanity.js` | Output of the above |
| `reports/fixtures/radar_gauge_validation_fixture.json` | strong refs from `radarGaugeValidationExport.js` AND its `.test.js` | **ACTIVE — used by tests.** Listed here only for completeness; do NOT delete. |

The doc comment in `src/modules/radar/radarGaugeValidationExport.js:22` describes how to use the script:

```
// The Node radar-vs-gauge script can then consume it:
//     node scripts/radar_vs_gauge_sanity.js --gauge-fixture reports/fixtures/radar_gauge_validation_fixture.json
```

**Question for operator:**
> *Is the radar-vs-gauge sanity diagnostic toolchain still useful for offline validation, or has it been superseded? If superseded, `scripts/radar_vs_gauge_sanity.js` and `reports/RADAR_VS_GAUGE_SANITY.md` can be deleted (and the doc comment in `radarGaugeValidationExport.js:20-23` removed). The fixture JSON is used by the active test suite and stays regardless.*

**Why it cannot be safely classified without operator input:** dormant manual-validation tooling has value the tracer cannot measure. Operators run these on demand to investigate radar-gauge alignment issues.

**Suggested commit group if approved:** `commit-E: drop dormant radar-vs-gauge sanity tool` (script + report markdown + 3 lines of doc comment in radarGaugeValidationExport.js — keep the fixture)

---

## Cross-cutting issue — case-duplicate directories

`Assets/` and `assets/` exist as separate git-tracked directories. On Windows (case-insensitive) they appear as one directory. This is a latent bug that will surface for any operator on a case-sensitive filesystem (Linux / macOS with default settings).

Files affected:
- `Assets/Logos/{ATMOS,PLUVIOMETRICS,STORMGAUGE}.png`
- `assets/logos/pluviometrics-main.png`

Same issue exists in the hub repo.

**Question for operator:**
> *Consolidate to one case (`Assets/Logos/`)? If yes, `assets/logos/pluviometrics-main.png` becomes a candidate for `git mv` to `Assets/Logos/pluviometrics-main.png` AS A SEPARATE FOLLOW-UP — out of scope for the current dead-file audit because it's a move, not a delete.*

---

## Summary table

| Cluster | Files | Recommended action | Default if no operator response |
|---|---|---|---|
| A — Superseeded snapshots | 4 | DELETE (carry council path leaks publicly) | Hold — operator decision |
| B — Lizard exploration | 12 (incl. 1 doc-comment update) | DELETE — work moved to Stormgrid | Hold — operator decision |
| C — Catchment derivation | 4 | DELETE — work moved to Stormgrid | Hold — operator decision |
| D — Unused logos | 3 | DELETE — duplicate of hub assets | Hold — operator decision |
| E — Sanity diagnostic toolchain | 2 + 3 lines of comment | KEEP — dormant but useful | KEEP |

Total `NEEDS_CONFIRMATION` count: **22 files** across 5 clusters. Plus 3 lines of doc-comment in `src/modules/radar/radarAvailability.js` and `radarGaugeValidationExport.js` if certain clusters are approved for deletion.

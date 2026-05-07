# PHASE2B_IMPLEMENTATION

**Branches:**
- `feature/phase2b-safe-cleanup-stormgauge` (off `staging`)
- `feature/phase2b-safe-cleanup-stormgrid` (off `main`)
- `feature/phase2b-safe-cleanup-hub` (off `main`)

**Date:** 2026-05-07.
**Audit basis:** Phase 2A reports `SAFE_DELETE_CANDIDATES.md`, `NEEDS_CONFIRMATION_CANDIDATES.md`, and the case-duplication finding from `DEAD_FILE_AUDIT.md`.

---

## Stormgauge — exact actions

### Deletions (9 files)

| File | Reason |
|---|---|
| `__pycache__/main.cpython-311.pyc` | Phase 2A SAFE_DELETE — Python bytecode artefact |
| `data/lizard_catchments/discovery_candidates.json` | Phase 2A cluster B — exploration probe output |
| `data/lizard_catchments/discovery_log.txt` | Same |
| `data/lizard_catchments/wms_capabilities_probe.json` | Same |
| `data/lizard_catchments/wms_probe_log.txt` | Same |
| `data/lizard_catchments_approx/approximation_log.txt` | Phase 2A cluster B — log file |
| `data/lizard_catchments_approx/catchments_approx_manifest.json` | Phase 2A cluster B — superseded by Stormgrid catchments |
| `data/lizard_catchments_approx/validation_report.json` | Phase 2A cluster B — JSON form replaced by archived MD |
| `Assets/Catchments/derived/extraction_log.txt` | Phase 2A cluster C — log file |

### Renames / moves (10 files)

#### Case normalisation (1)

| From | To |
|---|---|
| `assets/logos/pluviometrics-main.png` | `Assets/Logos/pluviometrics-main.png` |

Method: `git rm --cached <lower>` + `git add <upper>`. Git registered as a rename, history preserved.

#### Archival relocation (9)

| From | To |
|---|---|
| `data/lizard_catchments_approx/validation_report.md` | `archive/research/lizard_catchments_approx/validation_report.md` |
| `data/radar_archive/reports/lizard_backfill_validation_JAN2024.md` | `archive/research/lizard_radar_backfill/lizard_backfill_validation_JAN2024.md` |
| `data/radar_archive/reports/lizard_full_backfill_final_report.md` | `archive/research/lizard_radar_backfill/lizard_full_backfill_final_report.md` |
| `data/radar_archive/reports/lizard_full_backfill_progress.md` | `archive/research/lizard_radar_backfill/lizard_full_backfill_progress.md` |
| `scripts/lizard_precip_aoi_backfill.py` | `archive/research/scripts/lizard_precip_aoi_backfill.py` |
| `scripts/lizard_precip_full_backfill_runner.py` | `archive/research/scripts/lizard_precip_full_backfill_runner.py` |
| `Assets/Catchments/derived/extraction_report.md` | `archive/research/catchments/extraction_report.md` |
| `Assets/Catchments/derived/manifest.json` | `archive/research/catchments/manifest.json` |
| `Assets/Catchments/northern-beaches-subcatchmentsZ_2026-05-04T00_05_35Z.tiff` | `archive/research/catchments/northern-beaches-subcatchmentsZ_2026-05-04T00_05_35Z.tiff` |

All performed with `git mv`. Rename detection succeeded — history preserved.

### New files (1)

| Path | Purpose |
|---|---|
| `archive/research/README.md` | Self-documenting archive — what's here, why, where the live successors are, that the archived Python scripts hardcode stale paths and won't run as-is. |

### Code edits (1 line)

| File | Edit |
|---|---|
| `src/modules/radar/radarAvailability.js:15` | Comment-only path update: `// see data/radar_archive/reports/...` → `// see archive/research/lizard_radar_backfill/...` |

**No behaviour change. No new exports. No imports added or removed. No constants modified.**

### Reports (4 new)

| Path | Purpose |
|---|---|
| `reports/CASE_NORMALISATION_AUDIT.md` | Task 2 — pre/post case audit, canonical convention, fix applied |
| `reports/STORMGRID_ARTIFACT_RELOCATION.md` | Task 3 — per-file relocation/deletion decisions for clusters B and C |
| `reports/PHASE2B_IMPLEMENTATION.md` | This file |
| `reports/PHASE2B_VALIDATION.md` | Browser validation log (separate file) |

### Stormgauge net diff

| Metric | Value |
|---|---|
| Files deleted | 9 |
| Files moved | 10 |
| Files added | 5 (1 README + 4 reports) |
| Code changes | 1 line in `radarAvailability.js` (comment) |
| Logic changes | 0 |
| Bytes removed from deploy | small (logs / probe outputs) |
| Bytes relocated within deploy | ~220 KiB TIFF + small markdowns + Python scripts |
| Public-deploy net effect | tree is cleaner; one directory (`archive/research/`) added; 4 directories removed (`data/lizard_catchments/`, `data/lizard_catchments_approx/`, `Assets/Catchments/derived/`, `Assets/Catchments/`) |

---

## Hub — exact actions

### Deletions (1 file)

| File | Reason |
|---|---|
| `Superseeded/stormgauge-direct-calculator-link-before-fix/index.html` | Phase 2A SAFE_DELETE — historical UI snapshot, not routed to from live `index.html` |

### Renames (1 file)

| From | To |
|---|---|
| `assets/logos/pluviometrics-main.png` | `Assets/Logos/pluviometrics-main.png` |

Same case-normalisation method as Stormgauge.

### Reports (2 new)

| Path | Purpose |
|---|---|
| `reports/PHASE2B_IMPLEMENTATION.md` | Brief — Hub-scoped summary |
| `reports/PHASE2B_VALIDATION.md` | Validation log |

### Hub net diff

| Metric | Value |
|---|---|
| Files deleted | 1 |
| Files moved | 1 |
| Files added | 2 (reports) |
| Code changes | 0 |

---

## Stormgrid — no actions taken

Phase 2A determined Stormgrid has zero genuine dead files and zero case-duplication issues. Phase 2B applied no deletions, no moves, no code edits, no archival relocations.

A `reports/PHASE2B_IMPLEMENTATION.md` and `reports/PHASE2B_VALIDATION.md` are still committed to the `feature/phase2b-safe-cleanup-stormgrid` branch for completeness — they document the no-op outcome.

---

## Items deferred (NOT actioned in Phase 2B)

| Item | Phase 2A cluster | Why deferred |
|---|---|---|
| `Superseeded/` 4 files in Stormgauge | A | Operator decision needed — directory name signals retention intent; user prompt did not greenlight cluster A |
| `Assets/Logos/ATMOS.png`, `PLUVIOMETRICS.png` in Stormgauge | D | Operator decision needed — brand-asset-duplication policy |
| `assets/logos/pluviometrics-main.png` in Stormgauge AND Hub | D | **Re-classified by Phase 2B as MOVE-not-DELETE** — case-renamed instead of removed (it's no longer a dead file; it's a properly-cased archival master) |
| `scripts/radar_vs_gauge_sanity.js` + `reports/RADAR_VS_GAUGE_SANITY.md` | E | Dormant operator tool, kept |
| Documentation reorganisation (`reports/` historical reports) | HISTORICAL_REFERENCE | Out of scope; would be a `chore: relocate historical reports/` PR |

---

## Risk register

| Risk | Mitigation |
|---|---|
| Case-rename produces 404 on Linux for any external link | Phase 2A confirmed zero referrers to the lowercase path. External link auditing remains an operator concern. The capitalized path is now canonical and resolves cleanly. |
| Archived Python scripts no longer functional | `archive/research/README.md` flags this explicitly. The scripts are preserved for reference, not for execution. |
| `radarAvailability.js` comment update breaks something | Comment-only change — JS interprets `//` lines as no-ops. Validator confirmed module loads, exports work, page doesn't error. |
| `archive/research/` ships publicly via Cloudflare Pages | Same exposure as the original locations. None of the archived files contain credentials, tokens, or council SharePoint paths (verified per Phase 1 path-leak audit and Phase 2A reference trace). |
| Empty source directories on Linux checkout | Git doesn't track empty dirs; they simply don't exist on a fresh clone. No risk. |
| Merge conflict with Phase 1 PRs | Phase 1 modified `assets/logos/pluviometrics-main.png` content. Phase 2B renames it. Git's rename-detection should handle this as `rename + content change`. Operator should merge Phase 1 first, then Phase 2B, OR resolve the case-rename by hand if they merge in opposite order. |

---

## Validation summary

See `reports/PHASE2B_VALIDATION.md`. **Stormgauge: 12/13 PASS, 0 FAIL. Hub: 13/13 PASS, 0 FAIL. Stormgrid: pre-existing baseline (no Phase 2B regressions).**

---

## What this implementation does NOT do

- Does not touch rainfall, AEP, IFD, radar science, exports, packaging, or costing logic.
- Does not externalise any dataset.
- Does not split the inline JS monolith.
- Does not modify any binary file's content.
- Does not change the deploy URL or domain of any property.
- Does not touch `index.html`'s structure (script tags, page divs, navigation, CSP) — beyond the `radarAvailability.js` comment update which is in a `src/modules/` file, not in `index.html`.

Logo files were case-renamed but **the image bytes are unchanged**. Brand artwork is preserved exactly per the prompt's "preserve existing logos exactly" directive.

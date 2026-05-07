# STORMGRID_ARTIFACT_RELOCATION

**Branch:** `feature/phase2b-safe-cleanup-stormgauge`.
**Scope:** Phase 2A's NEEDS_CONFIRMATION clusters B (Lizard backfill exploration) and C (Catchment derivation outputs).
**Approach:** Per-file decision — DELETE obsolete log files; MOVE methodology records to `archive/research/`; KEEP runtime-cited material under updated paths.

---

## Decisions

| File (pre-Phase-2B path) | Decision | New path | Reason |
|---|---|---|---|
| `data/lizard_catchments/discovery_candidates.json` | DELETE | — | Pure exploration probe output. No methodology value beyond what's in archived reports. |
| `data/lizard_catchments/discovery_log.txt` | DELETE | — | Log file. |
| `data/lizard_catchments/wms_capabilities_probe.json` | DELETE | — | Probe output. |
| `data/lizard_catchments/wms_probe_log.txt` | DELETE | — | Log. |
| `data/lizard_catchments_approx/approximation_log.txt` | DELETE | — | Log. |
| `data/lizard_catchments_approx/catchments_approx_manifest.json` | DELETE | — | Derived manifest of an approach that's been superseded by raster-derived authoritative polygons (now in Stormgrid). |
| `data/lizard_catchments_approx/validation_report.json` | DELETE | — | JSON form of the validation; the Markdown narrative survives in archive. |
| **`data/lizard_catchments_approx/validation_report.md`** | **MOVE** | `archive/research/lizard_catchments_approx/validation_report.md` | Methodology narrative — explains why approximation was tried and how it was validated. |
| **`data/radar_archive/reports/lizard_backfill_validation_JAN2024.md`** | **MOVE** | `archive/research/lizard_radar_backfill/lizard_backfill_validation_JAN2024.md` | Early-phase validation record for the Lizard precipitation backfill. |
| **`data/radar_archive/reports/lizard_full_backfill_final_report.md`** | **MOVE + UPDATE COMMENT** | `archive/research/lizard_radar_backfill/lizard_full_backfill_final_report.md` | **Cited by `src/modules/radar/radarAvailability.js:15`** as the methodological source for archive-bound constants. The comment was updated to point at the new path. |
| **`data/radar_archive/reports/lizard_full_backfill_progress.md`** | **MOVE** | `archive/research/lizard_radar_backfill/lizard_full_backfill_progress.md` | Progress log. |
| **`scripts/lizard_precip_aoi_backfill.py`** | **MOVE** | `archive/research/scripts/lizard_precip_aoi_backfill.py` | Operator script. Now archived because Lizard work moved to Stormgrid. **Hardcodes paths — see "known limitations" below.** |
| **`scripts/lizard_precip_full_backfill_runner.py`** | **MOVE** | `archive/research/scripts/lizard_precip_full_backfill_runner.py` | Same. |
| `Assets/Catchments/derived/extraction_log.txt` | DELETE | — | Log. |
| **`Assets/Catchments/derived/extraction_report.md`** | **MOVE** | `archive/research/catchments/extraction_report.md` | Methodology record of the original raster-to-polygon extraction. |
| **`Assets/Catchments/derived/manifest.json`** | **MOVE** | `archive/research/catchments/manifest.json` | Provenance manifest. The actual outputs (the `.geojson` files) now live in Stormgrid. |
| **`Assets/Catchments/northern-beaches-subcatchmentsZ_2026-05-04T00_05_35Z.tiff`** | **MOVE** | `archive/research/catchments/northern-beaches-subcatchmentsZ_2026-05-04T00_05_35Z.tiff` | Source raster (220 KiB). Kept in case re-derivation is ever needed. |

**Total: 9 deletions, 10 moves.**

---

## Code change

`src/modules/radar/radarAvailability.js:15` — comment-only path update:

```diff
 // Periods below are anchored to the validated archive (final backfill report,
-// see data/radar_archive/reports/lizard_full_backfill_final_report.md).
+// see archive/research/lizard_radar_backfill/lizard_full_backfill_final_report.md).
```

**No behaviour change.** The comment is documentation only; the runtime constants below it (`ARCHIVE_EARLIEST_ISO`, `ARCHIVE_LATEST_ISO`, `RELIABLE_DATA_START_ISO`, `KNOWN_RADAR_PERIODS`) are unchanged.

---

## New: `archive/research/README.md`

Added to make the relocated material self-explanatory. Documents:

- What's in the archive and why it's not part of the runtime.
- That the Python scripts hardcode pre-relocation paths and **will not run as-is**.
- Where the live successors of this work now live (Stormgrid, in most cases).
- Recovery procedure if any file is needed back.

---

## Known limitations (acknowledged)

### Archived Python scripts have stale path constants

`archive/research/scripts/lizard_precip_full_backfill_runner.py` still contains:

```python
PROGRESS_PATH = Path("data/radar_archive/reports/lizard_full_backfill_progress.md")
FINAL_PATH = Path("data/radar_archive/reports/lizard_full_backfill_final_report.md")
SCRIPT = Path(__file__).resolve().parent / "lizard_precip_aoi_backfill.py"
```

The `data/radar_archive/reports/` paths no longer exist (the reports are at `archive/research/lizard_radar_backfill/` now). The relative path to the AOI script (`__file__.parent / ...`) does still resolve because both scripts moved together.

**Decision:** Leave the path constants as-is. The script is archived as historical material. If anyone wants to revive it, updating two lines is trivial; preserving the original constants documents the original setup.

The `archive/research/README.md` calls this out explicitly so a future operator isn't surprised.

### Empty directories left behind on Linux

After Phase 2B's deletions and moves, the following directories will be empty on a Linux checkout (Git doesn't track empty dirs, so they will simply not exist):

- `data/lizard_catchments/`
- `data/lizard_catchments_approx/`
- `Assets/Catchments/derived/`
- `Assets/Catchments/`
- `data/radar_archive/reports/` (only had the 3 lizard reports)

**Risk: zero.** These directories are no longer referenced by any tracked file. The `data/radar_archive/` parent directory is gitignored anyway (per `.gitignore`); only its `reports/` subdirectory had tracked content before the move.

---

## What was deliberately NOT moved or deleted

- `Assets/Logos/*` — brand artwork, ACTIVE_RUNTIME_DEPENDENCY (`STORMGAUGE.png` loaded at `index.html:274,296`).
- `templates/Rainfall AEP Calculator.xlsm` — runtime template.
- `bom_ifd_cache.js`, `bom_northern_beaches_all_gauges.js`, `nsw_lga_boundaries.js` — ACTIVE.
- `data/pluviometrics_ifd_table.json` — ACTIVE.
- `reports/fixtures/radar_gauge_validation_fixture.json` — ACTIVE (used by tests).
- `scripts/enrich_ifd.py` — operator build script (still used).
- `scripts/radar_vs_gauge_sanity.js` — manual diagnostic tool, dormant but referenced from `radarGaugeValidationExport.js:22`. Phase 2A cluster E.
- `Superseeded/*` (Stormgauge) — Phase 2A cluster A, NEEDS_CONFIRMATION. **Out of scope for Phase 2B**, awaiting operator decision on whether to delete entirely.
- `Assets/Logos/ATMOS.png`, `Assets/Logos/PLUVIOMETRICS.png` — Phase 2A cluster D, NEEDS_CONFIRMATION. **Out of scope for Phase 2B.**

---

## Validation status

See `reports/PHASE2B_VALIDATION.md`. The Phase 2B browser validator confirmed:

- The page still loads with zero console errors and zero page errors.
- `radarAvailability.js` parses correctly (its only change was a comment).
- No runtime request to any moved or deleted path — confirming the relocation didn't orphan a runtime reference.
- All ACTIVE_RUNTIME_DEPENDENCY assets resolve.

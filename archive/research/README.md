# archive/research/

Historical research artefacts retained for institutional memory. **Not part
of the runtime.** Files here are not loaded by the SPA, not built by any
active script, and may reference paths that no longer exist.

## What's here

### `lizard_catchments_approx/`

`validation_report.md` — methodology record from the Phase-pre-split
catchment-approximation experiment. The approach was superseded once
authoritative catchment polygons (raster-derived) became available; the
report explains the reasoning behind the original approximation.

### `lizard_radar_backfill/`

Three reports documenting the Lizard precipitation archive backfill:

- `lizard_backfill_validation_JAN2024.md` — early validation pass
- `lizard_full_backfill_final_report.md` — terminal report (cited by `src/modules/radar/radarAvailability.js:15` as the methodological source for archive-bound constants)
- `lizard_full_backfill_progress.md` — progress log

The Lizard precipitation archive is now consumed by the **Stormgrid** repo
(`stormgrid:scripts/build_static_rainfall.py`). These Stormgauge reports
are the historical record of how the archive was assembled.

### `scripts/`

Two archived operator scripts:

- `lizard_precip_aoi_backfill.py`
- `lizard_precip_full_backfill_runner.py`

These hardcode paths from the pre-relocation tree (e.g.
`data/radar_archive/reports/...`). **They will not run as-is** — they're
preserved for reference. If they need to be revived, update the path
constants and consider whether the work should run in Stormgauge or
Stormgrid.

### `catchments/`

- `extraction_report.md` — methodology record of the original catchment
  extraction from the source TIFF.
- `manifest.json` — provenance manifest for the extraction outputs (the
  outputs themselves now live in Stormgrid as `data/catchments/*.geojson`).
- `northern-beaches-subcatchmentsZ_2026-05-04T00_05_35Z.tiff` — source
  raster (220 KiB). Kept in case re-derivation is ever needed; the
  authoritative downstream catchment data now lives in Stormgrid.

## What is NOT here

Runtime code, runtime data, build scripts, tests, exports, AEP / IFD /
radar / packaging logic — none of that is in this directory.

## Cleanup history

These files were relocated from various live paths to
`archive/research/` in commit (Phase 2B safe cleanup). See
`reports/STORMGRID_ARTIFACT_RELOCATION.md` and
`reports/PHASE2B_IMPLEMENTATION.md` for the full inventory.

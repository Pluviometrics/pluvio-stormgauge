# HISTORICAL_REFERENCE_FILES — Stormgauge

**Audit branch:** `audit/dead-file-audit-stormgauge`.

Files in the tree that document past work. Not consumed at runtime. Not blocking any deploy. Their value is institutional memory, not active dependency.

---

## Reports preserving past audits

| File | Subject | Tracer status |
|---|---|---|
| `reports/FOLDER_STRUCTURE_AND_INDEX_SPLIT_AUDIT.md` | Pre-split inventory of the monolith file structure | unreferenced |
| `reports/PRE_SPLIT_CLEANUP_MANIFEST.md` | Pre-split cleanup plan | referenced from PRE_SPLIT_CLEANUP_RESULT.md |
| `reports/PRE_SPLIT_CLEANUP_RESULT.md` | Outcome of the pre-split cleanup | unreferenced |
| `reports/RADAR_GAUGE_SOURCE_MAPPING_DIAGNOSIS.md` | Radar-vs-gauge mapping diagnosis | unreferenced |
| `structure.txt` | Output of `tree`-style directory dump | referenced from FOLDER_STRUCTURE_AND_INDEX_SPLIT_AUDIT.md |
| `structure-atmos.txt` | Same, atmos-scoped | referenced from FOLDER_STRUCTURE_AND_INDEX_SPLIT_AUDIT.md |

These should remain accessible to anyone reviewing the project's history — but they could equally well live in a `docs/historical/` subdirectory or on a separate `archive/` branch. **The current location is fine; this report only flags them so they're not deleted by mistake during a "clean up reports/" pass.**

## Recommendation

Defer to a documentation-organisation pass. **Out of scope for the dead-file audit.** No deletion candidate is in this list.

If the operator chooses to relocate these in a future PR:

| Suggested target | Files |
|---|---|
| `docs/historical/` | the 6 files above |
| Cleanup commit | `chore: relocate historical reports to docs/historical/` |
| Risk | Zero — they're not read at runtime |

---

## Files that ARE consumed but capture historical decisions

These are not in this list because they're ACTIVE — they describe methodology that the runtime depends on:

- `data/radar_archive/reports/lizard_full_backfill_final_report.md` is referenced from a comment in `src/modules/radar/radarAvailability.js:15` describing how the radar-availability state was anchored. That comment treats the report as a methodological citation. See `NEEDS_CONFIRMATION_CANDIDATES.md` cluster B for the deletion question.

---

## Total HISTORICAL_REFERENCE count: 6 files

These do not block any deploy and do not regress with age. **No action required.**

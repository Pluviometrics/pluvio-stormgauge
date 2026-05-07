# SAFE_DELETE_CANDIDATES — Stormgauge

**Audit branch:** `audit/dead-file-audit-stormgauge`.
**No files have been deleted.** This report identifies candidates and their evidence.

---

## SAFE_DELETE — high confidence (1 file)

### `__pycache__/main.cpython-311.pyc`

| Property | Value |
|---|---|
| Path | `__pycache__/main.cpython-311.pyc` |
| Size | small |
| Reason | Python bytecode artifact. Should never be committed. The directory is gitignored elsewhere (`__pycache__/` is in `.gitignore` line 6) but this single file pre-dates that rule. |
| Evidence | Tracer found 0 references. Python bytecode is regenerated on every interpreter run; deleting has zero effect on any consumer. |
| Risk level | **None.** |
| Suggested commit group | `commit-1: drop tracked python bytecode artifact` |

---

## What is NOT in this report

The 22 candidates that are **highly likely** dead but require operator sign-off because they have judgement calls — keep-as-archival vs delete — are listed in `reports/NEEDS_CONFIRMATION_CANDIDATES.md` with the exact question for the operator.

This report only lists files where there is **no plausible reason to keep them and no operator judgement involved**. The bar is deliberately high.

---

## Why so few?

The Stormgauge tree contains historical artifacts (Superseeded UI snapshots, Lizard backfill reports, Catchment derivation outputs, unused-but-shipped logos) that all *could* be deleted with low or zero runtime risk, but each has a non-trivial keep-as-archival justification:

- **Superseeded snapshots** were created deliberately by past commits with names like "before-blank-screen-fix-20260430". The operator may want them preserved as on-branch history rather than relying solely on `git log`.
- **Catchment derivation outputs** are reproducible from the source TIFF — but the build script that produced them (`build_catchments.py` or similar) is not in this repo any more, so re-deriving is non-trivial.
- **Lizard backfill artefacts** capture work that informed methodology decisions still cited in `src/modules/radar/radarAvailability.js` doc comments.
- **Unused logos** are still brand assets that may be linked from external Pluviometrics properties.

For each, the right call is operator judgement, not unilateral deletion. See `NEEDS_CONFIRMATION_CANDIDATES.md`.

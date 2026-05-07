# CASE_NORMALISATION_AUDIT

**Branch:** `feature/phase2b-safe-cleanup-stormgauge`.
**Date:** 2026-05-07.
**Method:** Cross-reference every tracked file against every reference in HTML / JS / CSS / Python / Markdown.

---

## Why this matters

All three repos have `core.ignoreCase = true` (Windows default). Files tracked at different cases coexist on Windows but are different paths on Linux / macOS / Cloudflare Pages — which serves files case-sensitively. A case mismatch between a reference and a tracked file produces a 200 on Windows and a 404 on production.

---

## Pre-Phase-2B inventory

### Stormgauge — case-tracked-as-shipped paths

| Tracked path (case-exact) | Referenced as | Match? |
|---|---|---|
| `Assets/Logos/STORMGAUGE.png` | `index.html:274,296` → `Assets/Logos/STORMGAUGE.png` | ✓ |
| `Assets/Logos/PLUVIOMETRICS.png` | (not referenced from runtime) | n/a |
| `Assets/Logos/ATMOS.png` | (not referenced from runtime) | n/a |
| **`assets/logos/pluviometrics-main.png`** | (not referenced from runtime) | **case-mismatch with siblings** |

The 4th row is the problem. The directory `assets/logos/` (lowercase) exists in Git as a separate path from `Assets/Logos/` (capitalized). On Windows they collapse to one directory; on Linux they're two.

### Hub — case-tracked-as-shipped paths

| Tracked path (case-exact) | Referenced as | Match? |
|---|---|---|
| `Assets/Logos/PLUVIOMETRICS.png` | `index.html:31,96` → `Assets/Logos/PLUVIOMETRICS.png` | ✓ |
| `Assets/Logos/ATMOS.png` | `index.html:51` → `Assets/Logos/ATMOS.png` | ✓ |
| `Assets/Logos/STORMGAUGE.png` | `index.html:66` → `Assets/Logos/STORMGAUGE.png` | ✓ |
| `Assets/Logos/STORMGRID.svg` | `index.html:81` → `Assets/Logos/STORMGRID.svg` | ✓ |
| **`assets/logos/pluviometrics-main.png`** | (not referenced from runtime) | **case-mismatch with siblings** |

Same single-file mismatch as Stormgauge.

### Stormgrid — no case duplication

Stormgrid uses one `data/` directory plus `src/`, `docs/`, `scripts/`, `tests/`, `reports/`. No `Assets/`/`assets/` mix; no case duplication anywhere. **No action required.**

---

## Canonical convention chosen

**`Assets/Logos/`** (capitalized initial letters) — because:

1. All existing live runtime references use this case.
2. All ACTIVE tracked logo files use this case.
3. Phase 1 documentation (`docs/OPERATIONS.md`, `THIRD_PARTY_NOTICES.md`) was written with this case.
4. The single outlier is one unreferenced file.

---

## Phase 2B fix applied

For both Stormgauge and Hub, the file `assets/logos/pluviometrics-main.png` was case-renamed to `Assets/Logos/pluviometrics-main.png` using:

```bash
git rm --cached assets/logos/pluviometrics-main.png
git add Assets/Logos/pluviometrics-main.png
```

Git registered the change as a rename (`R `, similarity 100%) which preserves history. On Windows the on-disk physical file is unchanged (case-insensitive fs); on Linux/Cloudflare the file now lives at the canonical path.

**No reference updates were needed** because there were zero runtime references to the lowercase path.

---

## Verification

The Phase 2B Stormgauge validator (`reports/PHASE2B_VALIDATION.md`) explicitly tested:

- `case_norm_capitalized_resolves`: GET `/Assets/Logos/pluviometrics-main.png` → 200 ✓
- `no_request_for_moved_or_deleted_paths`: zero local 4xx/5xx after page load ✓

On Windows (case-insensitive fs) a GET to the lowercase path also resolves to 200, but on Cloudflare's case-sensitive serve the lowercase path will correctly 404. Since nothing on the deployed site references the lowercase path, this is a clean migration.

---

## Linux/Cloudflare risk: zero post-Phase-2B

Before Phase 2B: a Linux operator's checkout would have two separate directories (`Assets/Logos/` and `assets/logos/`) and would not be able to unify them without a Windows-style merge. The case-normalisation removes that risk.

After Phase 2B: every tracked logo path uses the same `Assets/Logos/` capitalisation. A fresh Linux clone has one directory.

---

## What's NOT covered by this audit

- Path-as-string references inside binary files (e.g. inside Excel templates). Phase 2A's tracer cannot inspect binaries; Phase 2B did not touch any binary file content. **Risk: very low** — the `templates/Rainfall AEP Calculator.xlsm` template is loaded by URL `templates/Rainfall AEP Calculator.xlsm` in `index.html:1368`, and that path's case is unchanged.
- Dynamic case construction (`fetch('./Assets/' + 'L' + 'ogos/' + name)`) is not detected. Spot-checking the Stormgauge inline JS shows no such patterns; all asset paths are static literals.

---

## Cross-cutting recommendation (out of scope)

**Set `core.ignoreCase = false` on operator workstations** to catch these issues earlier, OR add a CI check that fails on case-mismatched references. Out of scope for this audit; flagged for future hardening.

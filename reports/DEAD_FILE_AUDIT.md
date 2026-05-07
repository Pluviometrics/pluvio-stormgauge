# DEAD_FILE_AUDIT — Stormgauge

**Branch:** `audit/dead-file-audit-stormgauge` (off `staging`).
**Method:** Reference tracer (`.tmp_dead_file_audit.py`) — for each tracked file, search every other tracked file for the basename + relative path (with both forward- and back-slash separators). Strict mode only counts path/basename literal hits. False positives from generic substring matching of word-stems were eliminated.
**Date:** 2026-05-07.

**Audit only — no files deleted, moved, or edited.** No code changes.

---

## Headline

| Repo | Tracked files | Strict-unreferenced | Genuinely dead (high confidence) | Operator decision required | Active runtime |
|---|---|---|---|---|---|
| **Stormgauge** | 70 | 21 | **1** (`__pycache__/main.cpython-311.pyc`) | **22** (Lizard cluster, Catchment derivation cluster, Superseeded snapshots, unused logos) | 47 |
| Stormgrid | 67 | 5 | **0** | 0 | 67 |
| Hub | 10 | 5 | **1** (`Superseeded/stormgauge-direct-calculator-link-before-fix/index.html`) | 1 (`assets/logos/pluviometrics-main.png` — Phase 1 carryover) | 8 |

Stormgrid is essentially clean — its 5 "unreferenced" are all entry-point / config / doc files (`.gitignore`, `README.md`, `package.json`, `docs/asset_data_schema.md`, `src/stormgridReadme.md`) which entry-point tools consume directly, not via cross-file reference.

Hub is nearly clean — 1 SAFE_DELETE plus the Phase 1 master logo carryover.

Stormgauge has substantial cleanup candidates concentrated in three clusters: Lizard exploratory work (now lived in Stormgrid), Catchment-extraction outputs (work completed and shipped to Stormgrid), and historical UI snapshots in `Superseeded/`.

---

## Methodology — what was traced

| Reference type | Tracer detection |
|---|---|
| `<script src=>`, `<link href=>`, `<img src=>` | basename + path literal match |
| `import 'x'`, `from 'x'` | basename match (filenames in same dir use `./basename`) |
| `fetch('./path/to/x')` | basename + path |
| `url(./x)` in CSS | basename + path |
| Inline onclick handlers (`onclick="fn()"`) | function-name detection out of scope; the scripts containing those handlers are the unit of dependency |
| Python `import x`, `open('x')` | basename + path |
| Markdown `[text](path/file.ext)` | basename + path |
| Test runner discovery (e.g. `node --test path/x.test.js`) | doc-comment in test files; tests are entry points |

**Limitations of the tracer (acknowledged):**

- The tracer searches the working tree only, not git history. A file deleted in a recent commit and re-added is invisible.
- Dynamic string composition (`fetch('./data/' + key + '.json')`) is not detected — the `key` variable's runtime values are not enumerable from static analysis.
- Reference detection is case-sensitive. Windows case-insensitive duplicates (`Assets/Logos/` ↔ `assets/logos/`) are tracked separately by Git but appear identical to the OS — they're flagged here.
- Generic-name false positives were eliminated by requiring extension-bearing basename or full path match.

---

## Classification distribution (Stormgauge)

| Classification | Count | See report |
|---|---|---|
| `SAFE_DELETE` | 1 | `reports/SAFE_DELETE_CANDIDATES.md` |
| `NEEDS_CONFIRMATION` | 22 | `reports/NEEDS_CONFIRMATION_CANDIDATES.md` |
| `ACTIVE_RUNTIME_DEPENDENCY` | 47 | `reports/ACTIVE_RUNTIME_DEPENDENCIES.md` |
| `HISTORICAL_REFERENCE` | 6 | `reports/HISTORICAL_REFERENCE_FILES.md` |
| `GENERATED_ARTIFACT` | (overlap with above) | flagged inline |
| `UNKNOWN_DO_NOT_TOUCH` | 0 | n/a |

A file can be in multiple categories conceptually (e.g. `bom_ifd_cache.js` is both `ACTIVE_RUNTIME_DEPENDENCY` and `GENERATED_ARTIFACT`); the tables list each file once under its primary classification.

---

## Risk register for cleanup

If the operator approves any deletion based on the candidates in this audit:

| Risk | Mitigation |
|---|---|
| Deletion breaks Cloudflare Pages deploy | Verify `index.html`, `CNAME`, `.nojekyll`, all `<script src>` and `<link>` targets are in `ACTIVE_RUNTIME_DEPENDENCIES.md`. Run a local `python3 -m http.server` smoke test before merging the cleanup PR. |
| Deletion breaks AEP / IFD / radar / packaging logic | None of the SAFE_DELETE or recommended-DELETE NEEDS_CONFIRMATION items are in those code paths. The audit explicitly excludes any file whose deletion would touch protected logic. |
| Deletion of a Lizard backfill report breaks a doc reference | `radarAvailability.js:15` has a comment `// see data/radar_archive/reports/lizard_full_backfill_final_report.md`. Deleting that report leaves a dangling doc reference — a comment, not a runtime breakage. |
| Deletion removes useful operator history | All deletions are recoverable via `git checkout <pre-cleanup-commit> -- <path>`. Git is the backup. |
| Cleanup PR is too large to review | The candidates are pre-grouped into "deletion commit groups" in `SAFE_DELETE_CANDIDATES.md` to keep review manageable. |

---

## Cross-repo summary

See sibling reports in `pluvio-stormgrid:audit/dead-file-audit-stormgrid` and `pluviometrics-hub:audit/dead-file-audit-hub` for per-repo detail. Both are short.

# Test lead worked examples

| File | What it shows |
|---|---|
| `ex1-run-evidence.json` | A complete run-evidence record (the real numbers from the mock Timesheet run) with per-region decisions |
| `ex2_validate_evidence.py` | Validates a record against the evidence standard, and proves a bad record is rejected |
| `ex3-signoff-criteria.md` | Sign-off and baseline-promotion rules |

**Verified:** `python3 knowledge/erp-test-lead/examples/ex2_validate_evidence.py` → valid, and the deliberately broken copy is rejected with 3 errors (2026-11-22).

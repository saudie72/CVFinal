# ERP security worked examples

| File | What it shows |
|---|---|
| `ex1-role-scenario.md` | A role-based visual scenario with fictional roles, expected differences and the authorization limit |
| `ex2_privacy_audit.py` | Repository privacy audit: County hostnames, third-party scripts, analytics, secret keys, real-org words in demo pages |

**Verified:** `python3 -I knowledge/erp-security-admin/examples/ex2_privacy_audit.py` → PRIVACY AUDIT CLEAN on the full app tree (2026-11-22). It skips `vendor/` (OpenCV.js is sha256-pinned instead of grepped) and the two files that hold the patterns themselves (this example and `tools/privacy_audit.py`). Negative test re-run after the change: a planted third-party script tag (CDN URL) and the word 'Oracle' in `demo-erp/` were both reported (2 findings), then removed. The fuller repo tool is `tools/privacy_audit.py`.

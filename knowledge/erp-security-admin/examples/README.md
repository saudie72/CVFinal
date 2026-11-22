# ERP security worked examples

| File | What it shows |
|---|---|
| `ex1-role-scenario.md` | A role-based visual scenario with fictional roles, expected differences and the authorization limit |
| `ex2_privacy_audit.py` | Repository privacy audit: County hostnames, third-party scripts, analytics, secret keys, real-org words in demo pages |

**Verified:** `python3 knowledge/erp-security-admin/examples/ex2_privacy_audit.py` → PRIVACY AUDIT CLEAN. Negative test: a planted third-party script tag (CDN URL) and the word 'Oracle' in `demo-erp/` were both reported (2 findings), then removed (2026-11-22).

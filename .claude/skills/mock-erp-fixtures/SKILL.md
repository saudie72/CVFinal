---
name: mock-erp-fixtures
description: "Build the fictional PeopleSoft-style Demo ERP pages, planted regressions, PNG sample pairs and samples/manifest.json. Use when creating or validating demo data or test fixtures."
user-invocable: false
---
# Mock ERP fixtures

Reference: `docs/10-mock-erp-demo-plan.md`. Inputs: `docs/erp/test-scenarios.md`, `docs/erp/change-catalogue.md`, `docs/erp/capture-standards.md`.

## Pages (demo-erp/<page>/before.html + after.html)
| Page | Planted change(s) | Expected |
|---|---|---|
| hcm-job-data | Pay Grade field removed; Save button moved | FAIL, ≥ 2 regions |
| hcm-personal-data | Label "Dept ID" → "Department"; link colour change | FAIL, ≥ 2 regions |
| fscm-voucher | Grid column shifted 6 px; Amount truncated | FAIL, ≥ 1 region |
| fscm-po | Only the "Last updated" timestamp changes | FAIL → PASS with ignore zone |
| tl-timesheet | Submit moved below grid; Reported Hours truncated | FAIL, ≥ 2 regions |
| hcm-job-data-shifted | Whole page +3 px (and a 110% variant) | PASS after alignment |
| fscm-po-identical | No change | PASS, 0 regions |

## Rules
- Title "Demo ERP (fictional)". Use **fake** names, IDs and amounts, with **no** Oracle or Miami-Dade logos or names.
- Shared `demo-erp/styles.css` with a classic ERP look: grey header, breadcrumbs, tabs, grid, buttons.
- Capture PNGs at a fixed viewport of 1366×900, 100% zoom, full page, PNG only.
- `samples/manifest.json`:
```json
[{"page":"tl-timesheet","module":"Time & Labor","before":"samples/tl-timesheet_before.png","after":"samples/tl-timesheet_after.png","expected":{"status":"FAIL","minRegions":2},"ignoreZones":[]}]
```
- `demo-erp/index.html` lists the pages and has a **Simulate patch** toggle for live demos.

---
name: mock-erp-fixtures
description: "Build the fictional PeopleSoft-style Demo ERP pages, planted regressions, PNG sample pairs and samples/manifest.json. Use when creating or validating demo data or test fixtures."
user-invocable: false
---
# Mock ERP fixtures

Reference: `docs/10-mock-erp-demo-plan.md`. Inputs: `docs/erp/test-scenarios.md`, `docs/erp/change-catalogue.md`, `docs/erp/capture-standards.md`.

## Pages (demo-erp/<page>/before.html + after.html), 8 pairs as built
| Page | Planted change(s) | Expected (no zones) |
|---|---|---|
| tl-timesheet | Submit moved below grid; Reported Hours truncated (reflow: the grid moves up, so one big region) | FAIL, ≥ 2 regions |
| hcm-job-data | Pay Grade field removed; Save button moved | FAIL, ≥ 2 |
| hcm-personal-data | Label "Dept ID" → "Department"; link colour change | FAIL, ≥ 2 |
| fscm-voucher | Grid column shifted 6 px; Amount truncated | FAIL, ≥ 1 |
| fscm-po | Only the "Last updated" timestamp changes | FAIL; PASS with 0 regions once the zone is applied |
| hcm-job-data-shifted | Whole page +3 px | PASS, 0 regions (alignment (0,+3)) |
| fscm-po-identical | No change | PASS, 0 regions |
| hcm-job-data-zoom110 | After captured at 1.1x device scale | **FAIL**: a capture-standard-violation demo, not a PASS case |

## Rules
- Title "Demo ERP (fictional)". Use **fake** names, IDs and amounts, with **no** Oracle or County logos or names. Pairs differ only in the planted changes.
- Shared `demo-erp/styles.css`, classic ERP look. `demo-erp/index.html` lists the pages and has a **Simulate patch** toggle.
- **Captures are full-page, 1366x900 viewport width, 100% zoom, PNG** (decision log row 16: `docs/erp/capture-standards.md` beats the viewport-only setting in the knowledge script). Names: `samples/<page>_<before|after>.png` (the manifest contract; dated patterns are for real cycles). Capture with `tools/capture-samples.py`.
- **zoom110:** browser zoom breaks the capture standard, so the fixture is recaptured as a 1.1x *device-scale* variant. The pipeline detects the scale (resize ~0.91) but resampled text still differs, so the pair is expected FAIL (about 25 regions) and the app hints "Likely capture artifact". Don't loosen the pipeline to make it pass; it is a stretch case, not a gate (`docs/erp/page-catalogue.md`).
- VR-BU-01 and VR-SEC-01 stay documentation-only (no fixtures).

## `samples/manifest.json` (as built)
```json
{"page":"fscm-po","title":"FSCM – Purchase Order (timestamp only)","module":"FSCM","before":"samples/fscm-po_before.png","after":"samples/fscm-po_after.png",
 "expected":{"status":"FAIL","minRegions":1},
 "ignoreZones":[{"x":1207,"y":74,"w":146,"h":20,"label":"Last updated timestamp"}],
 "expectedWithIgnoreZones":{"status":"PASS","maxRegions":0},
 "note":"expected = result with NO zone applied; ignoreZones = the zone to draw/load (baseline px)"}
```
- Fields: `page`, `title`, `module`, `before`, `after`, `expected {status, minRegions?, maxRegions?}`, `ignoreZones[]`, optional `expectedWithIgnoreZones {status, maxRegions}` and `note`. `maxRegions` is used on PASS pairs.
- "Load sample" does **not** auto-apply zones; the app offers an "Add suggested ignore zone" action instead.
- Validate with `node tools/cv-test/run.js` (harness) and `node tools/app-smoke/run.js` (both sample checks in the app).

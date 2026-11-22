# Handoff log

Kept by **Atlas (orchestrator)**. One row per handoff or review. Experts never call each other: every handoff goes through the orchestrator.

| # | Wave | From | To | Task | Files | Result |
|---|---|---|---|---|---|---|
| 1 | 0 | User | Atlas | Step 9: build the ERP Visual Regression Inspector, Netlify-ready | — | accepted |
| 2 | 0 | Atlas | (all) | Build plan; vendored opencv.js 4.13.0 (the version the knowledge was verified on) and proved it loads in a Web Worker | docs/build-plan.md, vendor/opencv/4.13.0/opencv.js | done |
| 3 | 0 | Atlas | Piper | netlify.toml + a local server that applies its headers | netlify.toml, tools/serve_netlify.py | done (kept from the first planning pass; paths retargeted to inspector.worker.js and 4.13.0 by Atlas) |
| 4 | A | Atlas | Iris | A-CV: compare() pipeline (align, absdiff, threshold, morphology, contours, SSIM, heatmap, ignore zones) | js/cv/*, tools/cv-test/, docs/cv-pipeline-notes.md | launched |
| 5 | A | Atlas | Volt | A-WASM: inspector.worker.js + worker-client.js, watchdog, CSP check | inspector.worker.js, js/worker-client.js, tools/worker-test/, docs/worker-notes.md | launched |
| 6 | A | Atlas | Ledger | A-IDB: erpinspector v1 + Reset app data | js/db.js, tools/db-test/, docs/db-notes.md | launched |
| 7 | A | Atlas | Wren | A-UX: flows, states, copy, HTML skeleton | docs/design/ux-flows.md | launched |
| 8 | A | Atlas | Mason | A-FIXTURES: Demo ERP pages + PNG pairs + manifest | demo-erp/, samples/, tools/capture-samples.* | launched |
| 9 | A | Atlas | Morgan | A-BA: user stories + demo story | docs/erp/user-stories.md, docs/erp/demo-story.md | launched |
| 10 | A | Atlas | Riley | A-FUNC: test scenarios + page catalogue | docs/erp/test-scenarios.md, docs/erp/page-catalogue.md | launched |
| 11 | A | Atlas | Dex | A-DEV: change catalogue + region hints | docs/erp/change-catalogue.md, js/region-hints.json | launched |
| 12 | A | Atlas | Hal | A-PSA: capture standards + capture tip | docs/erp/capture-standards.md | launched |
| 13 | A | Atlas | Vera | A-SEC 1/2: security scenarios + privacy audit script | docs/erp/security-scenarios.md, tools/privacy_audit.py | launched |
| 14 | A | Atlas | Tess | A-TEST: evidence standard + validator | docs/erp/evidence-standard.md, tools/validate_evidence.py | launched |
| 15 | A | Hal | Atlas | Capture standard done; capture tip for Wren; full-page vs viewport question | docs/erp/capture-standards.md | done |
| 16 | A | Atlas | Mason | Decision: full-page 1366×900 PNG captures (the standard wins over the knowledge script's viewport-only setting) | samples/*.png | routed |
| 17 | A | Atlas | Wren | Hal's capture tip (section 5 of capture-standards.md) for the add-baseline state | docs/design/ux-flows.md | queued with the next Wren handoff |
| 18 | A | Dex | Atlas | Change catalogue (CC-01–CC-14) + region hints; asks Juno to show hints by geometry, asks Iris to check the reflow rule, asks Mason for actual region sizes | docs/erp/change-catalogue.md, js/region-hints.json | done; requests queued for waves B/C |
| 19 | A | Riley | Atlas | Test scenarios VR-* + page catalogue; realism flags held for the review of Mason's pages | docs/erp/test-scenarios.md, docs/erp/page-catalogue.md | done |
| 20 | A | Atlas | Mason | Riley's fixture details (Mon–Sun Timesheet, 1,250.00 totals, pairs differ only in planted changes, exact fscm-po zone box). Decision: VR-BU-01 / VR-SEC-01 stay documentation-only | demo-erp/, samples/manifest.json | routed |
| 21 | A | Morgan | Atlas | 16 user stories + 3-minute demo story (estimates labelled) | docs/erp/user-stories.md, docs/erp/demo-story.md | done |
| 22 | A | Atlas | Wren | Hal's capture tip; Morgan's UI labels, US-15 timings. Decision: region decisions are Expected / Regression / Ignore (Tess's standard wins over "Noise") | docs/design/ux-flows.md | routed |
| 23 | A | Tess | Atlas | Evidence standard + validator (valid examples pass, invalid fails with 8 errors) | docs/erp/evidence-standard.md, tools/validate_evidence.py, tools/evidence-examples/ | done |
| 24 | A | Atlas | Wren, Ledger | Conflict resolved (correctness/knowledge first): region decisions are Expected / Regression / **Noise**, reversing row 22. Ledger gets signOff, decisions, reviewMs, runs.update | docs/design/ux-flows.md, js/db.js | routed |
| 25 | A | Ledger | Atlas | erpinspector v1 + runs.update + Tess's fields; 30/30 browser tests (blocked upgrade, reset with tabs open) | js/db.js, tools/db-test/, docs/db-notes.md | done; Juno owns confirm/reload + required evidence fields (queued for wave B) |
| 26 | A | Vera | Atlas | Security scenarios VR-SEC-01..08 + privacy audit script (clean now; negative test caught 24 planted violations) | docs/erp/security-scenarios.md, tools/privacy_audit.py | done; part 2 in wave C. Decision: VR-SEC fixtures stay documentation-only (row 20) |
| 27 | A | Wren | Atlas | UX flows: 14 states, copy, HTML skeletons, sign-off table, capture tip | docs/design/ux-flows.md | done |
| 28 | A | (rate limit) | Atlas | Iris, Volt and Mason paused by the usage limit; resumed from saved state after the reset with Wren's/Dex's requests attached | — | resumed |
| 29 | A | Atlas | Ledger | Wren's follow-up: regions[].note, settings keys, resetAppData → {blocked} + re-open | js/db.js | routed |
| 30 | B | Atlas | Sable | B-UI: css/app.css from Wren's class glossary + contrast check | css/app.css, tools/contrast_check.py | launched |
| 31 | B | Atlas | Juno | B-APP: index/how-it-works/resources + js/* wiring db, worker client, hints, evidence, sign-off, reset | index.html, *.html, js/app.js … | launched |

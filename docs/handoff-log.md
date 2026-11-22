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
| 32 | A | Mason | Atlas | Demo ERP (8 pairs), 16 PNGs at 1366×900, manifest with titles + fscm-po zone (1207,74,146,20); cv2 self-check OK; region numbers for Dex | demo-erp/, samples/, tools/capture-samples.* | done |
| 33 | A | Atlas | Juno, Iris | Samples ready. Decisions: Load sample doesn't auto-apply zones (an "Add suggested ignore zone" action instead); fixture names stay `<page>_<before|after>.png` (the manifest contract), and Hal's dated pattern is for real cycles | samples/manifest.json | routed |
| 34 | A | Ledger | Atlas | Follow-up: regions[].note, resetAppData → {blocked}; 32/32 tests | js/db.js, docs/db-notes.md | done; skill update queued for Forge (wave E) |
| 35 | A | Atlas | Juno | Ledger's final reset contract | js/db.js | routed |
| 36 | B | Sable | Atlas | Liquid Glass css (glass on chrome only, opaque evidence), 208/208 AA contrast pairs, 375 px checked | css/app.css, tools/contrast_check.py | done |
| 37 | B | Atlas | Juno | Sable's hooks. Decision: `--split = 100 − slider value` (keep the clip, match Wren's mapping); data-status on run rows; .is-dragover; hidden-only toggles; .table-wrap | js/views.js, js/app.js | routed |
| 38 | A | Volt | Atlas | Worker + client: ready ≈0.5 s, compare ≈0.3 s, 60 fps main thread, heap flat over 20 runs, watchdog verified at 30 s; 'unsafe-eval' required | inspector.worker.js, js/worker-client.js, docs/worker-notes.md, tools/worker-test/ | needs review |
| 39 | A | Atlas | Piper (via Atlas) | Volt's CSP finding applied to netlify.toml as a small integration fix (comment only; 'unsafe-eval' stays). Decision: the protocol lives in docs/worker-notes.md, and Forge fixes the agent file's docs/worker-protocol.md reference | netlify.toml | done |
| 40 | A | Atlas | Juno | Volt's progress step names + "inputs are transferred" | js/app.js | routed |
| 41 | C | Atlas | Wren | C-REV-UI: review Sable's css | css/app.css | REQUEST CHANGES (1 major: nav hides How it works/Resources at 375 px; 3 minor); overlay mapping confirmed |
| 42 | C | Atlas | Sable, Juno | Wren's findings routed (nav wrap, focus rule, indeterminate progress, zone warn; Juno hides progress in ready/error) | css/app.css, js/app.js | routed |
| 43 | C | Sable | Atlas | Fixed Wren's 4 findings + 2 optional; 208/208 contrast; 375 px nav shows How it works / Resources | css/app.css | done → re-review by Wren |
| 44 | C | Wren | Atlas | Re-review of Sable's fixes | css/app.css | **APPROVE**; Juno to add .table-wrap (routed) |
| 45 | B | Juno | Atlas | App built: index/how-it-works/resources + js/*; smoke 18/20 under real CSP (persist, reset, export VALID, 0 external requests, 0 console errors); 2 failures are pipeline results | index.html, how-it-works.html, resources.html, js/*, tools/app-smoke/ | needs review |
| 46 | B | Atlas | Iris | Juno's 2 sample failures (tl-timesheet merged into 1 region; fscm-po 0.087% < 0.1 → PASS). Fix in defaults, not per sample | js/cv/* | routed |
| 47 | B | Atlas | Sable | Fold print.css, style Juno's new hooks | css/app.css | routed |
| 48 | C | Atlas | Ledger | C-REV-DB: review Juno's use of db.js | js/app.js | launched |
| 49 | C | Atlas | Juno | C-REV-DB2: review Ledger's db.js as the consumer | js/db.js | launched |
| 50 | C | Atlas | Riley | C-REV-FIX: review Mason's pages + manifest | demo-erp/, samples/ | launched |
| 51 | C | Atlas | Tess | C-REV-EVID: review the evidence form, sign-off rules, export | js/app.js, js/report.js, js/db.js | launched |
| 52 | C | Riley | Atlas | Review of Mason's pages + manifest | demo-erp/, samples/ | **APPROVE** (3 minor, 3 nit; no rebuild) |
| 53 | C | Atlas | Riley | Align page-catalogue.md with the build. Decision: hcm-job-data-zoom110 is a stretch case, not a DoD gate; the 3 px shift is the gating alignment test | docs/erp/page-catalogue.md, test-scenarios.md | routed |
| 54 | C | Juno | Atlas | C-REV-DB2: review of db.js as the consumer | js/db.js | **APPROVE** (5 non-blocking suggestions; #3 runs.summaries for History performance queued for Ledger) |
| 55 | C | Riley | Atlas | page-catalogue aligned with the build; zoom110 marked as a stretch case | docs/erp/page-catalogue.md, test-scenarios.md | done |
| 56 | B | Sable | Atlas | print.css folded into app.css; styles for .region-hint, #btn-suggest-zone, #notice-action2, .report-*; contrast 208/208 | css/app.css | done |
| 57 | B | Atlas | (integration) | Removed the dead `css/print.css` <link> from the HTML (small integration fix) | index.html | done |
| 58 | C | Tess | Atlas | C-REV-EVID review | js/app.js, js/report.js, js/db.js | REQUEST CHANGES (blocker: decisions editable after promotion → "promoted without sign-off"); rulings: clearing sign-off on change OK, save with open Regression allowed, Promote hidden on PASS |
| 59 | C | Atlas | Juno | Tess's blocker + minor fix | js/app.js | routed |
| 60 | C | Ledger | Atlas | C-REV-DB review of Juno's db usage | js/app.js | **APPROVE** with 3 majors (versionchange gating, orphan-run guard, reset {blocked} message) + minors |
| 61 | C | Atlas | Juno | Ledger's majors + selected minors added to the fix pass | js/app.js | routed |
| 62 | C | Juno | Atlas | Fixed Tess's blocker + minor, Ledger's 3 majors + minors 4/5/6/8; new smoke step; privacy audit clean | js/app.js, js/copy.js, tools/app-smoke/run.js | done → re-review by Tess |
| 63 | C | Tess | Atlas | Re-review of Juno's evidence fixes | js/app.js | **APPROVE** |
| 64 | A | Iris | Atlas | Pipeline: 21/22 pairs as expected (all manifest pairs except zoom110), heap flat over 20 runs (leak control caught), 1,920/1,920 Mats deleted; defaults changed: mergeGap 3, FAIL if any region OR % > threshold, max-channel diff | js/cv/*, tools/cv-test/, docs/cv-pipeline-notes.md | needs review |
| 65 | C | Atlas | Mason | Decision: recapture zoom110 as a 1.1× device-scale variant (browser zoom breaks the capture standard) | samples/ | routed |
| 66 | C | Atlas | Volt | C-REV-CV: review Iris's pipeline at the worker boundary (+ thenable check) | js/cv/* | launched |
| 67 | C | Atlas | Iris | C-REV-WASM: review Volt's worker + client | inspector.worker.js, js/worker-client.js | launched |
| 68 | C | Atlas | Dex | C-REV-HINTS: regions vs planted changes; decide the reflow rule | docs/erp/change-catalogue.md, js/region-hints.json | launched |
| 69 | C | Atlas | Vera | A-SEC 2/2: full privacy audit + runtime network/headers/logo checks | docs/security-audit.md | launched |
| 70 | C | Atlas | Piper | C-LINKS: verify every link + netlify.toml coverage | resources.html, netlify.toml | launched |
| 71 | C | Dex | Atlas | C-REV-HINTS: regions match the catalogue; reflow rule replaced (H≥100 & W≥300), catalogue updated with real numbers | docs/erp/change-catalogue.md, js/region-hints.json | **APPROVE** |
| 72 | C | Atlas | Juno | Dex's 7-step hint rule + unit test | js/hints.js | routed |
| 73 | C | Atlas | Morgan | Update demo story to the measured results. Decision: tl-timesheet stays the reflow demo; zoom110 stays a recapture (row 65) rather than Dex's "expected FAIL" proposal | docs/erp/demo-story.md | routed |
| 74 | C | Piper | Atlas | C-LINKS: every local link resolves; external links 200 except docs.opencv.org (403 to bots, unverified) and BackstopJS (403); netlify.toml gains /demo-erp/* and per-page HTML rules, 0 overlaps | netlify.toml | done |
| 75 | C | Atlas | Piper | Review of netlify.toml (release-docs ↔ orchestrator pair): publish ".", no build, 12 rules, worker path matches inspector.worker.js → vendor/opencv/4.13.0 | netlify.toml | **APPROVE** |
| 76 | C | Mason | Atlas | zoom110 recaptured at 1.1× device scale; pipeline detects scale 0.91 but flags 25 resampling slivers (FAIL) | samples/, demo-erp/hcm-job-data-zoom110/ | needs decision |
| 77 | C | Atlas | Mason | Decision (correctness > rubric): zoom110 expected FAIL as a capture-standard-violation demo (the capture-artifact hint fires); no pipeline loosening | samples/manifest.json | routed |
| 78 | C | Morgan | Atlas | Demo story + US-02 aligned with the measured results | docs/erp/demo-story.md, user-stories.md | done |
| 79 | C | Iris | Atlas | C-REV-WASM: review of Volt's worker + client (end-to-end Chromium run) | inspector.worker.js, js/worker-client.js | **APPROVE** (4 minor/nit) |
| 80 | C | Atlas | Volt | Iris's minors (malloc probe, heap() after restart) | inspector.worker.js, js/worker-client.js | routed |
| 81 | C | Juno | Atlas | Dex's hint rule implemented + unit test (8/8); app smoke 32/32 incl. both sample checks; privacy audit 0 findings | js/hints.js, js/app.js, tools/app-smoke/hints.test.mjs | done; one mismatch |
| 82 | C | Atlas | Juno, Dex | Decision: control-moved tolerance ±1 px (two different links misread as a moved control) | js/hints.js, docs/erp/change-catalogue.md | routed |
| 83 | C | Dex | Atlas | Catalogue §4 rule 5 updated to ±1 px (unverified, no fixture fires it) | docs/erp/change-catalogue.md | done |
| 84 | C | Mason | Atlas | zoom110 expected FAIL (capture-standard violation demo); Iris's harness 22/22, leak check flat, negative control caught; Juno's hints already give capture-artifact for 25 regions | samples/manifest.json, tools/capture-samples.* | done |
| 85 | C | Juno | Atlas | Rule 5 tightened; hints test 8/8, smoke 32/32 | js/hints.js, tools/app-smoke/hints.test.mjs | done |
| 86 | C | Volt | Atlas | C-REV-CV: review of Iris's pipeline at the worker boundary; stress test to 15 MP; added 16 MP limit + 512 MiB heap recycle; applied Iris's minors | js/cv/*; inspector.worker.js, js/worker-client.js, docs/worker-notes.md | **APPROVE** |
| 87 | C | Atlas | Iris, Juno | Volt's pipeline minors (mergeBoxes cap, early frees) → Iris; the 16 MP RangeError message → Juno | js/cv/pipeline.js, js/app.js, js/copy.js | routed |
| 88 | C | Vera | Atlas | A-SEC 2/2: static audit 0 findings; 0 cross-origin requests across load + all 8 samples; headers on 10 paths; images checked by eye, all fictional | docs/security-audit.md | **APPROVE** |
| 89 | C | Atlas | (integration) | Removed the stray pid file; .gitignore pid/__pycache__. README must say "no network needed after load", not "works offline" (routed to Piper for wave E) | .gitignore | done |
| 90 | C | Juno | Atlas | Friendly >16 MP message; recycle handled; smoke 32/32 | js/copy.js, js/app.js | done |
| 91 | C | Iris | Atlas | Volt's minors applied (union-find mergeBoxes + 2000 cap, early frees, nits); 22/22, 1,920/1,920 Mats freed, heap flat | js/cv/*, docs/cv-pipeline-notes.md | done |
| 92 | D | Atlas | Quinn | D-QA: final real-browser QA (every manifest pair, zones, persistence, reset, network, main thread, leaks, console/CSP, a11y, layout, offline, print, all suites) + review of Mason's samples | docs/qa-report.md, tools/qa/ | launched |
| 93 | E | Atlas | Forge | E-DRIFT: CLAUDE.md, skills, agent files, docs index in line with the build; team lint | CLAUDE.md, .claude/, docs/README.md | launched |
| 94 | E | Forge | Atlas | CLAUDE.md, 5 skills, 11 agent "You own" lines, docs index and a VERIFICATION Step 9 correction (clone() depends on the build); TEAM OK | CLAUDE.md, .claude/, docs/README.md, knowledge/VERIFICATION.md | done |
| 95 | E | Atlas | (integration) | Replaced the stale vendor/opencv/opencv.js path with the 4.13.0 path in the research docs and knowledge notes | docs/*.md, knowledge/** | done |
| 96 | D | Quinn | Atlas | D-QA: 94/95 checks; every manifest pair as expected through the UI; persistence, Reset (incl. blocked), 0 cross-origin requests, 0 long tasks, heap + probe flat over 20 runs, 0 console/CSP errors on 20 pages, keyboard path, print; all suites pass. Samples review: APPROVE | docs/qa-report.md, tools/qa/, docs/qa/screenshots/ | **READY** (1 minor defect QA-001) |
| 97 | E | Atlas | Juno | QA-001 (how-it-works table overflows at 375 px) + OBS-1 (zone-added note) | how-it-works.html, js/app.js | routed |
| 98 | E | Atlas | Vera | Align the knowledge privacy example's exclusions with tools/privacy_audit.py | knowledge/erp-security-admin/examples/ex2_privacy_audit.py | routed |
| 99 | E | Atlas | Piper | README: local run, Netlify deploy, verification, who-did-what | README.md | launched |
| 100 | E | Juno | Atlas | QA-001 fixed (table-wrap + <wbr> in the file-name pattern; scrollWidth 375); OBS-1 was a timing artifact, not a bug; QA [10.1] PASS | how-it-works.html | done |
| 101 | E | Piper | Atlas | README: run locally, Netlify deploy + checks, verify table, structure, who-did-what, known limits; 25/25 relative links resolve | README.md | done |
| 102 | E | Vera | Atlas | Knowledge privacy example aligned (vendor hash-pinned, pattern files skipped); negative test still fails; run_all.sh: only the 3 Python-playwright examples skipped | knowledge/erp-security-admin/examples/ | done |
| 103 | E | Atlas | (release) | Final local run: node tools/qa/run_qa.js 95/95 passed; QA-001 closed in docs/qa-report.md; committed and pushed to main | all | done |

## Summary: who did what (Step 9)
| Agent | Built | Reviewed by → verdict |
|---|---|---|
| Atlas (orchestrator, opus) | Plan, contracts, vendored opencv.js 4.13.0, routing, ~15 conflict decisions, integration fixes, release | Piper's netlify.toml → APPROVE (Atlas reviewed) |
| Iris (opencv-expert, opus) | js/cv/* pipeline; 22/22 test pairs; leak-free | Volt → APPROVE; Dex → APPROVE |
| Volt (wasm-expert, opus) | inspector.worker.js, js/worker-client.js; CSP finding; stress limits | Iris → APPROVE |
| Ledger (indexeddb-expert, sonnet) | js/db.js (erpinspector v1), Reset; 32/32 tests | Juno → APPROVE |
| Wren (ux-designer, sonnet) | docs/design/ux-flows.md (states, copy, skeletons) | Reviewed Sable |
| Sable (ui-designer, sonnet) | css/app.css Liquid Glass; 208/208 AA | Wren → REQUEST CHANGES → APPROVE |
| Juno (frontend-engineer, sonnet) | index/how-it-works/resources, js/* app; smoke 32/32 | Ledger → APPROVE; Tess → REQUEST CHANGES → APPROVE |
| Mason (mock-erp-builder, sonnet) | demo-erp/ (8 pairs), samples/ + manifest | Riley → APPROVE; Quinn → APPROVE |
| Morgan, Riley, Dex, Hal, Vera, Tess (ERP domain) | docs/erp/* specs, region hints, privacy audit, evidence validator | Cross-checked through Juno/Iris/Mason reviews |
| Quinn (qa-tester, sonnet) | docs/qa-report.md, tools/qa/ (95 checks) | READY |
| Piper (release-docs, haiku) | netlify.toml, serve_netlify.py, link check, README | Atlas → APPROVE |
| Forge (meta-agent, sonnet) | CLAUDE.md, skills and agent files in line with the build; TEAM OK | — |

## Round 2: result clarity (user feedback after the live test)
| # | Wave | From | To | Task | Files | Result |
|---|---|---|---|---|---|---|
| 104 | 0 | User | Atlas | Result screen isn't user friendly: "Region 1 of 4: 105 by 154 pixels at 702, 338" means nothing, there's no tie to the screenshot, Expected/Regression/Noise aren't explained, and it's unclear where the agent team (e.g. the business analyst) comes in | — | accepted |
| 105 | A | Atlas | Morgan | UX-1: plain-language definitions, user stories US-17+, "Who built this" content | docs/erp/plain-language-results.md, docs/erp/user-stories.md | launched |
| 106 | A | Atlas | Wren | UX-2: region card redesign (position in words, crops, two-way link to boxes), decision help, "what's happening" guide, onboarding, Who built this | docs/design/ux-flows.md | launched |
| 107 | A | Morgan | Atlas | UX-1 done: plain-language definitions, US-17–US-22 (Must: words+location, locate on screenshot, decision help, next-step guide, Who built this), "Who built this" content; flags a possible pre-selected Expected and a FAIL-rule mismatch on how-it-works | docs/erp/plain-language-results.md, docs/erp/user-stories.md | done |
| 108 | 0 | User | Atlas | Use public PeopleBooks 9.2.33 screenshots from the library | — | Decision (privacy/copyright first; rule 1): don't commit Oracle images; add a "try it locally with PeopleBooks" guide instead (the owner gave no preference when asked) |
| 109 | A | Atlas | Riley | UX-3: find and verify PeopleBooks 9.2 (PUM 33) page links; write the try-it-locally guide | docs/erp/peoplebooks-try-it.md | launched |
| 110 | 0 | User | Atlas → Wren | "Not user friendly, no idea what I'm supposed to do or why": UX-2 widened to the whole first-use journey (purpose in one sentence, a guided 'Try the demo' walkthrough, progressive disclosure, plain nav names) | docs/design/ux-flows.md | routed |

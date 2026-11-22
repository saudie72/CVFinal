# Research Docs: ERP Visual Regression Inspector

This folder holds the Step 4 research for the CAI 2840 final project. The inspector is a 100% in-browser app (OpenCV.js + WebAssembly + IndexedDB, static on Netlify) that compares "before" and "after" screenshots of ERP (PeopleSoft-style) pages and highlights the visual differences. The research docs below came first (Step 4); the build records and ERP specs further down were added during Step 9, when the app was built.

| File | What it covers |
|---|---|
| [business-case.md](business-case.md) | Business problem, use cases, Time & Labor example, County benefits, value estimate, how a pilot would measure it, data rules |
| [01-opencvjs-basics.md](01-opencvjs-basics.md) | Loading opencv.js once, readiness, `cv.Mat`, ImageData ↔ Mat, the `.delete()` memory rule |
| [02-image-diff-pipeline.md](02-image-diff-pipeline.md) | gray → blur → `absdiff` → threshold → dilate → `findContours` → boxes, % changed, SSIM, PASS/FAIL |
| [03-alignment.md](03-alignment.md) | Handling shifts and zoom: resize, `matchTemplate` translation, ORB + `findHomography` + `warpPerspective`, and their pitfalls |
| [04-ignore-zones.md](04-ignore-zones.md) | Masks for timestamps, user names and session IDs; drawing and storing zones per page |
| [05-visual-outputs.md](05-visual-outputs.md) | Numbered red boxes, heatmap (`applyColorMap` or LUT fallback), side-by-side, overlay slider, report export |
| [06-webassembly.md](06-webassembly.md) | What Wasm is, modules, instances and memory, the sandbox, and why Mats leak |
| [07-web-workers.md](07-web-workers.md) | OpenCV.js in a worker, transferable ArrayBuffers, progress messages, 30 s watchdog restart |
| [08-indexeddb.md](08-indexeddb.md) | `erpinspector` schema (pages, ignoreZones, runs, settings), versioning, blocked upgrades, Blobs, quota, Reset app data |
| [09-chrome-devtools-testing.md](09-chrome-devtools-testing.md) | Proving the rubric in DevTools: Application/IndexedDB, Network (no traffic), Performance, Memory (leaks) |
| [10-mock-erp-demo-plan.md](10-mock-erp-demo-plan.md) | Fictional PeopleSoft-style pages, planted regressions, PNG sample pairs, and the 3-minute demo script |
| [11-netlify-hosting.md](11-netlify-hosting.md) | Static deploy settings, a proposed `netlify.toml` with caching and security headers, local testing |
| [12-prior-art.md](12-prior-art.md) | Playwright, BackstopJS, Percy and Applitools, and how this privacy-first, analyst-friendly tool differs |

### Build records (Step 9)

| File | What it covers |
|---|---|
| [build-plan.md](build-plan.md) | The Step 9 build plan: waves, owners, acceptance |
| [handoff-log.md](handoff-log.md) | Every handoff, review and decision, one row each |
| [design/ux-flows.md](design/ux-flows.md) | Wren's screens, 14 states, copy, HTML skeletons, class glossary, sign-off table, capture tip |
| [cv-pipeline-notes.md](cv-pipeline-notes.md) | The `compare()` contract as built, defaults and why, alignment ladder, results on every sample pair |
| [worker-notes.md](worker-notes.md) | Worker and client protocol as built, limits (16 MP, 512 MiB recycle), measurements, the `'unsafe-eval'` CSP finding |
| [db-notes.md](db-notes.md) | `erpinspector` v1 as built, run record fields, `runs.update`, `resetAppData`, test results |
| [security-audit.md](security-audit.md) | Vera's privacy and security audit: static greps, runtime network and header checks |
| [qa-report.md](qa-report.md) | Quinn's final real-browser QA report (written at the end of Step 9) |

### ERP specs (`erp/`)

| File | What it covers |
|---|---|
| [erp/user-stories.md](erp/user-stories.md) | 16 user stories (Given/When/Then, MoSCoW) |
| [erp/demo-story.md](erp/demo-story.md) | The 3-minute demo story with measured results |
| [erp/test-scenarios.md](erp/test-scenarios.md) | Test scenarios VR-* |
| [erp/page-catalogue.md](erp/page-catalogue.md) | Fields, tabs, grids and buttons per mock page |
| [erp/change-catalogue.md](erp/change-catalogue.md) | PeopleSoft change catalogue CC-01..14 and the region-hint rules |
| [erp/capture-standards.md](erp/capture-standards.md) | Where the tool fits in the cycle, capture rules, naming, baseline promotion |
| [erp/security-scenarios.md](erp/security-scenarios.md) | Security scenarios VR-SEC-01..08 |
| [erp/evidence-standard.md](erp/evidence-standard.md) | Run evidence fields, report layout, sign-off rules |

## Key decisions captured so far

- **OpenCV.js runs only inside a Web Worker**, and is self-hosted at `vendor/opencv/4.13.0/opencv.js` (no CDN; versioned path for immutable caching). The research docs above still say `vendor/opencv/4.13.0/opencv.js`; the build records are the current truth.
- **Alignment comes first**: `matchTemplate` for translation, with ORB + homography only when the scale differs.
- **PASS/FAIL**: FAIL if any region survives the filters OR the changed-pixel % exceeds the page threshold (as built; see cv-pipeline-notes.md). SSIM is reported alongside.
- **IndexedDB** database `erpinspector` v1 stores baseline and candidate screenshots as Blobs.
- **Demo data is entirely fictional.** There are no real County screenshots and no Oracle or County logos.

Team roster (Step 5): [expert-roster.md](expert-roster.md). Models and personalities (Step 8): [agent-brains.md](agent-brains.md).

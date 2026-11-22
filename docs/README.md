# Research Docs: ERP Visual Regression Inspector

This folder holds the Step 4 research for the CAI 2840 final project. The inspector is a 100% in-browser app (OpenCV.js + WebAssembly + IndexedDB, static on Netlify) that compares "before" and "after" screenshots of ERP (PeopleSoft-style) pages and highlights the visual differences. Research only: there is no app code here yet.

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

## Key decisions captured so far

- **OpenCV.js runs only inside a Web Worker**, and is self-hosted at `vendor/opencv/opencv.js` (no CDN).
- **Alignment comes first**: `matchTemplate` for translation, with ORB + homography only when the scale differs.
- **PASS/FAIL** is decided by the % changed-pixel threshold for each page, with SSIM reported alongside it.
- **IndexedDB** database `erpinspector` v1 stores baseline and candidate screenshots as Blobs.
- **Demo data is entirely fictional.** There are no real County screenshots and no Oracle or County logos.

Next step (Step 5): the expert roster, `docs/expert-roster.md`.

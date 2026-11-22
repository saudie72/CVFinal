# Final exam submission: ERP Visual Regression Inspector

| Submit | Link |
|---|---|
| **Live Netlify URL** | https://cvfinal-erp-inspector.netlify.app/ |
| **GitHub repository** | https://github.com/saudie72/CVFinal |

Everything is on the `main` branch.

## How the app meets each requirement

| Area | What the rubric asks | Where to see it | Evidence |
|---|---|---|---|
| **Live app** | The Netlify URL opens in Chrome and the app works without errors | https://cvfinal-erp-inspector.netlify.app/ → Getting started → Open example | Live check: page loads, OpenCV ready in about 3 s, the Timesheet example gives FAIL with 2 changes, 0 requests to other sites. App console errors: 0 (Netlify's own injected badge script logs CSP errors; turn the badge off in Netlify to remove them, see below). |
| **OpenCV.js** | Real, visible computer vision that fits the use case | Result screen: outlined changes, heat map, side by side, slide to compare | `js/cv/align.js` (resize, `matchTemplate` translation, ORB + homography), `js/cv/pipeline.js` (absdiff, threshold, morphology, contours → numbered change boxes), `js/cv/ssim.js`, `js/cv/heatmap.js` (`applyColorMap`). 22/22 test pairs as expected (`node tools/cv-test/run.js`); notes in `docs/cv-pipeline-notes.md`. |
| **WebAssembly** | OpenCV.js loads once in a Web Worker, no freezing, every Mat deleted | DevTools → Sources → Threads: `inspector.worker.js` | OpenCV.js 4.13.0 self-hosted at `vendor/opencv/4.13.0/opencv.js`, loaded once by `inspector.worker.js`; the page stays at ~60 fps with 0 long tasks during compares; every Mat tracked and deleted (1,920 created / 1,920 deleted), Wasm heap flat over 20 runs, a deliberate leak is caught; 30 s watchdog. `docs/worker-notes.md`. |
| **IndexedDB** | Results persist after a refresh, Reset app data works, visible in DevTools | DevTools → Application → IndexedDB → `erpinspector`; Settings → Reset app data | Database `erpinspector` v1 with stores `pages`, `ignoreZones`, `runs`, `settings`; saved pages and results survive a refresh (checked on the live site); Reset app data deletes the database, including when another tab is open. `js/db.js`, `docs/db-notes.md` (32/32 tests). |
| **Agent team** | The four required agents plus sensible others, skills, models, personalities, built through the orchestrator | `.claude/agents/`, `.claude/skills/`, `docs/agent-brains.md`, `docs/handoff-log.md`, README "The agent team" | 17 agents (orchestrator Atlas, opencv-expert Iris, wasm-expert Volt, indexeddb-expert Ledger + UI/UX, front end, QA, release, mock ERP, 6 ERP domain roles, meta agent); 26 skills; models opus/sonnet/haiku with reasons; a name and personality each; 148 logged handoffs and peer reviews; who-did-what summary in the README. |
| **Knowledge & research** | Docs folder and knowledge folders with real notes, sources and examples, all on main | `docs/`, `knowledge/<agent>/docs` and `/examples`, `knowledge/VERIFICATION.md` | 12 research topics + business case + ERP specs in `docs/`; every agent has a knowledge folder with cited notes and runnable examples; examples verified by `bash tools/verify-knowledge/run_all.sh`; team lint "TEAM OK". |

## Required features

- **Resources page:** https://cvfinal-erp-inspector.netlify.app/resources.html links the official docs (OpenCV.js, MDN WebAssembly/Workers/IndexedDB, Chrome DevTools, Netlify, Apple HIG, WCAG, Claude Code), the GitHub repo and the course guide.
- **Reset app data:** Settings → Reset app data.
- **Orchestrator summary of who did what:** `README.md` → "The agent team" (and every handoff in `docs/handoff-log.md`).

## One thing to do before you submit

Netlify adds a "Powered by Netlify" badge script to every page on free accounts. The app's security policy blocks it, which shows up as red errors in the Chrome console that are not from the app. To keep the console clean for grading: Netlify → your project → **Project configuration → General → Powered by Netlify badge → off** (if your plan has the toggle).

## Demo script (3 minutes)

See `docs/erp/demo-story.md`. Short version: Getting started → walkthrough on the Timesheet → explain the 2 changes and decide → Save result → refresh (still there) → DevTools IndexedDB and Network (quiet) → Purchase order example: FAIL, "Add suggested ignore zone", PASS → How it works → Who built this.

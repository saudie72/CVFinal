# CLAUDE.md: ERP Visual Regression Inspector

## What this project is
This is the CAI 2840 Computer Vision final project. It is a **100% in-browser** app that compares "before" and "after" screenshots of ERP (PeopleSoft-style) pages and highlights unintended visual changes. It's for testing PUM updates, PeopleTools upgrades, customizations and configuration changes. It is a **supplemental QA tool, not a replacement for functional or security testing.** The business case is in `docs/business-case.md`.

## Architecture (fixed decisions)
- **Static site on Netlify.** There are no servers, no API keys and no build step. Publish directory `.`.
- **OpenCV.js** does the computer vision: alignment, `absdiff`, threshold, morphology, contours, SSIM and heatmap.
- **WebAssembly** makes it fast. OpenCV.js is self-hosted at `vendor/opencv/opencv.js` and loaded **once inside a Web Worker** (`inspector.worker.js`), so the page never freezes.
- **IndexedDB** (`erpinspector`) keeps the baseline & run library: pages, ignoreZones, runs and settings. It has a **Reset app data** button.
- **No network calls after load.** Data never leaves the device.

## Hard rules (override everything)
1. Use **fictional data only**: no real INFORMS/County screenshots, employee data, configurations or roles, and no Oracle or County logos. The demo uses "Demo ERP (fictional)".
2. Delete every `cv.Mat`, `MatVector` and `.get(i)` result (`try/finally`).
3. Use no third-party scripts, CDNs or analytics. Everything is self-hosted.
4. Everything lives on the `main` branch.

## The team
There are 17 project subagents in `.claude/agents/`, with skills in `.claude/skills/`. The full roster and skills matrix is in `docs/expert-roster.md`.

| Group | Agents |
|---|---|
| Lead | `orchestrator` (Atlas), `meta-agent` (Forge) |
| Required experts | `opencv-expert`, `wasm-expert`, `indexeddb-expert` |
| Design | `ui-designer-apple-liquid-glass` (Sable), `ux-designer-apple-hig` (Wren) |
| Build & ship | `frontend-engineer`, `mock-erp-builder`, `qa-tester`, `release-docs-engineer` |
| ERP domain | `erp-business-analyst`, `erp-functional-analyst`, `peoplesoft-developer`, `peoplesoft-admin-psa`, `erp-security-admin`, `erp-test-lead` |

## How the team works
- **The orchestrator runs the team.** For any multi-step goal, start with `@agent-orchestrator`. It plans the work, gives each task one owner, and **runs independent experts in parallel** by launching every unblocked task in the same turn, in waves: ERP and design specs → computer vision, storage and fixtures → app integration → peer reviews and QA → release.
- **Agents hand work to each other through the orchestrator.** Experts don't call each other (every agent except the orchestrator has `disallowedTools: Agent`). Each expert ends with a report that includes `HANDOFF REQUESTS`. The orchestrator routes those to the right agent, with the context and files they need.
- **Peer review.** The orchestrator pairs reviewers (e.g., opencv ↔ wasm, indexeddb ↔ frontend, Sable ↔ Wren, PeopleSoft developer ↔ opencv). Work is done only after APPROVE.
- **Handoff log.** The orchestrator records every handoff and review in `docs/handoff-log.md`, and puts a who-did-what summary in the README at the end.
- **Knowledge first.** Every agent reads `knowledge/<agent>/` and `docs/` before answering, cites its sources and flags anything unverified.
- **Conflicts** are decided in this order: privacy/safety, correctness, rubric, UX, elegance.

## Definition of done
- Live on Netlify, and works in Chrome.
- Every pair in `samples/manifest.json` produces its expected PASS/FAIL. Ignore zones and alignment work.
- Data persists after refresh. Reset app data works and is visible in DevTools → Application → IndexedDB.
- DevTools Network is quiet after load, and the heavy work runs on the worker thread with no Mat leak over 20 runs.
- How it works and Resources pages exist. The README has deploy steps and the who-did-what summary.

## Key files
`docs/` (research + roster) · `docs/erp/` (ERP specs) · `.claude/agents/` · `.claude/skills/` · `knowledge/<agent>/` · `index.html` · `inspector.worker.js` · `js/` · `css/` · `vendor/opencv/` · `demo-erp/` · `samples/` · `netlify.toml` · `README.md`

## Local testing
`python -m http.server 8080` → http://localhost:8080. Don't test from `file://`.

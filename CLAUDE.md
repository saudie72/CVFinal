# CLAUDE.md: ERP Visual Regression Inspector

## What this project is
This is the CAI 2840 Computer Vision final project. It is a **100% in-browser** app that compares "before" and "after" screenshots of ERP (PeopleSoft-style) pages and highlights unintended visual changes. It's for testing PUM updates, PeopleTools upgrades, customizations and configuration changes. It is a **supplemental QA tool, not a replacement for functional or security testing.** The business case is in `docs/business-case.md`.

## Architecture (fixed decisions)
- **Static site on Netlify.** There are no servers, no API keys and no build step. Publish directory `.`.
- **OpenCV.js** does the computer vision: alignment, `absdiff`, threshold, morphology, contours, SSIM and heatmap.
- **WebAssembly** makes it fast. OpenCV.js 4.13.0 is self-hosted at `vendor/opencv/4.13.0/opencv.js` (the version is in the path so it can be cached as immutable; a new version gets a new folder) and loaded **once inside a classic Web Worker** (`inspector.worker.js`, driven by `js/worker-client.js`), so the page never freezes. The client rejects images over 16 MP and recycles the worker when its Wasm heap passes 512 MiB. The protocol and measurements are in `docs/worker-notes.md`.
- **CSP:** `script-src` must include `'unsafe-eval'` (opencv.js's embind builds wrappers with `new Function`; measured by Volt in `docs/worker-notes.md`). Don't remove it from `netlify.toml`.
- **IndexedDB** (`erpinspector`) keeps the baseline & run library: pages, ignoreZones, runs and settings. It has a **Reset app data** button.
- **No network calls after load.** Data never leaves the device.

## Hard rules (override everything)
1. Use **fictional data only**: no real INFORMS/County screenshots, employee data, configurations or roles, and no Oracle or County logos. The demo uses "Demo ERP (fictional)".
2. Delete every `cv.Mat`, `MatVector` and `.get(i)` result (`try/finally`).
3. Use no third-party scripts, CDNs or analytics. Everything is self-hosted.
4. Everything lives on the `main` branch.

## The team
There are 17 project subagents in `.claude/agents/`, with skills in `.claude/skills/`. The full roster and skills matrix is in `docs/expert-roster.md`; models and personalities are in `docs/agent-brains.md` (opus: orchestrator, opencv, wasm · haiku: release-docs, PSA · sonnet: everyone else).

| Group | Agents |
|---|---|
| Lead | `orchestrator` (Atlas), `meta-agent` (Forge) |
| Required experts | `opencv-expert` (Iris), `wasm-expert` (Volt), `indexeddb-expert` (Ledger) |
| Design | `ui-designer-apple-liquid-glass` (Sable), `ux-designer-apple-hig` (Wren) |
| Build & ship | `frontend-engineer` (Juno), `mock-erp-builder` (Mason), `qa-tester` (Quinn), `release-docs-engineer` (Piper) |
| ERP domain | `erp-business-analyst` (Morgan), `erp-functional-analyst` (Riley), `peoplesoft-developer` (Dex), `peoplesoft-admin-psa` (Hal), `erp-security-admin` (Vera), `erp-test-lead` (Tess) |

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
`docs/` (research, roster, build plan, handoff log, `cv-pipeline-notes.md`, `worker-notes.md`, `db-notes.md`, `security-audit.md`, `qa-report.md`) · `docs/erp/` (ERP specs) · `docs/design/` (UX flows) · `tools/` (tests and audits) · `.claude/agents/` · `.claude/skills/` · `knowledge/<agent>/` · `index.html` · `inspector.worker.js` · `js/` · `css/` · `vendor/opencv/4.13.0/` · `demo-erp/` · `samples/` · `netlify.toml` · `README.md`

## Local testing
Serve with `python3 tools/serve_netlify.py --port 8080` (applies the real `netlify.toml` headers, including the CSP) → http://localhost:8080. `python -m http.server 8080` also works for a quick look but skips the headers. Don't test from `file://`.

| Command | What it checks |
|---|---|
| `node tools/app-smoke/run.js` | The whole app in headless Chromium under the real CSP: persistence, reset, export, both sample checks, no external requests, no console errors |
| `node tools/cv-test/run.js` | The comparison pipeline on every sample and synthetic pair, plus the 20-run leak check and Mat tracker |
| `node tools/worker-test/run.js` | Worker and client: readiness, transfer, watchdog, heap, CSP matrix (`stress` for large images) |
| `node tools/db-test/run.js` | `js/db.js`: CRUD, Blobs, evidence, `runs.update`, blocked upgrades, reset with other tabs open |
| `node tools/qa/run_qa.js` | The final QA run (Quinn); results in `docs/qa-report.md` |
| `python3 tools/privacy_audit.py` | No real data, logos, third-party hosts or network calls in the repo |
| `python3 tools/contrast_check.py` | WCAG contrast of every text/background pair in `css/app.css` |
| `python3 tools/validate_evidence.py` | Evidence JSON against `docs/erp/evidence-standard.md` |

Re-run every knowledge example and the team lint: `bash tools/verify-knowledge/run_all.sh` (results in `knowledge/VERIFICATION.md`). Team lint alone: `python3 knowledge/meta-agent/examples/ex1_lint_team.py`.

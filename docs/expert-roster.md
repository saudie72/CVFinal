# Expert Roster: ERP Visual Regression Inspector

**Decision:** everything runs in the browser and is deployed on Netlify as a static site, with no servers and no API keys. OpenCV.js does the computer vision. WebAssembly makes it fast, and it runs inside a Web Worker. IndexedDB keeps the **baseline & run library**: page baselines, ignore zones, comparison runs and settings.

This roster covers only what a **browser-only static app** needs. It has no backend, database-server, auth, DevOps-pipeline or cloud roles.

---

## Roles (11 agents)

| # | Agent (file name) | Persona | Required? | One-line job description |
|---|---|---|---|---|
| 1 | `orchestrator` | Atlas | **Required** | Runs the team: turns the goal into a plan, assigns work, runs independent experts in parallel, sets up peer reviews, resolves conflicts, and records every handoff in `docs/handoff-log.md`. |
| 2 | `meta-agent` | Forge | Requested | Builds and maintains the team itself: writes and updates the `.claude/agents/*.md` files, `.claude/skills/*/SKILL.md`, `CLAUDE.md` and the `knowledge/<agent>/` folders, so each agent has the right instructions and references. |
| 3 | `opencv-expert` | (named in Step 8) | **Required** | Owns the computer vision pipeline: alignment, grayscale, `absdiff`, threshold, morphology, contours, region boxes, % changed, SSIM, heatmap, and cleanup of every `cv.Mat`. |
| 4 | `wasm-expert` | — | **Required** | Owns OpenCV.js/WebAssembly loading and performance: loading once inside the Web Worker, readiness, the message protocol, transferable buffers, the 30 s watchdog restart, and Wasm heap/leak monitoring. |
| 5 | `indexeddb-expert` | — | **Required** | Owns the on-device library: the versioned `erpinspector` schema (pages, ignoreZones, runs, settings), Blob storage, the promise wrapper, blocked-upgrade handling, quota display, and **Reset app data**. |
| 6 | `ui-designer-apple-liquid-glass` | **Sable** | Requested | Owns the look: an Apple-style Liquid Glass visual language (translucent panels, depth, type scale, colour tokens, light/dark), the status pill, and the styling of the comparison views. |
| 7 | `ux-designer-apple-hig` | **Wren** | Requested | Owns the flow: Apple HIG-based user journeys (pick page → baseline → candidate → compare → review → save), screen states (empty, loading, working, error, PASS/FAIL), ignore-zone drawing UX, and accessibility rules. |
| 8 | `frontend-engineer` | — | Browser app need | Builds the app shell in vanilla HTML/CSS/JS: page library, upload/drag-drop, canvas views (boxes, heatmap, side-by-side, overlay slider), report export, and the How it works and Resources pages, all wired to the worker and the database. |
| 9 | `mock-erp-builder` | — | Project need | Builds the **fictional** PeopleSoft-style demo pages (`demo-erp/`) with "before" and "after patch" versions and planted regressions, plus `samples/` PNG pairs and a `manifest.json` of expected results. No real County data and no Oracle or County logos. |
| 10 | `qa-tester` | — | Browser app need | Tests in real Chrome: runs every sample pair against its expected result, checks persistence after refresh, Reset app data, no network traffic after load, UI responsiveness, Mat leaks, and accessibility, then files defects back to the owners. |
| 11 | `release-docs-engineer` | — | Static deploy need | Handles the small finishing jobs: `netlify.toml` (publish `.`, no build, cache and security headers), README with deploy steps, the Resources page link list, and keeping `docs/` tidy. |

**Why there are no other roles:** a static site needs no backend, API or auth engineer, and no CI/CD specialist, because Netlify redeploys on every push to `main`. Privacy and security checks for a browser-only app (no network calls, no third-party scripts, no real data in the repo) are covered by `qa-tester` and `release-docs-engineer` as shared skills, not a separate agent.

---

## Skills

Each skill becomes `.claude/skills/<skill-name>/SKILL.md` (Step 6) and is wired to its agents through the `skills:` field.

| Skill | What it teaches | Agents that share it |
|---|---|---|
| `team-orchestration` | Planning, parallel dispatch, peer-review pairing, the handoff-log format, definition of done | orchestrator, meta-agent |
| `agent-authoring` | Claude Code subagent and skill file format, frontmatter (`name`, `description`, `tools`, `model`, `skills`), knowledge-folder conventions | meta-agent, orchestrator |
| `knowledge-first` | "Before you answer": read `knowledge/<agent>/docs` and `examples`, cite sources, flag uncertainty instead of guessing | **all 11 agents** |
| `opencvjs-diff-pipeline` | gray → blur → `absdiff` → threshold → dilate → `findContours` → boxes; % changed, SSIM, PASS/FAIL rules | opencv-expert, wasm-expert, qa-tester |
| `screenshot-alignment` | resize, `matchTemplate` translation, ORB + `findHomography` + `warpPerspective`, fallbacks and pitfalls | opencv-expert, qa-tester |
| `cv-mat-memory-hygiene` | `.delete()` every Mat, MatVector and `.get(i)` result; `try/finally`; leak detection | opencv-expert, wasm-expert, qa-tester |
| `ignore-zones-masking` | Building masks from stored rectangles, applying them after `absdiff`, drawing zones on canvas | opencv-expert, ux-designer-apple-hig, frontend-engineer, indexeddb-expert |
| `wasm-worker-runtime` | Loading opencv.js once in a classic worker, readiness, message protocol, transferables, watchdog restart | wasm-expert, opencv-expert, frontend-engineer |
| `indexeddb-library` | `erpinspector` v1 schema, versioned upgrades, Blobs, transactions, `blocked`/`versionchange`, quota, deleteDatabase | indexeddb-expert, frontend-engineer, qa-tester |
| `reset-app-data` | The Reset button flow, closing connections, deleting the DB, reloading, verifying in DevTools | indexeddb-expert, frontend-engineer, qa-tester |
| `canvas-comparison-views` | Boxes, heatmap (LUT fallback), side-by-side, overlay slider, PNG/HTML report export | frontend-engineer, opencv-expert, ui-designer-apple-liquid-glass |
| `apple-liquid-glass-styling` | Translucent materials, depth, colour/type tokens, light/dark, motion restraint | ui-designer-apple-liquid-glass, frontend-engineer |
| `apple-hig-ux` | HIG navigation, feedback, empty/loading/error states, clear PASS/FAIL language, progressive disclosure | ux-designer-apple-hig, ui-designer-apple-liquid-glass, frontend-engineer |
| `accessibility-wcag` | Contrast, keyboard operation (overlay slider, zone drawing), focus, ARIA live status, not relying on colour alone | ux-designer-apple-hig, ui-designer-apple-liquid-glass, frontend-engineer, qa-tester |
| `mock-erp-fixtures` | Fictional PeopleSoft-style pages, planted-regression catalogue, PNG capture rules, `manifest.json` expected results | mock-erp-builder, qa-tester, opencv-expert |
| `privacy-no-real-data` | No real County screenshots, PII or Oracle/County logos in the repo; no network calls after load; no third-party scripts | mock-erp-builder, qa-tester, release-docs-engineer, orchestrator |
| `devtools-verification` | Application/IndexedDB, Network (offline proof), Performance (worker thread), Memory (leaks) checks | qa-tester, wasm-expert, indexeddb-expert |
| `netlify-static-deploy` | Publish `.`, empty build command, `netlify.toml` headers and caching, local `http.server` testing | release-docs-engineer, wasm-expert |
| `peer-review` | Review checklist, constructive findings, approve/request-changes, logging in the handoff log | **all experts** (orchestrator assigns pairs) |

---

## Skills by agent (quick view)

| Agent | Skills |
|---|---|
| orchestrator | team-orchestration, agent-authoring, knowledge-first, privacy-no-real-data, peer-review |
| meta-agent | agent-authoring, team-orchestration, knowledge-first |
| opencv-expert | opencvjs-diff-pipeline, screenshot-alignment, cv-mat-memory-hygiene, ignore-zones-masking, wasm-worker-runtime, canvas-comparison-views, mock-erp-fixtures, knowledge-first, peer-review |
| wasm-expert | wasm-worker-runtime, cv-mat-memory-hygiene, opencvjs-diff-pipeline, devtools-verification, netlify-static-deploy, knowledge-first, peer-review |
| indexeddb-expert | indexeddb-library, reset-app-data, ignore-zones-masking, devtools-verification, knowledge-first, peer-review |
| ui-designer-apple-liquid-glass (Sable) | apple-liquid-glass-styling, apple-hig-ux, accessibility-wcag, canvas-comparison-views, knowledge-first, peer-review |
| ux-designer-apple-hig (Wren) | apple-hig-ux, accessibility-wcag, ignore-zones-masking, knowledge-first, peer-review |
| frontend-engineer | canvas-comparison-views, wasm-worker-runtime, indexeddb-library, reset-app-data, ignore-zones-masking, apple-liquid-glass-styling, apple-hig-ux, accessibility-wcag, knowledge-first, peer-review |
| mock-erp-builder | mock-erp-fixtures, privacy-no-real-data, knowledge-first, peer-review |
| qa-tester | devtools-verification, opencvjs-diff-pipeline, screenshot-alignment, cv-mat-memory-hygiene, indexeddb-library, reset-app-data, mock-erp-fixtures, accessibility-wcag, privacy-no-real-data, knowledge-first, peer-review |
| release-docs-engineer | netlify-static-deploy, privacy-no-real-data, knowledge-first, peer-review |

---

## Working agreement

- **Parallel where independent:** after the orchestrator's plan, `opencv-expert`, `indexeddb-expert`, `mock-erp-builder` and Wren can start at once. `wasm-expert` defines the worker message protocol early, so everyone builds against it.
- **Peer-review pairs (proposed):** opencv ↔ wasm, indexeddb ↔ frontend, Sable ↔ Wren, mock-erp ↔ qa, release-docs ↔ orchestrator.
- **Definition of done:** every `samples/manifest.json` pair produces its expected PASS/FAIL. Data persists after refresh. Reset app data works and is visible in DevTools. Network is quiet after load. No Mat leak over 20 runs. The app is live on Netlify.
- **Model choice and personalities** are set in Step 8 (`docs/agent-brains.md`).

## Sources

- Course final guide (required agents, designer names, repo layout): https://cvfinal-doc-scanner.netlify.app/guide/
- Research index for this project: [docs/README.md](README.md)
- Claude Code subagents: https://docs.claude.com/en/docs/claude-code/sub-agents
- Claude Code skills: https://docs.claude.com/en/docs/claude-code/skills

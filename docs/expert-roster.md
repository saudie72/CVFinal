# Expert Roster: ERP Visual Regression Inspector

**Decision:** everything runs in the browser and is deployed on Netlify as a static site, with no servers and no API keys. OpenCV.js does the computer vision. WebAssembly makes it fast, and it runs inside a Web Worker. IndexedDB keeps the **baseline & run library**: page baselines, ignore zones, comparison runs and settings.

This roster covers only what a **browser-only static app** needs. It has no backend, database-server, auth, DevOps-pipeline or cloud roles.

---

## Roles (17 agents)

### Build team (11 agents)

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

### ERP domain team (6 agents)

These agents make the product **right for PeopleSoft**. They write requirements, test scenarios, realistic mock pages, the change catalogue and the evidence standards. They don't write the computer vision code. They work only from **public** PeopleSoft knowledge and the fictional Demo ERP, never from real INFORMS configurations, screenshots, roles or data.

| # | Agent (file name) | One-line job description |
|---|---|---|
| 12 | `erp-business-analyst` | Owns the "why": keeps the app tied to `docs/business-case.md`, writes user stories and acceptance criteria, defines the pilot metrics (time per comparison, regressions caught, false positives), and checks the "supplemental QA tool, not a replacement" positioning. |
| 13 | `erp-functional-analyst` | Owns the "what gets tested": HCM (Job Data, Personal Data), FSCM (Voucher, PO) and Time & Labor (Timesheet) test scenarios, the page and module catalogue, Business Unit/Constitutional Office comparison scenarios, and what a realistic page should look like. |
| 14 | `peoplesoft-developer` | Owns the "what can change": a catalogue of the visual effects of real change types (PeopleCode, page/field/record changes in Application Designer, Fluid vs Classic, customizations, PUM fixes, PeopleTools UI updates), used to design planted regressions and to explain detected regions. |
| 15 | `peoplesoft-admin-psa` | Owns the "how it fits the upgrade cycle": the PUM and PeopleTools upgrade workflow, test environments, the capture standards that keep screenshots comparable (browser, zoom, resolution, theme, same test user), and where the inspector fits before and after each migration. |
| 16 | `erp-security-admin` | Owns roles and privacy: role and permission-list test scenarios (fields or buttons that should appear or disappear for a role), the warning that a visual diff **does not prove authorization**, PII handling rules, and a privacy/security audit of the app (no network calls after load, no third-party scripts, CSP, no real data in the repo). |
| 17 | `erp-test-lead` | Owns the evidence: the UAT test-plan format, traceability fields on every run (test case ID, ticket/patch ID, PUM image or PeopleTools version, Business Unit, tested role, tester, date), the report layout for QA and audit, and sign-off criteria. |

**Why there are no other roles:** a static site needs no backend, API or auth engineer, and no CI/CD specialist, because Netlify redeploys on every push to `main`. A separate change-manager/CAB role is covered by `erp-test-lead`, through evidence and sign-off, and by `peoplesoft-admin-psa`, through the upgrade cycle.

---

## Skills

Each skill becomes `.claude/skills/<skill-name>/SKILL.md` (Step 6) and is wired to its agents through the `skills:` field.

| Skill | What it teaches | Agents that share it |
|---|---|---|
| `team-orchestration` | Planning, parallel dispatch, peer-review pairing, the handoff-log format, definition of done | orchestrator, meta-agent |
| `agent-authoring` | Claude Code subagent and skill file format, frontmatter (`name`, `description`, `tools`, `model`, `skills`), knowledge-folder conventions | meta-agent, orchestrator |
| `knowledge-first` | "Before you answer": read `knowledge/<agent>/docs` and `examples`, cite sources, flag uncertainty instead of guessing | **all 17 agents** |
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
| `privacy-no-real-data` | No real County screenshots, PII or Oracle/County logos in the repo; no network calls after load; no third-party scripts | mock-erp-builder, qa-tester, release-docs-engineer, orchestrator, erp-security-admin |
| `erp-business-case-metrics` | Business-case alignment, user stories and acceptance criteria, pilot metrics and ROI framing, "supplemental tool" positioning | erp-business-analyst, erp-test-lead, orchestrator |
| `peoplesoft-page-anatomy` | What Classic and Fluid PeopleSoft pages look like (header, breadcrumbs, tabs, grids, scroll areas, prompts, action buttons) and module conventions for HCM, FSCM and T&L | erp-functional-analyst, peoplesoft-developer, mock-erp-builder, ux-designer-apple-hig |
| `erp-test-scenarios` | Page and module catalogue, Business Unit/Constitutional Office scenarios, test data rules (fictional only), and expected results | erp-functional-analyst, erp-test-lead, qa-tester, mock-erp-builder |
| `peoplesoft-change-catalogue` | Change types (PUM, PeopleTools, customizations, configuration) and their visual effects, mapped to planted regressions and region explanations | peoplesoft-developer, peoplesoft-admin-psa, mock-erp-builder, opencv-expert |
| `upgrade-cycle-capture-standards` | Where the inspector fits in PUM and PeopleTools cycles; capture rules (same browser, zoom, resolution, theme, test user) so screenshots are comparable | peoplesoft-admin-psa, erp-functional-analyst, erp-test-lead, ux-designer-apple-hig |
| `role-based-security-testing` | Role and permission-list scenarios, the "appears/disappears for a role" check, the limits of visual evidence (does not prove authorization) | erp-security-admin, erp-functional-analyst, erp-test-lead |
| `uat-evidence-traceability` | Run metadata fields, report layout, sign-off criteria, keeping evidence consistent for QA and audit | erp-test-lead, erp-business-analyst, frontend-engineer, indexeddb-expert |
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
| indexeddb-expert | indexeddb-library, reset-app-data, ignore-zones-masking, devtools-verification, uat-evidence-traceability, knowledge-first, peer-review |
| ui-designer-apple-liquid-glass (Sable) | apple-liquid-glass-styling, apple-hig-ux, accessibility-wcag, canvas-comparison-views, knowledge-first, peer-review |
| ux-designer-apple-hig (Wren) | apple-hig-ux, accessibility-wcag, ignore-zones-masking, peoplesoft-page-anatomy, upgrade-cycle-capture-standards, knowledge-first, peer-review |
| frontend-engineer | canvas-comparison-views, wasm-worker-runtime, indexeddb-library, reset-app-data, ignore-zones-masking, apple-liquid-glass-styling, apple-hig-ux, accessibility-wcag, uat-evidence-traceability, knowledge-first, peer-review |
| mock-erp-builder | mock-erp-fixtures, privacy-no-real-data, peoplesoft-page-anatomy, peoplesoft-change-catalogue, erp-test-scenarios, knowledge-first, peer-review |
| qa-tester | devtools-verification, opencvjs-diff-pipeline, screenshot-alignment, cv-mat-memory-hygiene, indexeddb-library, reset-app-data, mock-erp-fixtures, accessibility-wcag, privacy-no-real-data, erp-test-scenarios, knowledge-first, peer-review |
| release-docs-engineer | netlify-static-deploy, privacy-no-real-data, knowledge-first, peer-review |
| erp-business-analyst | erp-business-case-metrics, uat-evidence-traceability, knowledge-first, peer-review |
| erp-functional-analyst | peoplesoft-page-anatomy, erp-test-scenarios, upgrade-cycle-capture-standards, role-based-security-testing, knowledge-first, peer-review |
| peoplesoft-developer | peoplesoft-change-catalogue, peoplesoft-page-anatomy, knowledge-first, peer-review |
| peoplesoft-admin-psa | upgrade-cycle-capture-standards, peoplesoft-change-catalogue, knowledge-first, peer-review |
| erp-security-admin | role-based-security-testing, privacy-no-real-data, knowledge-first, peer-review |
| erp-test-lead | uat-evidence-traceability, erp-test-scenarios, erp-business-case-metrics, upgrade-cycle-capture-standards, role-based-security-testing, knowledge-first, peer-review |

---

## Working agreement

- **Parallel where independent:** after the orchestrator's plan, `opencv-expert`, `indexeddb-expert`, `mock-erp-builder` and Wren can start at once. `wasm-expert` defines the worker message protocol early, so everyone builds against it.
- **ERP team goes first:** the business analyst, functional analyst, PeopleSoft developer and PSA produce the scenarios, the page catalogue, the change catalogue and the capture standards. `mock-erp-builder` builds from those, and `erp-test-lead` defines the run metadata that `indexeddb-expert` stores.
- **Peer-review pairs (proposed):** opencv ↔ wasm, indexeddb ↔ frontend, Sable ↔ Wren, mock-erp ↔ qa, release-docs ↔ orchestrator. ERP pairs: functional analyst ↔ mock-erp-builder (page realism), PeopleSoft developer ↔ opencv-expert (change catalogue vs. detected regions), business analyst ↔ test lead (requirements vs. evidence), security admin ↔ qa-tester (privacy audit), PSA ↔ Wren (capture-standards UX).
- **Definition of done:** every `samples/manifest.json` pair produces its expected PASS/FAIL. Data persists after refresh. Reset app data works and is visible in DevTools. Network is quiet after load. No Mat leak over 20 runs. The app is live on Netlify.
- **Model choice and personalities** are set in Step 8 (`docs/agent-brains.md`).

## Sources

- Course final guide (required agents, designer names, repo layout): https://cvfinal-doc-scanner.netlify.app/guide/
- Research index for this project: [docs/README.md](README.md)
- Claude Code subagents: https://docs.claude.com/en/docs/claude-code/sub-agents
- Claude Code skills: https://docs.claude.com/en/docs/claude-code/skills

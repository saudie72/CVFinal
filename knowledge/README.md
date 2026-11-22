# Knowledge folders

Every agent in `.claude/agents/` has `knowledge/<agent-name>/` with:
- `docs/`: reference notes taken from official documentation, each with its **source link** at the top.
- `examples/`: 2–3 small worked examples that show what good looks like, plus a `README.md` with the **verified results**.

Agents read their whole folder **before answering** and prefer it over memory (see "Before you answer" in each agent file). You can add your own files to any folder later.

| Agent | Main sources | Runnable examples |
|---|---|---|
| [opencv-expert](opencv-expert/) | docs.opencv.org (usage, basic ops, Canny, contours, geometric transforms, thresholding) | diff regions, shapes, alignment: **run in real OpenCV.js 4.13** and in Python OpenCV |
| [wasm-expert](wasm-expert/) | MDN WebAssembly, webassembly.org, W3C Wasm Web API, MDN Workers | streaming + MIME, Memory grow, worker transfer + watchdog |
| [indexeddb-expert](indexeddb-expert/) | MDN Using IndexedDB, Storage API, Chrome DevTools IndexedDB | open/upgrade/CRUD, Blobs + quota, blocked + reset |
| [ui-designer-apple-liquid-glass](ui-designer-apple-liquid-glass/) | Apple HIG Materials, Color, Accessibility; WCAG | token contrast check, status pill |
| [ux-designer-apple-hig](ux-designer-apple-hig/) | Apple HIG Feedback, Progress indicators, Accessibility | state table, flow and copy, ignore-zone interaction |
| [frontend-engineer](frontend-engineer/) | MDN Canvas, ARIA live regions, range input, modules | region boxes + list, overlay slider |
| [mock-erp-builder](mock-erp-builder/) | Oracle PeopleBooks (page design, Fluid, Classic Plus), Playwright | before/after Timesheet → capture → diff |
| [qa-tester](qa-tester/) | Chrome DevTools docs, WCAG, Lighthouse | smoke test (no network after load, offline), defect report |
| [release-docs-engineer](release-docs-engineer/) | Netlify file-based config and headers | netlify.toml validation, link checker |
| [meta-agent](meta-agent/) | Claude Code subagents and skills docs | team linter |
| [orchestrator](orchestrator/) | Claude Code subagents, course guide | wave plan, handoff, conflict decision |
| [erp-business-analyst](erp-business-analyst/) | Business case, PeopleBooks (PTF, PUM) | user stories, pilot metrics |
| [erp-functional-analyst](erp-functional-analyst/) | PeopleBooks (Fluid/Classic, page design) | scenarios, page catalogue |
| [peoplesoft-developer](peoplesoft-developer/) | PeopleBooks (Application Designer, PeopleCode Field class, Fluid) | change catalogue, region explainer |
| [peoplesoft-admin-psa](peoplesoft-admin-psa/) | PeopleBooks (PUM, Change Assistant) | capture standard, cycle runbook |
| [erp-security-admin](erp-security-admin/) | PeopleBooks (security basics, permission lists, roles) | role scenario, privacy audit |
| [erp-test-lead](erp-test-lead/) | PeopleBooks (PTF) | evidence record + validator, sign-off criteria |

**Re-run every check:** `bash tools/verify-knowledge/run_all.sh`. Results are in [VERIFICATION.md](VERIFICATION.md).

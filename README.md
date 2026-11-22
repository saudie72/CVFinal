# ERP Visual Regression Inspector

Compare a page before and after a PeopleSoft update, and see exactly what changed on screen. The app runs entirely in your browser (OpenCV.js on WebAssembly). The demo data is fictional and labelled "Demo ERP (fictional)". Built for the CAI 2840 Computer Vision final.

It is a **supplemental QA tool, not a replacement for functional or security testing.** A visual diff can show that a field or button appeared or disappeared for the tested role. It does not prove that authorization is correct. See [docs/business-case.md](docs/business-case.md).

**Live app:** https://cvfinal-erp-inspector.netlify.app/ · **Repo:** https://github.com/saudie72/CVFinal

**Try it in 30 seconds:** open the live app → **Getting started** → **Start the walkthrough** (or pick an example and click **Open example**). The Timesheet example should FAIL with 2 changes: the moved Submit toolbar and the cut-off Reported Hours column.

---

## Features

- **Getting started**: a 5-step guided walkthrough (before → after → changes found → decide → save) and a **Try an example** dropdown with 8 demo before/after pairs, each with a one-sentence story and what to expect.
- **My pages**: a **"Which PeopleSoft page are you testing?"** library dropdown (PeopleSoft 9.2 HCM and FSCM modules and pages, named as in PeopleBooks, e.g. *Time & Labor – Timesheet*). It filters your saved pages and starts a new comparison. Each saved page shows its latest result (PASS/FAIL, date, decided/signed off).
- **Changes in plain words**: each change is a card such as "Change 1 of 2 · middle left of the page · large block", with Before/After crops, a likely cause, and a two-way link to its numbered box on the screenshot. Pixel numbers are only under Details.
- **Decisions explained**: Expected (meant to change), Regression (a defect; blocks sign-off), Noise (not a real change). Nothing is pre-selected; "Not sure? Choose Regression and add a note."
- **Alignment**: a page shifted by a few pixels is lined up first ("The After screenshot was 3 pixels lower; the inspector lined them up automatically").
- **Ignore zones**: hide clocks, user names and session IDs — draw one, type it, or one click on "Add suggested ignore zone". Zones are saved per page.
- **Four views**: Outlined changes, Side by side, Slide to compare and Heat map.
- **Evidence and sign-off**: test case ID, ticket, tool version, business unit, role and tester; sign-off is blocked while any change is a Regression; the baseline can be promoted only after sign-off. Export JSON/CSV or print a report.
- **Reset app data** in Settings: deletes all pages, zones and runs after a confirmation (visible in DevTools → Application → IndexedDB).
- **[How it works](how-it-works.html)** (including **Who built this** and **Try it with real PeopleSoft screenshots**) and **[Resources](resources.html)** pages.

## How it works

- **OpenCV.js 4.13.0** is self-hosted at `vendor/opencv/4.13.0/opencv.js`. It does the comparison: alignment, absolute difference, threshold, contours, SSIM and heatmap.
- It runs in a **Web Worker** (`inspector.worker.js`), so the page does not freeze while a comparison runs.
- It uses **WebAssembly**. Every `cv.Mat` is deleted after use, and a 20-run check kept the heap flat.
- Your library is stored in **IndexedDB** (database `erpinspector`: pages, ignoreZones, runs, settings). Nothing is uploaded.
- After the page has loaded there are **no network calls**: no CDN, no analytics, no third-party scripts. Full walk-through: [how-it-works.html](how-it-works.html).

## Run locally

Requires Python 3. There is nothing to install.

```bash
python3 tools/serve_netlify.py --port 8080
```

Then open **http://localhost:8080**.

- Use `serve_netlify.py`. It applies the same `netlify.toml` headers as Netlify, including the Content-Security-Policy.
- `python3 -m http.server 8080` also works for a quick look, but it skips the headers.
- Do not open the files from `file://`. The worker and the sample fetches need a server.

## Deploy to Netlify

The site is static: no build step, no environment variables, no API keys. Netlify publishes the repo as it is.

1. Go to **app.netlify.com**. Click **Add new site** (the newer UI calls it **Add new project**), then **Import an existing project**.
2. Choose **GitHub** and pick the repository **saudie72/CVFinal**.
3. Branch to deploy: **main**.
4. Build command: leave it **empty**.
5. Publish directory: **`.`** (a single dot).
6. Environment variables: **none**.
7. Click **Deploy**. Every later push to `main` redeploys.

`netlify.toml` at the repo root sets the headers and cache rules. File-based settings override the Netlify UI, and headers are global (they cannot differ by branch). **New top-level HTML pages need their own cache rule in `netlify.toml`.** The `/*` rule sets only the security headers.

Because the publish directory is `.`, Netlify also serves `docs/`, `tools/` and `knowledge/`. They contain only fictional data, and `tools/privacy_audit.py` scans them.

**Verify the live site.** Checked on https://cvfinal-erp-inspector.netlify.app/ (headless Chromium): headers and CSP present, OpenCV ready in about 3 s inside `inspector.worker.js`, the Timesheet example FAILs with 2 changes, `erpinspector` (4 stores) survives a refresh, 0 requests to other sites.

1. Headers: `curl -I https://<your-site>.netlify.app/`. Expect `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and `Permissions-Policy`.
2. Open the site in Chrome. Go to **Getting started**, pick an example and click **Open example**.
3. DevTools → **Application** → **IndexedDB** → `erpinspector`. After a compare and a save, the stores should hold your data. Refresh the view to update it.
4. DevTools → **Network**. After the page is ready, no new requests should appear. No network is needed after load.

Sources: [docs/11-netlify-hosting.md](docs/11-netlify-hosting.md), [knowledge/release-docs-engineer/docs/01-netlify-config-and-headers.md](knowledge/release-docs-engineer/docs/01-netlify-config-and-headers.md), [netlify.toml](netlify.toml).

## Verify

The test commands from [CLAUDE.md](CLAUDE.md). The results are from the final QA run in [docs/qa-report.md](docs/qa-report.md), 2026-11-22.

| Command | What it checks | Latest result |
|---|---|---|
| `node tools/app-smoke/run.js` | The whole app in headless Chromium under the real CSP | 32/32 pass |
| `node tools/cv-test/run.js` | Comparison pipeline on every sample, plus the 20-run leak check | 22/22 pairs as expected; 1,920/1,920 Mats freed; heap flat |
| `node tools/worker-test/run.js` | Worker and client: readiness, watchdog, heap, CSP | Exit 0, all green |
| `node tools/db-test/run.js` | `js/db.js`: CRUD, blocked upgrade, reset with other tabs open | 32/32 pass |
| `node tools/qa/run_qa.js` | Final real-browser QA | 94 of 95 pass. QA-001 (a table that overflows at 375 px on How it works) was open at the QA run. The code now wraps that table, but the retest is not yet recorded |
| `python3 tools/privacy_audit.py` | No real data, logos, third-party hosts or network calls | Clean: 0 findings, 4 known warnings |
| `python3 tools/contrast_check.py` | WCAG contrast of every text and background pair | 208/208 pass |
| `python3 tools/validate_evidence.py` | Evidence JSON against the evidence standard | Exported run is VALID |
| `bash tools/verify-knowledge/run_all.sh` | Knowledge examples and the team lint | Not all green: 3 Python examples skipped (Playwright not installed on the QA machine), and 2 other sub-failures explained in the QA report. None is an app defect |

## Project structure

```
.
├── index.html              the app: Library, Compare, Result, History, Settings
├── how-it-works.html       walk-through of the method
├── resources.html          links and references
├── inspector.worker.js     Web Worker that loads OpenCV.js once
├── js/                     app, database, worker client, views, hints, report
│   └── cv/                 align, SSIM, heatmap and pipeline (compare())
├── css/app.css             design tokens and styles
├── vendor/opencv/4.13.0/   self-hosted OpenCV.js (sha256 pinned)
├── samples/                8 before/after pairs (PNG) and manifest.json
├── demo-erp/               fictional ERP pages that produced the samples
├── netlify.toml            publish ".", no build, headers and cache rules
├── tools/                  tests, audits and the local server
├── docs/                   research, specs, build records and reports
├── knowledge/              per-agent knowledge folders
└── .claude/                agents and skills for the project team
```

## The agent team

The project was built by 17 AI subagents, coordinated by the orchestrator (Atlas). Honest note on how: in Step 9 the Claude Code session took the orchestrator role itself (Atlas), because subagents can't start other subagents, and launched each expert as a subagent with its own agent file, model and knowledge folder; in the later feedback rounds the experts ran as the project's own agent types (`.claude/agents/*`). Every handoff and review is logged either way. Each agent has a name, a model and a personality, set in `docs/agent-brains.md`. The full roster is in `docs/expert-roster.md`. The table below is built from [docs/handoff-log.md](docs/handoff-log.md), where the row numbers are given.

| Agent | Name | Model | What they built | Review trail |
|---|---|---|---|---|
| orchestrator | Atlas | opus | Build plan, handoff log, routing and decisions; vendored OpenCV.js 4.13.0 | Reviewed Piper's `netlify.toml` (APPROVE, row 75) |
| opencv-expert | Iris | opus | `js/cv/*` comparison pipeline; `docs/cv-pipeline-notes.md` | Reviewed Volt's worker (APPROVE with minors, row 79). Reviewed by Volt (APPROVE, row 86) |
| wasm-expert | Volt | opus | `inspector.worker.js`, `js/worker-client.js`; `docs/worker-notes.md` | Reviewed Iris's pipeline at the worker boundary (APPROVE, row 86). Reviewed by Iris (row 79) |
| indexeddb-expert | Ledger | sonnet | `js/db.js` (`erpinspector` v1, Reset app data); `docs/db-notes.md` | Reviewed Juno's database use (APPROVE with 3 majors, row 60). Reviewed by Juno (row 54) |
| ux-designer-apple-hig | Wren | sonnet | `docs/design/ux-flows.md`: 14 states, copy, HTML skeletons | Reviewed Sable's CSS (REQUEST CHANGES, then APPROVE, rows 41 and 44) |
| ui-designer-apple-liquid-glass | Sable | sonnet | `css/app.css`: tokens, glass on chrome only, opaque evidence | Revised after Wren's review (rows 43, 56) |
| frontend-engineer | Juno | sonnet | `index.html`, `how-it-works.html`, `resources.html`, `js/app.js` and modules | Reviewed Ledger's database module (row 54). Tess's evidence review: REQUEST CHANGES, then APPROVE (rows 58, 63) |
| mock-erp-builder | Mason | sonnet | `demo-erp/` (8 fictional pages), `samples/` (8 pairs, 16 PNGs), `manifest.json` | Reviewed by Riley (APPROVE, row 52) and Quinn (APPROVE, QA report section 5) |
| qa-tester | Quinn | sonnet | `docs/qa-report.md`, `tools/qa/` | Reviewed Mason's samples (APPROVE) |
| erp-business-analyst | Morgan | sonnet | `docs/erp/user-stories.md` (16 stories), `docs/erp/demo-story.md` | Demo story aligned to the measured results (rows 73, 78). No separate review logged |
| erp-functional-analyst | Riley | sonnet | `docs/erp/test-scenarios.md`, `docs/erp/page-catalogue.md` | Reviewed Mason's pages (APPROVE, row 52) |
| peoplesoft-developer | Dex | sonnet | `docs/erp/change-catalogue.md` (CC-01 to CC-14), `js/region-hints.json` | Reviewed Iris's regions against the planted changes (APPROVE, row 71) |
| peoplesoft-admin-psa | Hal | haiku | `docs/erp/capture-standards.md` (capture rules, full-page 1366x900) | No review logged |
| erp-security-admin | Vera | sonnet | `docs/erp/security-scenarios.md`, `tools/privacy_audit.py`, `docs/security-audit.md` | Audit APPROVE (row 88) |
| erp-test-lead | Tess | sonnet | `docs/erp/evidence-standard.md`, `tools/validate_evidence.py` | Reviewed the evidence form (REQUEST CHANGES, then APPROVE, rows 58, 63) |
| release-docs-engineer | Piper | haiku | `netlify.toml`, `tools/serve_netlify.py`, link checks (row 74), this README | Reviewed by Atlas (APPROVE, row 75) |
| meta-agent | Forge | sonnet | `CLAUDE.md`, skills, agent files, docs index; team lint | Drift fixes and team lint (row 94). No separate review logged |

**How work moved between experts.** Atlas ran the work in waves. Experts never called each other. Every handoff went through Atlas, and each one is logged in [docs/handoff-log.md](docs/handoff-log.md). Some key handoffs:

- **Capture standard to samples** (rows 15 to 16): Hal's capture standard led Atlas to choose full-page 1366x900 PNG captures.
- **Change catalogue to hints** (rows 18, 68 to 72): Dex's change catalogue became the region-hint rules. Dex's review then replaced the reflow rule with a size-based one.
- **Evidence standard to the app** (rows 23 to 25, 58 to 63): Tess's evidence fields reached Ledger's run record and Juno's sign-off screen. Tess's blocker (decisions edited after promotion) was fixed before approval.
- **Security finding to hosting** (rows 38 to 39): Volt found that OpenCV.js needs `'unsafe-eval'` in the CSP. It stayed in `netlify.toml`.
- **Atlas's decisions:** region decisions are Expected, Regression or Noise (row 24). Load sample does not apply zones automatically (row 33). The 1.1x zoom sample is an expected FAIL, a capture-standard violation demo, rather than a loosened pipeline (rows 76 to 77).

### Feedback rounds after the first deploy (handoff-log rows 104–148)

After the owner tried the live app ("not user friendly … what does *Region 1 of 4: 105 by 154 pixels at 702, 338* mean to a user?"), Atlas ran three more rounds through the same team:

| Round | Who | What changed |
|---|---|---|
| Plain language | Morgan (business analyst), Wren (UX) | Plain definitions, user stories US-17–US-22, the first-use design (purpose sentence, guided demo, change cards in words, decision help, next-step strip) |
| Samples & PeopleBooks | Mason, Riley | Human sample names, stories and expectations; the PeopleSoft 9.2 page catalog (`js/ps-catalog.json`); a try-it-locally guide with public PeopleBooks links (no Oracle images committed) |
| Build & polish | Juno (front end), Sable (UI) | Landing → Getting started tab, example and module dropdowns, My pages as a work list, card ↔ box link, crops, tour on phones, visual polish (contrast 440/440 pairs) |
| Fixes found by QA | Quinn → Juno, Sable | "Try an example" failures (in-flight compare, old page names), tour off-screen on phones, Save result not shown at step 5, small a11y items. Final QA: READY (230/230 checks); smoke 98/98 |

## Docs and research

- [docs/README.md](docs/README.md): index of every doc.
- [docs/business-case.md](docs/business-case.md): the problem, use cases, value estimate and data rules.
- [docs/erp/](docs/erp/): ERP specs: user stories, test scenarios, page catalogue, change catalogue, capture standards, security scenarios and the evidence standard.
- [docs/cv-pipeline-notes.md](docs/cv-pipeline-notes.md): how `compare()` works and its results on every sample.
- [docs/worker-notes.md](docs/worker-notes.md): the worker protocol, limits and measurements.
- [docs/db-notes.md](docs/db-notes.md): the `erpinspector` schema and API.
- [docs/qa-report.md](docs/qa-report.md): the final QA report.
- [docs/security-audit.md](docs/security-audit.md): the privacy and security audit.
- [docs/build-plan.md](docs/build-plan.md) and [docs/handoff-log.md](docs/handoff-log.md): the build record.
- [docs/agent-brains.md](docs/agent-brains.md) and [docs/expert-roster.md](docs/expert-roster.md): the agent team.
- [resources.html](resources.html): links to the sources used, in the app.

## Known limits

- **Browser:** tested only in Chromium (Playwright's bundled build 157, not branded Google Chrome). Safari and Firefox are untested.
- **Live site:** verified (see above). Netlify injects its free-tier "Powered by Netlify" badge script into every page; our CSP blocks its inline code, which shows as console errors that are not from the app. Turn the badge off in Netlify (Project configuration → General) to remove them.
- **Offline:** there is no offline start. A reload with no network fails, because there is no service worker. Once the page has loaded, no network is needed.
- **Not run:** Lighthouse, the 200% zoom check, the reduced-motion check and the storage-quota case.
- **Image size:** images over 16 MP are rejected with a message. The worker is recycled when its heap passes 512 MiB.
- **CSP:** `'unsafe-eval'` must stay in `script-src`, because OpenCV.js builds wrappers with `new Function`.
- **Alignment:** handles shifts and simple resizes. A 1.1x zoom capture is a documented limit, and it is flagged as a capture artifact rather than fixed.
- **Hint rules:** tuned on the 8 demo samples only. Not yet checked on real screens.
- **Authorization:** a visual diff cannot prove that access control is correct. Role tests are needed (see [docs/erp/security-scenarios.md](docs/erp/security-scenarios.md)).
- **Data:** fictional data only. Do not load real screenshots.

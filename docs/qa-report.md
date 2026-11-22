# QA report: ERP Visual Regression Inspector (wave D)

Tester: **Quinn** (qa-tester). Date: 2026-11-22.

**Environment:** Chromium 157.0.8103.78 (Playwright 1.63, headless, bundled build; not branded Google Chrome), Node v22.23.5, Linux. App served by `python3 tools/serve_netlify.py --port 8107`, which applies the `netlify.toml` headers including the CSP (no inline script or style). Fresh browser context per section, so each starts with an empty IndexedDB. Viewport 1366x900 unless stated, deviceScaleFactor 1. The server was stopped after the run.

**Re-run everything:** `node tools/qa/run_qa.js` (about 70 s, starts and stops its own server on 8107; `QA_ONLY=3,5` runs selected sections) and `bash tools/qa/run_suites.sh` (the existing suites, one at a time; log in `tools/qa/suites.log`). Results of the last run are in `tools/qa/qa-results.json`.

## VERDICT: READY for release

Every definition-of-done item in `CLAUDE.md` passed in a real browser. The one failing automated check is a cosmetic layout defect (QA-001, a table that overflows on `how-it-works.html` at 375 px). I do not consider it a release blocker; Juno should fix it, and I will retest in one command. No defect touches privacy, correctness, persistence or the pipeline.

Two things I could not do here are listed as unverified in section 6 (Lighthouse score, the 200% zoom and reduced-motion passes).

## 1. Summary

| Result | Count |
|---|---|
| Automated checks run (`run_qa.js`) | 95 |
| PASS | 94 |
| FAIL | 1 (QA-001) |
| Info records (evidence only) | 6 |
| Existing suites | 8 of 9 green; `run_all.sh` 5 sub-failures, all explained in section 4 (none is an app defect) |

## 2. Check table (pass or fail, with evidence)

Ids match `tools/qa/run_qa.js` and `tools/qa/qa-results.json`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Every manifest pair, through the real UI (Load sample) | **PASS** (8/8) | tl-timesheet FAIL 2 regions (min 2); hcm-job-data FAIL 3 (min 2); hcm-personal-data FAIL 4 (min 2); fscm-voucher FAIL 4 (min 1); fscm-po FAIL 1 region, "under 0.1% of page" (min 1); shifted PASS 0 regions (max 0); zoom110 FAIL 25 regions, "Aligned: shift (0, 0), scale 0.91"; identical PASS 0 (max 0). Fresh profile starts in `ready-empty`; the select lists all 8 entries |
| 1a | fscm-po: Add suggested ignore zone, Compare again | **PASS** | FAIL then PASS, 0 regions, "Ignored: 1 zone (0.238% of page)" |
| 1b | Shifted pair shows "Aligned: shift (0, 3)" | **PASS** | exact text; PASS with 0 regions |
| 1c | zoom110 FAIL with the capture-artifact hint | **PASS** | the hint reads "Likely: Capture or rendering artifact. Many small regions wi...". The brief says "Likely capture artifact"; the app's wording is "Capture or rendering artifact" (same meaning, not a defect) |
| 2 | Zones drawn by mouse drag | **PASS** | drag from 10%,10% to 30%,15% of the thumbnail opened the dialog pre-filled x 137, y 90, w 274, h 46 (expected about 137, 90, 273, 45); focus lands in Label; empty label rejected inline; zone listed |
| 2a | Zones through the keyboard and numeric form | **PASS** | Enter on "Add zone manually", typed label, Tab through X/Y/W/H, Enter: "Keyboard zone, 120 by 30 pixels at 400, 500". Out-of-bounds gives "That zone extends past the baseline (1366 by 900 pixels). Reduce X or Width."; Esc returns focus to the opener; summary "2 zones ignored (1.3% of page)" |
| 2b | Zones are applied by Compare and stored | **PASS** | Result stat "Ignored: 2 zones (1.318% of page)"; `ignoreZones` has 2 rows after a reload |
| 2c | Alignment works | **PASS** | see 1b (a +3 px shift is aligned and is not reported as a change) |
| 3 | IndexedDB `erpinspector` structure | **PASS** | `indexedDB.databases()` gives `erpinspector@v1`; an open shows stores `ignoreZones, pages, runs, settings` |
| 3a | Pages, zones and runs survive a reload | **PASS** | counts before and after reload identical (pages 1, runs 1; zones 2 in section 2); Library lists the page; History shows the run (Not signed off, evidence ids visible) |
| 3b | Exported run passes the validator | **PASS** | `tools/validate_evidence.py` reports VALID for the exported JSON (`tools/qa/qa-export-run.json`) |
| 4 | Reset app data: dialog | **PASS** | title "Reset app data?", default focus on Cancel, Cancel keeps the data |
| 4a | Reset: confirm, done, empty after reload | **PASS** | "App data deleted", `pages, runs, ignoreZones` all 0 immediately and after reload; Library shows the empty state; samples still load. `settings` keeps one row (the `engineSeen` flag, not user data) |
| 4b | Reset with a second app tab open | **PASS** (note below) | The second app tab closes its connection on `versionchange`, so the reset finishes at once and that tab shows "The library was reset in another tab. Reload this page." |
| 4c | Truly blocked path (a tab holds the DB open and ignores `versionchange`) | **PASS** | dialog shows "Close other tabs of this app to finish the reset.", no done state, the button stays enabled; when the other tab closes its connection the reset completes by itself ("App data deleted") |
| 5 | Network quiet after ready (Load sample plus Compare x3) | **PASS** | After "ready" the only requests were `/samples/tl-timesheet_before.png`, `/samples/tl-timesheet_after.png` and one `blob:` URL (in-memory thumbnail, not network). 3 s idle afterwards: 0 requests |
| 5a | 0 cross-origin requests ever | **PASS** | 0 across the whole session, and across all 20 pages in check 8 |
| 5b | Initial load requests (listed for the record) | info | 19 same-origin: index.html, css/app.css, 9 files in js/, inspector.worker.js, vendor/opencv/4.13.0/opencv.js, samples/manifest.json, js/region-hints.json, js/cv/{align,ssim,heatmap,pipeline}.js |
| 6 | Heavy work off the main thread | **PASS** | 5 compares (about 410 to 515 ms each, click to result): max requestAnimationFrame gap 33 ms (16.7 ms is one frame at 60 Hz), **0 long tasks** (PerformanceObserver `longtask`), also 0 during Load sample |
| 7 | No Mat leak over 20 runs | **PASS** | On a dedicated `createInspector` (the app does not expose its own), `heap()` after each of 20 compares (alternating with and without zones): bytes 134,217,728 constant from before the first run to run 20; `_malloc` probe address constant at 7,098,176 from run 1 to run 20 (7,098,160 before the first run). Iris's harness also shows 1,920 of 1,920 Mats freed and a leak control that is detected |
| 8 | Console and CSP on every page | **PASS** | 20 pages (index, how-it-works, resources, demo index, 16 demo before/after pages): 0 console errors or warnings, 0 page errors, 0 `securitypolicyviolation` events, all HTTP 200; `favicon.svg` 200 (no QA-001-style favicon 404) |
| 9 | Keyboard-only: Load sample, result, decisions, Save, Sign off | **PASS** | Tab reaches Load sample (9 stops); Enter gives the result; focus goes to `#result-status`; Tab + Space marks each region; Enter on Save run, typed the 4 evidence fields, "Saved as run 1"; Sign off by keyboard works |
| 9a | Visible focus | **PASS** | all 9 Tab stops on the Library have a 2 px or larger outline or shadow |
| 9b | Tabs, slider, radios | **PASS** | ArrowRight, End, Home move and activate tabs (Side-by-side, Heatmap, Boxes); slider Home 0, End 100, `aria-valuetext` "Showing 100% after, 0% before"; arrows switch radios |
| 9c | aria-live announcements | **PASS** | the pill is `role=status aria-live=polite`, `#announcer` is polite. Captured: "Comparison finished. FAIL, 2 changed regions, 8.3 percent of page." (exactly once), "Region 2 marked Expected. 2 of 2 reviewed.", the saved announcement. Pill sequence: "Loading OpenCV (10 MB, first visit only)…" then "Ready" |
| 9d | axe-like basics (my own DOM checks; axe-core is not vendored and a CDN is out of bounds) | **PASS** | `lang=en`, 1 main, 1 nav, 1 header, skip link; exactly one visible h1 on each of the 5 screens; every visible button and link named; no `<img>` without alt; every visible canvas labelled; every control labelled; no duplicate ids; every dialog labelled; no `tabindex>0`; every `aria-disabled` button has `aria-describedby`; 0 targets under 44x44 px on the result screen |
| 9e | Wren section 11.1 to 11.4 | **PASS** | Regression keeps Sign off `aria-disabled` with the exact hint "Sign off isn't available while a region is marked Regression. Log a defect, attach the report, and retest after the fix."; all Expected but unsaved: "Save the run first."; after Save, Sign off enabled, Promote disabled ("Sign off first."); after sign-off, Promote enabled |
| 9f | Wren 11.6: duplicate name, storage blocked | **PASS** | duplicate: "A page named “Time & Labor – Timesheet” already exists…", `aria-invalid=true`, Open existing page shown. Storage blocked (`indexedDB` getter throws): `#notice` = `storage-blocked`, sample still compares in memory, 0 page errors |
| 9g | Wren 11.6: quota | not tested | cannot be simulated reliably in headless; unverified (the Ledger and Juno reviews cover the code path) |
| 10 | Layout at 1366 and 375 px, light and dark | **FAIL** (QA-001) | No horizontal scroll on Library, Compare, Result, History, Settings or Resources at 1366 or 375 px, light or dark. **`how-it-works.html` scrolls sideways at 375 px (scrollWidth 432 vs 375)** because its "Capture rules" table is not in `.table-wrap` |
| 10a | Screenshots | **PASS** | 8 PNGs in `docs/qa/screenshots/` (see section 5); viewed result-375-dark and result-1366-dark: readable, nothing clipped, screenshots on opaque panels, hatched and numbered boxes visible |
| 10b | Header links How it works and Resources | **PASS** | at 1366 px (x 642 and 770) and 375 px (the nav wraps to a second row, x 16 and 139, both inside the viewport): one click each, both pages show their h1, link to each other, and the brand link returns to `index.html#/library`. All 16 local links on Resources return 200; all 38 external links have `rel` with `noopener` |
| 11 | Compare with a user-chosen file while the context is offline | **PASS** | after load, `context.setOffline(true)`, `setInputFiles('#candidate-file', samples/tl-timesheet_after.png)`, Compare: FAIL, 2 regions, "Offline — everything still works on this device." shown; 0 network requests. A text file renamed as input gives the friendly "That file isn't a PNG image…" error |
| 11a | Print report | **PASS** | with `window.print` stubbed (counted: 1 call), `#print-report` is filled: h1 "Time & Labor – Timesheet (Time & Labor)", 3 table rows or more, 3 canvases. With `emulateMedia('print')` it is `display:block`, 1366 px wide, and the header and main are `display:none`. `page.pdf()` gives a 140 KB, 2-page PDF whose text contains the evidence fields, "Changed regions" and the disclaimer |
| 13 | Peer review of Mason's samples | **APPROVE** (section 5) | |

## 3. Defects

Format: ID | severity | steps | expected | actual | owner.

### QA-001 | minor | `how-it-works.html` scrolls sideways at 375 px | owner: **frontend-engineer (Juno)**

| Field | Value |
|---|---|
| Steps | 1. `python3 tools/serve_netlify.py --port 8107`. 2. `QA_ONLY=10 node tools/qa/run_qa.js` (check 10.1), or open `http://localhost:8107/how-it-works.html` at 375x812 and look at `document.documentElement.scrollWidth` |
| Expected | No horizontal page scroll at 375 px (Wren's layout rule: 16 px gutter, no horizontal scroll) |
| Actual | `scrollWidth` 432 vs `clientWidth` 375, in light and dark. The `<table class="table">` with caption "Capture rules" (`how-it-works.html` line 75) is 745 px wide and sits directly in the page, not inside `.table-wrap` |
| Evidence | `tools/qa/qa-results.json`, entry 10.1: `{"vw":375,"route":"how-it-works.html","sw":432,"cw":375}`. Every other page and screen passes |
| Suggested fix | Wrap the table: `<div class="table-wrap">…</div>` (the class already exists in `css/app.css` line 446 and is used for the History table) |
| Status | open. Retest: `QA_ONLY=10 node tools/qa/run_qa.js`, expect `PASS [10.1]` |

### Observations (not defects, no action required for release)

| ID | Note | Owner if anyone picks it up |
|---|---|---|
| OBS-1 | After "Add suggested ignore zone" on fscm-po, `#zone-added-note` is empty. The flow still works (the primary button becomes Compare again and the zone is announced), but Wren's section 4 wording ("Zone '…' added. Compare again to apply it.") is only shown for the from-region path. I did not check that note on the from-region path | Juno |
| OBS-2 | The brief wording "Likely capture artifact" differs from the app's "Likely: Capture or rendering artifact" | none (the app copy is fine) |
| OBS-3 | The reset with a second app tab: the other tab shows the notice under the `storage-blocked` state ("The library was reset in another tab. Reload this page."). Works as designed | none |

## 4. Existing suites (run one at a time with `bash tools/qa/run_suites.sh`)

| Suite | Result |
|---|---|
| `node tools/app-smoke/run.js` (own server, port 8106) | **PASS**: ALL 32 CHECKS PASSED |
| `node tools/app-smoke/hints.test.mjs` | **PASS** (exit 0; 8/8 per Juno's log) |
| `node tools/cv-test/run.js` | **PASS**: 22/22 pairs as expected; leak check FLAT; negative control detected |
| `node tools/worker-test/run.js` | **PASS**: exit 0 (all checks green in `tools/qa/suites.log`) |
| `node tools/db-test/run.js` | **PASS**: 32/32 checks (including "blocked upgrade" and "reset resolves {blocked:true}, then completes once the other tab closes") |
| `python3 tools/privacy_audit.py` | **PASS**: PRIVACY AUDIT CLEAN, 0 findings, 4 warns, 61 info (the known warns in `docs/security-audit.md`) |
| `python3 tools/contrast_check.py` | **PASS**: 208/208 token pairs, all four themes (light, dark, and both with contrast-more) |
| `python3 tools/validate_evidence.py` on an exported run | **PASS**: `tools/qa/qa-export-run.json: VALID` |
| `bash tools/verify-knowledge/run_all.sh` | **5 sub-failures, none an app defect** (below). Passed: python mirror, liquid-glass contrast example, evidence example, team lint (17 agents, 26 skills, TEAM OK) |

`run_all.sh` sub-failures:
1. `run_browser_examples.py`, `capture_and_verify.py` and `ex1_qa_smoke.py` (3 failures): **skipped, environment**. They `import playwright` for **Python**, which is not installed here (only the Node package). The same behaviour is covered by the Node equivalents above (cv-test, worker-test, db-test, run_qa.js sections 5 and 8). Run them where `pip install playwright` is available.
2. `validate_examples.py`: "links in docs/README.md: broken ['qa-report.md']". This was missing only because this report did not exist yet. It now resolves (retest: `python3 -I knowledge/release-docs-engineer/examples/validate_examples.py`; I did not re-run it after writing this file).
3. `ex2_privacy_audit.py` (the older, naive knowledge example) reports 7 "findings": the keyword list inside `tools/privacy_audit.py` itself, and random 20-letter strings in the minified, sha256-pinned `vendor/opencv/4.13.0/opencv.js` that look like AWS key ids. These are false positives. The project's own `tools/privacy_audit.py` excludes `vendor/` (pinned by hash) and its own pattern list, and is clean. Suggest Forge or Vera either point this example at `tools/privacy_audit.py` or give it the same exclusions.

## 5. Peer review of Mason's samples (mock-erp-builder, qa-tester pair): **APPROVE**

Method: read each PNG's size and mode with PIL, diffed every before/after pair with OpenCV (max-channel difference above 30, dilated, connected components), and looked at `tl-timesheet`, `hcm-job-data_after` and `fscm-voucher_after` by eye (plus the Result screenshots). I did not view all 16 images by eye; Vera's audit did (`docs/security-audit.md` section 5).

| Standard | Finding |
|---|---|
| 1366 wide, 1366x900, PNG, RGB, no metadata | All 16 files are 1366x900 RGB PNG, 69 to 110 KB, no embedded metadata. The only exception is `hcm-job-data-zoom110_after.png` at **1503x990**, on purpose (1.1x device scale; the manifest note says so) |
| Fictional | Every page header says "Demo ERP (fictional)" with a TEST badge; "Jordan Rivera", EmplID 000123, "Harbor Office Supply (fictional)", footer "Fictional demo data for a computer vision class project." No logos, no real names, no County or Oracle branding on the three images I viewed. Text scan clean (privacy audit) |
| Planted changes visible | Measured difference boxes: tl-timesheet 2 regions (12,233 774x170 and 13,409 275x23, the same two regions the app reports); hcm-job-data 6 boxes (Save button area, field values, bottom row); hcm-personal-data 4 boxes; fscm-voucher 3 column boxes (the clipped "500.0" amount is visible by eye); fscm-po one 68x18 px box at (1276,75) (242 changed pixels); identical 0; shifted: whole page offset (aligned out by the app) |
| Match the manifest | The app's results equal the manifest expectations for all 8 pairs (check 1) |
| Realism | Pages look like a PeopleSoft-style classic layout (breadcrumb, tabs, grid, action buttons) without copying Oracle assets |

Notes, none blocking: the fscm-po change is deliberately tiny (under 0.1% of the page); the zoom110 pair is a capture-standard violation demo and correctly FAILs with the artifact hint (Atlas decision, handoff-log rows 77 and 84).

## 6. Not covered and unverified

- **Lighthouse accessibility score (target 90 or more):** not run. Lighthouse is not installed here and I did not fetch it. My DOM checks, the keyboard pass and Sable's 208/208 contrast run stand in for it. Unverified.
- **200% zoom and reduced-motion passes** (`knowledge/qa-tester/docs/02-accessibility-testing.md` steps 4 and 5): not run in this pass. The 375 px layout (equivalent to about 365% zoom on a 1366 screen) passes except QA-001.
- **Quota exceeded and Chrome incognito with site data blocked:** quota not simulated; "blocked" was simulated by making `indexedDB` throw, not with a real incognito window.
- **Google Chrome:** tested on Playwright's Chromium 157, not branded Chrome. Playwright's `window.print` was stubbed; the system print dialog was not exercised (the print layout was checked through print media emulation and `page.pdf()`).
- **Live Netlify deployment:** tested only locally with `tools/serve_netlify.py` (same headers). The live site is Piper and Atlas's step.
- **Mat leak control for my own run:** I did not plant a leak in the app (no app edits allowed); the negative control is Iris's `tools/cv-test/run.js`, which caught a deliberate one-Mat-per-run leak (heap growth 134 MB, 128 MiB per step) in this run.

## 7. Files

- `docs/qa-report.md` (this file)
- `tools/qa/run_qa.js`, `tools/qa/run_suites.sh`, `tools/qa/qa-results.json`, `tools/qa/suites.log`, `tools/qa/qa-export-run.json` (the exported run used for the validator)
- `docs/qa/screenshots/` (8 PNGs, 1366 and 375 px, light and dark): `library-empty-1366-light.png`, `result-1366-light.png`, `result-1366-dark.png`, `compare-1366-dark.png`, `how-it-works-1366-light.png`, `result-375-light.png`, `result-375-dark.png`, `resources-375-dark.png`

Sources: `knowledge/qa-tester/` (devtools checks, accessibility testing, ex1 to ex3), `CLAUDE.md` definition of done, `knowledge/VERIFICATION.md`, `docs/build-plan.md`, `docs/design/ux-flows.md` sections 4, 6, 7 and 11, `docs/handoff-log.md`, `docs/security-audit.md`, `docs/worker-notes.md`, `samples/manifest.json`.

## Retest after release fixes (Atlas, 2026-11-22)
- **QA-001 — FIXED.** Juno wrapped the "Capture rules" table in `.table-wrap` and added `<wbr>` break points in the long file-name pattern. `QA_ONLY=10 node tools/qa/run_qa.js` → `[10.1] PASS`.
- **Full re-run:** `node tools/qa/run_qa.js` → **95 passed, 0 failed, 6 info** (72 s).
- **OBS-1:** not a defect. The note fills in after the zone is saved asynchronously (Juno).
- **run_all.sh:** the knowledge privacy example now passes (Vera aligned its exclusions). The 3 remaining sub-failures are the Python-playwright examples, skipped because the Python `playwright` module isn't installed here. The Node suites cover the same behaviour.
- **Verdict:** READY.

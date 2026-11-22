# User stories: ERP Visual Regression Inspector

Owner: Morgan (erp-business-analyst). Source of truth: [docs/business-case.md](../business-case.md). Fictional data only ("Demo ERP (fictional)").

## Positioning (use this wording everywhere)
"A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing."

A visual diff can show that a field or button appeared or disappeared for a tested role. It **does not prove that authorization is correct**.

## Personas
- **Analyst**: functional analyst doing first-pass visual checks after a PUM update, PeopleTools upgrade, customization or configuration change.
- **Test lead**: owns UAT evidence and sign-off.
- **Reviewer**: senior analyst or technical staff who confirms flagged regions.
- **Manager / pilot sponsor**: decides whether to adopt the tool.

## Story map (MoSCoW, mapped to app features)

| ID | Story (short) | MoSCoW | App feature |
|---|---|---|---|
| US-01 | Load a sample pair | Must | Load sample menu (`samples/manifest.json`) |
| US-02 | Compare against a baseline | Must | Compare, PASS/FAIL, numbered region boxes |
| US-03 | Understand what changed | Must | Boxes, heatmap, side-by-side, overlay slider, region table |
| US-04 | Tolerate a shifted capture | Should | Alignment ("Aligned: shift (dx, dy)") |
| US-05 | Ignore dynamic content | Must | Ignore zones (draw, save, reuse per page) |
| US-06 | Record evidence per run | Must | Evidence fields on save-run |
| US-07 | Decide each region | Must | Expected / Regression / Noise per region |
| US-08 | Keep baselines per page | Must | Baseline library (IndexedDB `pages`) |
| US-09 | Revisit past runs | Must | History (IndexedDB `runs`), persists after refresh |
| US-10 | Wipe local data | Must | Reset app data |
| US-11 | Work with nothing leaving the device | Must | Offline-capable, no network calls after load |
| US-12 | Understand and trust the tool | Should | How it works and Resources pages |
| US-13 | Export a report for the ticket | Should | PNG / printable HTML report |
| US-14 | Adjust sensitivity | Could | Settings (threshold %, min area, kernel) |
| US-15 | Collect pilot metrics | Should | Recorded `ms`, review duration, decisions, zone count |
| US-16 | Candidate becomes new baseline after sign-off | Could | Promote to baseline |

Won't (this release): automatic capture inside PeopleSoft, OCR of field values, server-side storage or sharing, proof of authorization or functional correctness.

---

## Must

### US-01 Load a sample pair (Must)
As an **analyst** trying the tool for the first time, I want to load a ready-made before/after pair with one click so that I can see it work without capturing anything.
- **Given** the app has loaded, **when** I open Load sample and choose "Time & Labor – Timesheet", **then** the baseline and candidate images appear and Compare is enabled.
- **Given** I am offline after the first load, **when** I load a sample, **then** it still works (samples are self-hosted).
- **Given** the sample pair has an entry in `samples/manifest.json`, **then** its expected result is the one the QA run checks (Timesheet: FAIL, at least 2 regions).

### US-02 Compare a page against its baseline (Must)
As an **analyst** testing a PUM update, I want to compare a page against its stored baseline so that I spot unintended UI changes in seconds.
- **Given** the Timesheet baseline and the after-change screenshot, **when** I press Compare, **then** I see a FAIL status, the number of changed regions, and numbered boxes. Target: within about 5 seconds (target, to be confirmed by QA and the pilot).
- **Given** the Timesheet pair, **then** the regions include the Submit button that moved below the time-reporting grid and the truncated Reported Hours column.
- **Given** an identical pair (Purchase Order identical), **when** I compare, **then** the result is PASS with 0 regions.
- **Given** the comparison is running, **then** the page stays responsive (work happens in a Web Worker) and shows progress.

### US-03 See what changed (Must)
As an **analyst**, I want several views of the result so that I can judge each change at a glance.
- **Given** a completed comparison, **when** I switch views, **then** I can see boxes, heatmap, side-by-side and an overlay slider on the same aligned images.
- **Given** a FAIL result, **then** a region table lists each region (number, size, position) and selecting a row highlights its box.
- **Given** the views, **then** status is conveyed by text as well as colour (PASS / FAIL label).

### US-05 Ignore dynamic content (Must)
As an **analyst**, I want to mark parts of a page as ignored so that timestamps and similar noise do not fail every run.
- **Given** the Purchase Order pair fails only on "Last updated", **when** I draw an ignore zone over that field and rerun, **then** the result is PASS.
- **Given** I saved the zone, **when** I compare the same page next time, **then** the zone is applied automatically and the report shows the zones used and the % ignored.
- **Given** a zone, **when** I delete or edit it, **then** the next run uses the updated set.

### US-06 Record evidence per run (Must)
As a **test lead**, I want each run saved with consistent evidence so that audit and QA reviews see the same fields every time.
- **Given** I save a run, **then** these fields are required: test case ID (e.g. VR-TL-01), ticket / change ID (e.g. CHG-0042, fictional), tools version / PUM image (free text), tester initials.
- **Given** optional fields (business unit, role, note), **then** I can leave them blank and still save.
- **Given** a required field is empty, **when** I save, **then** I get a clear message naming the field and nothing is saved.

### US-07 Decide each region (Must)
As a **reviewer**, I want to mark every flagged region as Expected, Regression or Noise so that sign-off is deliberate and the pilot can count outcomes.
- **Given** a FAIL run, **then** every region needs a decision before sign-off.
- **Given** all regions are Expected or Noise, **then** the page can pass UAT. Any Regression keeps it open.
- **Given** decisions are saved, **then** they are stored with the run and appear in the report.

### US-08 Keep baselines per page (Must)
As an **analyst**, I want one baseline per page so that every later screenshot is compared with the right reference.
- **Given** I add a baseline for "T&L – Timesheet", **then** it appears in the page library with its ignore zones.
- **Given** I select that page and drop a new screenshot, **then** it is compared with that baseline.

### US-09 Revisit past runs (Must)
As an **analyst**, I want a history of runs so that I can pull up earlier results and evidence.
- **Given** I ran and saved a comparison, **when** I refresh the browser, **then** the run is still listed with status, date and test case ID.
- **Given** I open DevTools > Application > IndexedDB > `erpinspector`, **then** the run appears in the `runs` store.

### US-10 Reset app data (Must)
As an **analyst on a shared machine**, I want one button that wipes everything the app stored so that no screenshots or evidence stay behind.
- **Given** the library has pages, zones and runs, **when** I confirm Reset app data, **then** the stores are empty after the page reloads.
- **Given** I cancel the confirmation, **then** nothing is deleted.
- **Given** a second tab holds the database open, **then** the app handles the blocked delete and tells me what to do.

### US-11 Nothing leaves the device (Must)
As a **test lead handling screenshots that may contain PII**, I want the app to make no network calls after it loads so that data never leaves the analyst's machine.
- **Given** the app is loaded and I clear DevTools > Network, **when** I load images and run three comparisons, **then** the Network list stays empty.
- **Given** the site, **then** it uses no third-party scripts, CDNs or analytics. OpenCV.js is self-hosted.

---

## Should

### US-04 Tolerate a shifted capture (Should)
As an **analyst**, I want screenshots captured with slightly different scroll positions to still compare correctly so that a 3 px offset does not look like a regression.
- **Given** the after-capture is shifted 3 px down, **when** I compare, **then** the status says "Aligned: shift (0, 3)" and the result is PASS if nothing else changed.
- **Given** alignment cannot be found with confidence, **then** the app says so and does not silently report PASS.
- **Given** captures at different zoom, **then** the app tells the analyst to recapture to the capture standard (see `docs/erp/capture-standards.md`).

### US-12 Understand and trust the tool (Should)
As an **analyst, manager or marker**, I want a How it works page and a Resources page so that I can see what the tool does and where its methods come from.
- **Given** I open How it works, **then** I see the pipeline steps (align, diff, threshold, regions, SSIM, heatmap) and the positioning statement above.
- **Given** I open Resources, **then** each link points to an official or public source and opens correctly.

### US-13 Export a report for the ticket (Should)
As a **manager**, I want an exportable report per page so that I can attach it to the change ticket.
- **Given** a saved run, **when** I export, **then** I get a PNG or printable HTML with title, status badge, date/time, evidence fields, baseline and candidate thumbnails, boxes view, region table, ignore zones and % ignored, settings, alignment method and the positioning disclaimer line.

### US-15 Collect pilot metrics (Should)
As a **pilot sponsor**, I want the app to record what a pilot needs so that the County can replace estimates with measurements.
- **Given** a run, **then** the compare time (`ms`), the review duration, the decision per region and the number of ignore zones are stored with it.
- **Given** the pilot sheet (below), **then** every measured column can be filled from stored runs or a stopwatch sample.

## Could

### US-14 Adjust sensitivity (Could)
As a **test lead**, I want to tune threshold %, minimum region area and kernel size per page so that I can reduce noise on pages that need it.
- **Given** I change a setting and rerun, **then** the result updates and the settings used are stored with the run.

### US-16 Promote to baseline after sign-off (Could)
As a **test lead**, I want to promote a signed-off candidate to the new baseline so that the next cycle starts from the approved state.
- **Given** a run is signed off, **when** I choose Promote, **then** the candidate becomes the baseline and the old one is not silently lost (confirmation shown).

---

## Pilot measurement plan (from the business case)

> **The 200 comparisons x 3 min -> 1 min figures are ESTIMATES and assumptions for a pilot, not measured data.**

Estimate arithmetic: 200 x 3 min = 600 min = 10.0 h; 200 x 1 min = 200 min, about 3.3 h; estimated saving about 6.7 h per upgrade cycle.

| Metric | How measured | Estimate | Pilot result |
|---|---|---|---|
| Comparisons per cycle | Count in-scope pages | 200 (assumption) | measure |
| Minutes per comparison, manual | Stopwatch sample (e.g. 20 pages) in the next PUM or PeopleTools cycle | 3.0 (estimate) | measure |
| Minutes per comparison, inspector | App `ms` plus review duration | 1.0 (estimate) | measure |
| Analyst hours saved per cycle | (manual - inspector) x pages / 60 | about 6.7 h (estimate) | calculate |
| True regressions caught | Regions marked Regression and confirmed | n/a | count |
| Missed regressions | Found later in UAT or production on a PASS page | 0 target | count |
| False positives | Regions marked Noise | n/a | count |
| One-time setup | Minutes on ignore zones and thresholds per page | n/a | measure |
| Analyst feedback | Short survey: usability, trust, evidence quality | n/a | collect |

**Decision rule:** adopt if time saved minus setup time is positive over two cycles, and the miss rate is no worse than manual review.

## Traceability to the demo
Each Must story is shown or verifiable in [demo-story.md](demo-story.md). Sample expectations live in `samples/manifest.json` (owner: Mason; the Timesheet entry is FAIL, at least 2 regions).

## Sources
`docs/business-case.md`, `docs/10-mock-erp-demo-plan.md`, `docs/09-chrome-devtools-testing.md`, `.claude/skills/erp-business-case-metrics`, `.claude/skills/uat-evidence-traceability`, `knowledge/erp-business-analyst/` (examples ex1, ex2; Oracle PTF and PUM docs listed in `01-business-case-sources.md`).

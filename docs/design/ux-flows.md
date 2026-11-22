# UX flows, states, copy and HTML skeleton

Owner: Wren (ux-designer-apple-hig). Consumers: Sable (`css/app.css`), Juno (`index.html`, `how-it-works.html`, `resources.html`, `js/*`), Quinn (QA), Atlas (review).
Fictional data only ("Demo ERP (fictional)"). Browser-only, no network calls after load.

Sources: `knowledge/ux-designer-apple-hig/docs/01-feedback.md`, `02-progress-loading.md`, `03-accessibility-interaction.md` (Apple HIG: Feedback, Progress indicators, Loading, Accessibility) and `examples/ex1`..`ex3`; skills `apple-hig-ux`, `accessibility-wcag`, `ignore-zones-masking`, `peoplesoft-page-anatomy`, `upgrade-cycle-capture-standards`, `uat-evidence-traceability`; `docs/build-plan.md`, `docs/04-ignore-zones.md`, `docs/05-visual-outputs.md`, `docs/10-mock-erp-demo-plan.md`, `docs/business-case.md`; ERP specs `docs/erp/capture-standards.md` (section 5, the tip), `docs/erp/evidence-standard.md` (fields, decisions, sign-off), `docs/erp/user-stories.md`, `docs/erp/demo-story.md` (UI labels).

> **UX-2 update:** section 12 ("UX-2 first-use clarity") supersedes this document wherever it conflicts, in particular the Result screen order (section 3), the region card and its template (sections 6 row 6, 7, 8), the stat labels, the status line wording, and the alignment line (D3). Everything else stands.

## 0. Decisions that deviate from, or settle, the inputs

| # | Decision | Why |
|---|---|---|
| D1 | Per-region decision values are **Expected / Regression / Noise** (stored exactly like that). | Atlas correction + `docs/erp/evidence-standard.md`. Also avoids clashing with "ignore zones". |
| D2 | The button that turns a region into an ignore zone is **Add ignore zone**, not "Ignore this region". | The skill wording would sit next to the decision "Noise" and be ambiguous. Pick one. |
| D3 | UI labels follow Morgan: **Load sample**, **Compare**, **Reset app data**, alignment line **"Aligned: shift (dx, dy)"** (e.g. "Aligned: shift (0, 3)"). | `docs/erp/user-stories.md`, `demo-story.md`. |
| D4 | The result summary is announced once, through `#announcer`. The pill returns to "Ready" when a result appears. | The knowledge example puts the summary in the pill; that would announce it twice. |
| D5 | Disabled-looking buttons use `aria-disabled="true"` plus `aria-describedby` to a hint, not `disabled`. | `disabled` buttons can't be focused, so a screen-reader user never learns why. JS must ignore clicks while `aria-disabled="true"`. |
| D6 | Compare progress has 4 steps: Aligning, Finding differences, Measuring regions, Drawing views. There is no "Saving" step. | Compare doesn't save; the save is an explicit step with the evidence form. The knowledge example listed "Saving (4/4)", which no longer fits. |
| D7 | Reset app data does not call `confirm()`/`alert()`; it uses `<dialog id="reset-dialog">`, then shows the done message without reloading. | The skill `reset-app-data` snippet reloads and uses native alerts. The two states `reset-confirm` / `reset-done` need real copy. See handoffs. |

## 1. Screen list

| Route (hash) | Screen | Purpose | In nav |
|---|---|---|---|
| `#/library` (default) | **Library** | Pages with baselines; first-run "Load sample"; New page | Library |
| `#/compare` | **Compare** | Baseline + ignore zones, after-change screenshot, Advanced settings, Compare | Compare |
| `#/result` | **Result** | PASS/FAIL, 4 views, numbered region list with decisions, Save run, Sign off, Promote | (Compare stays current) |
| `#/history` | **Run history** | Saved runs per page, open, delete with undo, export CSV/JSON | History |
| `#/settings` | **Settings** | Storage figures, privacy statement, **Reset app data** | Settings |
| `how-it-works.html` | **How it works** | Pipeline, capture standard, how to read a result, limits | How it works |
| `resources.html` | **Resources** | Official sources and knowledge links | Resources |

How it works and Resources are in the header nav on every page, so each is **one click** away from anywhere.
Unknown hash falls back to `#/library`. `#/result` with no result in memory (e.g. after refresh; results are only kept once saved) redirects to `#/compare` if a page is open, else `#/library`, with no error.
`document.title` = `<Screen> - ERP Visual Regression Inspector`. After a route change, focus moves to that screen's `<h1>` (`tabindex="-1"`), except Result, which focuses `#result-status`.

## 2. Primary flow (first run, one click)

```
Library (empty) --[Load sample]--> fetch samples/manifest.json -> fetch both PNGs
   -> create page + baseline (+ manifest ignoreZones) -> candidate set -> Compare runs automatically
   -> Result (FAIL, Boxes view)  --> decide each region --> Save run (evidence) --> Sign off --> Promote to baseline (Could)
                                  \-> Add ignore zone -> Compare again -> PASS
```

1. The sample `<select id="sample-select">` is filled from `samples/manifest.json`; the first entry ("Time & Labor – Timesheet", the business-case example) is selected, so **one click on Load sample** works.
2. Label per option: `manifest.title` if present, else `module + " – " + page` (e.g. "Time & Labor – tl-timesheet"). Option text must not reveal PASS/FAIL.
3. If the page name already exists in the library (sample loaded before): open that page and compare with the sample's after-image. Do not raise `duplicate-page-name`, and do not touch the stored baseline.
4. Clicking while OpenCV is still loading queues the compare: pill stays "Loading OpenCV…", `#btn-load-sample` gets `aria-busy="true"`, and the compare starts at `ready`.
5. Nothing is saved until **Save run**. Loading a sample creates the page + baseline (that is library data); the run is not stored.
6. Own screenshots: New page (name, module, baseline PNG) -> Compare screen -> drop / paste / choose the after-change PNG -> Compare. Pasting an image (Ctrl+V / Cmd+V) anywhere on Compare is accepted as the after-change screenshot.
7. A baseline is added by: New page, Replace baseline, or Load sample. **Each time**, the capture tip (section 5) appears under the baseline.

## 3. Result screen content (top to bottom)

1. `h1` "Result". `#result-status` (status line, text + icon, never colour only).
2. Stats `<dl id="result-stats">`: Changed (`#stat-changed`, "0.8% of page"), Similarity (`#stat-ssim`, "SSIM 0.962"), Alignment (`#stat-alignment`, "Aligned: shift (0, 3)" or "No alignment needed"), Ignored (`#stat-ignored`, "2 zones (1.4% of page)" or "None"), Compared in (`#stat-ms`, "1.2 s" from the result `ms`), Review time (`#stat-review`, "—" until saved, then "4 min 12 s").
3. View tabs: **Boxes** (default), **Side-by-side**, **Overlay slider**, **Heatmap**. One canvas set visible at a time. Ignore zones are drawn as grey hatching in every view. Heatmap legend text: "Blue: no change. Red: strong change."
4. **Changed regions** list (`#region-list`): numbered, one `<li>` per region, with a decision group (Expected / Regression / Noise), an optional note, and **Add ignore zone**. Heading shows progress: "2 of 3 reviewed".
5. Action bar: one primary (`#btn-result-primary`, `data-action` changes), then secondary: **Download evidence PNG**, **Print report**, **Sign off**, **Promote to baseline**, **Compare again**.
6. `#save-state` ("Not saved yet" / "Saved as run 4") and the disclaimer on **every** result: "Visual check only — not a replacement for functional or security testing." When ignore zones were used, add: "Ignore zones hide areas from the comparison. They are not a security control."

### 3a. Review, save and sign-off rules (from `docs/erp/evidence-standard.md` section 3)

`#result` carries `data-state="result-pass|result-fail"`, `data-review="undecided|regression|decided"`, `data-saved="no|yes"`, `data-signoff="no|yes"`.

| Situation | `data-review` | Primary action (`data-action`) | Sign off | Promote to baseline |
|---|---|---|---|---|
| PASS (0 regions), not saved | decided | **Save run** (`save`) | n/a until saved | hidden (nothing changed) |
| PASS, saved | decided | **Sign off** (`signoff`) | enabled | hidden |
| FAIL, some region has no decision | undecided | **Review regions** (`review`, focuses first undecided region) | disabled: "Decide every region first (1 left)." | disabled |
| FAIL, all decided, at least one Regression | regression | **Save run** if unsaved, else **Download evidence PNG** (`download`) | **disabled**: "Sign off isn't available while a region is marked Regression. Log a defect, attach the report, and retest after the fix." | disabled |
| FAIL, all Expected/Noise, unsaved | decided | **Save run** | disabled: "Save the run first." | disabled |
| FAIL, all Expected/Noise, saved | decided | **Sign off** | enabled | disabled: "Sign off first." |
| Signed off (FAIL with changes) | decided | **Promote to baseline** (`promote`) | shows "Signed off by SA on 22 Nov 2026" | enabled |
| Signed off (PASS) | decided | **Compare another page** (`library`) | signed-off line | hidden |

- **Save run requires a decision on every region of a FAIL run** (a run containing a Regression may be saved; it just can't be signed off). Saving a PASS needs no decisions.
- Changing any decision after Save run: the run is re-saved by pressing Save run again (the dialog is prefilled); if it was signed off, sign-off is cleared and the line reads "Sign-off cleared because a decision changed."
- **Promote to baseline** is a *Could* (US-16). If it is cut, remove `#btn-promote` and `#confirm-dialog` use for it; nothing else changes.
- **Review duration:** a silent timer starts when the Result screen first shows a result and stops on **Save run**; stored as `reviewMs` on the run. There is no visible ticking clock (it would pressure the reviewer and chatter in a screen reader). It is disclosed in the save dialog hint: "The time you spend reviewing is saved with the run."
- Evidence stored on sign-off: `signOff: {signedOff, reviewer, signedOffAt, baselinePromoted}` at run level.

## 4. Ignore-zone drawing: pointer, region and keyboard (three equal ways)

Zones belong to the **page** (not the run), are stored in baseline pixels, and apply to every future compare (`docs/04-ignore-zones.md`).

1. **Drag** on `#zone-canvas` (the baseline thumbnail on the Compare screen).
   - Pointer Events: `pointerdown` + `setPointerCapture`, `pointermove` draws a dashed rectangle, `pointerup` finishes. `touch-action: none` on the canvas (Sable: CSS only).
   - Convert with `imgX = (clientX - rect.left) * (img.width / canvas.clientWidth)`.
   - Ignore drags smaller than 8 x 8 px (a click, not a zone). `Escape` while dragging cancels.
   - On release, `#zone-dialog` opens pre-filled (X, Y, Width, Height) with focus in **Label**.
2. **From a region:** each region's **Add ignore zone** opens the same dialog, pre-filled with that box expanded by 4 px (clamped to the image), label empty. After the zone is added, no automatic re-run (region numbers and decisions would shift). The result shows a notice: "Zone 'Timestamp' added. Compare again to apply it." and the primary action becomes **Compare again**.
3. **Form (keyboard / screen reader):** **Add zone manually** (on the Compare screen, next to the zone list) opens the same dialog empty. Fields: Label, X, Y, Width, Height (baseline pixels, `type="number"` so arrow keys nudge by 1). A hint states the bounds: "The baseline is 1366 by 900 pixels." A live preview canvas (`#zone-preview`) draws the baseline with the rectangle as values change.

Dialog behaviour: modal `<dialog>`; **Add zone** (submit) / **Cancel**; Enter in a field submits; Esc cancels; focus returns to the control that opened it. Validation (inline in `#zone-error`, `role="alert"`): label required ("Give the zone a short label, for example Timestamp."); width and height at least 1; zone inside the baseline ("That zone extends past the baseline (1366 by 900 pixels). Reduce X or Width.").

Zone list `#zone-list` (real HTML, one `<li>` each: "Timestamp, 220 by 18 pixels at 1100, 20" + **Remove** button). Removing: no dialog (easily reversible); `#undo-bar` offers **Undo** for 5 s; the delete is committed after 5 s (closing the tab in that window cancels it).
Announcements (`#announcer`): "Zone 'Timestamp' added, 220 by 18 pixels." / "Zone 'Timestamp' removed. Undo is available for 5 seconds."
Guardrail: if zones cover more than 15% of the baseline, JS sets `#zone-summary[data-level="warn"]` (prepend `<span class="icon" aria-hidden="true"></span>`; Sable styles it like `.badge-warn`) and the text shows "3 zones ignored (18.2% of page). Large ignored areas can hide real regressions." (warning text + icon, polite announce).
Summary line always: "2 zones ignored (1.4% of page)" / "No ignore zones".

## 5. Capture tip, evidence form, sign-off dialog

**Capture tip** (`#capture-tip`, shown every time a baseline is added). Text is fixed (from `docs/erp/capture-standards.md` section 5), word for word:

> Capture the before and after pages with the same browser, 1366×900 viewport, 100% zoom, test user and data, then promote the after capture only after sign-off.

Followed by a link "Full capture standard" -> `how-it-works.html#capture`, and a **Got it** button that hides it until the next baseline is added. It is a polite `role="note"` (not an alert).

**Evidence form** (`#evidence-form` inside `#save-dialog`). Fields exactly per `docs/erp/evidence-standard.md` section 1a:

| Label | id | Required | Example placeholder |
|---|---|---|---|
| Test case ID | `ev-testcase` | yes | VR-TL-01 |
| Ticket / change ID | `ev-ticket` | yes | CHG-0042 (fictional) |
| Tools version / PUM image | `ev-tools` | yes | PI 50 (fictional) or PT 8.62.xx |
| Tester (initials) | `ev-tester` | yes | SA |
| Business unit | `ev-bu` | no | BU-NORTH |
| Role | `ev-role` | no | TL_EMPLOYEE |
| Environment | `ev-env` | no | TEST |
| Note | `ev-note` | no | |
| Expected role difference (inside `<details>` "Role-based test") | `ev-expected` | no | Approve button only for TL_MANAGER |

Form-level validation on submit: focus the first empty required field, `aria-invalid="true"`, error text under it, and a summary in `#evidence-error` (`role="alert"`): "Test case ID is required. Nothing was saved." For FAIL with open regions: "Decide every changed region before saving (2 left)." Last values for tester / tools version are remembered in `settings` (key `lastEvidence`) as a convenience; blocked storage -> not remembered, no error.

**Sign-off dialog** (`#signoff-dialog`): field Reviewer (`so-reviewer`, required, "Name or initials"). Body: "Signing off says every changed region has been reviewed and none is a Regression. The date and time are recorded automatically." Buttons **Sign off** / Cancel. Result: line "Signed off by SA on 22 Nov 2026, 14:32." and announcer "Run signed off."

**Promote confirm** (`#confirm-dialog`, shared with Delete page): title "Replace the baseline?" body "This screenshot becomes the new baseline for {page}. The old baseline is deleted from this device. Saved runs and ignore zones are kept. This can't be undone." Buttons **Replace baseline** (destructive) / **Cancel** (default focus). After: announcer "Baseline replaced for {page}."
**Delete page** (same dialog): title "Delete {page}?" body "This deletes its baseline, ignore zones and all saved runs from this device. This can't be undone." Buttons **Delete page** / **Cancel**.

## 6. State table (all states)

Where each state lives (the `data-state` hooks):
- `#status-pill[data-state]` = `loading | ready | working | error`. `#status-progress` is visible only in `loading` (indeterminate) and `working` (determinate); JS sets `hidden` in `ready` and `error` so an empty bar does not sit there permanently.
- `#main[data-state]` (the `<main>`) = `loading-opencv | ready-empty | ready | working | result-pass | result-fail | error-opencv | error-compare | error-timeout`
- `#notice[data-state]` = `none | storage-blocked | storage-quota`
- `#new-page-form[data-state]` = `idle | duplicate-page-name`
- `#reset-dialog[data-state]` = `reset-confirm | reset-done`
Pill, `#main` and `#notice` are independent: e.g. `ready` + `storage-blocked` banner can coexist.

Common rules: status text lives in `#status-text` (inside `#status-pill`, `role="status" aria-live="polite" aria-atomic="true"`). Errors use `role="alert"` on their panel. A short sentence says why and what to do; no codes, no "Oops".

| # | State (`data-state`) | Trigger | On screen | Exact copy | Primary action | Pill | Live behaviour |
|---|---|---|---|---|---|---|---|
| 1 | `loading-opencv` | App start until worker posts `ready` | Same layout as ready; **Compare** `aria-disabled` with `#compare-hint`; `<progress id="status-progress">` indeterminate | Pill: "Loading OpenCV (10 MB, first visit only)…". If `settings.engineSeen`: "Starting the vision engine…". Hint: "Getting the vision engine ready." | **Load sample** (queues the compare) | `loading` | Pill announces once on change. No percentage (size is unverified, progress unknown). |
| 2 | `ready-empty` | Library has no pages | `#library-empty`: heading + two buttons | H2 "Compare a page before and after a change". Body "Load a sample to see how it works in one click, or add your own baseline screenshot." | **Load sample** (secondary: **New page**) | `ready`: "Ready" | Pill "Ready" polite. Focus stays where it was. |
| 3 | `ready` | A page is open with baseline; candidate present or not | Compare screen: baseline panel, candidate panel, **Compare** | No candidate: drop zone text "Drop the after-change screenshot here, paste it with Ctrl+V, or choose a file." and hint "Add the after-change screenshot to compare." (Compare `aria-disabled`). With candidate: both thumbnails, capture tip (if a baseline was just added), Compare enabled. | **Choose screenshot** (no candidate) / **Compare** (both present) | `ready`: "Ready" | Candidate added: announcer "After-change screenshot added, 1366 by 900 pixels." |
| 4 | `working` | Compare pressed | `#compare-inputs` set `inert`; `<progress>` determinate (value = step index of 4); **Cancel** button | Pill: "Comparing: Aligning (1/4)" -> "Comparing: Finding differences (2/4)" -> "Comparing: Measuring regions (3/4)" -> "Comparing: Drawing views (4/4)" | **Cancel** (focus moves to it when Compare hides) | `working` | Each step change is announced by the pill (4 short messages). Cancel -> worker `terminate()` + respawn; pill "Starting the vision engine…" then "Ready"; announcer "Comparison cancelled. Your screenshots are still here."; focus returns to **Compare**. |
| 5 | `result-pass` | `status === "PASS"` | `#result` with green check icon + text | `#result-status`: "PASS — no unexpected changes". Stats as section 3. Disclaimer. | **Save run** | `ready`: "Ready" | Announcer: "Comparison finished. PASS, no unexpected changes." Focus -> `#result-status`. |
| 6 | `result-fail` | `status === "FAIL"` | `#result` with red cross icon + text, numbered boxes, region list | `#result-status`: "FAIL — 3 changed regions (0.8% of page)". One region: "FAIL — 1 changed region (0.8% of page)". Under 0.1%: "(under 0.1% of page)". Region item: "Region 2 of 3: 312 by 28 pixels at 40, 610". | **Review regions** (then per table 3a) | `ready` | Announcer: "Comparison finished. FAIL, 3 changed regions, 0.8 percent of page." Focus -> `#result-status`. Decision change: announcer "Region 2 marked Regression. 1 of 3 reviewed." |
| 7 | `error-opencv` | Worker `error` before `ready`, or script failed to load | `#error-panel` in place of the compare area | H2 "The vision engine didn't load". Body "Open the app from its website address (not a saved file), then reload. Your saved pages and runs aren't affected." | **Reload page** (secondary link: **Reset app data**) | `error`: "Something went wrong — see message" | Panel `role="alert"`; focus -> panel heading. Compare stays `aria-disabled`. |
| 8 | `error-compare` | Worker `error`, pre-check failure, or no baseline | `#error-panel` above the thumbnails, which stay | See messages table below. Generic: "The comparison failed: {message}. Your screenshots are unchanged." | **Try again** (secondary: **Reset app data**) | `error` | `role="alert"`; focus -> heading; inputs stay filled. |
| 9 | `error-timeout` | 30 s watchdog | `#error-panel` | H2 "That took too long". Body "Comparison took too long and was restarted. Try again, or reduce the screenshot size." | **Try again** | `error` | `role="alert"`. Worker is already restarted; pill goes `loading`->`ready`; focus -> panel heading. |
| 10 | `storage-blocked` | `indexedDB.open` fails / unavailable (private window, blocked site data) | `#notice` banner above main; Library lists nothing; **Save run**, New page and Promote `aria-disabled` | "This browser is blocking storage, so pages and runs can't be saved. You can still load a sample and compare; nothing is kept when you close this tab." Action: "How to allow storage" -> `how-it-works.html#storage`. Reason hint on disabled buttons: "Storage is blocked in this browser." | **Dismiss** (continue without saving) | unchanged | `role="alert"` once, on first show. |
| 11 | `storage-quota` | `QuotaExceededError` on write | `#notice` banner; save dialog stays open with its data | "This device has no room left for the app, so that run wasn't saved. Delete old runs in History, or download the evidence now." Actions: **Download evidence PNG**, **Open History** | **Download evidence PNG** | unchanged | `role="alert"`. Nothing the user typed is lost. |
| 12 | `duplicate-page-name` | Create page with a name that exists (case-insensitive; `ConstraintError`) | Inline under Name field in `#new-page-form`; `aria-invalid="true"` | `#page-name-error`: "A page named “HCM – Job Data” already exists. Choose another name, or open the existing page." with button **Open existing page** | **Open existing page** (field keeps its text) | unchanged | Error text is the field's `aria-describedby`; focus -> Name field; also announced via `role="alert"` on the error `<p>`. |
| 13 | `reset-confirm` | **Reset app data** pressed (Settings, or the error panels) | Modal `#reset-dialog`; default focus on **Cancel** | Title "Reset app data?" Body "Delete all baselines, ignore zones and runs on this device? This can't be undone. The sample screenshots aren't affected." Buttons **Delete everything** (destructive) / **Cancel** | **Cancel** is the default; **Delete everything** is the action | unchanged | Dialog is modal and labelled; Esc cancels. If another tab holds the database: "Close other tabs of this app to finish the reset." stays in the dialog (`role="alert"`) and the button stays enabled for a retry. |
| 14 | `reset-done` | Database deleted and reopened empty | Same dialog, content swapped | Title "App data deleted". Body "The library is empty and the samples still work." Button **Back to Library** | **Back to Library** | `ready` | Announcer "App data deleted. The library is empty." Focus -> the button; closing goes to `#/library` in `ready-empty`. No page reload is needed (re-open the DB). |

### 6a. Specific `error-compare` messages

| Cause | Message |
|---|---|
| Not an image / not PNG | "That file isn't a PNG image. Capture a full-page PNG (Chrome DevTools, Capture full size screenshot) and try again." |
| No baseline for the page | "Add a baseline for this page first." (primary **Add baseline**) |
| Image won't decode | "That image couldn't be read. Try capturing it again as a PNG." |
| Sizes very different | "These screenshots are very different sizes (1366×900 vs 800×600). Capture both at 100% zoom." The size-ratio cut-off is **unverified**; Iris decides, and the worker may also return it. |
| Zoom/scale not recoverable | "Alignment wasn't reliable. Capture both screenshots with the same browser zoom and window size, then try again." (US-04: never silently PASS) |

### 6b. Additional states (not in the required 14)
- **Offline:** `navigator.onLine === false` shows `#offline-note` (small, polite): "Offline — everything still works on this device." No other change.
- **Undo bar** (`#undo-bar`, `role="status"`): "Run deleted. Undo" for 5 s; "Zone 'Timestamp' removed. Undo". Focus is not moved; after delete, focus goes to the next list item or the list heading.
- **Library with pages:** page cards; empty History: "No saved runs for this page yet. Compare it and choose Save run."

## 7. Keyboard and screen-reader rules

- **Skip link** first in the DOM -> `#main`. DOM order = visual order. Every control is reachable by Tab; no keyboard trap (dialogs use native `<dialog>.showModal()`).
- **Focus ring:** `:focus-visible`, 2 px, 3:1 contrast against the surface (including on glass). `.drop:focus-within` shows the ring on the drop zone.
- **No single-key shortcuts** (WCAG 2.1.4) and nothing that overrides system shortcuts. Paste (Ctrl/Cmd+V) is the system shortcut.
- **View tabs** (`role="tablist"`): Left/Right move and activate, Home/End jump; only the selected tab is in the Tab order (`tabindex="-1"` on the others).
- **Overlay slider** `#overlay-slider` (`<input type="range" min="0" max="100" step="1">`, labelled "Overlay: before to after"): arrows +/-1, PageUp/PageDown +/-10, Home/End. JS sets `aria-valuetext` "Showing 60% after, 40% before". 0 = all before, 100 = all after.
- **Side-by-side:** each `.canvas-wrap` is a scroll region with `tabindex="0"` and `aria-label`; scrolling one syncs the other.
- **Canvases** `role="img"` with a live `aria-label`, e.g. "After-change screenshot with 3 changed regions outlined and numbered." The region list is real HTML and carries the same information as the boxes (never colour or canvas only).
- **Region `<li>`** has `tabindex="0"` and `aria-label` "Region 2 of 3, 312 by 28 pixels at 40, 610, decision: not reviewed". Focus/hover highlights the box in Boxes view (thicker line + numbered badge). Decision = native radio group in a `<fieldset><legend>Decision for region 2</legend>` (arrow keys switch). Radios are labelled **Expected**, **Regression**, **Noise**; each has a one-line `title`/description: Expected = intended by the change; Regression = unintended defect; Noise = harmless difference.
- **Dialogs:** `aria-labelledby` -> title; focus the first field (zone, save, sign-off) or **Cancel** (reset, delete, replace); Esc closes; focus returns to the opener.
- **Live regions (3, no more):** `#status-pill` (progress), `#announcer` (`sr-only`, polite: results, decisions, zones, undo, saved), error panels/`#notice` (`role="alert"` only for blocked/quota/errors). Never put the same sentence in two of them.
- **Reduced motion:** no sliding/wiping animations when `prefers-reduced-motion: reduce`; the progress bar still updates, but with no animation.
- **Targets:** at least 44 x 44 px for buttons, tabs, radios' labels and the slider thumb.
- **Colour:** PASS/FAIL, decisions and regions always have text and an icon/number; hatching for zones is a pattern, not only grey.
- **Test:** keyboard-only run of the whole flow, Lighthouse accessibility >= 90, axe DevTools if available.

## 8. HTML skeleton: `index.html`

Rules for Juno and Sable:
- **No inline scripts, no inline event handlers (`onclick=`), no `style=` attributes** (CSP `script-src 'self'`, `style-src 'self'`). Set dynamic styles from JS with `el.style.setProperty(...)`/`el.style.prop` (CSSOM, which the CSP does not block per the CSP3 spec; Quinn to verify in Chrome), **never** `setAttribute('style', ...)` or `cssText` strings built into HTML. The overlay uses `--split` set that way.
- The stylesheet must contain `[hidden]{display:none !important}`; the skeleton relies on the `hidden` attribute.
- Canvas sizes are set with `width`/`height` attributes from JS; CSS gives them `max-width:100%; height:auto`.
- Icons: `<span class="icon" aria-hidden="true"></span>`; Sable draws them with CSS (e.g. `background-image: url("data:image/svg+xml,...")`, allowed by `img-src data:`). No emoji, no icon fonts, no external files.
- JS is one module entry: `<script type="module" src="js/app.js">` (deferred by default). The worker is classic and is created by `js/worker-client.js`.
- Copy lives in one file, `js/copy.js` (exported object keyed by the state names in section 6), so wording is edited in one place. Strings in this document are the source.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Library - ERP Visual Regression Inspector</title>
  <meta name="description" content="Compare before and after ERP screenshots in your browser. Nothing leaves your device.">
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="css/app.css">
  <script type="module" src="js/app.js"></script>
</head>
<body>
  <a class="skip" href="#main">Skip to main content</a>

  <header class="app-header">
    <a class="brand" href="index.html#/library">ERP Visual Regression Inspector</a>
    <nav class="app-nav" aria-label="Main">
      <ul>
        <li><a href="#/library" data-route="library">Library</a></li>
        <li><a href="#/compare" data-route="compare">Compare</a></li>
        <li><a href="#/history" data-route="history">History</a></li>
        <li><a href="#/settings" data-route="settings">Settings</a></li>
        <li><a href="how-it-works.html">How it works</a></li>
        <li><a href="resources.html">Resources</a></li>
      </ul>
    </nav>
    <div class="status">
      <div id="status-pill" class="pill" data-state="loading" role="status" aria-live="polite" aria-atomic="true">
        <span class="icon" aria-hidden="true"></span>
        <span id="status-text">Loading OpenCV (10 MB, first visit only)…</span>
      </div>
      <progress id="status-progress" class="pill-progress" max="4" aria-label="Progress"></progress>
    </div>
  </header>

  <div id="announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>
  <p id="offline-note" class="hint" role="status" hidden>Offline — everything still works on this device.</p>

  <div id="notice" class="notice" data-state="none" role="alert" hidden>
    <span class="icon" aria-hidden="true"></span>
    <p id="notice-text"></p>
    <button id="notice-action" class="btn" type="button" hidden></button>
    <button id="notice-dismiss" class="btn" type="button">Dismiss</button>
  </div>

  <main id="main" class="app" data-screen="library" data-state="loading-opencv" tabindex="-1">
    <noscript><p class="notice">This app needs JavaScript. It runs entirely in your browser; nothing is sent anywhere.</p></noscript>

    <!-- error panel: used by error-opencv, error-compare, error-timeout -->
    <section id="error-panel" class="panel" role="alert" aria-labelledby="error-title" data-kind="" hidden>
      <h2 id="error-title" tabindex="-1"></h2>
      <p id="error-body"></p>
      <div class="actions">
        <button id="error-primary" class="btn btn-primary" type="button">Try again</button>
        <button id="error-reset" class="btn" type="button">Reset app data</button>
      </div>
    </section>

    <!-- ============ LIBRARY ============ -->
    <section id="screen-library" class="screen" data-screen="library" aria-labelledby="h-library">
      <h1 id="h-library" tabindex="-1">Library</h1>

      <div id="library-empty" class="panel">
        <h2>Compare a page before and after a change</h2>
        <p>Load a sample to see how it works in one click, or add your own baseline screenshot.</p>
        <div class="actions">
          <button id="btn-load-sample" class="btn btn-primary" type="button">Load sample</button>
          <button id="btn-new-page" class="btn" type="button">New page</button>
        </div>
        <div class="field">
          <label for="sample-select">Sample pair</label>
          <select id="sample-select"></select>
        </div>
      </div>

      <form id="new-page-form" class="panel" data-state="idle" novalidate hidden>
        <h2>New page</h2>
        <div class="field">
          <label for="page-name">Page name</label>
          <input id="page-name" name="name" type="text" autocomplete="off" required aria-describedby="page-name-hint page-name-error" placeholder="HCM – Job Data">
          <p id="page-name-hint" class="hint">Use the page's name in the application, so it is easy to find later.</p>
          <p id="page-name-error" class="field-error" role="alert" hidden></p>
          <button id="btn-open-existing" class="btn" type="button" hidden>Open existing page</button>
        </div>
        <div class="field">
          <label for="page-module">Module</label>
          <select id="page-module" name="module">
            <option>HCM</option><option>FSCM</option><option>Time &amp; Labor</option><option>Other</option>
          </select>
        </div>
        <div class="field">
          <label class="drop" for="baseline-file">
            <span class="drop-title">Baseline screenshot (before the change)</span>
            <span class="hint">Drop a PNG here or choose a file. Full-page PNG only.</span>
            <input id="baseline-file" class="sr-only" type="file" accept="image/png">
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Create page</button>
          <button id="btn-new-page-cancel" class="btn" type="button">Cancel</button>
        </div>
      </form>

      <ul id="page-list" class="cards" aria-label="Pages"></ul>
      <template id="tpl-page">
        <li class="card" data-page-id="">
          <img class="card-thumb" alt="" width="160" height="105">
          <h2 class="card-title"></h2>
          <p class="card-meta"></p>
          <div class="actions">
            <button class="btn btn-primary page-open" type="button">Compare</button>
            <button class="btn page-history" type="button">History</button>
            <button class="btn btn-danger page-delete" type="button">Delete page</button>
          </div>
        </li>
      </template>
    </section>

    <!-- ============ COMPARE ============ -->
    <section id="screen-compare" class="screen" data-screen="compare" aria-labelledby="h-compare" hidden>
      <h1 id="h-compare" tabindex="-1">Compare</h1>
      <p id="compare-page-name" class="hint"></p>

      <div id="compare-inputs">
        <ol class="steps">
          <li class="panel" id="baseline-panel">
            <h2>1. Baseline (before the change)</h2>
            <canvas id="zone-canvas" role="img" aria-label="Baseline screenshot. Drag to draw an ignore zone, or use Add zone manually."></canvas>
            <div class="actions">
              <button id="btn-replace-baseline" class="btn" type="button">Replace baseline</button>
              <button id="btn-add-zone" class="btn" type="button">Add zone manually</button>
            </div>
            <aside id="capture-tip" class="tip" role="note" hidden>
              <p>Capture the before and after pages with the same browser, 1366×900 viewport, 100% zoom, test user and data, then promote the after capture only after sign-off.</p>
              <a href="how-it-works.html#capture">Full capture standard</a>
              <button id="btn-tip-dismiss" class="btn" type="button">Got it</button>
            </aside>
            <h3 id="h-zones">Ignore zones</h3>
            <p id="zone-summary" class="hint">No ignore zones</p>
            <ul id="zone-list" aria-labelledby="h-zones"></ul>
            <template id="tpl-zone">
              <li class="zone">
                <span class="zone-text"></span>
                <button class="btn zone-remove" type="button">Remove</button>
              </li>
            </template>
          </li>

          <li class="panel" id="candidate-panel">
            <h2>2. After-change screenshot</h2>
            <label class="drop" id="candidate-drop" for="candidate-file">
              <span class="drop-title">Drop the after-change screenshot here</span>
              <span class="hint">Or paste it with Ctrl+V, or choose a file. Full-page PNG only.</span>
              <input id="candidate-file" class="sr-only" type="file" accept="image/png">
            </label>
            <img id="candidate-thumb" class="thumb" alt="After-change screenshot" hidden>
          </li>

          <li class="panel" id="compare-panel">
            <h2>3. Compare</h2>
            <p id="compare-hint" class="hint">Add the after-change screenshot to compare.</p>
            <div class="actions">
              <button id="btn-compare" class="btn btn-primary" type="button" aria-disabled="true" aria-describedby="compare-hint">Compare</button>
              <button id="btn-cancel" class="btn" type="button" hidden>Cancel</button>
            </div>
            <details id="advanced" class="advanced">
              <summary>Advanced</summary>
              <div class="field"><label for="set-T">Sensitivity (threshold T, 1–255)</label><input id="set-T" type="number" min="1" max="255" inputmode="numeric"></div>
              <div class="field"><label for="set-minarea">Minimum region size (pixels, area)</label><input id="set-minarea" type="number" min="0" inputmode="numeric"></div>
              <div class="field"><label for="set-kernel">Region merging kernel (pixels)</label><input id="set-kernel" type="number" min="1" inputmode="numeric"></div>
              <div class="field"><label for="set-thresholdpct">Fail above (% of page changed, saved for this page)</label><input id="set-thresholdpct" type="number" min="0" step="0.01" inputmode="decimal"></div>
              <div class="field"><label for="set-alignment">Alignment</label>
                <select id="set-alignment"><option value="auto">Automatic</option><option value="off">Off</option></select></div>
              <button id="btn-defaults" class="btn" type="button">Restore defaults</button>
            </details>
          </li>
        </ol>
      </div>
    </section>

    <!-- ============ RESULT ============ -->
    <section id="screen-result" class="screen" data-screen="result" aria-labelledby="h-result" hidden>
      <h1 id="h-result">Result</h1>

      <div id="result" class="panel" data-state="result-fail" data-review="undecided" data-saved="no" data-signoff="no">
        <p id="result-status" class="result-status" tabindex="-1">
          <span class="icon" aria-hidden="true"></span>
          <span id="result-text">FAIL — 3 changed regions (0.8% of page)</span>
        </p>
        <dl id="result-stats" class="stats">
          <div><dt>Changed</dt><dd id="stat-changed"></dd></div>
          <div><dt>Similarity</dt><dd id="stat-ssim"></dd></div>
          <div><dt>Alignment</dt><dd id="stat-alignment"></dd></div>
          <div><dt>Ignored</dt><dd id="stat-ignored"></dd></div>
          <div><dt>Compared in</dt><dd id="stat-ms"></dd></div>
          <div><dt>Review time</dt><dd id="stat-review">—</dd></div>
        </dl>
      </div>

      <div class="tabs" role="tablist" aria-label="View">
        <button id="tab-boxes" class="tab" role="tab" type="button" aria-selected="true" aria-controls="view-boxes" data-view="boxes">Boxes</button>
        <button id="tab-side" class="tab" role="tab" type="button" aria-selected="false" aria-controls="view-side" data-view="side" tabindex="-1">Side-by-side</button>
        <button id="tab-overlay" class="tab" role="tab" type="button" aria-selected="false" aria-controls="view-overlay" data-view="overlay" tabindex="-1">Overlay slider</button>
        <button id="tab-heatmap" class="tab" role="tab" type="button" aria-selected="false" aria-controls="view-heatmap" data-view="heatmap" tabindex="-1">Heatmap</button>
      </div>

      <div id="view-boxes" class="view" role="tabpanel" aria-labelledby="tab-boxes" data-view="boxes">
        <div class="canvas-wrap"><canvas id="canvas-boxes" role="img" aria-label=""></canvas></div>
      </div>
      <div id="view-side" class="view" role="tabpanel" aria-labelledby="tab-side" data-view="side" hidden>
        <div class="split">
          <div class="canvas-wrap" tabindex="0" aria-label="Baseline, scrollable"><canvas id="canvas-before" role="img" aria-label="Baseline screenshot"></canvas></div>
          <div class="canvas-wrap" tabindex="0" aria-label="After-change screenshot, scrollable"><canvas id="canvas-after" role="img" aria-label="After-change screenshot"></canvas></div>
        </div>
      </div>
      <div id="view-overlay" class="view" role="tabpanel" aria-labelledby="tab-overlay" data-view="overlay" hidden>
        <div class="canvas-wrap overlay">
          <canvas id="canvas-overlay-base" role="img" aria-label="Baseline screenshot"></canvas>
          <canvas id="canvas-overlay-top" aria-hidden="true"></canvas>
        </div>
        <div class="field">
          <label for="overlay-slider">Overlay: before to after</label>
          <input id="overlay-slider" type="range" min="0" max="100" step="1" value="50" aria-valuetext="Showing 50% after, 50% before">
        </div>
      </div>
      <div id="view-heatmap" class="view" role="tabpanel" aria-labelledby="tab-heatmap" data-view="heatmap" hidden>
        <div class="canvas-wrap"><canvas id="canvas-heatmap" role="img" aria-label=""></canvas></div>
        <p class="hint">Blue: no change. Red: strong change.</p>
      </div>

      <section id="regions" aria-labelledby="h-regions">
        <h2 id="h-regions">Changed regions</h2>
        <p id="regions-progress" class="hint">0 of 0 reviewed</p>
        <ol id="region-list" class="regions"></ol>
        <template id="tpl-region">
          <li class="region" tabindex="0" data-region="" data-decision="unreviewed">
            <p class="region-title">Region <span class="region-num"></span> of <span class="region-total"></span>: <span class="region-size"></span> at <span class="region-pos"></span></p>
            <fieldset class="decision">
              <legend>Decision for region <span class="region-num"></span></legend>
              <label><input type="radio" value="Expected"> Expected</label>
              <label><input type="radio" value="Regression"> Regression</label>
              <label><input type="radio" value="Noise"> Noise</label>
            </fieldset>
            <label class="field">Note (optional)<input class="region-note" type="text" autocomplete="off"></label>
            <button class="btn region-zone" type="button">Add ignore zone</button>
          </li>
        </template>
      </section>

      <div class="actions result-actions">
        <button id="btn-result-primary" class="btn btn-primary" type="button" data-action="review">Review regions</button>
        <button id="btn-signoff" class="btn" type="button" aria-disabled="true" aria-describedby="signoff-hint">Sign off</button>
        <button id="btn-promote" class="btn" type="button" aria-disabled="true" aria-describedby="signoff-hint">Promote to baseline</button>
        <button id="btn-download-png" class="btn" type="button">Download evidence PNG</button>
        <button id="btn-print" class="btn" type="button">Print report</button>
        <button id="btn-compare-again" class="btn" type="button">Compare again</button>
      </div>
      <p id="signoff-hint" class="hint"></p>
      <p id="save-state" class="hint">Not saved yet</p>
      <p id="zone-added-note" class="hint" hidden></p>
      <p class="disclaimer">Visual check only — not a replacement for functional or security testing.</p>
      <p id="zones-disclaimer" class="disclaimer" hidden>Ignore zones hide areas from the comparison. They are not a security control.</p>
    </section>

    <!-- ============ HISTORY ============ -->
    <section id="screen-history" class="screen" data-screen="history" aria-labelledby="h-history" hidden>
      <h1 id="h-history" tabindex="-1">Run history</h1>
      <div class="field">
        <label for="history-page">Page</label>
        <select id="history-page"></select>
      </div>
      <p id="history-empty" class="hint">No saved runs for this page yet. Compare it and choose Save run.</p>
      <table id="run-table" class="table" hidden>
        <caption class="sr-only">Saved runs</caption>
        <thead><tr>
          <th scope="col">Date</th><th scope="col">Status</th><th scope="col">Regions</th><th scope="col">Changed</th>
          <th scope="col">Test case</th><th scope="col">Ticket</th><th scope="col">Tester</th><th scope="col">Sign-off</th><th scope="col">Actions</th>
        </tr></thead>
        <tbody id="run-rows"></tbody>
      </table>
      <template id="tpl-run">
        <tr data-run-id="">
          <td class="run-date"></td>
          <td class="run-status"><span class="icon" aria-hidden="true"></span><span class="run-status-text"></span></td>
          <td class="run-regions"></td><td class="run-changed"></td>
          <td class="run-testcase"></td><td class="run-ticket"></td><td class="run-tester"></td><td class="run-signoff"></td>
          <td class="run-actions">
            <button class="btn run-view" type="button">View</button>
            <button class="btn btn-danger run-delete" type="button">Delete</button>
          </td>
        </tr>
      </template>
      <div class="actions">
        <button id="btn-export-csv" class="btn" type="button">Export CSV</button>
        <button id="btn-export-json" class="btn" type="button">Export JSON</button>
      </div>
    </section>

    <!-- ============ SETTINGS ============ -->
    <section id="screen-settings" class="screen" data-screen="settings" aria-labelledby="h-settings" hidden>
      <h1 id="h-settings" tabindex="-1">Settings</h1>
      <div class="panel">
        <h2>Storage</h2>
        <p id="storage-estimate">Calculating how much space the app uses…</p>
        <p id="persist-status" class="hint"></p>
        <p>Everything is stored in this browser on this device. Nothing is sent anywhere.</p>
      </div>
      <div class="panel">
        <h2>Reset app data</h2>
        <p>Deletes all baselines, ignore zones and runs saved on this device.</p>
        <button id="btn-reset" class="btn btn-danger" type="button">Reset app data</button>
      </div>
    </section>
  </main>

  <!-- ============ DIALOGS ============ -->
  <dialog id="zone-dialog" aria-labelledby="zone-title">
    <form id="zone-form" method="dialog" novalidate>
      <h2 id="zone-title">Add ignore zone</h2>
      <canvas id="zone-preview" role="img" aria-label="Baseline with the new zone outlined"></canvas>
      <div class="field"><label for="zone-label">Label</label><input id="zone-label" type="text" autocomplete="off" placeholder="Timestamp"></div>
      <p id="zone-bounds" class="hint"></p>
      <div class="field"><label for="zone-x">X</label><input id="zone-x" type="number" min="0" step="1" inputmode="numeric"></div>
      <div class="field"><label for="zone-y">Y</label><input id="zone-y" type="number" min="0" step="1" inputmode="numeric"></div>
      <div class="field"><label for="zone-w">Width</label><input id="zone-w" type="number" min="1" step="1" inputmode="numeric"></div>
      <div class="field"><label for="zone-h">Height</label><input id="zone-h" type="number" min="1" step="1" inputmode="numeric"></div>
      <p id="zone-error" class="field-error" role="alert" hidden></p>
      <div class="actions">
        <button id="zone-submit" class="btn btn-primary" type="submit" value="add">Add zone</button>
        <button class="btn" type="submit" value="cancel" formnovalidate>Cancel</button>
      </div>
    </form>
  </dialog>

  <dialog id="save-dialog" aria-labelledby="save-title">
    <form id="evidence-form" method="dialog" novalidate>
      <h2 id="save-title">Save run</h2>
      <p class="hint">The time you spend reviewing is saved with the run.</p>
      <p id="evidence-error" class="field-error" role="alert" hidden></p>
      <div class="field"><label for="ev-testcase">Test case ID</label><input id="ev-testcase" type="text" required autocomplete="off" placeholder="VR-TL-01"></div>
      <div class="field"><label for="ev-ticket">Ticket / change ID</label><input id="ev-ticket" type="text" required autocomplete="off" placeholder="CHG-0042 (fictional)"></div>
      <div class="field"><label for="ev-tools">Tools version / PUM image</label><input id="ev-tools" type="text" required autocomplete="off" placeholder="PI 50 (fictional)"></div>
      <div class="field"><label for="ev-tester">Tester (initials)</label><input id="ev-tester" type="text" required autocomplete="off" placeholder="SA"></div>
      <div class="field"><label for="ev-bu">Business unit (optional)</label><input id="ev-bu" type="text" autocomplete="off" placeholder="BU-NORTH"></div>
      <div class="field"><label for="ev-role">Role (optional)</label><input id="ev-role" type="text" autocomplete="off" placeholder="TL_EMPLOYEE"></div>
      <div class="field"><label for="ev-env">Environment (optional)</label><input id="ev-env" type="text" autocomplete="off" placeholder="TEST"></div>
      <div class="field"><label for="ev-note">Note (optional)</label><textarea id="ev-note" rows="3"></textarea></div>
      <details>
        <summary>Role-based test</summary>
        <div class="field"><label for="ev-expected">Expected role difference</label><input id="ev-expected" type="text" autocomplete="off" placeholder="Approve button only for TL_MANAGER"></div>
      </details>
      <div class="actions">
        <button id="save-submit" class="btn btn-primary" type="submit" value="save">Save run</button>
        <button class="btn" type="submit" value="cancel" formnovalidate>Cancel</button>
      </div>
    </form>
  </dialog>

  <dialog id="signoff-dialog" aria-labelledby="signoff-title">
    <form method="dialog" novalidate>
      <h2 id="signoff-title">Sign off this run?</h2>
      <p>Signing off says every changed region has been reviewed and none is a Regression. The date and time are recorded automatically.</p>
      <div class="field"><label for="so-reviewer">Reviewer (name or initials)</label><input id="so-reviewer" type="text" required autocomplete="off"></div>
      <p id="signoff-error" class="field-error" role="alert" hidden></p>
      <div class="actions">
        <button id="signoff-submit" class="btn btn-primary" type="submit" value="signoff">Sign off</button>
        <button class="btn" type="submit" value="cancel" formnovalidate>Cancel</button>
      </div>
    </form>
  </dialog>

  <dialog id="confirm-dialog" aria-labelledby="confirm-title">
    <form method="dialog">
      <h2 id="confirm-title"></h2>
      <p id="confirm-body"></p>
      <div class="actions">
        <button id="confirm-cancel" class="btn" type="submit" value="cancel" autofocus>Cancel</button>
        <button id="confirm-ok" class="btn btn-danger" type="submit" value="ok"></button>
      </div>
    </form>
  </dialog>

  <dialog id="reset-dialog" data-state="reset-confirm" aria-labelledby="reset-title">
    <form method="dialog">
      <h2 id="reset-title">Reset app data?</h2>
      <p id="reset-body">Delete all baselines, ignore zones and runs on this device? This can't be undone. The sample screenshots aren't affected.</p>
      <p id="reset-blocked" class="field-error" role="alert" hidden>Close other tabs of this app to finish the reset.</p>
      <div class="actions">
        <button id="reset-cancel" class="btn" type="submit" value="cancel" autofocus>Cancel</button>
        <button id="reset-confirm" class="btn btn-danger" type="button">Delete everything</button>
        <button id="reset-back" class="btn btn-primary" type="submit" value="done" hidden>Back to Library</button>
      </div>
    </form>
  </dialog>

  <div id="undo-bar" class="notice" role="status" hidden>
    <span id="undo-text"></span>
    <button id="btn-undo" class="btn" type="button">Undo</button>
  </div>

  <footer class="app-footer">
    <p>Demo ERP (fictional) · Everything runs on this device. No data leaves your browser.</p>
    <p class="disclaimer">A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing.</p>
  </footer>
</body>
</html>
```

Notes on the skeleton:
- `#main` is the app root: JS writes `data-screen` and `data-state` on it. There is no element with id `app`.
- Dialog buttons use `<form method="dialog">` so Cancel works with no JS; the dialog's `returnValue` is the button `value`. The Reset **Delete everything** button is `type="button"` because the action is async (the dialog must stay open for `reset-blocked` and `reset-done`).
- The `.sr-only` file inputs must still show a focus ring on their `label.drop` (`:focus-within`).

### 8a. Class glossary (kept deliberately small)

| Class | Meaning |
|---|---|
| `skip`, `sr-only` | Skip link; visually hidden text/inputs (still focusable and read) |
| `app-header`, `brand`, `app-nav`, `status`, `app-footer` | Chrome (only these use glass) |
| `pill`, `pill-progress` | Status pill (`data-state` loading/ready/working/error) and its progress bar |
| `app`, `screen`, `panel`, `steps`, `cards`, `card` | Layout blocks; screenshots sit on opaque `panel`s, not glass |
| `btn`, `btn-primary`, `btn-danger` | Buttons: one `btn-primary` per screen state |
| `field`, `hint`, `field-error`, `drop` | Form pieces; `drop` is the file/drop target label |
| `notice`, `tip` | Banners; `tip` is the capture tip |
| `tabs`, `tab`, `view`, `canvas-wrap`, `split`, `overlay` | Result views |
| `regions`, `region`, `decision` | Region list; `region[data-decision="unreviewed|Expected|Regression|Noise"]` |
| `result-status`, `stats`, `result-actions`, `disclaimer` | Result area |
| `table`, `icon`, `thumb`, `advanced`, `zone` | Misc |

Selectors Sable must style: `[data-state]` on `.pill`, `#main`, `#notice`, `#result`, `#new-page-form`, `#reset-dialog`; `#result[data-state="result-pass|result-fail"]`; `[aria-disabled="true"]` (looks disabled, still focusable); `[aria-selected="true"]` on `.tab`; `:focus-visible`; `dialog::backdrop`; `.region:focus` and `[data-decision=...]` (decision shown by text in the radios, so colour is only a reinforcement).

## 9. HTML skeleton: shared header and content pages

`how-it-works.html` and `resources.html` share the same `<head>` pattern, header, footer and a `<main class="page prose">`. They have **no** status pill, progress bar, announcer or `app.js`. The current page link has `aria-current="page"`. Links to app screens are absolute-relative (`index.html#/library`).

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>How it works - ERP Visual Regression Inspector</title>
  <meta name="description" content="How the inspector compares ERP screenshots in your browser, and how to read a result.">
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <a class="skip" href="#main">Skip to main content</a>
  <header class="app-header">
    <a class="brand" href="index.html#/library">ERP Visual Regression Inspector</a>
    <nav class="app-nav" aria-label="Main">
      <ul>
        <li><a href="index.html#/library">Library</a></li>
        <li><a href="index.html#/compare">Compare</a></li>
        <li><a href="index.html#/history">History</a></li>
        <li><a href="index.html#/settings">Settings</a></li>
        <li><a href="how-it-works.html" aria-current="page">How it works</a></li>
        <li><a href="resources.html">Resources</a></li>
      </ul>
    </nav>
  </header>

  <main id="main" class="page prose" tabindex="-1">
    <h1>How it works</h1>
    <p class="lede">…</p>
    <nav class="toc" aria-label="On this page"><ul><li><a href="#what">What it does</a></li>…</ul></nav>
    <section id="what"><h2>…</h2>…</section>
  </main>

  <footer class="app-footer">
    <p>Demo ERP (fictional) · Everything runs on this device. No data leaves your browser.</p>
    <p class="disclaimer">A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing.</p>
  </footer>
</body>
</html>
```

`resources.html` is identical except `<title>Resources - ERP Visual Regression Inspector</title>`, `aria-current="page"` on the Resources link, `<h1>Resources</h1>`.

### 9a. `how-it-works.html` outline (`<section id>` values are fixed: other pages and the app link to them)

| id | h2 | Must say |
|---|---|---|
| `what` | What it does | Compares a before and an after screenshot of an ERP page and highlights unintended visual changes. Positioning line (see footer). A visual diff can show a field or button appeared or disappeared for a tested role; it does **not** prove authorization is correct. |
| `steps` | The steps | Load a sample or add a baseline -> add the after-change screenshot -> Compare -> decide each region -> Save run -> Sign off -> Promote (optional). |
| `pipeline` | What happens when you press Compare | Plain-words version of: align (shift/zoom), difference, ignore zones applied, threshold, merge into regions, SSIM, heatmap. States the pass rule: FAIL when **any** change is found **or** the changed % is above the page's limit (default 0.1%). (Corrected in UX-2: the earlier text said "regions and %", which disagrees with `js/cv/pipeline.js` line 262 per Morgan; Juno fix `how-it-works.html#pipeline` to match.) Notes it runs in a Web Worker with OpenCV.js (WebAssembly) so the page stays responsive. |
| `capture` | Capture standard | The tip sentence (verbatim, as in section 5) then the table from `docs/erp/capture-standards.md` section 2 (browser, 1366×900, 100% zoom, same user/role/data, theme, no popups, full-page PNG) and file name `<module>_<page>_<before|after>_<YYYYMMDD>.png`, and the cycle (capture before -> change -> capture after -> compare -> triage -> sign-off -> promote). |
| `reading` | Reading a result | The four views, the numbered region list, Expected / Regression / Noise meanings, sign-off rules (no sign-off while any Regression is open; promote only after sign-off; every FAIL region needs a decision). |
| `zones` | Ignore zones | What they are for (timestamps, user names), per page and reused, the 15% warning, the **not a security control** sentence. Three ways to add one, including the keyboard form. |
| `storage` | Your data and storage | Stored only in this browser (IndexedDB `erpinspector`); no network calls after load; how to Reset app data; what to do if storage is blocked (allow site data for this site, or leave a private window). |
| `limits` | Limits | Visual check only; PNG full-page; same capture settings; fictional demo data only; estimates (3 min -> 1 min) are assumptions for a pilot, not measurements. |

### 9b. `resources.html` outline

Intro line: "Links open the official documentation in a new tab. The app itself makes no network requests." Each `<a>` gets `target="_blank" rel="noopener noreferrer"` and text that names the destination. Sections (ids fixed): `opencv` (OpenCV.js tutorials and colormap docs, from `docs/01`, `docs/05`), `web` (MDN Web Workers, WebAssembly, IndexedDB, Canvas, `toBlob`), `design` (Apple HIG: Feedback, Progress indicators, Loading, Accessibility; WCAG 2.1 Non-text Contrast), `erp` (public Oracle PeopleBooks pages for Update Manager and Change Assistant; PTF), `testing` (Playwright snapshot assertions, BackstopJS), `project` (links to repo `docs/` and knowledge notes, the team roster, `README.md`). Piper checks every link; take URLs only from the `## Sources` sections of `docs/*.md` and `knowledge/*/docs/*`, never from memory.

## 10. Layout and responsive notes (for Sable)

- Header: brand left, nav in the middle, status pill right; under 720 px the nav wraps below, the pill stays visible. 16 px side gutter, no horizontal page scroll.
- Compare `ol.steps` is a single column on phones; two columns (baseline | candidate) from ~960 px, with the Compare panel full width below.
- Screenshots are the hero: canvases sit on an opaque `panel` and are never behind glass or blur. The overlay's clip is `clip-path: inset(0 0 0 calc(var(--split) * 1%))` on `#canvas-overlay-top` (JS sets `--split` via `style.setProperty`). **Mapping (settled in C-REV-UI):** `#canvas-overlay-top` is the after-change image; the clip hides its left `--split`% so the after image shows on the right. The slider value is the percent of *after* shown (0 = all before, 100 = all after), so JS sets `--split = 100 - value`. `aria-valuetext` is "Showing {value}% after, {100-value}% before". Colour contrast: text 4.5:1, UI parts 3:1, including text on glass.
- Dialogs: max width ~34rem, scroll inside on small screens; `dialog::backdrop` dimmed, no blur on the panel content.

## 11. Verification checklist for Quinn

1. Fresh profile: `ready-empty`, pill sequence "Loading OpenCV (10 MB, first visit only)…" -> "Ready", **Load sample** with defaults -> Result `result-fail` in one click, summary announced once.
2. Purchase Order pair: FAIL -> **Add ignore zone** from the region -> "Compare again" -> PASS.
3. Shifted pair: `#stat-alignment` reads "Aligned: shift (0, 3)"; PASS.
4. Decisions: Regression keeps **Sign off** `aria-disabled` with the exact hint; Expected/Noise only enables it after Save run; Promote stays disabled until signed off.
5. Keyboard-only run of the whole flow, including the manual zone form and the overlay slider keys.
6. Storage blocked (Chrome incognito with site data blocked), quota (simulate), duplicate name, Reset (confirm, blocked by a second tab, done), Network panel quiet after load, no CSP violations in the console.

## 12. UX-2 first-use clarity

**Scope widened (project owner, verbatim): "this app is really not user friendly, i have no idea what in the world i'm suppose to do or why it's absolutely terrible".** Sections 12.1 to 12.15 fix the result screen and region card. **Section 12.16 is the whole-app first-use journey (landing, guided demo, progressive disclosure, plain navigation) and is the highest priority.** Each item there is marked **Must** or **Should**; Juno builds the Musts first. Priority across the whole section: 12.16 Musts, then 12.6 to 12.8 (card, decisions, two-way link), then 12.4 and 12.5 (guide, stats), then Shoulds.

Why this section exists: the project owner used the app and said it works but "doesn't tell a user what exactly is going on or needed". Verbatim points: "what the hell is region 1", "there is not tie in to the screenshot", "what is expected, regression or noise", "What in the world does Region 1 of 4: 105 by 154 pixels at 702, 338 mean to a user?", and "where do all these agents and team come in to any of this like the business analyst?".

**What I looked at.** The region-card screenshot (`/tmp/claude-0/-home-user/823eeff0-8200-5655-b4dd-f330ac5a9614/images/1.png`), `js/app.js` (`renderStats`, `renderRegionList`, `setDecision`), `js/views.js` (`drawBoxes`), `js/copy.js`, `js/hints.js`, `js/region-hints.json`, and sections 1 to 11 above. **I could not run the app and take my own result-screen screenshot**: this session has no shell tool, so I could not start the server or Playwright. My critique of the full screen comes from the card screenshot plus the code and the skeleton, not from seeing the page. Quinn or Atlas should check section 12.13 against the running app (unverified visually).

Source basis: Apple HIG Feedback and Accessibility (`knowledge/ux-designer-apple-hig/docs/01-feedback.md`, `03-accessibility-interaction.md`); `docs/erp/evidence-standard.md` (meanings of Expected / Regression / Noise, sign-off rules); `docs/erp/change-catalogue.md` and `js/hints.js` (cause rules, owner Dex). **Aligned with Morgan's `docs/erp/plain-language-results.md` (section 4).** Her copy is the source for the definitions, the position and shape words, the hint rewrites, the decision help and the 10-state next-step guide; this section says where it goes on screen and how it behaves. Where my layout choice differs from hers I say so (D14 and the notes in 12.4, 12.8, 12.9). If her file changes, the strings in `js/copy.js` change and nothing else.

### 12.1 First-time-analyst critique (what is wrong today)

1. **Jargon in the title.** "Region 1 of 4: 105 by 154 pixels at 702, 338" is output, not language. A tester doesn't think in pixel boxes. Nothing says where on the page it is.
2. **No tie to the screenshot.** The card number matches a badge on the canvas, but the canvas and the card are far apart on the page, and neither responds to the other. Hover/focus on a card redraws the canvas; the reverse does nothing, and a mouse user who can't see the canvas gets no signal at all.
3. **Decision is unexplained.** Three bare radios. "Noise" and "Expected" mean different things in this team's standard than in everyday speech. A first-timer can't tell which one is safe to pick.
4. **No story at the top of the result.** A red FAIL badge and four numbers (SSIM 0.962, "Aligned: shift (0, 3)") with no sentence saying "this is what happened, this is what you do next".
5. **Hidden pipeline.** No visible next step beyond the button label changing. The sign-off rules exist and are right, but the user finds them out by hitting a disabled button.
6. **The "Likely:" line is dev-speak** ("Tall narrow block: likely a grid layout change (column width or shift)") and is in small italic grey at the bottom of the card, so it reads as a footnote.
7. **No first-run explanation.** The empty Library says what to click, not what the tool is for.
8. **The team is invisible.** Atlas and 16 other roles shaped the tool, but nothing in the product connects them to what the user sees.

### 12.2 Decisions

| # | Decision | Why |
|---|---|---|
| D8 | **User-facing word is "change", not "region".** "Region" stays in code, storage (`regions[]`), evidence JSON and the validator. Status line becomes "FAIL — 4 changes found (0.8% of the page)" (Morgan 4a); one: "FAIL — 1 change found (...)"; under 0.1%: "(under 0.1% of the page)". PASS stays "PASS — no unexpected changes". Also renamed per Morgan 4a: list heading "Changes to review", progress "2 of 3 changes decided", button "Review changes" (was "Review regions", `data-action="review"` unchanged), sign-off hints "Decide every change first (1 left).", "Sign off isn't available while a change is marked Regression. ...", save error "Decide every change before saving (2 left).", canvas label "...3 changes outlined and numbered." | The owner's complaint. One word everywhere. This **deviates from** the status copy in `knowledge/ux-designer-apple-hig/docs/01-feedback.md`/ex1 and the `apple-hig-ux` skill ("3 changed regions"); the owner's feedback is the newer source. **Quinn:** any test that greps "changed region" must be updated. The announcer sentence changes the same way. |
| D9 | **Position and shape are computed, in words.** Raw pixels move to a collapsed "Details". | Owner's "what does 105 by 154 at 702, 338 mean". |
| D10 | **Two-way link between card and box**, with a keyboard route that doesn't depend on the canvas. | Owner's "no tie in to the screenshot". WCAG 2.1.1: the canvas click is a convenience; the card list and **Show on screenshot** are the keyboard path (same principle as the ignore-zone form, section 4). |
| D11 | **Alignment line reads in words** ("None needed", "Shifted 3 px down"), the raw "(0, 3)" goes to the help text. Supersedes D3's "Aligned: shift (dx, dy)". | Owner's feedback; Morgan's older stories used the technical form. **Quinn:** verification item 3 changes. The **sign of dy/dx (which image moved which way) is unverified**: Iris must confirm what `alignment` means before Juno writes "down"/"right" (see Handoffs). |
| D12 | **When unsure, the tip says choose Regression** (it can be changed later and blocks sign-off, so it fails safe). | Matches "never silently PASS" (US-04) and the sign-off rule. Morgan to confirm. |
| D14 | **Morgan's next-step guide is kept in full, shown as `#result-next` under the strip**, and the owner's one-line summary stays above it. Her decision-help, location and shape rules replace my earlier drafts. I do **not** add her "Switch to Boxes" button: **Show on screenshot** switches the tab itself (one click fewer). | Morgan 4c/4f. Atlas message. |
| D15 | **The radios start with none checked** (`rad.checked = r.decision === rad.value`, and `decision` starts `null` in `showResult`, so the code is already right). The blue ring on Expected in the owner's screenshot is therefore most likely hover or focus, but **I could not run the app to confirm** (no shell tool here). Quinn: assert zero checked radios on arrival; if one is checked, it is a defect (a reviewer could approve by doing nothing). | Morgan flag 1; `docs/erp/evidence-standard.md`. Unverified visually. |
| D13 | **The progress strip and summary are not live regions.** They are static text updated silently; the one-time result sentence still goes through `#announcer`, and decisions already announce "n of M decided". | Keeps the rule of three live regions and "never the same sentence twice" (section 7, D4). |

### 12.3 Result screen, new order

1. `h1` "Result".
2. **`#result-guide`** (new): `#result-summary` sentence, then `#result-steps` progress strip (12.4).
3. `#result-status` (badge, still receives focus on arrival), then stats (12.5).
4. View area: tabs and canvases, then a one-line `#boxes-hint` under the Boxes canvas.
5. **Changes to review** (`#regions`, was "Changed regions"): the cards (12.6), then the action bar and the rest unchanged (section 3, 3a).

**Layout hint for Sable.** At 1100 px and wider, put steps 4 and 5 in a two-column grid `.result-layout`: the view area on the left in a sticky column (`position: sticky`, `top` below the header, `max-height: calc(100vh - header)`, `.canvas-wrap` scrolls inside), the card list on the right scrolling with the page. The box stays visible while the user reads its card, and the click-to-jump scroll mostly isn't needed. Below 1100 px, one column (view first, cards below). DOM order stays view then cards, so it reads the same with a keyboard. Heatmap/Overlay/Side-by-side tabs live in the same left column.

### 12.4 "What's happening" guide

`#result-guide` (a `<section class="guide panel" aria-labelledby="h-guide">`, heading `h2#h-guide` visually "What's happening").

**Summary sentence** (`#result-summary`, plain `<p>`, not live):
- FAIL, N changes: "N changes found between the before and after screenshots of {page}. Review each change below and decide what it is." (N = 1: "1 change found between ... Review it below and decide what it is.")
- PASS: "No unexpected changes found between the before and after screenshots of {page}. Save the run to keep a record." {page} is the page name, e.g. "Time & Labor – Timesheet".
- After a run is saved: replace the second sentence with "Saved as run 4." After sign-off: "Signed off by SA on 22 Nov 2026."

**Progress strip** `<ol id="result-steps" class="strip" aria-label="Review progress">`: four `<li class="strip-step" data-step="review|decide|save|signoff" data-status="done|current|todo|blocked">`. Each has the number, the label, an `.icon` (aria-hidden; check = done, filled dot = current, lock = blocked, empty ring = todo) and a `.strip-status` line **in text** (never colour only). The first step that isn't `done` gets `aria-current="step"`.

| Step | Label | todo / current text | done text | blocked |
|---|---|---|---|---|
| 1 | Review changes | "0 of 4 looked at" ("looked at" = a card was selected, focused or decided) | "All 4 looked at" | n/a |
| 2 | Decide | "0 of 4 decided" / "2 of 4 decided" | "All 4 decided" | n/a |
| 3 | Save run | "Not saved yet" | "Saved as run 4" | "Decide every change first (2 left)" (todo, not blocked; used while step 2 isn't done) |
| 4 | Sign off | "Not signed off" | "Signed off by SA" | "Not available: a change is marked Regression" (`blocked`); "Save the run first" while unsaved |

PASS: steps 1 and 2 are `done` with "Nothing to review" and "Nothing to decide"; step 3 is current. Signed-off runs with Promote still available show a fifth line under the strip, not a fifth step: "Next: Promote to baseline (optional)". The strip reflects `#result[data-review|data-saved|data-signoff]`, so Juno updates it from the same function that runs `updateActions()`.

**Next-step sentence `#result-next`** (Morgan 4f, verbatim; a plain `<p>` under the strip, `data-step` mirrors the active step; announce only when the active step changes, through `#announcer`):

| State | Sentence |
|---|---|
| FAIL, none decided | "The tool found 4 changes. Each is outlined on the screenshot. Next: click each change, then decide if it is Expected, Regression or Noise." |
| FAIL, some decided | "2 of 4 changes decided. Next: decide the other 2." |
| FAIL, all decided, Regression, unsaved | "Every change is decided, and at least one is a Regression. Next: save the run, then log a defect and attach the report. This page can't be signed off until the defect is fixed and retested." |
| FAIL, all decided, Regression, saved | "Saved. Sign-off is blocked while a change is marked Regression. Next: log a defect, attach the report, and compare again after the fix." |
| FAIL, all Expected/Noise, unsaved | "Every change is decided. Next: save the run (you will be asked for the test case, ticket, tools version and your initials)." |
| FAIL, all Expected/Noise, saved | "Saved. Next: a reviewer signs off. After sign-off you can make this screenshot the new baseline." |
| Signed off, FAIL | "Signed off. Next: promote the after-change screenshot to be the new baseline, or compare another page." |
| PASS, unsaved | "No differences found. Next: save the run as evidence, then sign off." |
| PASS, saved | "Saved. Next: sign off, then compare another page." |
| Signed off, PASS | "Signed off. Next: compare another page." |

So the two sentences don't repeat each other: `#result-summary` says **what was found** and `#result-next` says **what to do now**. Final rule: `#result-summary` is only the first sentence ("4 changes found between the before and after screenshots of Time & Labor – Timesheet." / PASS: "No unexpected changes found between the before and after screenshots of Time & Labor – Timesheet."), and the owner's "Review each change below and decide what it is." is covered by the first `#result-next` row. Both are always shown (never hidden on narrow screens). Under `#result-status`, one explain line (`#result-explain`, Morgan 4a): FAIL "FAIL means the tool found differences between the before and after screenshots. It does not mean something is broken. You decide that below." PASS "PASS means the tool found no differences. It checks how the page looks, not whether it works."

### 12.5 Plain stat labels

The stats stay a `<dl>`. Each `dd` has a one-line **always-visible** caption (`<p class="stat-note">`, referenced by `aria-describedby`), so nobody has to hover. Under the list, a `<details id="stats-help">` "What do these numbers mean?" holds the longer text. No hover-only tooltips (touch and keyboard users would miss them).

| `dt` (label) | `dd` value | Caption (always visible) |
|---|---|---|
| "Page changed" (`#stat-changed`) | "0.8% of the page" | "How much of the whole page looks different. A page also fails if it is above its limit (0.1% here)." (limit = the page's `thresholdPct`) |
| "Similarity (1.0 = identical)" (`#stat-ssim`) | "0.962 out of 1.0" | "A supporting number: how alike the two screenshots look overall. It does not decide PASS or FAIL." (Morgan section 2; `pipeline.js` FAIL rule: any change exists **or** % above the limit) |
| "Alignment" (`#stat-alignment`) | "None needed" or "Shifted 3 px down" | "None needed: the screenshots lined up. Shifted: the after screenshot was moved 3 px (down) to line it up before comparing, so a small scroll difference doesn't count as a change." |
| "Ignored areas" (`#stat-ignored`) | "None" or "2 zones (1.4% of page)" | "Areas you chose to leave out of the comparison." |
| "Comparison took" (`#stat-ms`) | "1.2 s" | none |
| "Your review time" (`#stat-review`) | "—" then "4 min 12 s" | none |

`#stats-help` content (draft, Morgan's definitions win): **Page changed** is the share of the screenshot's pixels that differ after small differences below the sensitivity are ignored. **Similarity** is the structural similarity score (SSIM), from 0 to 1. **Alignment** moves the after screenshot a few pixels, or rescales it slightly, so scrolling or a different zoom isn't flagged. **PASS** means no changes above this page's limit. **FAIL** means at least one change above the limit that someone must review. **Ignore zone** is an area you told the tool to skip, such as a timestamp. Last line: "Wording from the business analyst role. More on [How it works](how-it-works.html#reading)." (a `.credit` line; see 12.9).

### 12.6 The change card

#### Header words

Header text: **"Change N of M · {position} · {shape}"**, for example "Change 1 of 4 · middle of the page · tall narrow block". Screen readers read the `h3`, so the separator is a literal " · " in the visible text and the accessible name uses commas (see aria below).

**Superseded by Morgan 4b (use her wording and overrides, the code below is still the grid maths).** Final words: "top left of the page", "top of the page", "top right of the page", "middle left of the page", "middle of the page", "middle right of the page", "bottom left of the page", "bottom of the page", "bottom right of the page". Two overrides in order: (1) `changedPct > 30` or box covers at least 80% of the page area: "most of the page"; (2) box width at least two thirds of the page width: replace the horizontal word with "across the full width" ("top, across the full width"). Final shapes: H>=100 and W<300 "tall narrow block"; H>=100 and W>=300 "large block"; H<30 "thin strip"; W>=3H (H>=30) "wide strip"; else "small block" (Dex's thresholds, so words and hints agree). So the example (105 x 154 at 702, 338) reads **"Change 1 of 4 · middle of the page · tall narrow block"**. The two tables that follow are corrected to her words; `copy.position`, `copy.shape` and `copy.cause` in 12.11 are the strings to build from. Honest limit (Morgan): in a dense page several changes share one third, so words only orient; the highlight, badge and crops are the real tie-in.

**Position** (from the box centre in a 3 x 3 grid of the whole image; use the result's `width`/`height`):

```js
const col = Math.min(2, Math.floor(3 * (r.x + r.width / 2) / m.width));   // 0 left, 1 centre, 2 right
const row = Math.min(2, Math.floor(3 * (r.y + r.height / 2) / m.height)); // 0 top, 1 middle, 2 bottom
```

| | left | centre | right |
|---|---|---|---|
| top | top left of the page | top of the page | top right of the page |
| middle | middle left of the page | **middle of the page** | middle right of the page |
| bottom | bottom left of the page | bottom of the page | bottom right of the page |

The three rows are thirds of the **whole image**, so on a tall full-page capture "top" means the top third of the capture. The example region (105 x 154 at 702, 338 on 1366 x 900) has centre (754, 415), so col 1, row 1: "middle of the page".

**Shape** (box W x H in baseline pixels; first match wins; Morgan 4b, same thresholds as `js/hints.js` and `docs/erp/change-catalogue.md` section 4):

| Test | Words |
|---|---|
| H >= 100 and W < 300 | tall narrow block |
| H >= 100 and W >= 300 | large block |
| H < 30 | thin strip |
| W >= 3 x H (H >= 30) | wide strip |
| otherwise | small block |

#### Card contents, top to bottom

1. **Header row:** number badge (`.region-badge`, same number and colour as the box badge on the canvas), `h3.region-title` with the header text, and **Show on screenshot** (`.region-show`).
2. **Crops row** (`.region-crops`): two `<figure>`s side by side, each with a canvas and a visible `<figcaption>` "Before" / "After". Right of them, a small **locator** (`.region-locator`, `aria-hidden="true"`), a 72 x 48 canvas of the page outline with the box filled, so the user sees the position at a glance. The text header carries the same meaning, so the locator is decorative.
   Between header and crops, one locate line (`p.region-locate`, Morgan 4c): "Outlined in red on the screenshot, badge 1."
3. **Likely cause** (`div.region-cause`, Morgan 4d): bold lead-in "What this probably is:" + sentence, then "What to check:" + sentence (both from `copy.cause[hintId]`), then a small last line "This is a guess from the shape. You decide." Normal body text, not italic grey, and above the decision so the user reads it first.
4. **Decision** (`fieldset.decision`): legend "Your decision for change 1", the visible line "Is this change OK? Compare it with your change ticket.", then three `label.choice` rows each with name and help (12.7). **No radio is pre-selected (D15).**
5. **Not sure?** rule line under the group (12.7), always visible (no `<details>`: Morgan 4e).
6. **Note** (optional; placeholder per 12.7) and **Add ignore zone** with its visible help line (12.7).
7. **Details** (`details.region-details`, collapsed, Morgan 4b): summary "Details". Body one sentence: "105 × 154 pixels, top-left corner at x 702, y 338. Page size 1366 × 900." Pixels are in baseline pixels.

**Crops, how.** Source for each crop is the already-loaded `m.baseline` and `m.candidate` (canvas or ImageBitmap). `drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh)` with the crop box = region expanded by a margin of `max(16, round(0.25 * max(W, H)))` px each side, clamped to the image. Draw a dashed 2 px outline (red, with a dark under-stroke so it shows on any background) around the exact region inside both crops, so the eye finds what changed. Scale to fit at most 280 x 180 CSS px (set the canvas `width`/`height` attributes to the scaled pixel size, times `devicePixelRatio`, capped at 2; CSS `max-width: 100%; height: auto`). Draw lazily with an `IntersectionObserver` (plain `drawImage` if it is unavailable) so a run with 20 or more changes doesn't paint 40 canvases at once. Ignore zones are not drawn in crops. **This is Canvas 2D only; no `cv.Mat` is created**, so the Mat rule is unaffected. Release nothing on the main thread beyond the canvases being replaced on the next render.

**ARIA.** Each crop canvas: `role="img"`, `aria-label` "Before: middle of the page, tall narrow block, change 1" / "After: ..." (Morgan 4c wording). The `li` keeps `tabindex="0"` and gets `aria-label` "Change 1 of 4, middle of the page, tall narrow block, decision: not reviewed" (updated by `setDecision`, as today). Heading level: `h3` under the `h2` "Changes to review". Details and Not sure are native `<details>`.

**Card states** (`li.region[data-decision]` as today, plus `data-selected="true"` and `data-linked="true"`): not reviewed, Expected, Regression, Noise (decision shown by text in the radio and a small text tag in the header "Decided: Regression", not only by colour), selected (strong outline + the matching box drawn thick on the canvas), linked (the pointer is over the box on the canvas: light highlight on the card only).

### 12.7 Decision copy

All copy is Morgan 4e, verbatim. Legend: **"Your decision for change {n}"**, with the line "Is this change OK? Compare it with your change ticket." Each option is `label.choice` containing `input[type=radio]`, `span.choice-name` and `span.choice-desc` (the description sits inside the label, so a screen reader reads it with the name; visible text, not a `title`).

| Name | Help text |
|---|---|
| Expected | "This change was supposed to happen. It is part of the patch or upgrade." |
| Regression | "This change is a defect. Log it. The page can't be signed off until it is fixed." |
| Noise | "Not a real change, for example a time stamp or rendering. Safe to ignore." |

Rule line under the group (`p.region-rule`): "Not sure? Choose Regression and add a note. A reviewer can change it later." (D12; true because changing a decision after save clears sign-off, section 3a.) A **Noise** choice shows once under the group: "Will this change every time? Add an ignore zone so it stops showing up." (`p.region-noise-tip`, `hidden` unless Noise is checked.) Note placeholder: "For example: toolbar moved per CHG-0042"; when Regression is checked: "Say what is wrong, for example: Submit button missing". **Add ignore zone** help line: "Hides this area from every future comparison of this page. Use it for things that change every time, like a time stamp. It is not a security control."

Sign-off rules are unchanged (section 3a). New hint above the list (`#regions-lede`): "Decide every change. You can't sign off while any change is marked Regression." The old `title` attributes on radios are removed.

Announcements (`#announcer`): decision: "Change 2 marked Regression. 1 of 4 decided." (replaces "Region 2 marked ...").

### 12.8 Two-way link between cards and the screenshot

State: `S.selected` (index or -1), `S.hover` (index or -1, from canvas pointer or card hover/focus). `redrawBoxes(m, hover >= 0 ? hover : selected)`: hover/focus gives a temporary highlight, otherwise the selected box stays highlighted. The numbered badges on the canvas already use `i + 1`, so box numbers equal card numbers; keep it that way and never renumber after sorting (cards are in region order).

**Card to screenshot**
- Select a card by click, by **Enter** on the focused `li`, by focusing into it (Tab), or by pressing **Show on screenshot**.
- Selecting sets `data-selected`, clears the old one, thickens the matching box.
- **Show on screenshot** also: switches to the Boxes tab if another tab is active (announce "Showing change 2 on the Boxes view."), scrolls so the box is visible (`reveal(i)`, below), and leaves focus on the button. A small `#btn-back-to-card` ("Back to change 2") appears under the canvas so a keyboard user who scrolled can return.
- Focus or hover alone only highlights; it doesn't scroll (so tabbing through cards doesn't make the page jump).

**Screenshot to card**
- `click` on `#canvas-boxes`: convert with `imgX = (clientX - rect.left) * (canvas.width / rect.width)` (same maths as section 4), hit-test the boxes expanded by 6 CSS px (smaller of two overlapping boxes wins), select the card, scroll it into view (`li.scrollIntoView({block: 'center', behavior: 'auto'})`) and **move focus to the card** (`li.focus({preventScroll: true})` after scrolling) so a screen-reader user lands on it.
- `pointermove` over a box: set `S.hover`, cursor `pointer` (class `is-over-box` on the canvas wrap; Sable styles the cursor), mark the card `data-linked`. Leaving clears it.
- Click on empty canvas: no change.
- `#boxes-hint` under the canvas: "Click a numbered box to jump to its card. Using a keyboard? Tab through the cards; each one highlights its box."

**`reveal(i)`**: if `.canvas-wrap` scrolls (sticky layout or tall capture), set its `scrollTop`/`scrollLeft` so the box centre sits in the middle; then `wrap.scrollIntoView({block: 'nearest'})` for the page. Respect `prefers-reduced-motion`: always `behavior: 'auto'` (no smooth scrolling anywhere).

Selecting a card marks it "looked at" for the progress strip.

### 12.9 First-run intro and "Who built this"

**Intro card** (`#intro-card`, `role="region"`, `aria-labelledby="intro-title"`) shown at the top of the Library on first visit. **Settings key is `onboardingSeen`** (Morgan 4g, Atlas; this replaces the `introDismissed` name in the task brief; no schema change, the `settings` store already holds `engineSeen`). Title "What this tool does"; exactly three sentences (Morgan 4g, copy in 12.11), then the positioning line in smaller text (not counted in the three). Buttons: **Load sample** (primary, the same action as the main button) and **Got it** (`settingsDb.set('onboardingSeen', true)`; if storage is blocked, show every visit, no error), plus a link "How it works". **Got it** moves focus to **Load sample**. A Library link "What does this tool do?" reopens it. **Reset app data** clears the flag, so it returns after a reset. It sits above, and never covers, the main Load sample button. Show it whenever `onboardingSeen` isn't true (empty or not); Morgan's rule, and a returning-but-never-dismissed user still benefits. Under Load sample, a hint: "The sample is a fictional Timesheet page with a few deliberate changes."

**Where the team shows up.** The AI agent team is not part of the running app, so the product only says so in three quiet places:
1. `how-it-works.html#team` (section below; Morgan's id).
2. A footer line on every page: "Built and reviewed by a team of AI agents. [Who built this](how-it-works.html#team)." (`.credit`).
3. Small `.credit` lines where a role's work is visible: under the capture tip ("The capture standard is from the PeopleSoft administrator role."), at the end of the "What do these numbers mean?" panel ("Wording from the business analyst role."), under "Likely cause" help (see 12.11, "Cause rules are from the PeopleSoft developer role."), and under the evidence form heading ("Fields follow the test lead's evidence standard."). Each links to `#team`. They're short, secondary text and never a reason a task is blocked.

**`how-it-works.html`, new section `team`** (h2 "Who built this"; Morgan's id and text). **Use section 5 of `docs/erp/plain-language-results.md` verbatim**: the opening paragraph (17 AI assistants, **not part of the running app**, nothing talks to an AI while you work), the 17-row table (Name, Role, What they did, Model tier, in a `.table-wrap` so it fits at 375 px), and the closing paragraph. I add one column to the table for UX, **"Where you see it in the app"** (Should): Morgan, "the wording of results, PASS/FAIL and the three decisions"; Riley, "the sample pages"; Dex, "the 'What this probably is' lines"; Hal, "the capture tip"; Vera, "the 'not a security control' lines"; Tess, "Expected / Regression / Noise, the Save run form, sign-off"; Iris/Volt/Ledger, "the comparison, its speed, Reset app data"; Wren/Sable/Juno/Mason, "every screen and the Demo ERP"; Quinn/Piper, "the checks and the README"; Atlas, "nowhere in the app". This is what answers the owner's question "where do the agents come in". Order in the page: `what`, `steps`, `pipeline`, `capture`, `reading`, `zones`, `storage`, `limits`, then **`try-real`** (Riley's section, `docs/erp/peoplebooks-try-it.md`, keep this slot free), then `team` last; the TOC lists them in that order. Add `<li><a href="#team">Who built this</a></li>`.

- Link to the log (Atlas asked for it here; Morgan prefers Resources only): put "Read the log: [docs/handoff-log.md](docs/handoff-log.md)" under the closing paragraph as a same-site relative link, and the same link in `resources.html#project`. **Link target is unverified**: I did not find the GitHub repository URL anywhere in the repo (`grep` for github.com in `*.md`, `*.html`, `*.js` found only third-party tools). Because the site publishes `.` on Netlify, the relative path `docs/handoff-log.md` works without a third-party host and passes `tools/privacy_audit.py`. If Atlas supplies the repo URL, add a second link "View on GitHub" with `target="_blank" rel="noopener noreferrer"` and check the privacy audit allows it. Same link goes in the `project` section of `resources.html`.
- Names are team names, not people; all data in the app is fictional.

### 12.10 Keyboard and screen-reader rules (new interactions)

- **Every canvas action has a non-canvas twin.** Click-a-box to select a card has Tab to the card plus Enter; the box highlight follows card focus. **Show on screenshot** is a real button.
- Card `li`: `tabindex="0"`, **Enter** selects it (ignore Enter when the target is an input, button or summary; those keep their own behaviour). **Space** isn't bound (it scrolls and activates controls). No single-key shortcuts (WCAG 2.1.4).
- Tab order inside a card: card, Show on screenshot, the three radios (one tab stop, arrows move), Not sure?, Note, Add ignore zone, Details. No tab stops on crops or the locator.
- Crops: `role="img"` with the labels in 12.6, so the alt text comes from the card header. The locator is `aria-hidden="true"`.
- **Live regions:** unchanged at three. `#announcer` gets: the result sentence (once), "Change 2 of 4 selected: top right, wide strip." on card select by click or Enter (not on plain Tab focus, so tabbing is quiet), "Showing change 2 on the Boxes view.", and the decision line. `#result-summary` and `#result-steps` are **not** `aria-live` (D13); they are plain text readers find in reading order.
- Progress strip: `<ol>` with `aria-label`; `aria-current="step"` on the current step; every status is text.
- Focus after card select by canvas click: the card. After **Show on screenshot**: stays on the button. After **Got it** on the intro: **Load sample**.
- Focus ring: `:focus-visible` 2 px, as section 7, also on `li.region` (it is a focus target) and `details > summary`.
- Targets at least 44 x 44 px for **Show on screenshot**, **Got it**, radio labels and summary rows.
- Reduced motion: no smooth scroll, no fade on highlight changes.
- **Contrast:** the numbered badge on the card must match the badge on the canvas (`#b3001b` on white text); Sable runs `tools/contrast_check.py` for the new pairs: `.region-cause`, `.choice-desc`, `.stat-note`, `.credit`, `.strip-status` in light, dark and the highlight outline against the card.
- **CSP:** no inline scripts, no `style=` attributes, no `onclick`. Crops and locator are canvases sized by attributes; selection and progress are `data-*` attributes and classes, never inline widths; any dynamic value goes through `el.style.setProperty` only.

### 12.11 Copy for `js/copy.js` (Juno: add under these keys)

```js
// UX-2 result clarity (docs/design/ux-flows.md section 12). Fictional data only.
result: {
  statusFail: (n, pct) => `FAIL — ${n === 1 ? '1 change found' : `${n} changes found`} (${pct} of the page)`,
  // pct is fmtPct(): "0.8%" or "under 0.1%"
  statusPass: 'PASS — no unexpected changes',
  announceFail: (n, pct) => `Comparison finished. FAIL, ${n === 1 ? '1 change' : `${n} changes`} found, ${pct} percent of the page changed.`,
  announcePass: 'Comparison finished. PASS, no unexpected changes.',
  guideTitle: "What's happening",
  summaryFail: (n, page) => n === 1
    ? `1 change found between the before and after screenshots of ${page}. Review it below and decide what it is.`
    : `${n} changes found between the before and after screenshots of ${page}. Review each change below and decide what it is.`,
  summaryPass: page => `No unexpected changes found between the before and after screenshots of ${page}. Save the run to keep a record.`,
  summarySaved: (page, runId) => `Saved as run ${runId}.`,
  summarySigned: (who, when) => `Signed off by ${who} on ${when}.`,
  nextPromote: 'Next: Promote to baseline (optional).',
  regionsTitle: 'Changes to review',
  regionsLede: "Decide every change. You can't sign off while any change is marked Regression.",
  progress: (k, n) => `${k} of ${n} decided`,
  boxesHint: 'Click a numbered box to jump to its card. Using a keyboard? Tab through the cards; each one highlights its box.',
  backToCard: n => `Back to change ${n}`,
},
steps: {
  label: 'Review progress',
  names: { review: 'Review changes', decide: 'Decide', save: 'Save run', signoff: 'Sign off' },
  reviewTodo: (k, n) => `${k} of ${n} looked at`,
  reviewDone: n => `All ${n} looked at`,
  reviewNone: 'Nothing to review',
  decideTodo: (k, n) => `${k} of ${n} decided`,
  decideDone: n => `All ${n} decided`,
  decideNone: 'Nothing to decide',
  saveTodo: 'Not saved yet',
  saveWait: n => `Decide every change first (${n} left)`,
  saveDone: id => `Saved as run ${id}`,
  signTodo: 'Not signed off',
  signNeedSave: 'Save the run first',
  signBlocked: 'Not available: a change is marked Regression',
  signDone: who => `Signed off by ${who}`,
},
stats: {
  changed: { label: 'Page changed', value: pct => pct, note: limit => `How much of the screenshot looks different. This page fails above ${limit}.` },
  ssim: { label: 'Similarity (1.0 = identical)', value: v => `${(+v).toFixed(3)} out of 1.0`, note: 'How alike the two screenshots look. For information only; PASS or FAIL comes from the percent changed.' },
  alignment: {
    label: 'Alignment',
    none: 'None needed',
    // dx, dy from the worker; WORDS FOR DIRECTION ARE UNVERIFIED until Iris confirms the sign convention.
    shifted: (dx, dy) => 'Shifted ' + [dx ? `${Math.abs(dx)} px ${dx > 0 ? 'right' : 'left'}` : '', dy ? `${Math.abs(dy)} px ${dy > 0 ? 'down' : 'up'}` : ''].filter(Boolean).join(' and '),
    noteNone: 'The screenshots lined up, so nothing was moved before comparing.',
    noteShifted: (dx, dy) => `The after screenshot was moved (${dx}, ${dy}) pixels to line it up before comparing, so a small scroll difference doesn't count as a change.`,
  },
  ignored: { label: 'Ignored areas', none: 'None', note: 'Areas you chose to leave out of the comparison.' },
  took: { label: 'Comparison took' },
  review: { label: 'Your review time' },
  helpSummary: 'What do these numbers mean?',
  help: [
    ['Page changed', "The share of the screenshot's pixels that look different, after tiny differences are ignored."],
    ['Similarity', 'A score from 0 to 1 for how alike the screenshots look to a person (SSIM). 1.0 means identical.'],
    ['Alignment', "The tool moves the after screenshot a few pixels, or rescales it slightly, so scrolling or a small zoom difference isn't flagged."],
    ['PASS', "No change above this page's limit."],
    ['FAIL', "At least one change above the limit. Someone needs to review it."],
    ['Ignore zone', 'An area you told the tool to skip, such as a timestamp. It is not a security control.'],
  ],
  helpCredit: 'Wording from the business analyst role.',
},
card: {
  title: (i, n, pos, shape) => `Change ${i} of ${n} · ${pos} · ${shape}`,
  aria: (i, n, pos, shape, decision) => `Change ${i} of ${n}, ${pos}, ${shape}, decision: ${decision || 'not reviewed'}`,
  cropAria: (which, i, n, pos, shape) => `${which}: change ${i} of ${n}, ${pos}, ${shape}`,
  before: 'Before', after: 'After',
  show: 'Show on screenshot',
  showAnnounce: i => `Showing change ${i} on the Boxes view.`,
  selectAnnounce: (i, n, pos, shape) => `Change ${i} of ${n} selected: ${pos}, ${shape}.`,
  causeCredit: 'Cause rules are from the PeopleSoft developer role.',
  noteLabel: 'Note (optional)',
  zoneBtn: 'Add ignore zone',
  decided: d => `Decided: ${d}`,
  marked: (i, d, k, n) => `Change ${i} marked ${d}. ${k} of ${n} decided.`,
},
position: {   // Morgan 4b. Keys: `${row}-${col}`; overrides 'most' and 'fullwidth' apply first.
  'top-left': 'top left of the page', 'top-centre': 'top of the page', 'top-right': 'top right of the page',
  'middle-left': 'middle left of the page', 'middle-centre': 'middle of the page', 'middle-right': 'middle right of the page',
  'bottom-left': 'bottom left of the page', 'bottom-centre': 'bottom of the page', 'bottom-right': 'bottom right of the page',
  most: 'most of the page',
  fullwidth: row => `${row}, across the full width`,   // row = 'top' | 'middle' | 'bottom'
},
shape: { tall: 'tall narrow block', large: 'large block', thin: 'thin strip', wide: 'wide strip', small: 'small block' },
decision: {   // Morgan 4e, verbatim
  legend: n => `Your decision for change ${n}`,
  intro: 'Is this change OK? Compare it with your change ticket.',
  Expected: 'This change was supposed to happen. It is part of the patch or upgrade.',
  Regression: "This change is a defect. Log it. The page can't be signed off until it is fixed.",
  Noise: 'Not a real change, for example a time stamp or rendering. Safe to ignore.',
  rule: 'Not sure? Choose Regression and add a note. A reviewer can change it later.',
  noiseTip: 'Will this change every time? Add an ignore zone so it stops showing up.',
  notePh: 'For example: toolbar moved per CHG-0042',
  notePhRegression: 'Say what is wrong, for example: Submit button missing',
  zoneHelp: 'Hides this area from every future comparison of this page. Use it for things that change every time, like a time stamp. It is not a security control.',
},
cause: {   // Morgan 4d: [what this probably is, what to check]; keyed by hint id; unknown ids use 'unclassified'
  lead: 'What this probably is:', check: 'What to check:', guess: 'This is a guess from the shape. You decide.',
  'grid-layout': ['A table or grid changed: a column is wider or narrower, or shifted.', 'Look for values that are cut off, for example an amount ending early.'],
  'reflow': ['Something above this area changed and pushed the content below it. This block is the knock-on effect, not the cause.', 'Look at the top edge of the outline for the first real change, such as a moved toolbar or a removed field.'],
  'control-moved': ['A button or link moved: the same shape appears at an old and a new position.', 'Check the change ticket for a toolbar or layout change.'],
  'label-text': ['A small piece of text changed: a label, a message, or a value such as a date or time.', 'If it changes on every capture, consider an ignore zone.'],
  'peoplecode-visibility': ['A field or button appeared, disappeared or turned grey.', 'Compare with the change ticket. This can come from page or PeopleCode changes, or from a different role or Business Unit. It does not prove that access (authorization) is right.'],
  'page-definition-field': ['A field was added, removed or moved on the page.', 'Check the page in Application Designer, or the change ticket.'],
  'style-branding': ['Colours, fonts or spacing changed.', 'This is typical of a style sheet or branding change, for example a PeopleTools upgrade.'],
  'dynamic-content': ['This may be a value that changes every time, such as a date, time, user or ID.', 'If it is, choose Noise and add an ignore zone.'],
  'whole-page': ['Most of the page looks different: a new theme, or Classic changed to Fluid or Classic Plus.', 'Consider capturing a new baseline instead of reviewing each change.'],
  'configuration-values': ['Values or defaults differ.', 'Check that both screenshots used the same test data, Business Unit and SetID.'],
  'capture-artifact': ['Many small changes with little of the page changed: often a capture difference, not a real change.', 'Capture again at 100% zoom, same window size, same browser.'],
  'unclassified': ['The tool can see a difference here but cannot guess the cause.', 'Look at the before and after crops, then decide.'],
},
locate: n => `Outlined in red on the screenshot, badge ${n}.`,
detailsSummary: 'Details',
detailsLine: (w, h, x, y, pw, ph) => `${w} × ${h} pixels, top-left corner at x ${x}, y ${y}. Page size ${pw} × ${ph}.`,
intro: {   // Morgan 4g, three sentences; settings key onboardingSeen
  title: 'What this tool does',
  body: 'This tool compares a before and an after screenshot of an ERP page and shows you what changed. You decide whether each change is expected, a defect, or just noise, and save the result as test evidence. Everything stays in your browser: nothing is uploaded and nothing is sent anywhere.',
  positioning: 'A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing.',
  dismiss: 'Got it', more: 'How it works', reopen: 'What does this tool do?',
},
team: {
  footer: 'Built and reviewed by a team of AI agents.',
  footerLink: 'Who built this',
  captureCredit: 'The capture standard is from the PeopleSoft administrator role.',
  evidenceCredit: "Fields follow the test lead's evidence standard.",
},
```
(Section 12.16 adds the whole-app first-use copy: `landing`, `tour`, `nav`, `empty`, per-screen purpose lines.)

Notes on the copy: the `intro.body` is three sentences, as asked. Position, shape and cause maps keep all user-facing words in one file; `js/hints.js` and `js/region-hints.json` still decide *which* id applies, and `region-hints.json` `label`/`hint` are no longer shown (Dex: keep the ids stable). The `how-it-works.html` strings in 12.9 live in the HTML (static page, no JS).

### 12.12 New ids and classes (Sable styles, Juno builds)

Ids: `result-guide`, `h-guide`, `result-summary`, `result-steps`, `stats-help`, `boxes-hint`, `btn-back-to-card`, `regions-lede`, `result-next`, `result-explain`, `intro-card`, `intro-title`, `intro-dismiss`, `intro-more`; per card, `region-{n}-title` (`h3`) and the `canvas` ids are generated (`crop-before-{n}`, `crop-after-{n}`, `locator-{n}`). On `how-it-works.html`: `team` (and Riley's `try-real`). Extra card classes: `region-locate`, `region-rule`, `region-noise-tip`. Whole-app ids and classes are in 12.16.

Classes: `guide`, `strip`, `strip-step` (`[data-step]`, `[data-status="done|current|todo|blocked"]`), `strip-status`, `stat-note`, `credit`, `result-layout` (two-column from 1100 px, view column sticky), `region-head`, `region-badge` (same colour and number as the canvas badge), `region-title`, `region-show`, `region-crops`, `region-crop` (the figure), `region-locator`, `region-cause`, `region-help` (the Not sure details), `region-details`, `choice`, `choice-name`, `choice-desc`, `is-over-box` (on `.canvas-wrap` while the pointer is over a box).

Data attributes: `li.region[data-selected="true"]`, `li.region[data-linked="true"]`, `li.region[data-decision]` (as today), `.strip-step[data-status]`.

Class glossary update (section 8a): add the above to "Result views" and "Result area" groups.

Template `tpl-region` replacement (Juno builds from this; no inline style or handlers):

```html
<template id="tpl-region">
  <li class="region" tabindex="0" data-region="" data-decision="unreviewed">
    <div class="region-head">
      <span class="region-badge" aria-hidden="true"></span>
      <h3 class="region-title"></h3>
      <button class="btn region-show" type="button"></button>
    </div>
    <div class="region-crops">
      <figure class="region-crop"><canvas class="crop-before" role="img"></canvas><figcaption>Before</figcaption></figure>
      <figure class="region-crop"><canvas class="crop-after" role="img"></canvas><figcaption>After</figcaption></figure>
      <canvas class="region-locator" width="72" height="48" aria-hidden="true"></canvas>
    </div>
    <p class="region-cause"><strong>Likely cause:</strong> <span class="region-cause-text"></span></p>
    <fieldset class="decision">
      <legend>What is this change?</legend>
      <label class="choice"><input type="radio" value="Expected"><span class="choice-name">Expected</span><span class="choice-desc"></span></label>
      <label class="choice"><input type="radio" value="Regression"><span class="choice-name">Regression</span><span class="choice-desc"></span></label>
      <label class="choice"><input type="radio" value="Noise"><span class="choice-name">Noise</span><span class="choice-desc"></span></label>
    </fieldset>
    <details class="region-help"><summary>Not sure?</summary><p></p></details>
    <label class="field">Note (optional)<input class="region-note" type="text" autocomplete="off"></label>
    <div class="actions">
      <button class="btn region-zone" type="button">Add ignore zone</button>
      <span class="hint region-zone-hint"></span>
    </div>
    <details class="region-details"><summary>Details (pixels)</summary><dl class="region-dl"></dl><p class="hint"></p></details>
  </li>
</template>
```
(Visible text in the template is filled from `copy.js` in JS; the English in the template is the fallback and the source for review.)

### 12.13 Verification additions for Quinn

1. Load sample (Timesheet): the summary sentence names "Time & Labor – Timesheet" and the number of changes; the strip shows step 1 current, "0 of N decided".
2. Each card header reads "Change n of N · {position} · {shape}" with no pixel numbers outside **Details**; the example region (105 x 154 at 702, 338 on 1366 x 900) reads "centre of the page" and "tall block".
3. Before and After crops show the region with a margin and an outline; their `aria-label` equals the header.
4. Click each numbered box: the card with the same number is selected, focused and scrolled into view. Press **Show on screenshot**: the Boxes tab opens, the box is highlighted and visible, **Back to change n** returns. Keyboard-only: Tab to a card, Enter, Show on screenshot, no mouse.
5. Decide cards: the strip updates (2 of 4 decided), the announcer says "Change 2 marked Regression. 1 of 4 decided.", sign-off stays blocked with its exact text.
6. Stats read "Page changed 0.8%", "Similarity (1.0 = identical) 0.962 out of 1.0", "Alignment None needed" (and the shifted pair reads "Shifted 3 px down" only after Iris confirms the direction).
7. Fresh profile: intro card with three sentences; **Got it** hides it and it stays hidden after reload; Reset app data brings it back.
8. How it works has `#team` (17 rows), a slot kept free for `#try-real`, and a working `docs/handoff-log.md` link; the footer line is on all pages; no horizontal scroll at 375 px.
8a. On arrival at a result, **no radio is checked** on any card (D15).
8b. `#pipeline` on How it works says FAIL happens when any change is found **or** the percent is above the limit.
9. No CSP violations; Network quiet; `tools/contrast_check.py` covers the new text pairs; update the existing tests that match "changed region" or "Aligned: shift".

### 12.14 Before / after

| What the owner said | What it was | How it is resolved |
|---|---|---|
| "what the hell is region 1" | A bare "Region 1 of 4: 105 by 154 pixels at 702, 338" | "Change 1 of 4 · centre of the page · tall block", a Before/After picture, a locator, a plain "Likely cause" sentence; pixels are in a collapsed Details |
| "there is not tie in to the screenshot" | Card hover only redrew the canvas one way | Two-way link: selecting a card highlights and scrolls to its box; clicking a box selects its card; **Show on screenshot** and **Back to change n** work from the keyboard; numbers match; sticky screenshot on wide screens |
| "what is expected, regression or noise" | Three bare radios | Each option has a one-line plain description, a "Not sure?" tip that fails safe, and a lede that says what blocks sign-off |
| "doesn't tell a user what exactly is going on or needed" | A red FAIL and raw numbers | "What's happening" sentence plus a 4-step progress strip that says what's done and what is next; plain stat labels with a caption each and a glossary; the result announcement says "changes", not "regions" |
| "Region 1 of 4: 105 by 154 pixels at 702, 338" | Raw box coordinates in the title | Words for position and shape in the title; coordinates under Details with plain labels |
| "where do all these agents and team come in... like the business analyst" | The team was invisible | How it works "Who built this" with a role-to-feature table and the handoff log link; a footer line on every page; small credit lines where a role's work is visible; it says the agents are **not** part of the running app |
| (unspoken) first-run confusion | The empty Library said what to click, not what the tool is | Three-sentence dismissible intro (`introDismissed`) |

### 12.15 Handoffs (for Atlas to route)

- **Juno:** build 12.3 to 12.12 (`js/app.js`, `js/views.js` for crops, locator, click hit-test and persistent highlight; `js/copy.js`; `index.html` template; `how-it-works.html` `#team`, the `#pipeline` FAIL-rule fix and footer line on all three pages; `resources.html` `project` link). Use settings key `onboardingSeen` (not `introDismissed`) through `settingsDb`. **Then build 12.16.**
- **Sable:** style 12.12 (card layout, crops, strip, stat notes, `.credit`, sticky two-column layout at 1100 px, `is-over-box` cursor, selected/linked states) and run `tools/contrast_check.py` on the new pairs.
- **Morgan:** reconcile the definitions in 12.5, 12.7 and the "Who built this" table with `docs/erp/plain-language-results.md`; confirm D12 ("when unsure, choose Regression").
- **Iris:** confirm what `alignment.dx`/`dy` mean (which image moved, which way) so "Shifted 3 px down" is true (D11).
- **Dex:** confirm the shape cut-offs in 12.6 and keep the hint ids stable; review the plain cause sentences.
- **Quinn:** update tests that match "changed region", "Region n marked" and "Aligned: shift" (D8, D11); add 12.13.
- **Atlas:** supply the GitHub repo URL if the handoff log should link there (12.9).

### 12.16 Whole-app first-use journey (owner: "i have no idea what in the world i'm suppose to do or why")

Priority tags: **Must** = Juno builds first; **Should** = after the Musts. Everything here supersedes sections 1 to 10 where it conflicts (screen names, the empty Library, nav labels). The result-screen work in 12.3 to 12.8 stays (it is where the owner's earlier complaint lives).

#### 12.16.1 First-use audit (every screen, as someone who has never heard of visual regression testing)

**Method and limit.** Atlas asked for Playwright screenshots of every screen. **I could not take them: this session has no shell tool, so I cannot start the server or Playwright.** The audit below comes from the skeleton (section 8), `js/app.js`, `js/copy.js`, the owner's card screenshot and the owner's two quotes. Treat it as a code-reading audit; Quinn should confirm each row against the running app. **Unverified visually.**

| Screen | Where a first-timer can't tell what this is for or what to do next | Fix (section) |
|---|---|---|
| Header, every screen | Six nav items shown at once ("Library", "Compare", "History", "Settings") on an empty app; two of them lead nowhere yet. The pill's first words are "Loading OpenCV (10 MB, first visit only)…", which means nothing to a tester. | 12.16.4, 12.16.7 |
| Library (empty) | H1 "Library" says nothing about purpose. The panel says "Compare a page before and after a change" but never says what the tool shows you or why. Two buttons ("Load sample", "New page") and a dropdown "Sample pair" compete; "New page" asks for a name, a module and a baseline PNG before the user has seen any value. | 12.16.2, 12.16.3 |
| Compare | "Baseline" is jargon. Ignore zones, "Add zone manually", a capture tip and Advanced (threshold T, kernel) all appear before the user has pressed Compare once. Three numbered panels but no sentence says "this will show what changed". The disabled Compare needs a hint to be understood. | 12.16.3, 12.16.5 |
| Result | A red FAIL with no explanation; "Region 1 of 4 ... 702, 338"; three unexplained radios; SSIM and "Aligned: shift (0, 3)"; six buttons (Sign off, Promote to baseline, Print report ...) at once, some disabled. | 12.3 to 12.8, 12.16.5 |
| Save run dialog | Nine fields, four required, jargon ("Tools version / PUM image") with no explanation of why they matter. | 12.16.5 |
| History | Nine-column table, two export buttons, before any run is saved; "History" of what? | 12.16.4, 12.16.5 |
| Settings | Storage figures and "persist status" mean little; the only action is a red destructive button. No sentence says what the screen is for. | 12.16.6 |
| How it works | The best explanation in the app is the **last** nav item, in a long page, and a first-timer never goes there. | 12.16.2 (tour), 12.16.4 |

#### 12.16.2 The landing state and the guided demo (Must)

**Rule: in under 10 seconds the user reads why (one sentence) and sees what to do (one button).**

Landing = the Library when it has no pages (route `#/library`, `#main[data-state="ready-empty"]`). It replaces `#library-empty`. Contents, top to bottom, nothing else above the fold:

1. `h1#h-library`: **"Compare a page before and after a PeopleSoft update, and see exactly what changed on screen."** (the owner's sentence, word for word; `document.title` stays "My pages - ERP Visual Regression Inspector".)
2. **One primary button** `#btn-load-sample` (keep this id so existing tests still find it): **"Try the demo (30 seconds)"**. Hint under it: "Uses a fictional Timesheet page. Nothing leaves your browser."
3. **Secondary** text-style button `#btn-new-page`: **"Compare my own screenshots"** (opens New page, 12.16.3).
4. `<details id="intro-card">` "What this tool does" (collapsed): Morgan's three sentences and the positioning line (12.11 `intro`). **Got it** is not needed on the landing; the details stays closed. (Morgan's `onboardingSeen` now means "has seen or skipped the tour", see below.)
5. `<details id="more-samples">` "Try a different demo" holding `#sample-select` (**Should**; hides the dropdown).

No sample dropdown, no module picker, no nav items except "My pages", "How it works", "Resources" (12.16.4).

**Guided demo (the tour).** Pressing **Try the demo** loads the sample (existing logic, section 2), starts the comparison in the background, and opens the tour. The tour is a docked, non-modal panel `#tour` at the top of `#main` (the screenshots below it stay the hero; nothing is blocked or `inert`), plus a stage `#tour-stage` that shows the images for steps 1 to 3. One sentence per step. Buttons: **Next** (primary), **Back** (secondary, Should), and a **Skip tour** link-style button.

| Step | Heading and sentence (exact) | Stage shows | Next button | Notes |
|---|---|---|---|---|
| 1 | "Step 1 of 5. This is the page before the update." | `#tour-before`: the baseline canvas, captioned "Before: Time & Labor – Timesheet (a fictional demo page)" | Next | Available as soon as the sample baseline is decoded (no need for OpenCV) |
| 2 | "Step 2 of 5. This is the same page after the update." | `#tour-after`: the after-change canvas, caption "After" | Next | A **Flip between before and after** toggle button (Should) swaps the two so the eye catches the difference |
| 3 | "Step 3 of 5. The inspector found {N} changes, highlighted in red." (N = 1: "found 1 change, highlighted in red.") | The real boxes canvas with numbered badges (`#canvas-boxes`) | Next, `aria-disabled` with hint "Still comparing, a moment." until the result exists | While waiting the sentence reads "Step 3 of 5. The inspector is comparing the two pages…" with the pill progress; on result it switches and the announcer says "Comparison finished. {N} changes found." once. If the comparison fails: "The demo comparison didn't finish. [Try again] [Skip tour]" (error panel rules, section 6) |
| 4 | "Step 4 of 5. Decide what each change is." | The Result screen is shown, with change card 1 scrolled into view and its box highlighted | Next | Help line allowed under the sentence (one more sentence is the limit): "Expected means it was meant to change, Regression means it is a defect, Noise means it is harmless." Nothing is auto-decided |
| 5 | "Step 5 of 5. Save it as evidence." | The Result screen with the primary action button outlined | **Finish** (not Next) | Under it: "Once every change is decided, Save run keeps the result and Sign off confirms it." If storage is blocked add: "Saving isn't available in this browser, but you can download the evidence." |

Behaviour:
- **Skip tour** works on every step. It closes the panel, sets `onboardingSeen`, and leaves the user on the Result screen once the comparison is ready (if it's still running, on the Compare screen with the working state). Esc inside the panel = Skip. It never loses the user's place: the demo page stays in **My pages**.
- **Finish** closes the panel, sets `onboardingSeen`, announces "Tour finished. Decide each change, then save the run.", and moves focus to the first change card (`li.region`).
- Each step change moves focus to the step heading (`#tour-title`, `tabindex="-1"`). The panel itself is not an `aria-live` region (D13); the focus move is what announces it. Step 3's "found N changes" is also sent once to `#announcer`, so don't repeat it elsewhere.
- Refreshing during the tour ends it (no tour state is stored); the user lands on **My pages** with the demo page, where a one-line banner `#tour-again` says "Take the 30-second tour" (hidden once `onboardingSeen` is true, or when the user presses its **Dismiss**; plus a **Take the tour again** link in the page footer area on My pages, Should).
- The tour uses the existing result data. It adds **no** new computation and **no** `cv.Mat` (the Mat rule is unaffected).
- Reduced motion: no animated transitions between steps.

#### 12.16.3 "Compare my own screenshots" (Must for the copy; Should for the field changes)

Button opens the New page form, trimmed to what is needed (**Should**): **Page name** (suggested from the file name once a file is chosen) and **Before screenshot** (drop, paste or choose). **Module** moves into a `<details>` "More options" (default HCM, as today). Submit button: **"Create page and continue"**; then the Compare screen.

Compare screen plain-language copy (**Must**, replaces the panel headings and hint of section 8; ids unchanged):
- `p.screen-purpose` under the h1: "Add a screenshot taken after the update, then press Compare. The inspector shows what changed."
- Panel 1 `h2`: "1. Before the update" with sub-line "This is your baseline: the approved screenshot every later one is checked against."
- Panel 2 `h2`: "2. After the update" (drop text unchanged: "Drop the after-change screenshot here" becomes "Drop the screenshot taken after the update").
- Panel 3 `h2`: "3. Compare". The primary action follows section 6 (Choose screenshot, then Compare).
- The capture tip stays (fixed sentence, section 5), now under panel 2 as well as under the baseline only when a baseline was just added (unchanged rule).
- **Ignore zones** (the zone list, the zone summary and **Add zone manually**) move into `<details id="zones-details">` with summary "Skip areas that always change (ignore zones)" (**Should**; collapsed until at least one zone exists, then open). The canvas drag-to-draw hint stays inside it.
- **Advanced** stays collapsed (already). Label "Sensitivity (threshold T, 1–255)" stays in Advanced only.

#### 12.16.4 Navigation: plain names and progressive reveal

**Must (renames).** Nav labels and h1s: **My pages** (route `library`), **Compare**, **Past results** (route `history`; h1 "Past results", was "Run history"), **Settings**, **How it works**, **Resources**. Update `copy.screens` (`library: 'My pages'`, `history: 'Past results'`) and the `<title>`s. Route hashes and `data-route` values do not change.

**Should (reveal).** Items are `hidden` (so not in the tab order) until relevant: **Compare** shown once at least one page exists; **Past results** once at least one run is saved. **My pages**, **Settings**, **How it works**, **Resources** are always shown. A direct hash to a hidden route still works and falls back as in section 1. The skeleton and `app-nav` markup are otherwise unchanged. **How it works** is also reachable from the landing details and from the tour's last step footer ("Learn more: How it works").

#### 12.16.5 Progressive disclosure table

| Thing | Shown when | Until then | Priority |
|---|---|---|---|
| Purpose sentence under every h1 (`p.screen-purpose`, 12.16.6) | Always | n/a | **Must** |
| Landing: one primary button, one secondary | Library has no pages | n/a | **Must** |
| Guided demo | First run, or "Take the tour again" | `onboardingSeen` true hides the banner | **Must** |
| Advanced settings (threshold, kernel, minimum size, alignment) | User opens Advanced | Collapsed (already) | **Must** (keep) |
| Region/change card extras: Not sure? rule, Details | Details collapsed, rule always visible | Details collapsed | **Must** (12.6) |
| Ignore zone list and manual zone form | `#zones-details` opened, or a zone exists | Collapsed | Should |
| New page "Module" | "More options" opened | Collapsed, default HCM | Should |
| Evidence fields beyond the four required (Business unit, Role, Environment, Note, Role-based test) | User opens `<details>` "More details (optional)" in the Save run dialog; remembered per session | Collapsed. The four required fields stay visible with a one-line why: "These identify the test in your defect tracker and the audit record." | Should |
| Sign off and Promote buttons | Each becomes the primary action in its turn (table 3a). Before that, the progress strip and `#result-next` carry the reason (e.g. "Sign-off is blocked while a change is marked Regression"). Both buttons are `hidden`, not just disabled | Hidden | Should (this supersedes D5 **only for these two buttons**; Save run and Compare keep `aria-disabled` + reason because users reach them early) |
| Download evidence PNG, Print report, Compare again | In a `<details id="more-actions">` "More actions" under the primary button | Collapsed | Should |
| Past results table | Table shows Date, Status, Changes, Test case, Sign-off, View; ticket, tester and tools version appear in the run's View and in exports | Fewer columns | Should |
| Export CSV / JSON | In a `<details>` "Export" under the table | Collapsed | Should |
| Empty Past results | "Nothing saved yet. Compare a page and press Save run, and it shows up here." plus a **Go to My pages** button | n/a | **Must** (copy) |

One primary button per screen (`btn-primary`): My pages (landing): Try the demo; My pages (with pages): Compare on the first page card, others secondary; Compare: Choose screenshot, then Compare; Result: per table 3a; Past results: none (View per row is secondary); Settings: none.

#### 12.16.6 Purpose line on every screen (Must)

`<p class="screen-purpose">` directly under each `h1`, plain text, always visible:

| Screen | Line |
|---|---|
| My pages (with pages) | "Each page keeps its own before screenshot (the approved baseline). Pick a page to compare it with a new screenshot." |
| Compare | "Add a screenshot taken after the update, then press Compare. The inspector shows what changed." |
| Result | `#result-summary` serves as the line (12.4) |
| Past results | "Every saved result for a page, with its status and who signed it off." |
| Settings | "Where your data is kept, and how to erase it. Everything stays on this device." |
| How it works | The `lede` (unchanged): add as its first sentence "Compare a page before and after a PeopleSoft update, and see exactly what changed on screen." |

#### 12.16.7 Status pill, first run (Should)

First-visit pill text becomes "Getting ready: loading the comparison engine (about 10 MB, first visit only)…" (size is the project's existing figure; still **unverified**). Returning: "Starting the comparison engine…". Replaces the words "OpenCV" and "vision engine" for the user; error text uses "comparison engine" too ("The comparison engine didn't load"). Progress steps names are already plain.

#### 12.16.8 States added

| State | Where | On screen |
|---|---|---|
| `ready-empty` (landing) | `#main[data-state]` | 12.16.2 landing |
| `tour-1` to `tour-5`, `tour-wait` (step 3 while comparing), `tour-error` | `#tour[data-step="1..5|wait|error"]`; `body[data-tour="on|off"]` | 12.16.2 table |
| `ready` with `onboardingSeen` false and pages | My pages | `#tour-again` banner |
| `storage-blocked` | Banner as section 6 | Tour still runs; step 5 sentence adds the download note |
| `loading-opencv` during the tour | Pill | Step 3 shows "comparing" wait text; Steps 1 and 2 work without the engine |

#### 12.16.9 Keyboard and screen readers for the tour and nav

Panel first in DOM order inside `#main` while open (so Tab reaches Next first); **Next** is a real button (Enter/Space); **Skip tour** is a `<button class="link-btn">`; Esc skips; no single-key shortcuts. Heading `#tour-title` receives focus on each step. The stage images are canvases with `role="img"` and labels: "Before: Time & Labor – Timesheet, fictional demo page" / "After: ..." / the existing boxes label. Targets 44 x 44 px. Contrast per `tools/contrast_check.py`. **CSP:** no inline script or style; the tour highlights an element with a class (`.tour-focus`), never an inline style; any dynamic value via `style.setProperty`.

#### 12.16.10 Copy for the whole-app work (`js/copy.js`)

```js
// UX-2 first-use clarity (docs/design/ux-flows.md 12.16). Fictional data only.
screens: { library: 'My pages', compare: 'Compare', result: 'Result', history: 'Past results', settings: 'Settings' },
nav: { library: 'My pages', compare: 'Compare', history: 'Past results', settings: 'Settings', how: 'How it works', resources: 'Resources' },
landing: {
  h1: 'Compare a page before and after a PeopleSoft update, and see exactly what changed on screen.',
  primary: 'Try the demo (30 seconds)',
  primaryHint: 'Uses a fictional Timesheet page. Nothing leaves your browser.',
  secondary: 'Compare my own screenshots',
  moreSamples: 'Try a different demo',
  aboutSummary: 'What this tool does',   // body = intro.body + intro.positioning
  tourAgain: 'Take the 30-second tour',
  tourAgainDismiss: 'Dismiss',
},
tour: {
  stepOf: i => `Step ${i} of 5.`,
  s1: 'This is the page before the update.',
  s2: 'This is the same page after the update.',
  s3: n => n === 1 ? 'The inspector found 1 change, highlighted in red.' : `The inspector found ${n} changes, highlighted in red.`,
  s3wait: 'The inspector is comparing the two pages…',
  s3waitHint: 'Still comparing, a moment.',
  s4: 'Decide what each change is.',
  s4help: 'Expected means it was meant to change, Regression means it is a defect, Noise means it is harmless.',
  s5: 'Save it as evidence.',
  s5help: 'Once every change is decided, Save run keeps the result and Sign off confirms it.',
  s5blocked: "Saving isn't available in this browser, but you can download the evidence.",
  captionBefore: 'Before: Time & Labor – Timesheet (a fictional demo page)',
  captionAfter: 'After',
  next: 'Next', back: 'Back', finish: 'Finish', skip: 'Skip tour', flip: 'Flip between before and after',
  learnMore: 'Learn more: How it works',
  error: "The demo comparison didn't finish.", retry: 'Try again',
  doneAnnounce: 'Tour finished. Decide each change, then save the run.',
  foundAnnounce: n => `Comparison finished. ${n === 1 ? '1 change' : `${n} changes`} found.`,
},
purpose: {
  pages: 'Each page keeps its own before screenshot (the approved baseline). Pick a page to compare it with a new screenshot.',
  compare: 'Add a screenshot taken after the update, then press Compare. The inspector shows what changed.',
  history: 'Every saved result for a page, with its status and who signed it off.',
  settings: 'Where your data is kept, and how to erase it. Everything stays on this device.',
},
compare: {
  baselineTitle: '1. Before the update',
  baselineSub: 'This is your baseline: the approved screenshot every later one is checked against.',
  afterTitle: '2. After the update',
  dropAfter: 'Drop the screenshot taken after the update',
  zonesSummary: 'Skip areas that always change (ignore zones)',
  newPageSubmit: 'Create page and continue',
  moreOptions: 'More options',
},
resultActions: { more: 'More actions', exportSummary: 'Export' },
evidenceUi: { why: 'These identify the test in your defect tracker and the audit record.', moreSummary: 'More details (optional)' },
historyUi: { empty: 'Nothing saved yet. Compare a page and press Save run, and it shows up here.', goPages: 'Go to My pages' },
pillFirst: 'Getting ready: loading the comparison engine (about 10 MB, first visit only)…',
pillSeen: 'Starting the comparison engine…',
```

#### 12.16.11 New ids and classes (Sable and Juno)

Ids: `tour`, `tour-title`, `tour-stage`, `tour-before`, `tour-after`, `tour-next`, `tour-back`, `tour-skip`, `tour-flip`, `tour-again`, `more-samples`, `zones-details`, `more-actions`. Classes: `landing` (the hero block: big h1, generous spacing, one `btn-primary`), `link-btn` (button that looks like a link, with the focus ring), `screen-purpose`, `tour-panel`, `tour-step`, `tour-focus` (the outline on the target element). Data: `#tour[data-step]`, `body[data-tour]`. Sable: the landing is the one place the page may use larger type and calm space; keep the screenshots, not the chrome, as the hero in the tour.

#### 12.16.12 Priority list for Juno

**Must (build first):** landing + `btn-load-sample` relabel (12.16.2); the 5-step tour with Skip, Finish and `onboardingSeen`; nav and h1 renames (12.16.4); screen purpose lines (12.16.6); Compare panel headings and plain copy (12.16.3); empty Past results copy; the change card, decision help, two-way link, "What's happening" guide and `#result-next`, status wording ("changes", 12.6 to 12.8, 12.4); Who built this (`#team`) and the FAIL-rule fix on How it works; keep Advanced collapsed.
**Should:** nav reveal rules; pill wording; ignore zones and New page "Module" collapsed; Save dialog optional fields collapsed with the "why" line; Sign off/Promote hidden until primary; "More actions"; fewer Past results columns and collapsed Export; Back and Flip in the tour; "Try a different demo" details; the "Where you see it" column; credit lines; sticky two-column result layout; locator canvas.

#### 12.16.13 Before / after (owner's second message) and handoffs

| Owner | Before | After |
|---|---|---|
| "i have no idea what in the world i'm suppose to do" | An empty page with two buttons and a dropdown | One sentence of purpose, one button "Try the demo (30 seconds)", a guided 5-step demo, and a purpose line plus a "what to do next" sentence on every screen |
| "or why" | The purpose was only on How it works, the last nav item | The owner's purpose sentence is the landing h1; the tour shows before, after, the highlighted changes, deciding and saving; Who built this explains the team |
| "absolutely terrible" (overall) | Advanced and rare controls all visible at once | Progressive disclosure: advanced and rare things stay collapsed or hidden until they are relevant; plain nav names |

(Section 12.17 below replaces the sample dropdown and `#more-samples` with example cards, and adds the app-wide plain-words rules.)

Handoffs: **Juno** builds 12.16 Musts first (then the earlier UX-2 Musts); **Sable** styles `landing`, `tour-panel`, `link-btn`, `tour-focus`, the collapsed `<details>` blocks; **Quinn** adds to 12.13: (a) fresh profile shows the landing with exactly one primary button and the owner's sentence, no nav items other than My pages, How it works, Resources; (b) tour: Next/Skip/Finish by keyboard only, Skip on each step, Esc skips, `onboardingSeen` persists, Reset app data brings the tour back, step 3 waits for the compare, N matches the result; (c) tests that click `#btn-load-sample` still work and the old "Load sample" text assertion changes; (d) 375 px layout of the landing and the tour; **Atlas:** decide whether to hold `introDismissed` (brief) or `onboardingSeen` (Morgan); I used `onboardingSeen`; **Morgan:** confirm the tour sentences and the purpose lines.

### 12.17 Example cards and the plain-words test (owner: "what the hell does 'fscm - purchase order (timestamp only)' even mean ... this is not for a machine to use")

**Source of truth:** `samples/manifest.json` (Mason). It now has, per sample: `title` (plain), `story` (one sentence), `whatToExpect`, `group` ("Start here", "More examples", "How the inspector handles tricky cases") and `order`. I read the current file; the eight entries are: Timesheet (Start here, order 1); Employee job record, Personal details, Supplier invoice (voucher) (More examples, 2 to 4); Purchase order (with a changing clock), Employee job record (scrolled 3 pixels), Employee job record (different screen scale), Purchase order (same page twice) (tricky cases, 5, 6, 8, 7). **This replaces the `<select id="sample-select">`, its label "Sample pair", and `#more-samples` from 12.16.2 (all Must).**

#### 12.17.1 Example cards

Show **cards, not a dropdown**, grouped in the manifest's group order ("Start here", then "More examples", then "How the inspector handles tricky cases"); inside a group sort by `order` (note `order` 8 comes before 7 in the file; sort numerically, do not rely on file order).

**Start here card** (`article.sample-hero`, Timesheet) is the big card on the landing, directly under the h1 sentence of 12.16.2, and it **is** the primary action: it contains `#btn-load-sample` "Try the demo (30 seconds)" (starts the tour). Its parts: `h2` = `title` ("Timesheet"), a small tag with the plain area name (see below), `p.sample-story` = `story`, `p.sample-expect` = `whatToExpect`, the button. Nothing else competes with it above the fold except the secondary "Compare my own screenshots".

**Other examples** are in two collapsed `<details>` blocks under the hero, closed by default (so the landing still answers "what do I do" in 10 seconds): `<details id="examples-more">` summary "More examples (3)" and `<details id="examples-tricky">` summary "How the inspector handles tricky cases (4)". Each group heading inside is an `h3`; each card is an `article.sample-card` with `h4`/title, area tag, `p.sample-story`, `p.sample-expect`, and a button **"Open this example"** (`button.btn.sample-open`, `data-sample-id`). **Open this example** loads that sample, compares it and goes straight to the Result screen (no tour). Counts in the summaries come from the manifest.

**The expectation line.** Render `whatToExpect` with the leading word replaced: if it starts with "Expect:", show **"What to expect:"** in bold and then the rest. This **supersedes** section 2 point 2 ("option text must not reveal PASS/FAIL"): for learning, the expected outcome is shown on purpose. Mason's strings contain "(FAIL)"/"(PASS)": keep them, and add after the card button a visible outcome text, no colour-only badge.

**Area tag** (`span.sample-area`): the manifest `module` value is a code. Show it in plain words (display mapping only, stored values don't change): "HCM" is "People and HR (HCM)", "FSCM" is "Money and purchasing (FSCM)", "Time & Labor" is "Time and labor". These three names are my proposal (Morgan/Riley to confirm, **unverified**). Never show the code alone and never show it in the card title.

**My pages with pages** (not the landing): the user's own pages come first under an `h2` "Your pages" as page cards (`li.card`: title, a plain line "Before screenshot added {date}", **Compare** primary, **Past results** secondary, **Delete page** under a "More" `<details>` (Should)); examples sit in one collapsed `<details id="examples">` "Try an example" below them, with the same groups and cards inside. A card whose sample has already been opened shows the tag "In My pages" and its button stays "Open this example" (existing rule: reopens that page, does not touch its baseline).

**Behaviour and a11y.** `<section aria-labelledby>` per group; only the button inside a card is interactive (no whole-card click, no hover-only content). Opening: the button gets `aria-busy="true"`, announcer "Opening {title}…"; if OpenCV is still loading the compare queues (existing behaviour). If `manifest.json` can't be read: panel (error rules, section 6) "The examples couldn't be loaded. Reload the page, or compare your own screenshots." with **Reload page** and **Compare my own screenshots**. `title`, `story` and `whatToExpect` are set with `textContent` (no HTML). Cards stack in one column below 720 px; the hero is full width; the others two columns from about 960 px (Sable).

**Manifest content requests (Mason, via Atlas).** (1) "Employee job record (scrolled 3 pixels)": a pixel number sits in a title, which breaks the rule below; retitle to "Employee job record (page scrolled a little)" and keep "3 pixels" only in the story if wanted. (2) "Supplier invoice (voucher)": "voucher" is PeopleSoft-correct and fine. (3) `whatToExpect` for the voucher says "at least 1 change found (FAIL)"; make it a number or "a few changes", so the user isn't left guessing. (4) Timesheet's text says "2 changes", while the tour step 3 takes N from the real result; if the real result differs the tour is right and the card text is a Quinn finding.

#### 12.17.2 Card copy for `js/copy.js`

```js
samples: {
  startHere: 'Start here',
  moreSummary: n => `More examples (${n})`,
  trickySummary: n => `How the inspector handles tricky cases (${n})`,
  yourPages: 'Your pages',
  tryExample: 'Try an example',
  open: 'Open this example',
  inLibrary: 'In My pages',
  expectLead: 'What to expect:',          // replaces a leading "Expect:" in whatToExpect
  area: { 'HCM': 'People and HR (HCM)', 'FSCM': 'Money and purchasing (FSCM)', 'Time & Labor': 'Time and labor' },   // proposal, unverified
  opening: t => `Opening ${t}…`,
  loadError: "The examples couldn't be loaded. Reload the page, or compare your own screenshots.",
  groupOrder: ['Start here', 'More examples', 'How the inspector handles tricky cases'],
},
```

Template: `<template id="tpl-sample"><article class="sample-card"><h4 class="sample-title"></h4><span class="sample-area"></span><p class="sample-story"></p><p class="sample-expect"></p><button class="btn sample-open" type="button">Open this example</button></article></template>`. Hero uses the same fields with `h2` and `btn-primary`. New ids/classes: `examples`, `examples-more`, `examples-tricky`, `tpl-sample`, `sample-hero`, `sample-card`, `sample-title`, `sample-area`, `sample-story`, `sample-expect`, `sample-open`.

#### 12.17.3 The plain-words test, applied to every label in the app

**Rule.** Before a label ships, ask: would a PeopleSoft tester who has never used a visual-comparison tool know what it means and what happens if they use it? If not, rewrite it or explain it in place. No module codes alone, no "baseline"/"candidate" without a plain companion, and **no pixel numbers outside Details** (exceptions: the Advanced fields, the manual zone form, the fixed capture-standard sentence and error messages that quote sizes, because there the number is the user's own input or the point of the message).

| Today | Replace with | Priority |
|---|---|---|
| "Baseline" (first mention on a screen) | "Before screenshot (baseline)"; afterwards "Before screenshot". Compare panel headings are in 12.16.3 | **Must** |
| "After-change screenshot", "candidate" | "After screenshot" (user-visible); "candidate" never appears except inside a tooltip-free help sentence | **Must** |
| "Replace baseline" button / "Replace the baseline?" dialog | "Replace Before screenshot" / "Replace the Before screenshot (baseline)?"; body keeps its text | Should |
| "Promote to baseline" | "Use as new Before screenshot (promote)"; the help line from Morgan stays ("After sign-off, the after screenshot replaces the baseline for the next cycle") | Should |
| "Region", "regions" | "change(s)" everywhere visible (D8) | **Must** |
| Module values (`HCM`, `FSCM`) in labels, cards, tables | Plain area names (12.17.2), the code only in brackets | **Must** |
| Page names with codes such as "Time & Labor – tl-timesheet" or "FSCM - Purchase Order (timestamp only)" | The sample page name is the manifest `title`; never `module + " – " + page-id` | **Must** |
| Tab "Boxes" / "Side-by-side" / "Overlay slider" / "Heatmap" | "Outlined changes" / "Side by side" / "Slide to compare" / "Heat map" (ids and `data-view` unchanged) | Should |
| Compare progress "Aligning / Finding differences / Measuring regions / Drawing views" | "Lining up the pages / Finding differences / Outlining changes / Drawing views" | Should |
| Advanced: "Sensitivity (threshold T, 1–255)" | "Sensitivity (1 to 255): lower finds smaller differences" | Should |
| Advanced: "Minimum region size (pixels, area)" | "Smallest change to report (area, pixels)" | Should |
| Advanced: "Region merging kernel (pixels)" | "Join nearby changes (distance, pixels)" | Should |
| Advanced: "Fail above (% of page changed, saved for this page)" | "Fail when more than this share of the page changed (%, saved for this page)" | Should |
| Advanced: "Alignment: Automatic / Off" | "Line up the screenshots first: Automatic / Off" | Should |
| Save dialog "Tools version / PUM image" | "PeopleSoft version or update image" (placeholder "PI 50 (fictional)") | Should |
| Save dialog "Role" | "User role used for the test" | Should |
| Zone list line "Timestamp, 220 by 18 pixels at 1100, 20" | "Timestamp, top right of the page" (position words from 12.6); numbers shown in the zone dialog's form only | **Must** (it is a pixel line outside Details) |
| Announcer "Zone 'Timestamp' added, 220 by 18 pixels." | "Zone 'Timestamp' added, top right of the page." | Should |
| Zone summary "2 zones ignored (1.4% of page)" | Keep: a percent, not pixels | keep |
| Region `aria-label` and card header with pixels | Words only; pixels in Details (12.6) | **Must** |
| "Save run" | Open question: "run" is internal; "Save result" reads better. Left unchanged for now because Morgan's stories, the 3a table and tests use "Save run". If Atlas and Morgan agree, rename the button, dialog title, strip step and `#result-next` text together | Open |
| Stat names SSIM, "Aligned: shift (dx, dy)" | Plain stats of 12.5 | **Must** |
| Pill "Loading OpenCV…" | 12.16.7 | Should |
| Library sample dropdown "Sample pair" | Removed, cards (12.17.1) | **Must** |

**Priority for Juno within this section:** Must = the example cards (`manifest.json` fields, hero, collapsed groups, area tag, loading and error states), page names from titles, the zone list line, the baseline/after/region/module wording and the stat names. Should = everything else in the table, plus the "Your pages" layout details.

#### 12.17.4 Verification additions for Quinn

1. Fresh profile: the Timesheet hero card is the only thing under the landing sentence besides "Compare my own screenshots"; the other seven examples are in two collapsed groups with counts 3 and 4.
2. Every card shows title, area tag in plain words, one-sentence story and a "What to expect:" line; none shows a bare module code or a pixel number (the scrolled-3-pixels title is a known item for Mason).
3. **Open this example** on each card loads, compares and shows the Result for that sample; the pair's real PASS/FAIL matches the card text (the CLAUDE.md definition of done) or it is reported.
4. A text scan of every screen, dialog and `how-it-works.html` for "region", "candidate", "SSIM" (outside help), module codes without a plain name, and "NNN by NNN pixels" outside Details, the manual zone form, Advanced and error messages.
5. Keyboard: Tab reaches only the button of each card; summaries of the two groups toggle with Enter/Space; focus ring visible at 375 px and 1366 px.

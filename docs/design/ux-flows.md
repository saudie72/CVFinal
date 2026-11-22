# UX flows, states, copy and HTML skeleton

Owner: Wren (ux-designer-apple-hig). Consumers: Sable (`css/app.css`), Juno (`index.html`, `how-it-works.html`, `resources.html`, `js/*`), Quinn (QA), Atlas (review).
Fictional data only ("Demo ERP (fictional)"). Browser-only, no network calls after load.

Sources: `knowledge/ux-designer-apple-hig/docs/01-feedback.md`, `02-progress-loading.md`, `03-accessibility-interaction.md` (Apple HIG: Feedback, Progress indicators, Loading, Accessibility) and `examples/ex1`..`ex3`; skills `apple-hig-ux`, `accessibility-wcag`, `ignore-zones-masking`, `peoplesoft-page-anatomy`, `upgrade-cycle-capture-standards`, `uat-evidence-traceability`; `docs/build-plan.md`, `docs/04-ignore-zones.md`, `docs/05-visual-outputs.md`, `docs/10-mock-erp-demo-plan.md`, `docs/business-case.md`; ERP specs `docs/erp/capture-standards.md` (section 5, the tip), `docs/erp/evidence-standard.md` (fields, decisions, sign-off), `docs/erp/user-stories.md`, `docs/erp/demo-story.md` (UI labels).

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
| `pipeline` | What happens when you press Compare | Plain-words version of: align (shift/zoom), difference, ignore zones applied, threshold, merge into regions, SSIM, heatmap. States the pass rule: FAIL when there are regions and the changed % is above the page's limit (default 0.1%). Notes it runs in a Web Worker with OpenCV.js (WebAssembly) so the page stays responsive. |
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

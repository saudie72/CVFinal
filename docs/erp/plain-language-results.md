# Plain-language results (UX-1: "Make the result understandable")

Owner: Morgan (erp-business-analyst). Consumers: Wren (screens and flows), Juno (build, `js/copy.js`, `how-it-works.html`), Tess (evidence and report wording check), Sable (styles). Fictional data only ("Demo ERP (fictional)"). No network calls after load.

**Positioning (word for word, wherever the disclaimer appears):** "A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing."

## 0. Why this document exists

The project owner tried the live app and said it works but "doesn't tell a user what exactly is going on or needed". The card they attached shows:

> Region 1 of 4: 105 by 154 pixels at 702, 338 · Decision for region 1 · Expected / Regression / Noise · Note (optional) · "Likely: Grid layout changed. Tall narrow block: likely a grid layout change (column width or shift). Check for truncated values." · Add ignore zone

Their four questions, and the requirement each one creates:

| Owner's question | What is missing today | Requirement (story) |
|---|---|---|
| "What the hell is Region 1?" / "What does 105 by 154 pixels at 702, 338 mean?" | "Region" is a CV word; pixel coordinates mean nothing to an analyst | Say it in words, move numbers to a details line (US-17) |
| "There is no tie in to the screenshot" | The card does not show or point at the area it describes | Highlight and scroll to the box; show before/after crops (US-18) |
| "What is expected, regression or noise?" | Three labels with no meaning attached at the point of decision | Help text on every option, plus a rule for "not sure" (US-19) |
| "What is going on or needed?" | No guide to the flow; first-run user gets no explanation | Next-step guide (US-20) and a 3-sentence introduction (US-21) |
| "Where do the agents and the business analyst come in?" | The team is only in the README and `docs/` | A plain "Who built this" section on How it works (US-22) |

One observation from the screenshot, for Wren and Juno to check: the **Expected** radio looks already selected. `docs/design/ux-flows.md` section 3a says a new change starts **undecided** (`data-decision="unreviewed"`). A default of Expected would let a reviewer approve a change by doing nothing, which breaks the evidence standard ("every FAIL region has a decision"). If the screenshot is a real default, it is a defect; the correct start is no option selected. I cannot tell from the image alone whether it is a default or the user's click. **Unverified.**

---

## 1. Who the user is, and what they ask at each step

**The user** is a functional analyst or tester in the middle of a PUM update, PeopleTools upgrade, customization or configuration change. They know PeopleSoft pages (Time & Labor, Job Data, Vouchers) and their change ticket. They do **not** know computer vision: words like pixel, threshold, contour, SSIM, region, heatmap mean nothing to them. They are often tired and checking dozens of pages (the business case assumes about 200 per cycle, an **estimate**). Persona match: "Analyst" and "Reviewer" in `docs/erp/user-stories.md`.

Rule for all copy: describe what they would see on the page ("the grid moved up", "a block in the middle of the page changed"), not what the algorithm did.

| Step (screen) | 1. What is this tool doing? | 2. What do I need to do now? | 3. What changed and where? | 4. Is it a problem? | 5. What do I do next? |
|---|---|---|---|---|---|
| **First visit** (Library, empty) | It compares a before and an after screenshot of an ERP page and shows what changed. | Load the sample to see it work, or add your own before screenshot. | n/a | n/a | Press **Load sample**. |
| **Add screenshots** (Compare screen) | It keeps your "before" screenshot (the baseline) for this page and checks every later screenshot against it. | Add the after-change screenshot (drop, paste, or choose). Check both were captured the same way. | n/a | n/a | Press **Compare**. |
| **Result: reading** | It found differences (FAIL) or none (PASS) and outlined each difference on the screenshot. | Look at each numbered change on the screenshot. | Each change card says where on the page, what shape, and shows before/after crops. | Maybe: only you can say. The card gives a likely cause as a suggestion, not a verdict. | Decide each change. |
| **Result: deciding** | It records your decision with the run so the evidence is consistent. | Choose Expected, Regression or Noise for each change. | Click a change to see it on the screenshot again. | Expected = no. Regression = yes, log a defect. Noise = no, and consider an ignore zone. | Save the run. |
| **Save run** | It stores the run and your decisions on this device only. | Fill in the required evidence fields (test case, ticket, tools version, tester initials). | n/a | n/a | Sign off, or log a defect if you chose Regression. |
| **Sign off / promote** | It checks that every change is decided and none is a Regression. | A reviewer signs off. Only after that, promote the after-change screenshot to be the new baseline. | n/a | n/a | Next page, or retest after the fix. |

---

## 2. Plain-language definitions

One sentence each, an ERP example, and the rule it ties to. These are the strings for tooltips, the "Words used here" help and `how-it-works.html#reading`. In the UI, prefer the words in the **UI word** column.

| Term (UI word) | Plain sentence | ERP example (fictional) | Ties to |
|---|---|---|---|
| **Change** (was "region") | One area of the page that looks different between the before and after screenshots. | "The Reported Hours column in the Timesheet grid is narrower, and a value is cut off." | `regions[]` in `docs/erp/evidence-standard.md` section 1b: stored name stays `regions`; the person sees "change". Every change of a FAIL run needs a decision. |
| **% changed** ("x% of the page") | How much of the whole page differs, as a share of its area. | "0.8% of page" means a few small spots; "30% or more" usually means a theme or layout change. | Stored as `changedPct`. Default limit 0.1% (`thresholdPct`): a page also fails if the share is above it. |
| **Similarity score** (SSIM) | A score from 0 to 1 for how alike the two screenshots look overall; 1.000 means identical. | "0.962" is very similar but not identical. | Shown as supporting information. It does **not** decide PASS or FAIL (confirmed in `js/cv/pipeline.js`: FAIL if any change exists or % changed is above the limit). Say "supporting number" in the UI. |
| **PASS** | The tool found no differences worth flagging. | Identical Purchase Order pair: PASS, 0 changes. | Passes visual UAT; tester initials (`evidence-standard.md` section 3). A PASS does not prove the page works. |
| **FAIL** | The tool found at least one difference. It does **not** mean something is broken: you decide that. | Timesheet after the upgrade: FAIL, 2 changes. | FAIL needs a decision on every change before sign-off. |
| **Alignment** | The tool first lines the two screenshots up, so a page captured a few pixels lower is not reported as changed. | "Aligned: shift (0, 3)" means the after screenshot was 3 pixels lower and was moved back before comparing. | Stored as `alignment`. If alignment cannot be trusted, say so and never show a silent PASS (US-04). |
| **Ignore zone** | A rectangle you draw so the tool skips that area on every future comparison of this page. | The "Last updated" time stamp on the Purchase Order. | Stored per page (`ignoreZones`) and listed in the report with % ignored. Not a security control: keep zones small, because a zone can hide a real defect. |
| **Baseline** | The approved "before" screenshot of a page that later screenshots are compared with. | The Timesheet as it looked before the PeopleTools upgrade. | One per page (US-08). Replaced only through Promote, after sign-off. |
| **After-change screenshot** (internal name: candidate) | The new screenshot you are checking against the baseline. | The Timesheet captured after the upgrade, same user and settings. | Becomes the new baseline only after sign-off. Avoid the word "candidate" in the UI except inside a tooltip. |
| **Expected** | This change was supposed to happen: it is part of the patch or upgrade. | The upgrade release notes say the toolbar moves; it moved. | Counts toward sign-off. All changes Expected or Noise: the page can pass UAT. |
| **Regression** | This change is a defect: it should not have happened. Log it. | The Submit button vanished and no ticket says it should. | **Any Regression blocks sign-off and promotion**; raise a defect with the report attached and retest after the fix. |
| **Noise** | This is not a real change (a time stamp, rendering, anti-aliasing); safe to ignore. If it will happen every time, add an ignore zone. | The "Last updated" stamp changes on each capture. | Counts toward sign-off. Counted as a false positive in the pilot (`docs/erp/user-stories.md`, pilot measurement plan). |
| **Sign off** (extra) | A reviewer confirms every change has been looked at and none is a Regression. | "Signed off by SA on 22 Nov 2026." | `signOff` in the run; hard rules in `evidence-standard.md` section 3. |
| **Promote to baseline** (extra) | After sign-off, the after-change screenshot replaces the baseline for the next cycle. | Next PUM image is compared with the approved upgrade state. | Only after sign-off (US-16, Could). |

Avoid in the UI: region, contour, threshold, SSIM (without the plain sentence), heatmap (use "Heatmap: blue means no change, red means strong change"), candidate, morphology, kernel.

---

## 3. New user stories (summary)

The full Given/When/Then text is appended to `docs/erp/user-stories.md` (US-17 to US-22). MoSCoW reasoning: the owner's first-use feedback is that the result cannot be understood, so the stories that fix reading and deciding are Must. Anything that makes the app bigger without making a result clearer is Should or lower.

| ID | Story (short) | MoSCoW | Why this priority |
|---|---|---|---|
| US-17 | Each change described in words and location, pixels in an optional "details" line | **Must** | The owner's first complaint; copy only, small effort |
| US-18 | Each change can be found on the screenshot; before/after crops | **Must** | "No tie in to the screenshot"; the card is useless without it |
| US-19 | Decision options explain themselves; "Not sure?" rule | **Must** | A wrong or random decision defeats the sign-off rules |
| US-20 | "What's happening / what to do next" guide on the result screen | **Must** | Owner: "doesn't tell a user what is needed" |
| US-21 | First-run introduction in 3 sentences | **Should** | Helps first use; the guide (US-20) already carries the in-flow help |
| US-22 | "Who built this" on How it works | **Must** | A direct question from the owner; static content, no app logic |

Scope note (diplomatic but firm): none of this changes what the tool detects or what PASS/FAIL means. It changes wording, layout and a small amount of display logic. No OCR is added, so the tool cannot read the label or field name inside a change (Won't, as before).

---

## 4. Exact copy suggestions

Where a string already exists in `docs/design/ux-flows.md`, this section proposes a replacement. Wren owns the final layout; Juno puts strings in `js/copy.js`.

### 4a. Global wording change: "region" becomes "change"

| Place | Today | Proposed |
|---|---|---|
| Result headline (`#result-text`) | "FAIL — 4 changed regions (1.9% of page)" | "FAIL — 4 changes found (1.9% of the page)" |
| One change | "FAIL — 1 changed region (...)" | "FAIL — 1 change found (...)" |
| Under 0.1% | "(under 0.1% of page)" | "(under 0.1% of the page)" |
| List heading (`#h-regions`) | "Changed regions" | "Changes to review" |
| Progress (`#regions-progress`) | "2 of 3 reviewed" | "2 of 3 changes decided" |
| Review button | "Review regions" | "Review changes" |
| Sign-off hint | "Decide every region first (1 left)." | "Decide every change first (1 left)." |
| Regression hint | "Sign off isn't available while a region is marked Regression. Log a defect, attach the report, and retest after the fix." | "Sign off isn't available while a change is marked Regression. Log a defect, attach the report, and retest after the fix." |
| Save error | "Decide every changed region before saving (2 left)." | "Decide every change before saving (2 left)." |
| Announcer | "Region 2 marked Regression. 1 of 3 reviewed." | "Change 2 marked Regression. 1 of 3 decided." |
| Canvas `aria-label` | "...3 changed regions outlined and numbered." | "...3 changes outlined and numbered." |

Stored field names (`regions[]`, `region` in code and exports) do not change. Report table (`evidence-standard.md` section 2, item 4): see Handoff requests, Tess.

Add one line under the FAIL headline (new, `#result-explain`):
> "FAIL means the tool found differences between the before and after screenshots. It does not mean something is broken. You decide that below."

And under PASS:
> "PASS means the tool found no differences. It checks how the page looks, not whether it works."

### 4b. Change card header

Format: `Change {n} of {total} · {where} · {shape}`

Examples from the fictional Voucher and Timesheet pairs (page 1366 by 900, measured boxes in `docs/erp/change-catalogue.md` section 3):

| Box (W x H at x, y) | Header |
|---|---|
| 105 x 154 at 702, 338 (the owner's card) | "Change 1 of 4 · middle of the page · tall narrow block" |
| 64 x 21 at 554, 464 | "Change 4 of 4 · middle of the page · thin strip" |
| 774 x 170 at 11, 233 (Timesheet) | "Change 1 of 2 · middle left of the page · large block" |
| 276 x 23 at 12, 409 (Timesheet) | "Change 2 of 2 · middle left of the page · thin strip" |
| 69 x 18 at 1275, 75 (Purchase Order time stamp) | "Change 1 of 1 · top right of the page · thin strip" |

Honest limit: in a dense page such as the Voucher grid, all four changes fall in the middle third, so words alone do not tell them apart. The screenshot highlight, the number badge and the crops (US-18) are the real tie-in; the words are an orientation aid. Do not invent finer landmarks ("near the Amount column"): the app has no OCR, so any such label would be unverified.

**Location rule (for Juno).** Use the centre of the box, with the page (the aligned baseline) split into thirds both ways.

| Centre x | Centre y | Words |
|---|---|---|
| left third | top third | "top left of the page" |
| middle third | top third | "top of the page" |
| right third | top third | "top right of the page" |
| left third | middle third | "middle left of the page" |
| middle third | middle third | "middle of the page" |
| right third | middle third | "middle right of the page" |
| left third | bottom third | "bottom left of the page" |
| middle third | bottom third | "bottom of the page" |
| right third | bottom third | "bottom right of the page" |

Two overrides, in this order:
1. Page-level `changedPct > 30` (the whole-page hint) or the box covers at least 80% of the page area: "most of the page".
2. Box width at least two thirds of the page width: replace the horizontal word with "across the full width", for example "top, across the full width".

**Shape rule** (uses the thresholds already in Dex's hint rule, `docs/erp/change-catalogue.md` section 4, so words and hints agree):

| Condition (W = width, H = height, pixels) | Shape words |
|---|---|
| H at least 100 and W under 300 | "tall narrow block" |
| H at least 100 and W at least 300 | "large block" |
| H under 30 | "thin strip" |
| W at least 3 x H (and H at least 30) | "wide strip" |
| anything else | "small block" |

**Details line** (collapsed by default, a `<details>` named "Details", also read by screen readers):
> "Details: 105 × 154 pixels, top-left corner at x 702, y 338. Page size 1366 × 900."

Keep the pixel numbers: the evidence report and defect tickets still need them, and a developer may want them.

### 4c. Locating the change (copy for US-18)

- Button on each card: **Show on screenshot**. (Keyboard and touch equivalent of clicking the card.)
- Line under the header: "Outlined in red on the screenshot above, badge {n}." If the active view cannot show boxes (Heatmap, Overlay): "Switch to Boxes to see the outline." with a **Switch to Boxes** button.
- Crop captions: "Before" and "After". Each crop has `alt`: "Before: {where} {shape}, change {n}" and "After: ...".
- Announcer on selection: "Change 1 selected, middle of the page, tall narrow block."

### 4d. Hint line, rewritten for humans

Replace "Likely: Grid layout changed. Tall narrow block: likely a grid layout change (column width or shift). Check for truncated values." The pattern is: **what it probably is** + **what to check** + a reminder that the user decides. The label from `js/region-hints.json` ("Grid layout changed") moves into the sentence, so the header does not repeat the shape twice.

Layout: a short bold lead-in "What this probably is:" then the sentence, then one line "What to check:". Final line, small: "This is a guess from the shape. You decide."

| Hint id | "What this probably is" | "What to check" |
|---|---|---|
| `grid-layout` | "A table or grid changed: a column is wider or narrower, or shifted." | "Look for values that are cut off, for example an amount ending early." |
| `reflow` | "Something above this area changed and pushed the content below it. This block is the knock-on effect, not the cause." | "Look at the top edge of the outline for the first real change, such as a moved toolbar or a removed field." |
| `control-moved` | "A button or link moved: the same shape appears at an old and a new position." | "Check the change ticket for a toolbar or layout change." |
| `label-text` | "A small piece of text changed: a label, a message, or a value such as a date or time." | "If it changes on every capture, consider an ignore zone." |
| `peoplecode-visibility` | "A field or button appeared, disappeared or turned grey." | "Compare with the change ticket. This can come from page or PeopleCode changes, or from a different role or Business Unit. It does not prove that access (authorization) is right." |
| `page-definition-field` | "A field was added, removed or moved on the page." | "Check the page in Application Designer, or the change ticket." |
| `style-branding` | "Colours, fonts or spacing changed." | "This is typical of a style sheet or branding change, for example a PeopleTools upgrade." |
| `dynamic-content` | "This may be a value that changes every time, such as a date, time, user or ID." | "If it is, choose Noise and add an ignore zone." |
| `whole-page` | "Most of the page looks different: a new theme, or Classic changed to Fluid or Classic Plus." | "Consider capturing a new baseline instead of reviewing each change." |
| `configuration-values` | "Values or defaults differ." | "Check that both screenshots used the same test data, Business Unit and SetID." |
| `capture-artifact` | "Many small changes with little of the page changed: often a capture difference, not a real change." | "Capture again at 100% zoom, same window size, same browser." |
| `unclassified` | "The tool can see a difference here but cannot guess the cause." | "Look at the before and after crops, then decide." |

Source texts and ids: `js/region-hints.json` (owner Dex). The wording above keeps their meaning; ask Dex to confirm (see Handoff requests). `peoplecode-visibility` keeps the authorization caveat from the business case ("does not prove that authorization is correct").

### 4e. Decision fieldset (US-19)

Legend: **"Your decision for change {n}"** (was "Decision for region {n}"). Intro line under the legend, visible at all times:
> "Is this change OK? Compare it with your change ticket."

Radio labels and one-line help, visible text beside each (not only a `title`, because touch and keyboard users never see a tooltip):

| Option | Label | Help text |
|---|---|---|
| Expected | "Expected" | "This change was supposed to happen. It is part of the patch or upgrade." |
| Regression | "Regression" | "This change is a defect. Log it. The page can't be signed off until it is fixed." |
| Noise | "Noise" | "Not a real change, for example a time stamp or rendering. Safe to ignore." |

Beneath the group, one rule line:
> "Not sure? Choose Regression and add a note. A reviewer can change it later."

Why this rule (reasoning, not a claim about the code): a wrongly flagged change costs a minute of review; a missed defect can reach go-live (business case, "Business need"). For the pilot, only Regressions confirmed by a defect count as "true regressions caught" (`docs/erp/user-stories.md`, pilot plan), so conservative choices will show up as unconfirmed Regressions, not as inflated catches. A changed decision after save clears sign-off (ux-flows section 3a), so "can change it later" is true.

Note field: label "Note (optional)", placeholder "For example: toolbar moved per CHG-0042". When Regression is chosen, the placeholder becomes "Say what is wrong, for example: Submit button missing". The note stays optional (`evidence-standard.md`: `regions[].note` is "no").

When **Noise** is chosen, show once under the group:
> "Will this change every time? Add an ignore zone so it stops showing up."

**Add ignore zone** button help (visible, small): "Hides this area from every future comparison of this page. Use it for things that change every time, like a time stamp. It is not a security control." Keep the label "Add ignore zone" (UX decision D2 in `ux-flows.md`: it avoids a clash with the decision "Noise").

Heatmap legend (already in ux-flows): keep "Blue: no change. Red: strong change."

### 4f. "What's happening / what to do next" guide (US-20)

A single panel at the top of Result, always visible (not dismissible: it changes with the state, so it never goes stale). A four-step list plus one sentence for the current state. Mark the current step with text ("Step 2 of 4: you are here") and not colour alone; make the list an `<ol>` and keep `aria-current="step"` on the active item.

Steps (exactly as the owner proposed):
1. **Review each change.** Look at it on the screenshot.
2. **Decide.** Expected, Regression or Noise.
3. **Save the run.** Add the test case and ticket.
4. **Sign off.** A reviewer confirms; then promote the new baseline.

Current-state sentence (`#result-next`), keyed to the existing `data-review / data-saved / data-signoff` hooks in `ux-flows.md` section 3a. Do not announce it on every change (the announcer rule allows one polite message per event); announce only when the step changes.

| State | Active step | "What's happening" and "What to do next" |
|---|---|---|
| FAIL, none decided | 1 | "The tool found 4 changes. Each is outlined on the screenshot. Next: click each change, then decide if it is Expected, Regression or Noise." |
| FAIL, some decided | 2 | "2 of 4 changes decided. Next: decide the other 2." |
| FAIL, all decided, a Regression exists, unsaved | 3 | "Every change is decided, and at least one is a Regression. Next: save the run, then log a defect and attach the report. This page can't be signed off until the defect is fixed and retested." |
| FAIL, all decided, a Regression exists, saved | 4 (blocked) | "Saved. Sign-off is blocked while a change is marked Regression. Next: log a defect, attach the report, and compare again after the fix." |
| FAIL, all Expected or Noise, unsaved | 3 | "Every change is decided. Next: save the run (you will be asked for the test case, ticket, tools version and your initials)." |
| FAIL, all Expected or Noise, saved | 4 | "Saved. Next: a reviewer signs off. After sign-off you can make this screenshot the new baseline." |
| Signed off, FAIL | done | "Signed off. Next: promote the after-change screenshot to be the new baseline, or compare another page." |
| PASS, unsaved | 3 (steps 1 and 2 are skipped) | "No differences found. Next: save the run as evidence, then sign off." |
| PASS, saved | 4 | "Saved. Next: sign off, then compare another page." |
| Signed off, PASS | done | "Signed off. Next: compare another page." |

In the PASS states, show steps 1 and 2 as "nothing to review" (not hidden, so the list does not change shape).

Also add one sentence at the top of each other screen (small, `.hint`), so "what is needed" is stated everywhere:
- **Library, empty:** keep "Compare a page before and after a change. Load a sample to see how it works in one click, or add your own baseline screenshot."
- **Library with pages:** "Pick a page to compare. Each page keeps its own baseline (the approved before screenshot)."
- **Compare:** "Step 1: the baseline is the approved before screenshot. Step 2: add the after-change screenshot. Step 3: press Compare." (matches the existing numbered panels.)
- **History:** "Every saved run for a page, with its status and who signed it off."

### 4g. First-run introduction, three sentences (US-21)

Shown once, as a dismissible panel above the Library on first visit (or a dialog if Wren prefers; panel is less intrusive and keeps focus order simple). Title: "What this tool does".

> "This tool compares a before and an after screenshot of an ERP page and shows you what changed. You decide whether each change is expected, a defect, or just noise, and save the result as test evidence. Everything stays in your browser: nothing is uploaded and nothing is sent anywhere."

Under it, in smaller text, the positioning line (word for word, not counted in the three sentences):
> "A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing."

Buttons: **Load sample** (primary) and **Got it**. A link "How it works" goes to `how-it-works.html`. After **Got it**, remember with `settings` key `onboardingSeen` (the `settings` store already exists, as `lastEvidence` and `engineSeen` do; no schema change). A footer or Library link "What does this tool do?" reopens it. If storage is blocked, show it every visit and do not raise an error. Reset app data clears the flag, so the panel returns after a reset (acceptable and arguably right).

### 4h. "Words used here" (optional, Could)

A collapsed `<details>` on the Result screen called "What do these words mean?", listing the definitions in section 2 (change, % changed, similarity, alignment, ignore zone, baseline, Expected, Regression, Noise). It is the same text as `how-it-works.html#reading`; do not write a second version. Could, because the inline help in 4d and 4e covers the moments that matter.

---

## 5. Who built this (content for Juno)

This is the content for a new section on `how-it-works.html`. Suggested id `team`, h2 "Who built this", in the outline after `limits` (or before it; Wren decides), plus a link in the page's table of contents. Plain words, no jargon. Sources: `docs/handoff-log.md`, `docs/agent-brains.md`.

Rules for the section (for Juno): include the table in a `.table-wrap` (the page already needed that at 375 px, QA-001); put the disclaimer line in the footer as on every page; do not add icons or logos or any person's real name.

### How it works page: copy

**Who built this**

This app was designed, built, reviewed and tested by a team of 17 AI assistants, each given a name and a job, such as business analyst, designer, developer or tester. They worked like a small project team: one of them (Atlas, the coordinator) planned the work and handed tasks to the others, and the others checked each other's work before anything was finished. The team is **not part of the app you are using**. Nothing here talks to an AI while you work: the comparison runs entirely in your browser, and no data leaves your device. The team's notes, test results and decisions are public in the project's `docs/` folder, and the table below says what each member contributed. Where a number in the project is an estimate (for example, the time the tool might save), the business analyst labelled it as an estimate until a pilot measures it.

| Name | Role | What they did for this app | Model (size tier) |
|---|---|---|---|
| Atlas | Coordinator | Planned the work, handed tasks to the others, settled disagreements, and released the app | Opus (largest) |
| Morgan | Business analyst | Wrote the user stories and acceptance checks, the 3-minute demo script, the pilot measurement plan (what to time, what to count), and the exact wording of "a supplemental tool, not a replacement"; wrote the plain-language wording for this results screen | Sonnet (mid-size) |
| Riley | Functional analyst | Wrote realistic test scenarios and the list of ERP pages to test, and reviewed the fictional demo pages to check they feel real | Sonnet |
| Dex | PeopleSoft developer | Wrote the catalogue of PeopleSoft changes and the rules behind the "what this probably is" hints | Sonnet |
| Hal | PeopleSoft administrator | Wrote the capture standard: how to take the before and after screenshots, and the tip shown in the app | Haiku (small, fast) |
| Vera | Security administrator | Wrote the security test scenarios, built the privacy check that scans the project for real data or logos, and keeps the point that a screenshot never proves access is correct | Sonnet |
| Tess | Test lead | Defined the evidence fields, the sign-off rules and the checker that validates saved evidence; blocked a release-stopping flaw in sign-off until it was fixed | Sonnet |
| Iris | Computer-vision expert | Built the comparison engine: lining screenshots up, finding differences, outlining changes, the similarity score and the heatmap | Opus |
| Volt | WebAssembly expert | Made the comparison run fast in the background so the page never freezes, and added the safety limits (timeout, memory) | Opus |
| Ledger | Browser-storage expert | Built the storage that keeps your pages, baselines and runs on your device, and the Reset app data button | Sonnet |
| Wren | UX designer | Designed the screens, states and wording, and reviewed the visual design | Sonnet |
| Sable | Visual designer | Created the look: colours, spacing, glass effect on the controls, and checked every text colour for readability | Sonnet |
| Juno | Front-end engineer | Built the pages and the app logic that connects everything | Sonnet |
| Mason | Mock-page builder | Built the fictional "Demo ERP" pages and the before/after sample screenshots, with known planted changes | Sonnet |
| Quinn | QA tester | Tested the finished app in a real browser (95 checks), including that nothing is sent over the network and nothing leaks memory | Sonnet |
| Piper | Release engineer | Set up the website hosting, wrote the README and checked every link | Haiku |
| Forge | Team toolsmith | Kept the team's instructions and project rules consistent with each other | Sonnet |

Closing paragraph:

"These are AI assistants working from written instructions and public documentation, so their work was checked by running tests, not just by trusting it. Their research notes and worked examples are listed on the Resources page. The app is a supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing."

Notes for Juno on the content:
- Count check: the table has 17 named members (Atlas, Morgan, Riley, Dex, Hal, Vera, Tess, Iris, Volt, Ledger, Wren, Sable, Juno, Mason, Quinn, Piper, Forge): 3 Opus, 12 Sonnet, 2 Haiku, as in `docs/agent-brains.md`.
- "95 checks" is Quinn's final run in `docs/qa-report.md` (handoff-log rows 96 and 103: 94/95, then 95/95 after the fix). Refresh the number if the QA run changes.
- "Model" shows the size tier only, because the exact model version is not recorded in the project files. **Unverified** beyond the tier names.
- Do not call the team "employees", "staff" or give them human backstories. They are named personas for AI assistants (`docs/agent-brains.md`).
- Link "Where the team's notes are": `docs/handoff-log.md` and `docs/expert-roster.md` on the repo, via the Resources page (`resources.html#project`), not as new external links from How it works.

### Where the business analyst fits (extra detail, one sentence each, optional sidebar)

- **Before building:** wrote the user stories and Given/When/Then checks that the other experts built and tested against (US-01 to US-16, now US-22).
- **For the demo:** wrote the 3-minute script and its closing line, and kept it in line with the measured results.
- **For the County:** wrote the pilot plan, which turns "we think it saves about 6.7 hours per cycle" (an estimate: 200 comparisons x 3 min down to 1 min, from the business case) into numbers a pilot can measure, with the rule "adopt if time saved minus setup time is positive and misses are no worse than manual review".
- **Throughout:** kept the positioning wording word for word and held the line on scope (no automatic capture, no OCR, no server, no proof of authorization).

---

## 6. Handoff and verification notes

- **Stale wording found:** `docs/design/ux-flows.md` section 9a (`pipeline` row) says FAIL happens "when there are regions and the changed % is above the page's limit". `js/cv/pipeline.js` (line 262) and `docs/handoff-log.md` row 64 say FAIL if **any** region exists **or** % changed is above the limit. Use the code. The how-it-works text in `how-it-works.html` should be checked against it (Juno/Wren).
- **Terms for Quinn to retest** after the build: no visible text says "region" except in downloads and stored data; every change card shows a location, shape, crops and a Show on screenshot control; the guide sentence matches state on all 10 rows in 4f; first-run panel appears once and again after Reset app data; Who built this renders at 375 px without horizontal scroll.
- **Not tested here:** I have not run the app; all wording is a proposal. Screen layout is Wren's call.
- **Estimates:** the only numbers I quote that are estimates are 200 comparisons, 3 min to 1 min, and about 6.7 hours per cycle. They are marked as estimates wherever they appear.

## Sources
`docs/business-case.md` · `docs/erp/user-stories.md` · `docs/erp/evidence-standard.md` (sections 1b, 2, 3) · `docs/erp/change-catalogue.md` (sections 3 and 4) · `docs/design/ux-flows.md` (sections 3, 3a, 6, 7, 9a, D2) · `js/region-hints.json` · `js/cv/pipeline.js` (status rule) · `docs/handoff-log.md` · `docs/agent-brains.md` · `knowledge/erp-business-analyst/` (docs/01, examples ex1, ex2: estimate labelling, story format) · the owner's screenshot `/tmp/claude-0/-home-user/823eeff0-8200-5655-b4dd-f330ac5a9614/images/1.png`.

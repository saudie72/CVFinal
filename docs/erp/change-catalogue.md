# PeopleSoft change catalogue (Demo ERP, fictional)

Owner: Dex (peoplesoft-developer). Task A-DEV. Advisory only: the inspector detects pixel differences, this page says what a PeopleSoft change usually looks like. The analyst always decides Expected / Regression / Noise.

Sources: `knowledge/peoplesoft-developer/docs/01-page-definitions-and-peoplecode.md` (public PeopleBooks, URLs listed there), `knowledge/peoplesoft-developer/examples/ex1`/`ex2`, `knowledge/VERIFICATION.md` (lesson 7 and the Timesheet run), `docs/10-mock-erp-demo-plan.md`, `docs/business-case.md`, skills `peoplesoft-change-catalogue`, `peoplesoft-page-anatomy`, `mock-erp-fixtures`. Fixture pages were not on disk when this was written (Mason is building them), so fixture rows follow the plan in `docs/10-mock-erp-demo-plan.md` and the skill table; exact pixel sizes are **unverified** until Mason's captures exist. Anything marked **verified** was confirmed in the knowledge run.

## 1. Reading the shape of a region

| Shape | What it usually means |
|---|---|
| Small box on one label | Text or label change |
| Two same-size boxes, different positions | A control moved (verified: Submit flagged at its old and new position) |
| One tall or wide block starting at a change | **Reflow**: something above/left changed size and pushed the rest (lesson 7) |
| Box the size of a grid | Column width or row change (verified: grid-sized region) |
| Many small boxes plus a high % changed | Style sheet or branding change |
| Almost the whole page (> 30 %) | Theme or Classic / Fluid change: capture a new baseline |
| Box on a date or time | Dynamic data: ignore zone |

**Reflow rule (lesson 7).** Removing a field, moving a toolbar or narrowing a column shifts everything after it. The inspector then reports one large region, not just the edited spot. The cause is at the region's top or left edge, so look there first. For fixture design: expect reflow regions to be larger than the planted change and do not assert exact box counts, only `minRegions` and FAIL.

## 2. Catalogue

| ID | Change type | Typical visual effect | Expected region shape (incl. reflow) | False-positive risks | Hint id (`js/region-hints.json`) |
|---|---|---|---|---|---|
| CC-01 | Page definition: field removed (Application Designer) | Field and label vanish; rows below move up | Region at the old field row; large block below it if the layout reflows | Same shape appears when PeopleCode hides the field for this row/role (CC-05) | `page-definition-field` |
| CC-02 | Page definition: field added | New field appears; neighbours shift down | Region at the new field; reflow block below | Test data now filling a previously empty optional field | `page-definition-field` |
| CC-03 | Page definition or toolbar: control moved or reordered | Button/field at a new position | Two regions: old and new position (verified); reflow if the move changes row height | Responsive wrapping from a different window size | `control-moved` |
| CC-04 | Page field label / message catalog text | Different label text | Small region over the label (< 30 px high, in the label column); reflow only if the new text wraps | Language setting or font rendering differences | `label-text` |
| CC-05 | PeopleCode (RowInit/FieldFormula) hide/unhide, display-only | Control hidden or greyed out | Region over the control; neighbours shift if hidden, not if only greyed | Different role, Business Unit or test row, not a code change; never proof of authorization | `peoplecode-visibility` |
| CC-06 | Grid / scroll area column width or property | Value truncated; the whole grid reflows | Grid-sized region plus header slivers (verified) | Column shifts of 1-2 px from font hinting | `grid-layout` |
| CC-07 | Style sheet / branding (PeopleTools upgrade, Classic Plus) | Colours, fonts, spacing everywhere | Many small regions; high % changed | Anti-aliasing and zoom differences | `style-branding` |
| CC-08 | Link or button colour only | Colour change on interactive text | Small regions over each link | Hover or focus state captured by accident | `style-branding` |
| CC-09 | Classic to Fluid, or Classic to Classic Plus | Whole layout differs | Region(s) cover nearly the whole page; > 30 % | None: this is a genuine new baseline | `whole-page` |
| CC-10 | PUM fix (delivered image) | Any of CC-01 to CC-08, often several pages | Depends on the fix; one fix can touch many pages | Fixes to non-visual logic produce no region (a PASS is not proof of correctness) | by type |
| CC-11 | Customization (local page/PeopleCode) overwritten or re-applied | Custom field or button disappears or returns | Like CC-01 / CC-02 at the customized spot | Customization intentionally dropped by the upgrade (Expected) | `page-definition-field` |
| CC-12 | Configuration / setup table (Business Unit, SetID) | Different defaults, extra or missing fields, other values | Regions over changed values or fields | Different test data counts as config change | `configuration-values` |
| CC-13 | Dynamic data (timestamp, user, IDs, session) | Text differs on every capture | Small region on the value | Any real change hidden under an ignore zone (keep zones tight) | `dynamic-content` |
| CC-14 | Capture settings (zoom, viewport, scrollbar) | Everything scaled or shifted | Alignment handles about 3 px; zoom or size differences give a whole-page region | Looks like CC-07/CC-09 but is not an app change | `capture-artifact` |

## 3. Fixture mapping (planted change to catalogue entry, with measured regions)

Measured by Iris (`docs/cv-pipeline-notes.md`, `tools/cv-test/last-results.json`, OpenCV.js 4.13.0 pipeline, mergeGap 3 px, boxes as W x H @ (x,y) in baseline px). Reviewed by Dex (C-REV-HINTS).

| Fixture | Planted change | Catalogue | Result | Region(s) measured | Consistent with catalogue? |
|---|---|---|---|---|---|
| tl-timesheet | Submit toolbar moved below the grid | CC-03 + reflow | FAIL, 2 regions, 8.34 % | #1 774x170 @(11,233); #2 276x23 @(12,409) | Yes, as reflow: the grid moved up 37 px into the old toolbar row, so #1 is one big block (old toolbar plus grid) and #2 is the footer line that moved. Not "old and new Submit position", because the changed pixels are contiguous. Cause is at the top edge (y=233, the old toolbar row) |
| tl-timesheet | Reported Hours column narrowed (truncated) | CC-06 | merged into #1 | inside #1 | Yes; cannot be separated from the reflow block (see Mason handoff) |
| hcm-job-data | Pay Grade removed (empty slot stays, no reflow) | CC-01 | FAIL, 3 regions, 2.03 % | #2 320x32 @(519,537) | Yes: a box at the old field row, no reflow block, as the fixture keeps the slot |
| hcm-job-data | Save moved to top right, other buttons shift left | CC-03 | (same run) | #1 70x38 @(1285,65) new Save position; #3 588x37 @(12,643) old toolbar row | Yes: a region at the new and at the old position (the old position is one wide toolbar box, not a same-size twin, because the neighbouring buttons shifted) |
| hcm-personal-data | Label "Dept ID" to "Department" | CC-04 | FAIL, 4 regions, 0.60 % | label-sized boxes 110x19 @(21,307), 75x19 @(21,441), 76x21 @(103,635), 151x20 @(591,666) | Yes (all 19-21 px high). Which box is the label and which are the links is not decidable from geometry |
| hcm-personal-data | Three links blue to green | CC-08 | (same run) | the remaining small boxes | Yes. Needs max-rgb diff (Iris: gray diff misses it) |
| fscm-voucher | Unit Price column +6 px: Amount, Account, Department shift | CC-06 | FAIL, 4 regions, 1.85 % | #1 105x154 @(702,338); #2 84x113 @(443,348); #3 132x113 @(555,348); #4 64x21 @(554,464) | Yes: tall narrow grid-column blocks (113-154 px high, 84-132 px wide); #4 is the clipped Amount cell |
| fscm-voucher | Amount clipped ("500.0") | CC-06 | (same run) | #4 64x21 @(554,464) | Yes |
| fscm-po | Only the timestamp changes | CC-13 | FAIL, 1 region, 0.087 %; PASS with zone (1207,74,146x20) | #1 69x18 @(1275,75), inside the zone | Yes. Note: 0.087 % is below the 0.1 % noise limit, so FAIL comes from the "any region" rule |
| hcm-job-data-shifted | Whole page +3 px | CC-14 | PASS, 0 regions | translate (0,+3) | Yes |
| hcm-job-data-zoom110 | Page rendered at 110 % | CC-14 | FAIL, 50 regions, 3.34 % (documented limit) | #1 1240x52 @(0,0) header plus many 9-125 px boxes | Yes as a capture artifact: reflow plus re-rasterised text, alignment finds scale 0.91 but cannot equalise pixels. Not whole-page (3.3 % is under 30 %), so see rule 7 in section 4 |
| fscm-po-identical | None | none | PASS, 0 | none | Yes |

Review notes:
- Mason's self-check reports other region counts (tl-timesheet 4, hcm-job-data 6, fscm-voucher 20) than Iris's pipeline (2 / 3 / 4). They are different implementations (Python mirror without Iris's mergeGap 3 and max-rgb), so the manifest numbers `minRegions` are safe, but exact counts must not be asserted anywhere. Docs should quote Iris's numbers, which are what the app shows.
- Planted changes on one page overlap in effect, so assert `minRegions` and status, not exact counts.

## 4. How Juno uses `js/region-hints.json`

Format: `[{id, label, hint}]`, loaded as static JSON (no network after load). `id` is a hint category, not a region id. Show `hint` next to a region as a suggestion, never a verdict ("Likely ..."). Region objects from the pipeline are `{id, x, y, width, height, area, changedPixels}`; regions are at least 3 px apart (mergeGap), so they never touch.

**Exact geometry rule, first match wins** (page level first, then per region; W = width, H = height, in baseline px):

1. Page, `changedPct > 30` : every region gets `whole-page`.
2. Page, `regions.length >= 20` : every region gets `capture-artifact` (many small regions with a low % is typical of a zoom or font-rendering difference or a style sheet change; **verified only on zoom110: 50 regions, 3.34 %**, otherwise unverified).
3. Region with `H >= 100 and W >= 300` : `reflow` (verified: fires only on tl-timesheet #1 774x170; it did not fire on any other pair; **thresholds are chosen from these samples, unverified elsewhere**). Tell the user to look at the region's top edge.
4. Region with `H >= 100 and W < 300` : `grid-layout` (tall narrow block, typical for a column width or shift; verified shape on all three fscm-voucher blocks 84x113, 132x113, 105x154).
5. Two regions with `|W1-W2| <= 1`, `|H1-H2| <= 1` and centres at least 10 px apart : both get `control-moved`. The tolerance was tightened from 2 px to 1 px because hcm-personal-data #2 (75x19) and #3 (76x21), two different links, fired at 2 px. **Unverified: no current fixture fires this rule** (the Save move gives a wide toolbar box, so it falls to rule 7).
6. Region with `H < 30` : `label-text`. The hint text covers label, message text and dynamic values together, because geometry cannot tell them apart (a timestamp 69x18 and a label 110x19 look alike). If the region lies inside an ignore zone the app already treats it as ignored, so no hint is needed.
7. Anything else : `unclassified`.

Known weak spots of the rule (do not hide these): tl-timesheet #2 (276x23 footer line moved by reflow) gets `label-text`; hcm-job-data #1 70x38 (new Save) and #2 320x32 (removed Pay Grade) and #3 588x37 (old toolbar) get `unclassified`. That is acceptable for advisory hints, and better than a wrong confident hint.

`page-definition-field`, `peoplecode-visibility`, `style-branding`, `dynamic-content`, `configuration-values` cannot be told apart from pixels alone. They are for the analyst's manual tag or for the catalogue page shown in the report.

## 5. Not covered
No vision code here (Iris owns it). No OCR, so a date cannot be recognised automatically. No real PeopleSoft pages, only the fictional Demo ERP.

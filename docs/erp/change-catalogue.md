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

## 3. Fixture mapping (planted change to catalogue entry)

| Fixture | Planted change | Catalogue | Expected | Likely region (unverified until captured) |
|---|---|---|---|---|
| hcm-job-data | Pay Grade field removed | CC-01 | FAIL | Old Pay Grade row, plus reflow block below |
| hcm-job-data | Save button moved to top-right | CC-03 | FAIL | Old and new Save position |
| hcm-personal-data | Label "Dept ID" to "Department" | CC-04 | FAIL | Small label region; wider text may cause a small reflow |
| hcm-personal-data | Link colour change | CC-08 | FAIL | Small regions on each link |
| fscm-voucher | Grid column shifted 6 px | CC-06 | FAIL | Narrow vertical grid region, possibly grid-sized |
| fscm-voucher | Amount truncated | CC-06 | FAIL | Region over the Amount cells |
| fscm-po | Only "Last updated" changes | CC-13 | FAIL, then PASS with an ignore zone | Small region on the timestamp |
| tl-timesheet | Submit moved below the grid | CC-03 (+ reflow) | FAIL | Old and new Submit position; may be one large block if the grid shifts |
| tl-timesheet | Reported Hours truncated | CC-06 | FAIL | Grid-sized region (verified) |
| hcm-job-data-shifted | Whole page +3 px, and 110 % variant | CC-14 | PASS after alignment | None after alignment; the 110 % variant is a zoom artifact, only valid if alignment handles it, otherwise it is a documented limit |
| fscm-po-identical | No change | none | PASS, 0 regions | None |

Planted changes on one page overlap in effect (a moved Submit reflows the grid), so assert `minRegions` and status, not exact counts.

## 4. How Juno uses `js/region-hints.json`

Format: `[{id, label, hint}]`, loaded as static JSON (no network after load). Display `hint` next to a region as a suggestion, never as a verdict, with the wording "Likely ...". Suggested choice of `id`, from `knowledge/peoplesoft-developer/examples/ex2` (first match wins):

1. `changedPct > 30` gives `whole-page`.
2. Region width > 0.8 of a grid and overlapping it gives `grid-layout`.
3. Two regions of the same size at different positions give `control-moved` (both regions).
4. Region height < 30 px in the label column gives `label-text`.
5. Region area > 4 times the median region area and touching another region's bottom/right edge gives `reflow` (heuristic, **unverified**).
6. Otherwise `unclassified`.

`page-definition-field`, `peoplecode-visibility`, `style-branding`, `dynamic-content`, `configuration-values` and `capture-artifact` cannot be told apart from pixels alone. They are for the analyst's manual tag, or for the catalogue page in the report. Ignore zones should be consulted for `dynamic-content`.

## 5. Not covered
No vision code here (Iris owns it). No OCR, so a date cannot be recognised automatically. No real PeopleSoft pages, only the fictional Demo ERP.

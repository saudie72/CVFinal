# Mock ERP worked examples

| # | Files | Shows |
|---|---|---|
| 1 | `tl-timesheet/before.html`, `after.html`, `after-no-reflow.html`, `styles.css` | A fictional "Demo ERP" Time & Labor Timesheet (fake employee, fake BU, no vendor branding) with the **business-case regressions planted**: Submit moved, Reported Hours truncated. Two variants: *reflow* (Submit moved below the grid) and *no-reflow* (Submit moved along its own row) |
| 2 | `capture_and_verify.py` → `out/*.png` | Captures each page with Playwright at the **capture standard** (Chrome, 1366×900, scale 1, PNG), runs the project diff pipeline (Python OpenCV), draws numbered boxes, and checks that the Submit button's **old and new** positions are both flagged |

## Verified result (2026-11-22, Chrome 153 + OpenCV 5.0)
| Variant | Status | Regions | % changed | Submit old/new flagged |
|---|---|---|---|---|
| after (Submit below grid) | FAIL ✅ | 3 (one large block, 670×172) | 5.51 | ✅ / ✅ |
| after-no-reflow | FAIL ✅ | 10 (old Submit, new Submit, grid block, column-header slivers) | 4.22 | ✅ / ✅ |

See `out/tl-timesheet_after_boxes.png` and `out/tl-timesheet_after-no-reflow_boxes.png`.

## Lessons for building fixtures (and for the report text)
1. **A move that reflows the page produces one big region.** Moving the toolbar below the grid shifted the whole grid up, so everything from the grid to the footer became a single 670×172 region. It's correct (FAIL), but coarse. To demo *separate* boxes, plant changes that don't move other content.
2. **Narrowing one grid column reflows the whole table.** HTML tables redistribute column widths, so the truncation shows up as a whole-grid region plus column-header slivers. The peoplesoft-developer's change catalogue should describe grid changes as "whole grid region expected".
3. Region merging (skill `opencvjs-diff-pipeline`, step 7) and the alignment step help here. A future improvement is row-shift detection: match horizontal bands between images to tell "moved" from "changed".

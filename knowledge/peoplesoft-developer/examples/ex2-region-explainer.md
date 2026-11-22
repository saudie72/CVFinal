# Example 2: rules for explaining a region (heuristics for the report)

```
IF changedPct > 30%                      → "Whole-page change (theme/branding or Classic↔Fluid). Consider a new baseline."
ELSE IF region.width > 0.8 * gridWidth
        AND region overlaps a grid        → "Grid layout changed (column widths / rows)."
ELSE IF two regions same size, same
        content at different positions   → "A control moved."
ELSE IF region height < 30 px
        AND overlaps a label column      → "Label or text change."
ELSE IF region inside a known ignore-able
        pattern (date/time regex via OCR
        is out of scope — use zone)      → "Possible dynamic content — consider an ignore zone."
ELSE                                      → "Visual change — review."
```
These are **hints**, not verdicts. The analyst always makes the Expected / Regression / Noise decision (erp-test-lead evidence standard).

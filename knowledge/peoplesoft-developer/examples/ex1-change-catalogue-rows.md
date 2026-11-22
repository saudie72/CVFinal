# Example 1: change-catalogue rows written well

| ID | Change type | Planted in (mock page) | Visual effect | Inspector expectation | Region explanation shown to the user |
|---|---|---|---|---|---|
| CC-01 | Page definition: field removed (Pay Grade) | hcm-job-data | Field and label gone; the row below moves up | FAIL; ≥ 1 region spanning the old field row and anything that moved | "Likely a page definition change: a field is missing or moved." |
| CC-02 | Toolbar reordered (Submit moved) | tl-timesheet | The button is at a new position | FAIL; regions at the old **and** new position (verified) | "A control moved. Check the toolbar/page layout change." |
| CC-03 | Grid column width reduced | tl-timesheet, fscm-voucher | Value truncated; whole table reflows | FAIL; grid-sized region (verified) | "Grid layout changed (column widths). Check for truncated values." |
| CC-04 | Dynamic data only (timestamp) | fscm-po | Date/time text differs | FAIL until an ignore zone is drawn → PASS | "Dynamic content. Consider an ignore zone." |

Good rows are testable (expected output stated), tie to a mock page, and give plain-language explanations a functional analyst understands.

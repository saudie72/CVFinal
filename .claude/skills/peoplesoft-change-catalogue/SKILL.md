---
name: peoplesoft-change-catalogue
description: "Map PeopleSoft change types (PUM fixes, PeopleTools upgrades, PeopleCode, Application Designer page/field changes, configuration, Fluid vs Classic) to their typical visual effects. Use when designing planted regressions or explaining detected regions."
user-invocable: false
---
# PeopleSoft change catalogue

## Output: docs/erp/change-catalogue.md
| Change type | Typical visual effect | Planted in | How the inspector shows it |
|---|---|---|---|
| Page definition change (App Designer: field added/removed/moved) | Field appears/disappears, layout shifts | hcm-job-data | Region at old + new location |
| Field label / message catalog change | Label text differs | hcm-personal-data | Small region over label |
| PeopleCode (FieldFormula/RowInit hide/unhide, gray/ungray) | Control hidden or disabled for some rows/roles | VR-SEC-01 | Region over control |
| Style sheet / branding change (PeopleTools upgrade) | Colours, fonts, spacing differ | hcm-personal-data | Many small regions; high % changed |
| Grid/scroll area property change | Column width, alignment, truncation | fscm-voucher, tl-timesheet | Narrow vertical region |
| Component/page reorder, toolbar config | Buttons move | tl-timesheet, hcm-job-data | Two regions (old/new) |
| Configuration / setup table (BU-specific) | Different defaults, extra fields | VR-BU-01 | Region over changed values |
| Dynamic data (dates, IDs, user name) | Changes every capture | fscm-po | Handled by ignore zone |
| Classic ↔ Fluid conversion | Whole layout differs | out of scope | Very high % changed → treat as new baseline |

Explain detected regions in plain words in the report ("Likely a page definition change: field missing").

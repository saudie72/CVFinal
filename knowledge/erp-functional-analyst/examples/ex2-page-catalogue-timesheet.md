# Example 2: page catalogue entry (Time & Labor Timesheet, fictional)

| Area | Content (fictional) |
|---|---|
| Banner | "Demo ERP (fictional)", Home · Worklist · Sign out |
| Breadcrumbs | Time and Labor › Report Time › Timesheet |
| Header fields | Employee: Jordan Rivera · EmplID: 000123 · Business Unit: BU-NORTH · Period: 11/16/2026 – 11/22/2026 |
| Toolbar | **Submit** (primary), Save for Later |
| Grid columns | Time Reporting Code · Mon–Fri · Reported Hours |
| Grid rows | REG – Regular 8.00×5 = 40.00 hours · OVT – Overtime 1.50 on Tue |
| Planted (VR-TL-01) | Submit moved; Reported Hours truncated |

This entry was implemented as `knowledge/mock-erp-builder/examples/tl-timesheet/` and verified: the inspector pipeline flags the Submit button at both its old and new positions.

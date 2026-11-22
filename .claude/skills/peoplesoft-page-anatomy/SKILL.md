---
name: peoplesoft-page-anatomy
description: "Describe how Classic and Fluid PeopleSoft pages are laid out and what HCM, FSCM and Time & Labor pages contain, so mock pages and flows look realistic. Use when designing demo pages, test scenarios or UX that mirrors PeopleSoft."
user-invocable: false
---
# PeopleSoft page anatomy (public knowledge, generic)

## Classic pages
Branded header bar with a navigation/home icon and sign-out → breadcrumbs → page title → **component tabs** (folder tabs across the top) → key fields (e.g., EmplID, Empl Rcd #) → group boxes with labelled fields and prompt (magnifier) lookups → **scroll areas/grids** with row navigation ("1-3 of 3", first/prev/next/last) → toolbar at the bottom: **Save, Return to Search, Previous/Next in List, Notify, Refresh, Add, Update/Display, Include History, Correct History**.

## Fluid pages
Responsive banner, tiles or a left navigation panel, cards, larger touch targets, an action menu (⋯) and a primary action button (e.g., Submit) top-right or at the bottom.

## Typical pages for the demo (fictional data only)
- **HCM Job Data:** Work Location (Effective Date, Action, Reason, Company, Business Unit, Department, Location), Job Information (Position, Job Code, Reg/Temp, Full/Part), Salary Plan (Plan, Grade, Step), Compensation.
- **HCM Personal Data:** Name, Address, Phone, Email, Date of Birth (fake), Ethnicity/Military tabs.
- **FSCM Voucher Entry:** Business Unit, Voucher ID, Vendor ID/Name, Invoice No/Date, Gross Amount, Lines grid (Line, Distribution, Account, Amount), Payments tab.
- **FSCM Purchase Order:** Business Unit, PO ID, Vendor, PO Date, Status, Buyer, Lines grid (Item, Description, Qty, UOM, Price, Amount).
- **Time & Labor Timesheet:** Employee header, period selector, daily grid (Mon–Sun), Time Reporting Code, Reported Hours total, Submit button.

Use generic styling. Don't copy Oracle's CSS, images or logos.

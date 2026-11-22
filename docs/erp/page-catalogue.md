# Page catalogue: Demo ERP (fictional)

Owner: Riley (erp-functional-analyst). Contract partner: Mason (`demo-erp/<page>/before.html` + `after.html`). All data is fictional. No Oracle or County names, logos or CSS.

Sources: `knowledge/erp-functional-analyst/docs/01-hcm-fscm-tl-pages.md` (Classic vs Fluid, grids, scroll areas, prompts; PeopleBooks URLs listed there), `knowledge/erp-functional-analyst/examples/ex2-page-catalogue-timesheet.md`, skills `peoplesoft-page-anatomy` and `mock-erp-fixtures`, `docs/10-mock-erp-demo-plan.md`.

## Shared chrome (every page, Classic-style)
UI flavour: **Classic** (laptop/desktop). Record it on every capture; Classic and Fluid captures must never be compared (knowledge doc 01).

| Area | Content |
|---|---|
| Header bar (grey) | Text "Demo ERP (fictional)"; links Home, Worklist, Sign out. No logo. |
| Environment tag | "TEST" pill in the header (reinforces test-environment use). |
| Breadcrumbs | Module › Menu › Page (per page below). |
| Page title | Page name, one H1. |
| Footer toolbar (Classic) | Save, Return to Search, Previous in List, Next in List, Notify, Refresh. Add, Update/Display, Include History, Correct History appear only where noted. |
| Viewport | 1366x900, 100% zoom, full-page PNG (upgrade-cycle-capture-standards). |

Common fictional keys: Jordan Rivera, EmplID 000123, Empl Record 0; Business Units BU-NORTH and BU-SOUTH; vendor "Harbor Office Supply (fictional)". Effective date 11/16/2026.

## 1. hcm-job-data (HCM, Job Data)
Breadcrumb: Workforce Administration › Job Information › Job Data.
Key fields (top): EmplID 000123, Empl Record 0, Name Jordan Rivera. Effective-dated row navigator: "Effective Date 11/16/2026 · Effective Sequence 0 · 1 of 1".

| Tab | Content |
|---|---|
| Work Location (default) | Effective Date 11/16/2026; Action PAY (Pay Rate Change); Reason PRC; Company DEM; Business Unit BU-NORTH; Department 4410 Records Office; Location HQ-01 |
| Job Information | Position Number 00000078 (see realism note); Job Code 100234 Administrative Analyst; Reg/Temp Regular; Full/Part Full-Time; Empl Class Salaried |
| Payroll | Pay Group MN1; Employee Type Salaried |
| Salary Plan | Salary Plan ADM; **Grade 14** (labelled "Pay Grade" in the mock; this is the planted field); Step 05 |
| Compensation | Comp Rate 68,500.00 USD; Frequency Annual |

Grids: effective-dated history grid (1 row). Buttons: Save, Return to Search, Previous/Next in List, Notify, Refresh, Add, Update/Display, Include History, Correct History. Prompts (magnifier) on Department, Location, Job Code.
Planted (VR-HCM-01): Pay Grade field removed; Save moved to top-right.
Variant `hcm-job-data-shifted`: identical to before, whole page offset +3 px down; plus a 110% zoom capture.

## 2. hcm-personal-data (HCM, Personal Data)
Breadcrumb: Workforce Administration › Personal Information › Modify a Person.

| Tab | Content |
|---|---|
| Biographical Details | Name Jordan Rivera; Date of Birth 03/14/1980 (fake); Gender U; Marital Status Single; Highest Education Bachelors |
| Contact Information | Address: 100 Example Plaza, Suite 4, Sampleville, ZZ 00000; Phone 555-0100; Email jordan.rivera@example.test |
| Regional (Eth/Military) | Ethnicity placeholder fields (generic) |

Fields on the page shown in the mock: the labelled field "Dept ID" 4410 plus a "View Department Details" text link (the planted colour change target). Grids: Phone/Email rows (2 rows, "1-2 of 2"). Buttons: Save, Return to Search, Notify, Refresh, Include History.
Planted (VR-HCM-02): label "Dept ID" becomes "Department"; link colour changes (e.g., blue to green).

## 3. fscm-voucher (FSCM, Voucher Entry)
Breadcrumb: Accounts Payable › Vouchers › Add/Update › Regular Entry.
Header group: Business Unit BU-NORTH; Voucher ID NEXT (or 00004567); Voucher Style Regular; Invoice No INV-2026-0418; Invoice Date 11/10/2026; Vendor ID 0000045 Harbor Office Supply (fictional); Gross Invoice Amount 1,250.00 USD; Voucher Status Unposted.

| Tab | Content |
|---|---|
| Invoice Information (default) | Header above + Lines grid |
| Payments | Pay Terms N30; Scheduled Due 12/10/2026; Payment Method CHK (read-only) |
| Voucher Attributes | Origin ONL; Accounting Date 11/16/2026 |

Lines grid columns: Line · Description · Quantity · UOM · Unit Price · **Amount** · Account · Department. Rows: 1 Printer paper, 10 CS, 45.00, 450.00, acct 521000, dept 4410; 2 Toner cartridges, 8 EA, 62.50, 500.00, acct 521000; 3 Delivery, 1 EA, 300.00, 300.00, acct 540100. Total 1,250.00 (row sum must equal Gross).
Buttons: Save, Return to Search, Notify, Refresh, Add; "Calculate" and "Budget Check" links.
Planted (VR-FS-01): one grid column shifted 6 px; an Amount value truncated.

## 4. fscm-po (FSCM, Purchase Order)
Breadcrumb: Purchasing › Purchase Orders › Add/Update POs.
Header: Business Unit BU-NORTH; PO ID 0000001042; PO Date 11/12/2026; PO Status Approved; Buyer Pat Morgan (fictional); Vendor 0000045 Harbor Office Supply (fictional); Currency USD; **Last updated 11/16/2026 09:14:02 AM** (dynamic text, the ignore-zone target; the mock may label it "Last updated").
Lines grid: Line · Item · Description · Qty · UOM · Price · Amount · Due Date. Rows: 1 / 10045 / Printer paper / 10 / CS / 45.00 / 450.00; 2 / 10078 / Toner cartridges / 8 / EA / 62.50 / 500.00; 3 / 10112 / Delivery service / 1 / EA / 300.00 / 300.00. PO total 1,250.00 USD (matches the voucher).
Buttons: Save, Return to Search, Notify, Refresh, Add.
Planted (VR-FS-02): only the Last-updated timestamp differs, e.g. 09:14:02 AM to 03:47:55 PM.
Variant `fscm-po-identical`: pixel-identical pair (VR-PASS-01).

## 5. tl-timesheet (Time and Labor, Timesheet)
Breadcrumb: Time and Labor › Report Time › Timesheet.
Header: Employee Jordan Rivera · EmplID 000123 · Empl Record 0 · Business Unit BU-NORTH · Period 11/16/2026 to 11/22/2026 (Mon to Sun, 7 columns) with Previous/Next Period arrows and a "Get Employee" button.
Grid columns: Time Reporting Code · Mon · Tue · Wed · Thu · Fri · Sat · Sun · **Reported Hours**. Rows: REG Regular: 8.00 Mon to Fri, Sat/Sun blank, 40.00; OVT Overtime: 1.50 on Tue, 1.50. Footer row: Total Reported Hours 41.50. Optional status line: "Reported Status: Needs Approval".
Buttons (before): **Submit** primary, directly above the grid at the right; Save for Later; Return to Search; Refresh.
Planted (VR-TL-01): Submit moves below the grid; the Reported Hours column is cut off (e.g., "40.00" clipped to "40."). Matches `docs/business-case.md` and knowledge example ex2 (the verified one).
VR-SEC-01 variant: manager view adds an Approve button (and "Manager" role tag) next to Submit.

## Not covered by the agreed fixture table (see test-scenarios.md)
VR-BU-01 (BU-NORTH vs BU-SOUTH Job Data) and VR-SEC-01 (employee vs manager Timesheet) have no pair in the skill's page table. They need either extra pairs or a "Simulate" parameter; this is raised as a handoff request.

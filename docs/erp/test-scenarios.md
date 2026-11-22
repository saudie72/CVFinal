# Test scenarios: ERP Visual Regression Inspector

Owner: Riley. Format per skill `erp-test-scenarios`; pairs and expectations agree with the `mock-erp-fixtures` page table (the fixture contract). Page content is in `page-catalogue.md`. Fictional data only (Demo ERP (fictional), Jordan Rivera EmplID 000123, BU-NORTH / BU-SOUTH, TL_EMPLOYEE / TL_MANAGER).

Sources: `knowledge/erp-functional-analyst/examples/ex1-test-scenarios.md` (set and statuses), skills `erp-test-scenarios`, `upgrade-cycle-capture-standards`, `role-based-security-testing`, `docs/10-mock-erp-demo-plan.md`.

## Common preconditions
Baseline ("before") captured in the TEST environment per capture standards: Chrome, 100% zoom, 1366x900, full-page PNG, same user/role, BU, effective date and data row, Classic UI, no popups/tooltips. Common steps: (1) load the before and after PNG; (2) run Compare; (3) review the regions, triage Expected / Regression / Noise; (4) record evidence. Evidence fields everywhere: scenario ID, change ID (CHG-#), PUM image/PeopleTools patch (PI #), page, environment, capture file names, tester, date.

## Summary (matches `samples/manifest.json` expectations)
| ID | Pair (fixture) | Expected status | Min regions | Ignore zones |
|---|---|---|---|---|
| VR-HCM-01 | hcm-job-data | FAIL | 2 | none |
| VR-HCM-02 | hcm-personal-data | FAIL | 2 | none |
| VR-FS-01 | fscm-voucher | FAIL | 1 | none |
| VR-FS-02 | fscm-po | FAIL, then PASS with zone | before zone: >=1; after zone: 0 | Last updated timestamp |
| VR-TL-01 | tl-timesheet | FAIL | 2 | none |
| VR-ALN-01 | hcm-job-data-shifted | PASS after alignment | 0 | none |
| VR-PASS-01 | fscm-po-identical | PASS | 0 | none |
| VR-BU-01 | extra pair (proposed) | FAIL, expected diff noted | >=1 | none |
| VR-SEC-01 | extra pair (proposed) | FAIL, expected diff + disclaimer | >=1 | none |

## Scenario detail
| ID | Module | Page | Change type | Precondition | Steps | Expected visual result | Expected inspector status | Evidence fields |
|---|---|---|---|---|---|---|---|---|
| VR-HCM-01 | HCM | Job Data (`hcm-job-data`) | Page definition change (PUM image) | Common; Work Location/Salary Plan tab, EmplID 000123 | Common steps | Pay Grade (Salary Plan, Grade 14) field gone, and the Save button moved to the top right. Regions: the vacated field area and the Save old and new positions | FAIL, >= 2 regions | VR-HCM-01, CHG-#, PI #, tab name, both PNGs |
| VR-HCM-02 | HCM | Personal Data (`hcm-personal-data`) | Label/style (PeopleTools upgrade) | Common; Biographical/Contact tab | Common steps | Label "Dept ID" now "Department" (text width changes); the link colour changed. Regions: label, link | FAIL, >= 2 regions | VR-HCM-02, CHG-#, PT version |
| VR-FS-01 | FSCM | Voucher Entry (`fscm-voucher`) | Customization deploy | Common; Voucher with 3 lines, BU-NORTH | Common steps | One grid column offset by 6 px and an Amount value truncated | FAIL, >= 1 region (grid area) | VR-FS-01, CHG-#, customization ID |
| VR-FS-02 | FSCM | Purchase Order (`fscm-po`) | None (dynamic data) | Common; PO 0000001042 | 1 Compare, see FAIL on the timestamp only. 2 Draw an ignore zone over "Last updated". 3 Rerun | Only the Last-updated value differs | FAIL, then PASS with 0 regions once the zone is saved | VR-FS-02, zone rectangle and label, run ids before/after |
| VR-TL-01 | T&L | Timesheet (`tl-timesheet`) | Toolbar/grid (PeopleTools upgrade); the business-case example | Common; period 11/16/2026 to 11/22/2026 | Common steps | Submit now below the grid; Reported Hours clipped. Both Submit positions are flagged | FAIL, >= 2 regions (verified earlier in the mock, knowledge ex2) | VR-TL-01, CHG-#, PI # |
| VR-ALN-01 | HCM | Job Data (`hcm-job-data-shifted`) | None (capture offset) | After-capture is the same page shifted +3 px down; also a 110% zoom variant | Compare | No real change; reports alignment about (0,+3) (the zoom variant reports a scale) | PASS after alignment, 0 regions | VR-ALN-01, the reported shift |
| VR-BU-01 | HCM | Job Data, BU-NORTH vs BU-SOUTH | Configuration | Same page and row, two fictional BUs, same role | Compare the two BU captures | Visible configuration difference, e.g. different default Company/Location values or an extra field | FAIL, but logged as an expected difference | VR-BU-01, both BUs, expected-diff note |
| VR-SEC-01 | T&L | Timesheet, TL_EMPLOYEE vs TL_MANAGER | Role display | Same page and data, two fictional roles | Compare | Approve button only for the manager | FAIL with the expected-difference note, plus the disclaimer below | VR-SEC-01, role names, expected-diff note |
| VR-PASS-01 | FSCM | Purchase Order (`fscm-po-identical`) | None | Identical capture | Compare | Nothing | PASS, 0 regions | VR-PASS-01 |

## Ignore zones
| Scenario | Zone | Why | Position (to be confirmed by Mason) |
|---|---|---|---|
| VR-FS-02 | The "Last updated" value on the PO header (label and timestamp) | Dynamic text that changes on every save or refresh; it is noise, not regression | x/y/w/h in baseline px, a rectangle that covers only the timestamp text |
All other scenarios: no zones. Note for report text: an ignore zone hides everything under it, so keep it tight.

## Security disclaimer (required in VR-SEC-01 and any role report)
"A visual comparison shows what was rendered for the tested role. It does not prove authorization is correct: hidden controls may still be reachable, and data access is enforced by permission lists, roles and row-level security, which must be tested functionally."

Note: the 110% zoom variant (hcm-job-data-zoom110) is a stretch case, not a definition-of-done gate; the 3 px shift (VR-ALN-01, hcm-job-data-shifted) is the gating alignment test. Re-rendered text at 110% may not match pixel for pixel.

## Acceptance for Mason's fixtures
- Only the listed planted changes exist; every other pixel matches between before and after (same fonts, same layout), otherwise min-region counts and PASS cases will misfire.
- The fscm-po timestamp is the single difference in that pair.
- hcm-job-data-shifted equals hcm-job-data before, offset +3 px only (and a separate 110% zoom variant).

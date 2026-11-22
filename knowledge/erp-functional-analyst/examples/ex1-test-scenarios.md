# Example 1: test scenarios (format + a full set)

| ID | Module | Page | Change type | Precondition | Steps | Expected visual result | Expected inspector status | Evidence |
|---|---|---|---|---|---|---|---|---|
| VR-HCM-01 | HCM | Job Data | Page definition (PUM) | Baseline captured, TEST env | Capture after the update; compare | Pay Grade missing; Save moved | FAIL ≥ 2 regions | VR-HCM-01, CHG-#, PI # |
| VR-HCM-02 | HCM | Personal Data | Label/style (PeopleTools) | Same | Same | "Dept ID" → "Department"; link colour | FAIL ≥ 2 regions | … |
| VR-FS-01 | FSCM | Voucher Entry | Customization deploy | Same | Same | Grid column shifted; Amount truncated | FAIL (grid region) | … |
| VR-FS-02 | FSCM | Purchase Order | None (dynamic data) | Same | Compare; add an ignore zone over "Last updated"; rerun | Only the timestamp differs | FAIL → PASS | … |
| VR-TL-01 | T&L | Timesheet | Toolbar/grid (PeopleTools) | Same | Same | Submit moved; Reported Hours truncated | FAIL (verified in the mock) | … |
| VR-ALN-01 | HCM | Job Data | None | After-capture scrolled 3 px | Compare | No real change | PASS, aligned (0,3) | … |
| VR-BU-01 | HCM | Job Data | Configuration | BU-NORTH vs BU-SOUTH (fictional) | Compare the two BUs | Different default fields | FAIL (expected diff noted) | … |
| VR-SEC-01 | T&L | Timesheet | Role display | TL_EMPLOYEE vs TL_MANAGER | Compare | Approve only for the manager | FAIL (expected) + security disclaimer | … |
| VR-PASS-01 | FSCM | Purchase Order | None | Identical capture | Compare | — | PASS, 0 regions | … |

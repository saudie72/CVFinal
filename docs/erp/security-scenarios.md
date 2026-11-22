# Security scenarios: role and permission-list visual checks

Owner: Vera (erp-security-admin). All users, roles, permission lists, Business Units and IDs below are **fictional**. No real INFORMS or County security configuration is used or implied. The subject platform is PeopleSoft-style; the pages are the "Demo ERP (fictional)" pages.

> **Authorization limit (applies to every scenario in this file and to every report built from it).**
> A visual comparison shows what was rendered for the tested role. It does **not** prove that authorization is correct: hidden controls may still be reachable, and data access is enforced by permission lists, roles and row-level security, which must be tested functionally. A screenshot never proves authorization.

## 1. What the inspector can and cannot do here

| It can | It cannot |
|---|---|
| Flag a button, field, tab or menu entry that **appears** or **disappears** between two captures taken as two roles (or before/after a change, same role). | Show that a hidden control is unreachable (direct URL, deep link, component or service call). |
| Flag a changed column or label set in a grid that is shaped by role. | Show that the **rows** returned are the right ones (row security / data permissions are not visible in a pixel diff). |
| Store an *expected-difference note* with the run so a reviewer sees what was intended. | Replace functional security testing, a permission-list review, or the security team's sign-off. |

Background (public PeopleBooks, see `knowledge/erp-security-admin/docs/01-peoplesoft-security-model.md`): user profiles link to roles, roles link to permission lists, permission lists carry page access and other authorizations, and changing a permission list changes access for every user holding a role that contains it. That is why a permission-list edit can change many screens at once, and why a visual check after such a change is a useful early signal, never a verdict.

## 2. Method (the same for every scenario)

1. Fix everything except the role: same page, same fictional employee/voucher/PO record, same Business Unit, same language, same viewport (1366x900, 100% zoom, full page, PNG), same data state. Follow `docs/erp/capture-standards.md`.
2. Capture **A** as the reference role and **B** as the role under test.
3. Compare in the inspector. Treat both baseline and candidate as the pair "A then B".
4. Review each highlighted region as **Expected** (matches the expected-difference note below), **Regression** (a control present or absent against the note) or **Noise**.
5. Save the run with the evidence fields: `testCaseId`, `ticketId` (fictional, e.g. CHG-0042), `toolsVersion`, `businessUnit` (if used), **`role`** (the role of the candidate capture), `tester`, plus the expected-difference note. The `role` field holds a fictional name only.
6. Put the authorization limit above in the exported report and hand the page to functional security testing for confirmation.

Reading the result: a visible difference that matches the note is **Expected** only for that rendering. A difference that does *not* match the note (an extra Approve button for the employee, a missing one for the manager) is a **Regression signal** to escalate. No difference does **not** mean the roles are equally authorized.

## 3. Fictional roles and permission lists used

| Role (fictional) | Permission lists (fictional) | Meaning |
|---|---|---|
| `TL_EMPLOYEE` | `TLPL_SELF_SERVICE` | Enters and submits own time |
| `TL_MANAGER` | `TLPL_SELF_SERVICE`, `TLPL_APPROVE` | Also approves or pushes back time |
| `TL_PAYROLL_ADMIN` | `TLPL_SELF_SERVICE`, `TLPL_APPROVE`, `TLPL_ADMIN_ADJUST` | Also adjusts reported hours |
| `HR_VIEWER` | `HRPL_JOBDATA_VIEW` | Read-only Job Data |
| `HR_SPECIALIST` | `HRPL_JOBDATA_VIEW`, `HRPL_JOBDATA_UPDATE` | Edits Job Data |
| `AP_CLERK` | `APPL_VOUCHER_ENTRY` | Enters vouchers |
| `AP_APPROVER` | `APPL_VOUCHER_ENTRY`, `APPL_VOUCHER_APPROVE` | Also approves vouchers |
| `CUSTOM_AUDITOR` | `AUPL_READONLY_ALL` | Read-only across modules |

Test users (fictional): `TEST_EMP01`, `TEST_MGR01`, `TEST_PAY01`, `TEST_HRV01`, `TEST_HRS01`, `TEST_APC01`, `TEST_APA01`, `TEST_AUD01`. Fictional record: employee "Jordan Rivera", EmplID 000123; Business Units `BU-NORTH`, `BU-SOUTH`.

## 4. Scenarios

Format: ID, page, captures, expected-difference note, regression signals, what the diff will look like, and the limit for that scenario.

### VR-SEC-01: Timesheet, manager-only buttons (primary scenario)
- **Page:** Time & Labor, Timesheet (Demo ERP, fictional). Same employee record 000123.
- **Capture A:** `TEST_EMP01` / `TL_EMPLOYEE`. Visible: Submit, Save for Later.
- **Capture B:** `TEST_MGR01` / `TL_MANAGER`. Visible: Submit, Save for Later, **Approve**, **Push Back**.
- **Expected-difference note:** "Approve and Push Back visible only for TL_MANAGER."
- **Regression signals:** Approve or Push Back present in A (a role sees an extra button); Approve or Push Back absent in B after a change.
- **Diff look:** two new boxes on the button row in B; nothing else changes.
- **Limit:** a hidden Approve button in A says nothing about whether `TL_EMPLOYEE` could still approve through another path. Confirm functionally.

### VR-SEC-02: Timesheet after a permission-list edit (before/after, same role)
- **Page:** Timesheet. **Role:** `TL_EMPLOYEE` for both captures.
- **Capture A (before):** before the fictional change CHG-0101 adds `TLPL_APPROVE` to a shared role by mistake. **Capture B (after):** after it.
- **Expected-difference note:** "None. The employee view must be identical before and after."
- **Regression signal:** any new Approve/Push Back region in B is a **blocker-level** signal to raise with the security team (a permission-list change reached a role it should not).
- **Diff look:** a FAIL status with boxes on the button row, where PASS was expected.
- **Limit:** PASS here does **not** show the permission list is unchanged for pages not captured, or for data rows.

### VR-SEC-03: Job Data, read-only vs update role
- **Page:** HCM Job Data. **A:** `TEST_HRV01` / `HR_VIEWER`. **B:** `TEST_HRS01` / `HR_SPECIALIST`.
- **Expected-difference note:** "Save, Add Row (+) and Delete Row (-) buttons and editable field borders only for HR_SPECIALIST. In HR_VIEWER the fields are display-only text."
- **Regression signals:** Save or the row controls present in A; Pay Grade field editable in A; Save missing in B.
- **Diff look:** several small regions (buttons) plus field-style regions (input box vs plain text). Reviewers should expect more than one region and mark each against the note.
- **Limit:** a display-only field can still accept a posted value if the server-side check is wrong. Diff cannot see that.

### VR-SEC-04: Voucher, approver-only action and an extra column
- **Page:** FSCM Voucher. **A:** `TEST_APC01` / `AP_CLERK`. **B:** `TEST_APA01` / `AP_APPROVER`. Same fictional voucher and vendor, same `BU-NORTH`.
- **Expected-difference note:** "Approve button and Approval Status column visible only for AP_APPROVER."
- **Regression signals:** Approve visible to AP_CLERK; Approval Status column absent for AP_APPROVER.
- **Diff look:** a new region on the action bar plus a new column region on the grid, which also shifts the columns to its right (expect grid-alignment boxes as well; mark as Expected only if they sit right of the new column).
- **Limit:** column hiding is cosmetic if the data is still returned to the browser; check functionally.

### VR-SEC-05: Search results, row-level (data) difference is out of scope
- **Page:** Job Data search page. **A:** `TEST_HRS01` with Business Unit scope `BU-NORTH`. **B:** the same user with scope `BU-SOUTH`.
- **Expected-difference note:** "Different rows are expected; layout identical."
- **What the inspector shows:** the layout matches and the rows differ, so it flags the whole results grid. This is the **wrong tool** for row security.
- **Result handling:** mark the grid region as **Noise (data)**, ignore-zone the grid for layout checks, and hand row security to functional testing.
- **Limit:** this scenario exists to show a boundary: row security cannot be validated by an image diff.

### VR-SEC-06: Navigation menu entry for a read-only auditor
- **Page:** Navigation menu / home page. **A:** `TEST_HRS01` / `HR_SPECIALIST`. **B:** `TEST_AUD01` / `CUSTOM_AUDITOR`.
- **Expected-difference note:** "Auditor sees View entries only. No Update/Add menu items."
- **Regression signals:** any Add/Update entry in B.
- **Diff look:** removed regions in B (menu items present in A, absent in B).
- **Limit:** a missing menu item does not remove page access. A bookmarked URL may still open the page. Test it directly.

### VR-SEC-07: Same role, same page: negative control
- **Page:** Timesheet. **Role:** `TL_EMPLOYEE` for both captures, same session settings.
- **Expected-difference note:** "None."
- **Expected inspector status:** PASS, 0 regions (see VR-PASS-01).
- **Purpose:** proves the capture routine itself is stable before role differences are trusted. A noisy control capture means role results are unreliable.

### VR-SEC-08: Evidence hygiene check (not a visual diff)
- **Check:** saved runs and exported reports contain only fictional role, user and BU names, and no screenshot of a real system.
- **How:** `python3 tools/privacy_audit.py` (repo) plus a manual look at every sample/screenshot; the DevTools Network tab stays empty after load.
- **Limit:** a clean audit shows the repo hygiene only. It does not assess authorization.

## 5. Scenario summary

| ID | Page | A / B | Expected difference | Inspector expectation |
|---|---|---|---|---|
| VR-SEC-01 | Timesheet | `TL_EMPLOYEE` / `TL_MANAGER` | Approve + Push Back only in B | FAIL, 2 expected regions |
| VR-SEC-02 | Timesheet | `TL_EMPLOYEE` before / after CHG-0101 | None | PASS (FAIL = blocker signal) |
| VR-SEC-03 | Job Data | `HR_VIEWER` / `HR_SPECIALIST` | Edit controls only in B | FAIL, 2 or more expected regions |
| VR-SEC-04 | Voucher | `AP_CLERK` / `AP_APPROVER` | Approve + Approval Status column in B | FAIL, 2 or more expected regions |
| VR-SEC-05 | Job Data search | `BU-NORTH` / `BU-SOUTH` scope | Rows differ (data) | FAIL on data region; Noise; functional test owns this |
| VR-SEC-06 | Navigation | `HR_SPECIALIST` / `CUSTOM_AUDITOR` | Add/Update items absent in B | FAIL, removed regions expected |
| VR-SEC-07 | Timesheet | `TL_EMPLOYEE` twice | None | PASS, 0 regions |
| VR-SEC-08 | Repo and reports | n/a | No real data | `privacy_audit.py` clean |

For the demo, only VR-SEC-01 and VR-SEC-02 need fixtures (Mason: `demo-erp/tl-timesheet` role variants, with button sets as above). The others are specification for real use in a test environment, with department approval.

## 6. Wording for reports

Use these lines in the exported report and in any hand-off:

- "This visual comparison shows what was displayed for the tested role. It does not prove that authorization is correct; access must be verified with functional security testing." (knowledge/erp-security-admin/docs/01-peoplesoft-security-model.md)
- "Expected-difference note: <text>. Reviewer decision per region: Expected / Regression / Noise."
- Never write "access control verified", "role is secure" or "permissions confirmed" on the strength of a diff.

## 7. Privacy rules for these scenarios

- Fictional names only (see section 3). Never real INFORMS roles, permission lists, user IDs, Business Units or screenshots.
- Real use happens in a test environment with department approval. Captures stay in the browser (IndexedDB) and never leave the device; Reset app data clears them.
- The audit that checks these rules is `tools/privacy_audit.py`; its final run is recorded in `docs/security-audit.md` (part 2).

Sources: `knowledge/erp-security-admin/docs/01-peoplesoft-security-model.md` (public PeopleBooks: https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tsec/SecurityBasics-c07658.html, https://docs.oracle.com/en/applications/peoplesoft/peoplesoft-common/data-transformer/user-profiles-roles-permission-lists.html); `knowledge/erp-security-admin/examples/ex1-role-scenario.md`; skills `role-based-security-testing`, `uat-evidence-traceability`, `erp-test-scenarios`; `docs/business-case.md` (Positioning). The role, permission-list and CHG names are invented for this project. Whether a real PeopleSoft Timesheet shows exactly these buttons per role is **unverified** and depends on configuration.

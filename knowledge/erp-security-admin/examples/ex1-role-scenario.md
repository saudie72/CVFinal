# Example 1: role-based visual scenario (fictional roles)

**ID:** VR-SEC-01 · **Page:** Time & Labor Timesheet (Demo ERP, fictional)

| Capture | User / role (fictional) | Expected visible controls |
|---|---|---|
| A | `TEST_EMP01` / `TL_EMPLOYEE` | Submit, Save for Later |
| B | `TEST_MGR01` / `TL_MANAGER` | Submit, Save for Later, **Approve**, **Push Back** |

**Expected difference note (stored on the run):** "Approve and Push Back visible only for TL_MANAGER."
**Regression signals:** Approve visible in capture A; or Approve missing in B after the change.
**Limit:** see docs/01. Pass this to functional security testing for confirmation.

---
name: erp-test-scenarios
description: "Write the page and module catalogue and the test scenarios (including Business Unit / Constitutional Office comparisons) with fictional data and expected results. Use when planning what to test or building fixtures."
user-invocable: false
---
# ERP test scenarios

## Output: docs/erp/test-scenarios.md
For each scenario: `ID | Module | Page | Change type | Precondition | Steps | Expected visual result | Expected inspector status | Evidence fields`.

## Required scenario set
| ID | Scenario |
|---|---|
| VR-HCM-01 | Job Data after a PUM update: Pay Grade removed, Save moved |
| VR-HCM-02 | Personal Data label/style change after a PeopleTools upgrade |
| VR-FS-01 | Voucher grid misalignment after a customization deploy |
| VR-FS-02 | PO page where only the timestamp changes (ignore-zone case) |
| VR-TL-01 | Timesheet: Submit moved, Reported Hours truncated (business-case example) |
| VR-ALN-01 | Same page captured with a 3 px scroll / 110% zoom (alignment) |
| VR-BU-01 | Same page for two fictional Business Units (e.g., "BU-NORTH" vs "BU-SOUTH") showing a visible config difference |
| VR-SEC-01 | Same page for two fictional roles: a button visible vs hidden (see role-based-security-testing) |
| VR-PASS-01 | Identical capture → PASS |

## Data rules
Fictional employees ("Jordan Rivera, EmplID 000123"), fictional BUs and vendors. Never real ones.

---
name: role-based-security-testing
description: "Design role-based visual test scenarios (fields or buttons that should appear or disappear for a role) and state the limits of visual evidence. Use when planning security-related comparisons or wording reports about them."
user-invocable: false
---
# Role-based security testing (visual support only)

## Method
- Capture the same page with the same data as two fictional roles (e.g., "TL_EMPLOYEE" vs "TL_MANAGER").
- Compare them. The expected differences (e.g., an Approve button only for the manager) should be stored as an **expected-difference note** on the run.
- Regression signal: a control that appears for a role that shouldn't have it, or disappears for a role that should.

## Limits (put this in every security-related report)
"A visual comparison shows what was rendered for the tested role. It does **not** prove authorization is correct: hidden controls may still be reachable, and data access is enforced by permission lists, roles and row-level security, which must be tested functionally."

## Data
Fictional role and permission-list names only. Never real INFORMS security configurations.

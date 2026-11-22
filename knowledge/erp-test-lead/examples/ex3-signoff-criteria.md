# Example 3: sign-off and baseline-promotion criteria

| Condition | Outcome |
|---|---|
| Status PASS | Page passes visual UAT. The tester initials it. No promotion needed if nothing changed |
| Status FAIL, all regions **Expected** (intended by the change) | Page passes. The reviewer signs off, then **promotes the after-capture to the new baseline** |
| Status FAIL, any region **Noise** only | Add an ignore zone or adjust the per-page threshold, rerun, and record the reason |
| Any region **Regression** | Raise a defect with the PNG/HTML report attached. No sign-off and no promotion. Retest after the fix |
| Security scenario (role-based) | Visual sign-off covers display only. **Functional security testing is still required** |

Run `ex2_validate_evidence.py` before sign-off: it blocks sign-off when a region is a Regression or a FAIL region has no decision.

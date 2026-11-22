---
name: upgrade-cycle-capture-standards
description: "Define where the inspector fits in PUM and PeopleTools upgrade cycles and the capture standards that make screenshots comparable. Use when writing the capture guide, onboarding text or the baseline workflow."
user-invocable: false
---
# Upgrade cycle and capture standards

## Where it fits (docs/erp/capture-standards.md)
1. **Before** the change is applied to the test environment: capture baselines for every page in scope.
2. Apply the PUM image fixes, PeopleTools patch or customization.
3. **After**: capture the same pages and compare them in the inspector. Triage the regions as Expected, Regression or Noise.
4. Log regressions as defects, and attach the PNG evidence.
5. Once signed off, **promote** the after-captures to new baselines for the next cycle.

## Capture standard (must be the same before and after)
- Same browser (Chrome), the same version where possible, 100% zoom, a fixed window of 1366×900, and the same OS display scaling.
- Same test user/role, Business Unit, effective date and test data row.
- Same theme / branding settings, no open popups or tooltips, cursor out of the way.
- Full-page PNG (DevTools → Capture full size screenshot), never JPEG.
- File name: `<module>_<page>_<before|after>_<YYYYMMDD>.png`.

The inspector's alignment step tolerates small scroll and zoom differences, but the standard is what keeps false positives low.

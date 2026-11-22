# Capture standards for upgrade-cycle screenshots

Owner: Hal (peoplesoft-admin-psa). Generic and public only: no real environments, hostnames or versions. Use the placeholders in this file when you write a real cycle runbook.

## 1. Where the inspector fits in the cycle

```
Capture BEFORE (test env, change not yet applied)
  → Apply change (PUM change package via Change Assistant, or PeopleTools patch / customization)
  → Capture AFTER with the same capture standard
  → Inspector compare → triage each region: Expected / Regression / Noise
  → Log regressions as defects, attach the PNG evidence
  → Test lead sign-off → promote AFTER captures to new baselines
```

- Repeat the whole loop for each target environment the change is deployed to (for example test, then UAT), because configuration can differ between them.
- The PUM image is the **source** of a change package. Change Assistant applies it to the **target** environment. The inspector is not part of either tool. It only compares the captures.
- The "before" baseline must be captured before the change is applied. If the change is backed out, the old baselines still match the old system, so do not promote anything until sign-off.

Sources: `knowledge/peoplesoft-admin-psa/docs/01-pum-change-assistant.md` (cycle diagram and PUM/Change Assistant roles, based on the public Oracle PeopleBooks pages for Update Manager and Change Assistant). `knowledge/peoplesoft-admin-psa/examples/ex2-cycle-runbook.md` (step order and rollback note).

## 2. Capture rules

Use the same values for the before and after captures. If any value changes between them, the difference is no longer evidence of the change.

| Item | Standard | Why |
|---|---|---|
| Environment | The same **test** environment for before and after. Never production. | Different environments have different configuration. |
| Browser | Google Chrome, the same major version for both captures | Rendering differences show up as false positives. |
| Viewport | **1366 × 900** viewport (the page's inner size) | Pixel geometry must match. The inspector's alignment tolerates small scroll and zoom differences, but a fixed size keeps false positives low. |
| Zoom | **100%** browser zoom, with OS display scaling at 100% | Zoom changes every text and box position. |
| User and role | The same **test** user and the same role, with no role changes between captures | A role change changes which fields and buttons are visible. |
| Business data | The same test record, business unit, effective date and period for both captures | Different data changes text widths and row counts. |
| Display settings | The same theme (Classic, Classic Plus or Fluid). Do not switch it during a cycle. | A theme change counts as a whole-page change. |
| Page state | Page fully loaded. No hover, tooltip, open prompt, dropdown or focus ring. Cursor moved out of the way. | Transient UI state creates differences that are not real changes. |
| Format | **PNG, full page** (Chrome DevTools → Capture full size screenshot). Never JPEG. | JPEG compression artefacts create false differences. |

Sources: `knowledge/peoplesoft-admin-psa/examples/ex1-capture-standard.md` (rules and reasons). `knowledge/peoplesoft-admin-psa/docs/` has no separate capture note, so the rules above are the ones in ex1 and in the team skill `upgrade-cycle-capture-standards`.

**Unverified:** the exact DevTools menu path for "Capture full size screenshot" depends on the Chrome version. Check it on the browser you use.

**Gap found in the knowledge folder:** ex1 says the mock-erp-builder's `knowledge/mock-erp-builder/examples/capture_and_verify.py` follows this standard. The script sets the 1366 × 900 viewport, device scale 1 and PNG output, but it calls `page.screenshot(..., full_page=False)`. It captures the viewport only, not a full page. Either the script or this standard needs to change. Hal does not own the script, so this is a handoff to Mason (mock-erp-builder).

## 3. File naming

Pattern:

```
<module>_<page>_<before|after>_<YYYYMMDD>.png
```

- `<module>`: the product area, lowercase, for example `hcm`, `fscm`, `tl`.
- `<page>`: the page or component name, lowercase, words joined with hyphens, for example `timesheet-entry`.
- `<before|after>`: exactly one of the two words.
- `<YYYYMMDD>`: the date the capture was taken, not the date of the change.

Example: `tl_timesheet-entry_before_20260601.png`

Sources: the pattern comes from `knowledge/peoplesoft-admin-psa/examples/ex1-capture-standard.md` and the team skill `upgrade-cycle-capture-standards`. The lowercase and hyphen rules are proposed here to keep names sortable and portable. They are not from a source.

## 4. Baseline promotion

1. Capture the before set and store it as the current baseline for each page in scope.
2. Apply the change, capture the after set using section 2.
3. Compare and triage each region. Log regressions as defects and attach the PNG evidence.
4. **Promote only after sign-off** from the test lead. Sign-off means every FAIL has been resolved, accepted or raised as a defect.
5. Promote the after captures to become the new baselines for the next cycle.
6. If the change is backed out, do not promote. The old baselines still match the old system.

Sources: `knowledge/peoplesoft-admin-psa/examples/ex2-cycle-runbook.md` (steps 4 to 6 and the rollback note). The "resolved, accepted or raised as a defect" wording is proposed here.

## 5. Capture tip (for Wren's UI)

When a baseline is added, Wren's UI shows this tip. Its text is fixed:

> "Capture the before and after pages with the same browser, 1366×900 viewport, 100% zoom, test user and data, then promote the after capture only after sign-off."

Sources: sections 2 to 4 of this file.

## Open questions / assumptions

- The 1366 × 900 viewport is the standard the project uses in its verified capture script. It is not an Oracle requirement.
- Whether the inspector should require full-page captures or accept viewport captures is unresolved. It depends on the gap noted in section 2.
- The "same major version" rule for Chrome is from ex1. The team skill says "same version where possible". Pick one before the first real cycle.

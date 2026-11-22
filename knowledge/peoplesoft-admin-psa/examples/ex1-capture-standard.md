# Example 1: capture standard (one page, filled in)

| Item | Standard | Why |
|---|---|---|
| Environment | Same **test** environment for before and after (never production) | Different environments differ in config |
| Browser | Chrome, same major version | Rendering differences become false positives |
| Window / zoom | 1366×900 inner size, **100% zoom**, OS display scaling 100% | Pixel geometry must match |
| User | The same fictional test user and role (e.g., `TL_EMPLOYEE_TEST`) | The role changes visible fields |
| Data | The same EmplID, Business Unit, effective date and timesheet period | The data changes text widths |
| Theme | The same branding theme (Classic, Classic Plus or Fluid); not switched mid-cycle | A theme change counts as a whole-page change |
| State | No hover, tooltip, open prompt or focus ring; the page fully loaded | Avoid transient differences |
| Format | PNG, full page (DevTools → Capture full size screenshot) | JPEG artefacts cause false diffs |
| Naming | `<module>_<page>_<before|after>_<YYYYMMDD>.png` | Traceability |

Verified: the mock-erp-builder's `capture_and_verify.py` follows this standard (Chrome, 1366×900, scale 1, PNG).

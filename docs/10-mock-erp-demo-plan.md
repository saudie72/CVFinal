# 10 — Mock ERP Demo Plan

## Summary

The demo can't use the County environment, and the public repo must contain **no real INFORMS screenshots, employee data, or Oracle or County branding**. So we build a small **fictional ERP**: static HTML pages styled like a typical classic-ERP screen, each with a **"before"** version and an **"after patch"** version that contains **planted regressions**. Because we planted the changes ourselves, we know exactly what the inspector *should* find. That makes the mock ERP both a demo and a test suite.

Branding: **"Demo ERP (fictional)"**, with a generic grey header, breadcrumbs, page tabs, form grid, and Save / Return to Search / Notify buttons. No real product logos.

## Pages and planted changes

| # | Page (folder) | Fake data | Planted change in "after" | What it demonstrates |
|---|---|---|---|---|
| 1 | HCM – Job Data (`hcm-job-data`) | Emp ID 000123, Dept 4410, Position 00078, Pay Grade 14 | **Pay Grade field removed**; **Save button moved** to the top-right | Missing field + layout regression |
| 2 | HCM – Personal Data (`hcm-personal-data`) | Fake name/address | **Label text** "Dept ID" → "Department"; **link colour** changes | Subtle text + styling change |
| 3 | FSCM – Voucher Entry (`fscm-voucher`) | Vendor 0000045, invoice lines | **Grid column misaligned** by 6 px; Amount value **truncated** | Small CSS regression |
| 4 | FSCM – Purchase Order (`fscm-po`) | PO lines | **Only the timestamp/"Last updated" changes** | Noise → fails until an ignore zone is drawn → PASS |
| 5 | Time & Labor – Timesheet (`tl-timesheet`) | Test employee, one week of hours | **Submit button moves below the grid**; **Reported Hours column truncated** | Exactly the business-case example |
| 6 | Any page, shifted (`hcm-job-data-shifted`) | Same as #1 "before" | Whole page shifted **+3 px down** (and a 110 % zoom variant) | Alignment step → PASS |
| 7 | Any page, identical (`fscm-po-identical`) | Same | No change | Clean **PASS** |

## Folder layout (proposal)

```
demo-erp/
  styles.css                 # shared fake-ERP look
  hcm-job-data/before.html   hcm-job-data/after.html
  ...
  index.html                 # list of pages + "Simulate patch" toggle
samples/
  hcm-job-data_before.png    hcm-job-data_after.png
  ...                        # pre-captured pairs, loaded with one click in the app
  manifest.json              # [{page, module, before, after, expected:{regions, status}}]
```

`expected` lets the QA expert check the inspector automatically. For example, Job Data should report 2 or more regions and FAIL, and the identical pair should report 0 regions and PASS.

## Two ways to use them

1. **Built-in samples (always works):** the app's "Load sample" menu fetches a PNG pair from `samples/`. This is the same approach as the guide's "Receipt" and "Letter" samples.
2. **Live capture (best for showcase):** open `/demo-erp/`, pick a page, take a screenshot (Win+Shift+S / ⌘+Shift+4), flip **Simulate patch**, take another, then drag both into the inspector. Capturing live shows the tool working on images it has never seen.

## Producing the PNG sample pairs

- **Option A, manual:** open each page in Chrome at 100 % zoom with a fixed window size, then use DevTools → ⌘/Ctrl+Shift+P → **"Capture full size screenshot"**.
- **Option B, in-browser:** render the page into a canvas with a DOM-to-canvas library. This adds a dependency and can be inexact, so it isn't recommended.
- **Option C, scripted (dev machine only):** a small Playwright script that loads each `before.html`/`after.html` and calls `page.screenshot({ fullPage: true })`. It is reproducible, and it is the same tool real visual-regression pipelines use. The script lives in `tools/` and never runs on Netlify.

Use the same viewport (e.g., 1366×900) and **PNG** format for every capture. JPEG artefacts would create false differences.

## Demo script (≈ 3 min)

1. Problem: PeopleSoft patches affect many departments, and manual screen checks are slow and inconsistent.
2. Load **Timesheet** pair → 2 regions, FAIL → show boxes, heatmap and overlay slider.
3. Load **Purchase Order** pair → FAIL on timestamp only → draw ignore zone "Last updated" → rerun → PASS.
4. Load the **shifted** pair → "Aligned: shift (0,+3)" → PASS.
5. Refresh → history and baselines are still there (IndexedDB). DevTools → Network is quiet, so nothing left the device.
6. Close: a supplemental QA tool, not a replacement for functional testing. Real use would be in a test environment with approval.

## Sources

- Chrome DevTools — capture full-size screenshot (Command Menu): https://developer.chrome.com/docs/devtools/command-menu
- Playwright screenshots: https://playwright.dev/docs/screenshots
- Business case and Timesheet scenario: `docs/business-case.md`

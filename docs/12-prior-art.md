# 12 — Prior Art: Existing Visual Regression Tools

## Summary

Visual regression testing is an established practice in web development. Existing tools all follow the same loop: **capture a baseline → capture again after a change → diff → review → approve a new baseline.** The inspector uses the same loop, but is designed for **ERP analysts** rather than front-end developers, and runs **entirely in the browser**.

| Tool | How it captures | How it compares | Where it runs | Notes |
|---|---|---|---|---|
| **Playwright** `toHaveScreenshot()` | Drives a real browser from test code | **pixelmatch** per-pixel diff; `threshold` (per-pixel colour tolerance, default 0.2), `maxDiffPixels`, `maxDiffPixelRatio`; `mask` to hide dynamic areas | Developer machine / CI | First run becomes the "golden" baseline; needs code and selectors |
| **BackstopJS** | Puppeteer/Playwright scenarios (URLs, viewports, selectors) | **Resemble.js**; `misMatchThreshold` = % of pixels allowed to differ; `hideSelectors` / `removeSelectors` for dynamic content | Node.js CLI / Docker | Open source, HTML report |
| **Percy** (BrowserStack) | SDK snapshots from tests / CI | Cloud rendering and diffing, review UI | **Vendor cloud** | Screenshots uploaded to a third party |
| **Applitools Eyes** | SDK in tests | "Visual AI" comparison that tolerates rendering noise | **Vendor cloud** | Commercial; uploads screenshots |

## What these tools assume, and why that's a poor fit for INFORMS

1. **Scriptable access to the app.** These tools drive the browser with code, URLs and CSS selectors. PeopleSoft pages are reached through sign-on, navigation and component state. A functional analyst usually can't script that, but can always take a screenshot.
2. **A developer workflow.** They need Node.js, CI pipelines and test code. ERP functional analysts work in test scripts and spreadsheets.
3. **Cloud upload (Percy, Applitools).** Sending HCM screenshots that contain employee PII to a third-party cloud would need security and legal review.

## What this project does differently

- **Input is just two screenshots.** Any analyst can use it, with no scripts.
- **Privacy-first.** The OpenCV.js pipeline runs on the analyst's own machine. Nothing is uploaded, which can be shown live in the DevTools Network panel.
- **Alignment step.** It tolerates scroll and zoom differences between manually captured screenshots. Code-driven tools avoid these by fixing the viewport.
- **ERP vocabulary.** Results are organized by page and module (HCM/FSCM/T&L), with ignore zones for each page and the patch or ticket ID stored with each run. This makes it UAT/audit evidence, not just a CI log.
- **Same proven thresholds.** It uses a % changed-pixel threshold and masking, borrowed from Playwright and BackstopJS, plus SSIM as an overall similarity score.

**Limits (be honest in the showcase):** it does not navigate PeopleSoft or capture pages automatically, and it does not validate data, business logic or security. It is a supplemental QA tool.

## Sources

- Playwright SnapshotAssertions (threshold, maxDiffPixels, mask): https://playwright.dev/docs/api/class-snapshotassertions
- Playwright visual comparisons guide: https://playwright.dev/docs/test-snapshots
- BackstopJS (misMatchThreshold, hideSelectors, Resemble.js): https://github.com/garris/BackstopJS
- pixelmatch: https://github.com/mapbox/pixelmatch
- Percy: https://www.browserstack.com/percy
- Applitools Eyes: https://applitools.com/platform/eyes/

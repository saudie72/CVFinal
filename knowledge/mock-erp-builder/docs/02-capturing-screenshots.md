# Capturing reproducible screenshots

**Sources:** Playwright screenshots: https://playwright.dev/docs/screenshots · Playwright visual comparisons (`toHaveScreenshot`, threshold, `maxDiffPixels`, `mask`): https://playwright.dev/docs/test-snapshots · SnapshotAssertions API: https://playwright.dev/docs/api/class-snapshotassertions · Chrome DevTools Command Menu (Capture full size screenshot): https://developer.chrome.com/docs/devtools/command-menu

## Facts
- Playwright's `page.screenshot({ path, fullPage })` captures the viewport or the full scrollable page. The viewport and `deviceScaleFactor` are set on the context or page.
- Playwright's visual comparisons use **pixelmatch**. `threshold` is a per-pixel colour tolerance (0–1, default 0.2), `maxDiffPixels` / `maxDiffPixelRatio` allow some changed pixels, and `mask` hides dynamic areas. These are the same ideas as our T, the % threshold and ignore zones.
- In Chrome DevTools, the Command Menu (Ctrl/⌘+Shift+P) → "Capture full size screenshot" works without code.

## Our capture standard (for fixtures)
- Chrome, **viewport 1366×900**, `device_scale_factor=1`, 100% zoom, **PNG** only.
- The same fonts and OS for before and after. Font rasterisation differs between OSes, so capture both on one machine.
- No hover state, focus ring or cursor in the shot. Wait for fonts to load.
- File names: `<page>_<before|after>.png`. The expected results go in `samples/manifest.json`.

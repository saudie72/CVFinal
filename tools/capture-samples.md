# How samples/*.png were captured

Everything here is fictional ("Demo ERP (fictional)"). The pages live in `demo-erp/<page>/before.html` and `after.html`
(shared `demo-erp/styles.css`; after-only styling is in `demo-erp/<page>/after.css`; no inline scripts or styles, so they work under the
Netlify CSP). `demo-erp/index.html` has the **Simulate patch** toggle (switches the links between `before.html` and `after.html`) for live captures.

## Re-run
```
python3 tools/capture-samples.py
```
Needs Node with the `playwright` package (the script runs `require('playwright')` and `chromium.launch()`; set `CHROME_PATH` to use another
Chrome), plus Python `cv2` and `numpy`. The script serves the repo root with `python3 -m http.server 8105 --bind 127.0.0.1` (port 8105 only) and
**stops the server when it ends**. It rewrites `samples/*.png` and `samples/manifest.json`, then runs the self-check and exits non-zero if it fails.
Dev machine only; never part of the Netlify site.

## Capture standard (docs/erp/capture-standards.md, skill upgrade-cycle-capture-standards)
- Chromium via Playwright, **viewport 1366x900, `deviceScaleFactor` 1, 100% zoom, full page (`fullPage: true`), PNG**.
- One browser session for every shot, so before and after share fonts and rendering. Waits for `document.fonts.ready`; the mouse is moved to (0,0); no hover, focus ring or caret.
- Every page is shorter than 900 px, so every PNG is exactly 1366x900.
- File names: `samples/<page>_<before|after>.png` (the manifest contract). Hal's pattern `<module>_<page>_<before|after>_<YYYYMMDD>.png` is for real capture cycles; the fixtures keep stable names.
- Note: the knowledge example `knowledge/mock-erp-builder/examples/capture_and_verify.py` used `full_page=False` (viewport only). The app samples follow the **full-page** standard instead. The knowledge folder was not edited.

## manifest.json
Array of `{page, title, module, before, after, expected:{status, minRegions[, maxRegions]}, ignoreZones}`. `tl-timesheet` is first.
- `expected` is the result with **no** ignore zone applied. For the two alignment pairs (`hcm-job-data-shifted`, `hcm-job-data-zoom110`) PASS means **after alignment**; an unaligned compare FAILs.
- `fscm-po` also has `ignoreZones` (the timestamp, baseline px) and `expectedWithIgnoreZones: {status: PASS, maxRegions: 0}`. The zone is **not** meant to be auto-applied: the demo draws it, then reruns. Zone: `{x:1207, y:74, w:146, h:20}` (the timestamp value box plus 3 px padding; the label "Last updated:" is outside it).
- `hcm-job-data-zoom110` is an extra variant (110% zoom, same 1366 px width). Whether it passes after alignment is **unverified** (re-rendered text may not match pixel for pixel).

## Planted changes (one list per page)
| Page | Planted changes |
|---|---|
| tl-timesheet | Submit toolbar moved below the grid (reflow); Reported Hours column narrowed 110 to 34 px so header and values are cut off |
| hcm-job-data | Pay Grade field removed (an empty slot stays, no reflow); Save button moved from the bottom toolbar to top right (other buttons shift left) |
| hcm-personal-data | Label "Dept ID" becomes "Department"; all three links change from blue to green |
| fscm-voucher | Unit Price column 6 px wider, so Amount, Account and Department shift +6 px; the line 2 Amount is clipped ("500.0") |
| fscm-po | Only "Last updated" 11/16/2026 09:14:02 AM becomes 03:47:55 PM (value box is fixed width, so the label does not move) |
| hcm-job-data-shifted | Whole page +3 px down |
| hcm-job-data-zoom110 | Whole page rendered at 110% |
| fscm-po-identical | None; both PNGs are pixel-identical |

## Self-check (built into the script; Python cv2, same steps as skill opencvjs-diff-pipeline: blur 3x3, absdiff, T 25, dilate 5x5 x2, area >= 64)
- every pair has equal size, and the raw status and `minRegions` match the manifest;
- every planted change changes pixels inside its element box (measured from the DOM);
- voucher: line 1 Amount equals the before value shifted +6 px, line 2 does not (truncation);
- fscm-po: with the zone masked there are 0 regions, and no difference exists outside the zone;
- fscm-po-identical: byte-identical pixels; hcm-job-data-shifted: 0 regions once the +3 px is undone.

Observed regions (x, y, w, h): tl-timesheet 4 (big grid block 774x170 at 11,233, old toolbar 276x23 at 12,409, plus 2 small slivers); hcm-job-data 6; hcm-personal-data 4; fscm-voucher 20 (many small, column shift); fscm-po 1 (69x18 at 1275,75).

# 04 — Ignore Zones (Masks)

## Summary

Some parts of a PeopleSoft page change on every visit: the current date and time, the signed-in user's name, session or instance IDs, "Last updated" stamps, and notification counts. If these aren't masked, every page **fails**, and analysts stop trusting the tool. Ignore zones are rectangles, saved for each page, that are blacked out of the diff before thresholding. Visual-testing tools handle this the same way: Playwright has `mask`, and BackstopJS has `hideSelectors`/`removeSelectors`.

This is the Lecture 4 and Lecture 6 mask idea used in reverse: **white = ignore** here, then the mask is applied with `setTo(0)`.

## Building the mask

```js
// zones: [{x, y, w, h, label}] in baseline pixel coordinates (stored in IndexedDB)
const mask = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
for (const z of zones) {
  cv.rectangle(mask, new cv.Point(z.x, z.y), new cv.Point(z.x + z.w, z.y + z.h),
               new cv.Scalar(255), -1);            // -1 = filled
}
diff.setTo(new cv.Scalar(0), mask);                 // zero the diff inside zones
// later: draw zones as grey hatched boxes on the output so reviewers see what was ignored
mask.delete();
```

Apply the mask **after `absdiff` and before `threshold`**. Masking the diff (not the source images) means the alignment still uses all of the page.

## UX for drawing zones

- Draw zones by dragging on the baseline canvas. Convert the mouse position to image pixels with `x * (img.width / canvas.clientWidth)`.
- Give each zone a label ("Timestamp", "User name"). Labels appear in the report.
- Zones belong to a **page** (e.g., "HCM – Job Data"), not to a single run. They are reused on every comparison.
- Offer an "Ignore this region" button on any detected region, which turns a box into a zone with one click.

## Gotchas

- Store zones in **baseline coordinates**. If the candidate is aligned to the baseline, the coordinates still match.
- Too many zones hide real regressions. Show the "% of page ignored" figure in the report.
- An ignore zone is not a security control. Note this in the report for security-testing use.

## Sources

- OpenCV.js basic operations (setTo, copyTo with mask): https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html
- Playwright snapshot assertion options (mask, maxDiffPixels): https://playwright.dev/docs/api/class-snapshotassertions
- BackstopJS hideSelectors / removeSelectors: https://github.com/garris/BackstopJS

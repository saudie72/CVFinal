# 03 — Aligning Screenshots Before Diffing

## Summary

Two screenshots of the same ERP page are rarely pixel-identical in position. Scrolling, a different browser zoom, a changed window size or an extra banner can shift everything. Without alignment, **a 3-pixel shift makes the whole page look "changed."** The inspector aligns the candidate to the baseline first, using the cheapest method that works.

## Strategy (try in order)

| Situation | Method | Cost |
|---|---|---|
| Same size, no shift | none | — |
| Different size (zoom/resolution) | `cv.resize` candidate to baseline size (`INTER_AREA` when shrinking, `INTER_LINEAR` when enlarging) | low |
| Small translation (scroll, banner) | `cv.matchTemplate` with a central strip of the baseline → offset → `cv.warpAffine` with translation matrix | low |
| Translation + scale (zoom + scroll) | ORB keypoints → BFMatcher (Hamming) → `cv.findHomography(RANSAC)` → `cv.warpPerspective` | higher |

Report which method was used, and the offset, in the result (e.g., *"Aligned: shift (0, +3) px"*). This becomes part of the test evidence.

## Translation with matchTemplate

```js
// take a template from the middle of the baseline
const roi = base.roi(new cv.Rect(x0, y0, tw, th));
const res = new cv.Mat();
cv.matchTemplate(cand, roi, res, cv.TM_CCOEFF_NORMED);
const mm = cv.minMaxLoc(res);           // best = maxLoc for CCOEFF_NORMED
const dx = mm.maxLoc.x - x0, dy = mm.maxLoc.y - y0;
const M = cv.matFromArray(2, 3, cv.CV_64FC1, [1, 0, -dx, 0, 1, -dy]);
cv.warpAffine(cand, aligned, M, new cv.Size(base.cols, base.rows),
              cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255,255,255,255));
// cleanup roi, res, M
```

- With `TM_SQDIFF`, the best match is the **minimum**. With the other methods, it is the maximum.
- The result size is (W−w+1) × (H−h+1). The template can't be larger than the source.
- Only accept the offset if `mm.maxVal > 0.8`. Otherwise fall back to ORB.

## Feature-based (ORB + homography)

```js
const orb = new cv.ORB(2000);
const kp1 = new cv.KeyPointVector(), kp2 = new cv.KeyPointVector();
const d1 = new cv.Mat(), d2 = new cv.Mat();
orb.detectAndCompute(g1, new cv.Mat(), kp1, d1);
orb.detectAndCompute(g2, new cv.Mat(), kp2, d2);
const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
const matches = new cv.DMatchVector();
bf.match(d1, d2, matches);
// keep best N by distance, build Float32 point arrays
const src = cv.matFromArray(n, 1, cv.CV_32FC2, ptsCand);
const dst = cv.matFromArray(n, 1, cv.CV_32FC2, ptsBase);
const H = cv.findHomography(src, dst, cv.RANSAC, 3);
cv.warpPerspective(cand, aligned, H, new cv.Size(base.cols, base.rows));
// delete orb, kp1, kp2, d1, d2, bf, matches, src, dst, H
```

**Known pitfalls, from the OpenCV forum:** people have reported an **empty homography matrix** or binding errors. The usual causes are passing point arrays in the wrong format (they must be `CV_32FC2` Mats), having fewer than 4 matches, or deleting objects before they are used. Always check `H.empty()` and that you have at least 4 good matches, and fall back to translation-only alignment if either check fails.

**UI caveat:** ERP pages contain many repeated elements (identical buttons, grid cells), which confuse feature matching. Translation via `matchTemplate` is usually enough for screenshots, so use ORB only when the scale differs.

## Gotchas

- Warped borders bring in fill pixels. Fill with white (the page background), and add the border strip to the ignore mask, so it isn't reported as a change.
- Align in **grayscale** for speed, then apply the same transform to the RGBA image for display.
- Large screenshots (1920×3000+) can be downscaled 0.5× to estimate the transform. Then scale the offsets back up.

## Sources

- OpenCV.js geometric transformations (resize, warpAffine, warpPerspective): https://docs.opencv.org/4.x/dd/d52/tutorial_js_geometric_transformations.html
- OpenCV.js template matching: https://docs.opencv.org/4.x/d8/dd1/tutorial_js_template_matching.html
- OpenCV forum — findHomography in opencv.js (pitfalls and working approach): https://forum.opencv.org/t/opencv-js-support-for-findhomography/1126
- AKAZE and ORB planar tracking (concepts): https://docs.opencv.org/5.x/dc/d16/tutorial_akaze_tracking.html

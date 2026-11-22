---
name: screenshot-alignment
description: "Align a candidate screenshot to its baseline before diffing (resize, matchTemplate translation, ORB + homography). Use when screenshots differ in size, scroll offset or zoom."
user-invocable: false
---
# Screenshot alignment

Reference: `docs/03-alignment.md`.

## Decision ladder
1. Same size and `matchTemplate` offset (0,0) → `method:'none'`.
2. Different size → `cv.resize` to the baseline size (`INTER_AREA` when shrinking, `INTER_LINEAR` when enlarging).
3. Translation: take a central strip of the baseline as the template → `cv.matchTemplate(cand, tmpl, res, TM_CCOEFF_NORMED)` → `minMaxLoc`. Accept if `maxVal > 0.8`. Then `warpAffine` with `[1,0,-dx, 0,1,-dy]`, filling the border with white.
4. Scale or perspective differs → ORB(2000) → `BFMatcher(NORM_HAMMING, true)` → best N matches → `matFromArray(n,1,CV_32FC2,…)` → `findHomography(RANSAC, 3)` → `warpPerspective`.

## Guards
- Need at least 4 good matches, and `!H.empty()`. Otherwise fall back to translation.
- Repeated UI elements confuse ORB. Prefer translation for screenshots.
- Add the warped border strip to the ignore mask.
- Estimate the transform on half-size grayscale, then scale it up for full-size images.
- Report the method and the offset in the result, because they are part of the test evidence.

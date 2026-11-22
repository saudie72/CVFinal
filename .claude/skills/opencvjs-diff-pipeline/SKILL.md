---
name: opencvjs-diff-pipeline
description: "Compare two aligned screenshots with OpenCV.js and produce changed regions, % changed, SSIM and PASS/FAIL. Use when writing or reviewing the comparison code in inspector.worker.js."
user-invocable: false
---
# OpenCV.js screenshot diff pipeline

Reference: `docs/02-image-diff-pipeline.md`.

## Steps (worker side, RGBA input)
1. `cv.matFromImageData` for the baseline and the candidate. **Align first** (see skill `screenshot-alignment`).
2. `cvtColor(RGBA2GRAY)` → `GaussianBlur(3×3)` on both.
3. `cv.absdiff(gA, gB, diff)`.
4. Apply ignore zones: `diff.setTo(0, mask)` (skill `ignore-zones-masking`).
5. `cv.threshold(diff, bin, T, 255, THRESH_BINARY)`, default **T = 25**.
6. `cv.dilate(bin, bin, rect 5×5, iterations 2)`. An optional `erode` removes specks.
7. `cv.findContours(bin, contours, hier, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)` → `boundingRect`, drop boxes with area < **MIN_AREA = 64**, merge boxes with gaps < 10 px.
8. `changedPct = 100 * countNonZero(bin) / (rows*cols)`.
9. SSIM on CV_32F with an 11×11 Gaussian (σ 1.5), C1 = (0.01·255)², C2 = (0.03·255)² → `cv.mean`.
10. **FAIL** if `regions.length > 0 && changedPct > page.thresholdPct` (default 0.1). Otherwise **PASS**.

## Result contract
```js
{ regions:[{x,y,width,height,area}], changedPct, ssim, status:'PASS'|'FAIL',
  alignment:{method:'none'|'resize'|'translate'|'homography', dx, dy, scale},
  settings:{T, kernel, minArea, thresholdPct}, ms }
```
Return image buffers (the boxes view and the diff gray) as transferable `ArrayBuffer`s.

## Rules
- The images must be the same size before `absdiff`.
- Every Mat is created inside `try` and deleted in `finally` (skill `cv-mat-memory-hygiene`).
- Expose T, kernel size and min area as settings, and don't hard-code page-specific numbers.

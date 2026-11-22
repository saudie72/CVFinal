---
name: opencvjs-diff-pipeline
description: "Compare two aligned screenshots with OpenCV.js and produce changed regions, % changed, SSIM and PASS/FAIL. Use when writing or reviewing the comparison code in inspector.worker.js."
user-invocable: false
---
# OpenCV.js screenshot diff pipeline

References: `docs/cv-pipeline-notes.md` (defaults as built, Iris; wins over the research doc), `docs/02-image-diff-pipeline.md`. Code: `js/cv/{align,ssim,heatmap,pipeline}.js`, entry `self.ErpCV.compare(cv, base, cand, zones, settings, {onProgress})`.

## Steps (worker side, RGBA input)
1. `cv.matFromImageData` for the baseline and the candidate. **Align first** (see skill `screenshot-alignment`).
2. `GaussianBlur` 3×3 on both (5×5 only when alignment rescaled the candidate, `scaledBlur`).
3. **Max-channel diff** (`diffMode:'max-rgb'`, default): the maximum of the per-channel R, G, B `absdiff`s. Gray `absdiff` (`diffMode:'gray'`) misses a red→green link of near-equal luminance, which the "link colour change" fixture needs.
4. Apply ignore zones: `diff.setTo(0, mask)` (skill `ignore-zones-masking`).
5. `cv.threshold(diff, bin, T, 255, THRESH_BINARY)`, default **T = 25**.
6. `cv.dilate(bin, bin, rect 5×5, iterations 2)`. An optional `erode` removes specks.
7. `cv.findContours(bin, contours, hier, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)` → `boundingRect`, drop boxes with area < **MIN_AREA = 64**, merge only boxes that overlap or nearly touch (**`mergeGap` = 3 px**; 10 fused neighbouring controls: tl-timesheet gave 1 region instead of 2). Merge is union-find, capped at `ErpCV.MAX_BOXES` = 2000.
8. `changedPct = 100 * countNonZero(bin) / (rows*cols)`.
9. SSIM on CV_32F with an 11×11 Gaussian (σ 1.5), C1 = (0.01·255)², C2 = (0.03·255)² → `cv.mean`.
10. **FAIL if any region exists OR `changedPct > thresholdPct`** (default 0.1). Otherwise **PASS**. (The old "regions AND %" rule passed fscm-po: the timestamp is a real region but only 0.087 % of the page.)

## Result contract
```js
{ regions:[{id,x,y,width,height,area,changedPixels}], changedPct, rawChangedPct, ignoredPct, ssim, status:'PASS'|'FAIL',
  alignment:{method:'none'|'resize'|'translate'|'homography', dx, dy, scale, ...},  // dx/dy/scale always numeric (0,0,1 when none)
  settings:{T, kernel, minArea, thresholdPct, dilateIter, mergeGap, diffMode, ...}, ms,
  images:{boxes, diff, heatmap} }  // each {width,height,data:Uint8ClampedArray RGBA}, baseline size
```
`images` = boxes (aligned candidate + numbered red boxes + hatched zones), diff (masked, NORM_MINMAX) and heatmap (JET blended 55 % over the candidate). They are copies outside the Wasm heap: transfer their `.buffer`s; `settings.images=false` skips them. Region ids follow reading order and match the numbers drawn on `boxes`. Never return a top-level `type` or `id` (the worker protocol uses them).

## Rules
- The images must be the same size before `absdiff`.
- Every Mat is created inside `try` and deleted in `finally` (skill `cv-mat-memory-hygiene`).
- Size mismatch is handled here (`align.js`): ratio outside 0.5–2 throws `Size mismatch …`; small differences are resized or padded.
- Expose T, kernel size and min area as settings, and don't hard-code page-specific numbers.

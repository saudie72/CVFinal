# CV pipeline notes (A-CV, Iris)

What `self.ErpCV.compare(cv, base, cand, zones, settings)` does, the defaults it uses and why, and the measured results on every sample pair. The code is in `js/cv/align.js`, `js/cv/ssim.js`, `js/cv/heatmap.js` and `js/cv/pipeline.js` (classic scripts, loaded in that order by `inspector.worker.js`). The test harness is `tools/cv-test/`.

## Contract (as built)
```js
const r = self.ErpCV.compare(cv, {width, height, data}, {width, height, data}, [{x, y, w, h, label}], settings, {onProgress}?);
// r = { regions:[{id, x, y, width, height, area, changedPixels}], changedPct, rawChangedPct, ignoredPct,
//       ssim, status:'PASS'|'FAIL',
//       alignment:{method:'none'|'resize'|'translate'|'homography', dx, dy, scale, score, steps, fallback?, H?},
//       settings:{T, kernel, minArea, thresholdPct, dilateIter, erodeIter, mergeGap, blur, blurUsed, diffMode, ...},
//       zones, size, heatmapMethod:'applyColorMap'|'lut', timings, ms,
//       images:{boxes, diff, heatmap}  // each {width, height, data: Uint8ClampedArray RGBA}, baseline size }
```
- `cv` must be the ready module. **Gotcha for the worker:** the opencv.js 4.13 module is a *thenable* that calls back with itself, so `resolve(cv)` or `return cv` inside a `.then` never settles (the Promise keeps adopting it). Resolve with a wrapper (`resolve({cv})`) or use `onRuntimeInitialized`. See `tools/cv-test/test.worker.js`.
- `alignment` **always** has numeric `dx`, `dy` and `scale` (0, 0, 1 when nothing was done), so the UI can always print "Aligned: shift (dx, dy)". `dx/dy` mean "the candidate content sits this far from the baseline".
- Region numbers (`id`) follow reading order (top to bottom, then left to right) and match the numbers drawn on `images.boxes`.
- Bad input (missing data, wrong length) and an extreme size mismatch throw an `Error` with a readable message; the worker turns it into `{type:'error'}`.
- `images.*.data` are copies outside the Wasm heap: transfer their `.buffer`. Set `settings.images = false` to skip them.
- `images.boxes` = aligned candidate + numbered red boxes (RGBA 220,38,38, 3 px, white number on a red tab) + grey hatching over ignore zones (`drawZones`, default on). `images.diff` = the masked diff stretched with NORM_MINMAX. `images.heatmap` = JET colour map of that diff blended 55 % over the aligned candidate.

## Defaults and why
| Setting | Default | Why |
|---|---|---|
| `T` | **25** | Skill/doc default (docs/02: 20–35 for UI). Clean on every identical and aligned pair (0 px over T). |
| `blur` | **3** (×3 Gaussian) | Absorbs anti-aliasing (docs/02). |
| `scaledBlur` | **5** | Used only when alignment rescaled the candidate. With 3, the 1.1× device-scale pair left 27 one-pixel resampling specks (FAIL); with 5 it gives 0 regions (PASS). |
| `diffMode` | **`max-rgb`** | The diff is the maximum of the per-channel R, G, B absdiffs, not the gray absdiff. **Deviation from the skill (gray), measured:** a red → green link with almost equal luminance gives 0 regions in gray mode and 1 region in max-rgb (`syn-link-colour` vs `syn-link-colour-gray`). The "link colour change" in hcm-personal-data is exactly this kind of change. `diffMode:'gray'` is still available. |
| `kernel`, `dilateIter` | **5×5, 2 iterations** | Joins the glyphs of one changed label into one blob (docs/02). A single changed pixel grows to 9×9. |
| `erodeIter` | 0 | Not needed: no specks survive on the samples. |
| `minArea` | **64** px² | Skill default. |
| `mergeGap` | **3** px (was 10) | Merge only boxes that overlap or nearly touch. Dilation already bridges gaps up to ~8 px, so an extra 10 px merge bridged ~18 px and fused neighbouring controls: tl-timesheet gave 1 region with gap 10 and 2 regions with gap 3. hcm-job-data, hcm-personal-data and fscm-po did not change (3 / 4 / 1); fscm-voucher went from 3 to 4. Same numbers in a Python cv2 mirror of the pipeline. |
| `thresholdPct` | **0.1** | Kept as the noise limit. |
| **Status rule** | **FAIL if any region exists OR changedPct > thresholdPct** | Changed at Juno's request, following the acceptance spec. The old rule (regions **and** % > 0.1) passed fscm-po: the timestamp change is 1 real region but only 0.087 % of the page. A region has already passed T, morphology and minArea, so it is a visible change. thresholdPct still fails pages that have only scattered sub-minArea speckle. Identical and aligned pairs have 0 regions and 0 %, so they still PASS. |
| `maxShift` | 40 px | Translation search radius. |
| `minMatchScore` | **0.8** | Skill/doc threshold for accepting a matchTemplate offset (TM_CCOEFF_NORMED). |
| `allowHomography`, `orbFeatures` | true, 2000 | Used only when translation is rejected. |

## Alignment ladder (who checks size, and the cut-off)
The **pipeline** (`align.js`) does the size-mismatch check. The page doesn't need to, though it may warn early.
1. **Size.** If either ratio (baseline/candidate width or height) is outside **[0.5, 2]**, `compare` throws `Size mismatch … Capture both at the same viewport and zoom.` If the widths differ by more than 2 px, the candidate is resized uniformly by the width ratio (`INTER_AREA` when shrinking, `INTER_LINEAR` when enlarging) and `scale` is reported. Then it is padded or cropped (white, top-left anchored) to the baseline canvas → `method:'resize'`. A height-only difference (for example, a page 3 px taller) is padded or cropped, never stretched.
2. **Translation.** matchTemplate (TM_CCOEFF_NORMED) runs on the most textured horizontal strip of the baseline. It searches coarsely at half size for pages wider than 900 px, then refines to ±3 px at full size. If the (0,0) offset scores within 0.002 of the best, the result is "no shift" (this avoids 1-px jitter on changed pages). If the score is ≥ 0.8 and the offset isn't zero, `warpAffine` runs with a white border → `method:'translate'`.
3. **Homography** (only if translation scored < 0.8). ORB(2000) → BFMatcher(HAMMING, crossCheck) → best ≤ 500 matches → `findHomography(RANSAC)`. It is accepted only if all of these hold: ≥ 10 matches, inliers ≥ max(8, 25 %), a near-similarity check (scale 0.5–2, isotropic within 5 %, no rotation or shear > 3 %, tiny perspective terms), the warp **lowers the mean residual by ≥ 10 %**, and coverage > 60 %. Otherwise it records `fallback:<reason>` and keeps the best translation if it scored ≥ 0.5, else nothing.
4. Pixels the warp could not fill (the `valid` mask, dilated by `borderPad` = 2 px) are added to the ignore mask, so the white strip is never reported (`syn-shift-3`, `syn-taller-3` and `hcm-job-data-shifted` all give 0 regions).

Ignore zones (baseline px, `w/h` or `width/height`, clamped to the image) are applied with `diff.setTo(0, mask)` **after absdiff, before threshold**. The mask is applied again after dilation, so blobs can't grow back into a zone. For SSIM, the zone pixels are copied from the baseline. `ignoredPct` is reported.

## Results (headless Chromium worker, vendored opencv.js 4.13.0, `node tools/cv-test/run.js`, 2026-11-22)
Build check: version 4.13.0. `applyColorMap`, `ORB`, `findHomography`, `cv.max` and `_malloc` are present. In this vendored build `Mat.clone()` was **deep** (the build ends by setting `clone = mat_clone`). That differs from the knowledge note, which says clone() is shallow, so the code always uses `mat_clone()`/`copyTo()`, which is safe either way.

| Set | Pair | Expected | Status | Regions | changedPct | SSIM | Alignment (method, dx,dy, scale, match) | ms | OK |
|---|---|---|---|---|---|---|---|---|---|
| samples | tl-timesheet | FAIL ≥2 | FAIL | 2 | 8.3387 | 0.93341 | none (0,0) s=1, m=0.37 (homography rejected) | 509 | ✅ |
| samples | hcm-job-data | FAIL ≥2 | FAIL | 3 | 2.0323 | 0.98516 | none (0,0) s=1 m=0.93 | 217 | ✅ |
| samples | hcm-personal-data | FAIL ≥2 | FAIL | 4 | 0.6027 | 0.99888 | none (0,0) s=1 m=1 | 245 | ✅ |
| samples | fscm-voucher | FAIL ≥1 | FAIL | 4 | 1.8465 | 0.98592 | none (0,0) s=1 m=0.76 (homography rejected) | 433 | ✅ |
| samples | fscm-po (no zones) | FAIL ≥1 | FAIL | 1 | 0.0870 | 0.99963 | none (0,0) s=1 m=1 | 226 | ✅ |
| samples | fscm-po (+ zone 1207,74,146×20) | PASS, 0 | PASS | 0 | 0 | 1 | none | 329 | ✅ |
| samples | hcm-job-data-shifted | PASS, 0 | PASS | 0 | 0 | 1 | **translate (0,3)** s=1 m=1 | 231 | ✅ |
| samples | hcm-job-data-zoom110 | PASS, 0 | **FAIL** | 50 | 3.3445 | 0.93196 | homography (0.02,0.25) **s=0.9101** | 589 | ❌ limit |
| samples | fscm-po-identical | PASS, 0 | PASS | 0 | 0 | 1 | none | 213 | ✅ |
| synthetic | syn-identical | PASS, 0 | PASS | 0 | 0 | 1 | none | 326 | ✅ |
| synthetic | syn-two-changes | FAIL ≥2 | FAIL | 5 | 1.0333 | 0.99203 | none | 219 | ✅ |
| synthetic | syn-two-changes-lut (LUT heatmap) | FAIL ≥2 | FAIL | 5 | 1.0333 | 0.99203 | none | 300 | ✅ |
| synthetic | syn-shift-3 | PASS, 0 | PASS | 0 | 0 | 1 | translate (0,3) | 386 | ✅ |
| synthetic | syn-shift-xy | PASS, 0 | PASS | 0 | 0 | 1 | translate (−5,7) | 374 | ✅ |
| synthetic | syn-timestamp | FAIL ≥1 | FAIL | 1 | 0.0847 | 0.99957 | none | 289 | ✅ |
| synthetic | syn-timestamp-zone | PASS, 0 | PASS | 0 | 0 | 1 | none | 289 | ✅ |
| synthetic | syn-link-colour (max-rgb) | FAIL ≥1 | FAIL | 1 | 0.3242 | 1 | none | 291 | ✅ |
| synthetic | syn-link-colour-gray (control) | PASS, 0 | PASS | 0 | 0 | 1 | none | 294 | ✅ |
| synthetic | syn-scale-110 (1.1× device scale) | PASS | PASS | 0 | 0 | 0.98959 | **resize** s=0.9088 | 391 | ✅ |
| synthetic | syn-zoom-105-same-size | FAIL (limit) | FAIL | 51 | 2.192 | 0.96139 | homography s=0.9506 (true 0.9524) | 615 | ✅ |
| synthetic | syn-taller-3 | PASS, 0 | PASS | 0 | 0 | 1 | resize→translate (0,3) | 257 | ✅ |
| synthetic | syn-unrelated | FAIL ≥1 | FAIL | 1 | 100 | 0.65254 | none (homography rejected: too few keypoints) | 257 | ✅ |

**21 of 22 as expected.** The run also checks that every result has numeric `alignment.dx/dy/scale` and that the tracker deleted exactly what it created. `ms` covers `compare` only (PNG decoding runs outside it) and was measured in a software-rendered headless container, so expect a desktop to be faster.

Region boxes on the samples (baseline px): tl-timesheet #1 774×170 @(11,233) (old toolbar + the grid, which moved up 37 px) and #2 276×23 @(12,409) (the footer line, which also moved). hcm-job-data: 70×38 @(1285,65), 320×32 @(519,537), 588×37 @(12,643). hcm-personal-data: 4 label-sized boxes (≈75–151 × 19–21). fscm-voucher: 3 grid-column blocks plus the truncated Amount. fscm-po: 69×18 @(1275,75), which is inside Mason's zone.

### tl-timesheet: why the Submit move and the grid share one box
The moved toolbar makes the grid move up 37 px into the toolbar's old row, so the changed **pixels themselves** are contiguous from y=233 to y=403. No merge gap can split that; only a fixture change could. The pair meets `minRegions: 2`, but region 2 is the reflowed footer line, not "Submit at its new position". If the demo should show the Submit move and the truncated column as separate boxes, a fixture change by Mason is more correct than more tuning: keep the grid's vertical position fixed (for example, leave the toolbar row's space empty and put the new toolbar in a footer row with ≥ 12 px clear space).

### hcm-job-data-zoom110: a documented limit
Homography finds the zoom (scale 0.9101 ≈ 1/1.1) and is accepted, because it lowers the residual. But the browser **re-renders and reflows** the page at 110 %: the header bar still spans the full 1366 px, and text is re-rasterised at a new size. So no global transform can make the pixels equal, and the result is 50 regions, 3.34 %, FAIL. The synthetic same-viewport bitmap zoom (`syn-zoom-105`) shows that even a pure bitmap zoom leaves edge residuals after up- and down-sampling, while a **device-scale** capture (the whole image 1.1× larger, `syn-scale-110`) PASSes through the resize step. Recommendation: change that manifest entry to `expected: FAIL` with the note "zoom artifact: alignment reports scale ≈ 0.91; recapture at 100 % zoom" (Hal's capture standard already requires 100 % zoom), or recapture it as a deviceScaleFactor 1.1 screenshot if the demo should show a scale PASS.

## Dex's reflow hint (change-catalogue §4, item 5): not supported as written
The rule is "area > 4× the median region area **and** touching another region's edge". `run.js` evaluates it on every result, and it fired on **no** pair:
- **"Touching" can't happen by construction.** Boxes that overlap or come within 3 px are merged into one region (`mergeGap`), so returned regions are always ≥ 3 px apart.
- **"4× the median" needs many regions.** With 2–4 regions per sample, the real reflow block (tl-timesheet #1, 774×170) *is* the median or above it.
- What the data does support is Dex's other statement: the cause is at the region's **top edge** (tl-timesheet #1 starts at y=233, the old toolbar row).

Suggested replacement (unverified beyond these samples): flag `reflow` when a region is **≥ 100 px tall and ≥ 300 px wide**. On the samples, that fires only on tl-timesheet #1. Then hint "look at the top edge". The fscm-voucher grid blocks (105–133 px wide) correctly don't fire.

## Review fixes from Volt (applied)
- `mergeBoxes` is now a union-find pass, repeated until stable (O(n²) per pass; 1,900 boxes take ~16 ms in Node). More than `ErpCV.MAX_BOXES` = 2000 raw boxes returns one whole-extent region.
- The raw candidate (`B0`), after alignment, and the 4-channel diff plus its planes, after the max step, are freed early with `T.drop`. This lowers the peak heap.
- The `deepCopy` fallback deletes its target if `copyTo` throws.
- `ErpCV.stats` is reset at the start of every `compare` and returned as `result.tracked`. The harness sums it over runs.
- Re-run after the fixes: **22/22 as expected, leak flat**. Mason's manifest now lists hcm-job-data-zoom110 as `FAIL ≥1`; it gives FAIL with 25 regions and 0.2923 %.

## Leak check
`run.js` runs the full `compare` (images included) **20 times** on tl-timesheet in the worker:
- Wasm heap (`cv.HEAPU8.length`): 134,217,728 bytes before and after (**+0**).
- malloc probe (address of a fresh 64 KB `_malloc` after each run): the **same address all 20 runs**, so freed memory is reused.
- Tracker: 1,920 objects created and 1,920 deleted.
- **Negative control:** the same loop leaking one RGBA Mat per run grows the heap to 268,435,456 bytes, and the probe address moves. So the test does detect a leak.

## How to re-run
```bash
python3 tools/cv-test/gen_synthetic.py      # writes tools/cv-test/fixtures/ (fictional pages)
node tools/cv-test/run.js [--png]           # serves the repo on :8101, runs everything, kills the server
# results: stdout + tools/cv-test/last-results.json; --png also writes boxes/diff/heatmap PNGs to tools/cv-test/out/
```

## Sources
- knowledge/opencv-expert/docs/01–06 and examples/README.md (Mat/delete, contours, thresholds, warps, matchTemplate, applyColorMap present in 4.13).
- docs/02-image-diff-pipeline.md, docs/03-alignment.md, docs/04-ignore-zones.md, docs/05-visual-outputs.md; skills opencvjs-diff-pipeline, screenshot-alignment, ignore-zones-masking, cv-mat-memory-hygiene, canvas-comparison-views.
- OpenCV.js tutorials: https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html · template matching https://docs.opencv.org/4.x/d8/dd1/tutorial_js_template_matching.html · geometric transforms https://docs.opencv.org/4.x/dd/d52/tutorial_js_geometric_transformations.html
- findHomography pitfalls: https://forum.opencv.org/t/opencv-js-support-for-findhomography/1126
- SSIM: Wang et al., IEEE TIP 2004, https://www.cns.nyu.edu/pub/lcv/wang03-reprint.pdf
- Measured results: tools/cv-test/last-results.json (this run).

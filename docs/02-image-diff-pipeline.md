# 02 — Screenshot Diff Pipeline

## Summary

This is the core computer vision step. It turns two aligned screenshots into **(a)** a binary "changed pixels" mask, **(b)** a list of boxes around the changed regions, **(c)** the percentage of the page that changed, and **(d)** a similarity score. Every step reuses class material: grayscale (L2), arithmetic and thresholding (L3), morphology and contours (L7).

## Pipeline

```
baseline RGBA ─┐
               ├─ (align, 03) ─ gray ─ GaussianBlur(3x3) ─┐
candidate RGBA ┘                                           ├─ absdiff ─ apply ignore mask (04)
                                                           │      │
                                                           │  threshold(T) ─ dilate(k) ─ (erode)
                                                           │      │
                                                           │  findContours(RETR_EXTERNAL)
                                                           │      │
                                                           │  boundingRect + area filter + merge nearby
                                                           │      │
                                                           └─ score: % changed, SSIM, PASS/FAIL
```

## Key code (inside the worker)

```js
const a = cv.matFromImageData(baseImageData);
const b = cv.matFromImageData(candImageData);
const ga = new cv.Mat(), gb = new cv.Mat(), diff = new cv.Mat(), bin = new cv.Mat();
cv.cvtColor(a, ga, cv.COLOR_RGBA2GRAY);
cv.cvtColor(b, gb, cv.COLOR_RGBA2GRAY);
cv.GaussianBlur(ga, ga, new cv.Size(3, 3), 0);   // suppress anti-aliasing noise
cv.GaussianBlur(gb, gb, new cv.Size(3, 3), 0);
cv.absdiff(ga, gb, diff);                        // |a - b| per pixel, saturating

// ignore zones: set masked pixels to 0 (see 04)
if (ignoreMask) diff.setTo(new cv.Scalar(0), ignoreMask);

cv.threshold(diff, bin, 25, 255, cv.THRESH_BINARY);   // T ≈ 20–35 for UI screenshots
const k = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
cv.dilate(bin, bin, k, new cv.Point(-1, -1), 2);      // join letters of a changed label into one blob

const contours = new cv.MatVector(), hier = new cv.Mat();
cv.findContours(bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
const regions = [];
for (let i = 0; i < contours.size(); i++) {
  const c = contours.get(i);
  const r = cv.boundingRect(c);
  if (r.width * r.height >= MIN_AREA) regions.push(r);   // MIN_AREA ≈ 30–100 px
  c.delete();
}
const changedPct = 100 * cv.countNonZero(bin) / (bin.rows * bin.cols);
// cleanup: a,b,ga,gb,diff,bin,k,contours,hier .delete()
```

**Why RETR_EXTERNAL?** We only want the outer box of each changed area. Holes inside a changed button don't matter (L7: LIST = 8 vs EXTERNAL = 5).

**Why dilate?** A changed label like "Dept ID" → "Department" shows up as many separate glyph blobs. Dilating merges them into one region. Erosion (the L7 "sandpaper" step) is optional and removes single-pixel specks.

**Merging nearby boxes:** after filtering, merge rectangles whose gap is smaller than about 10 px. This produces "4 changed regions", not 40.

## Similarity score

Two options. Use both: the first for PASS/FAIL, the second as a "how similar overall" number.

1. **% pixels changed** (`countNonZero / total`). Simple, easy to explain, and the same idea Playwright and BackstopJS use for their thresholds.
2. **SSIM** (Wang, Bovik, Sheikh & Simoncelli, 2004). It compares local luminance, contrast and structure. It can be implemented with OpenCV.js primitives on `CV_32F` Mats:

```
μx = GaussianBlur(x, 11x11, 1.5)     μy = GaussianBlur(y)
σx² = Blur(x·x) − μx²   σy² = Blur(y·y) − μy²   σxy = Blur(x·y) − μx·μy
SSIM = ((2μxμy + C1)(2σxy + C2)) / ((μx²+μy²+C1)(σx²+σy²+C2))
C1 = (0.01·255)²,  C2 = (0.03·255)²        → mean(SSIM map) ∈ [−1, 1]
```

Use `cv.multiply`, `cv.subtract`, `cv.add`, `cv.divide` and `cv.mean`. The SSIM map itself, `1 − ssim`, also makes a good heatmap (see 05).

## PASS / FAIL rule (proposal)

`FAIL` if `regions.length > 0` **and** `changedPct > page.threshold` (default 0.1%). Otherwise `PASS`. Store the threshold for each page in IndexedDB, so a noisy page can be tuned once.

## Gotchas

- The images **must be the same size** before `absdiff`. Align or resize first (see 03).
- JPEG screenshots create compression noise. Use PNG, and raise T or blur if you have to use JPEG.
- Font anti-aliasing and sub-pixel rendering differ between machines. A small blur plus threshold ≥ 20 absorbs most of it. This is the same reason Playwright's per-pixel threshold defaults to 0.2.
- `countNonZero` needs a single-channel Mat.

## Sources

- OpenCV.js image arithmetic / thresholding / morphology tutorials: https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html
- OpenCV.js contours getting started: https://docs.opencv.org/4.x/d0/d43/tutorial_js_table_of_contents_contours.html
- Contours basics (white object on black background): https://docs.opencv.org/4.x/d4/d73/tutorial_py_contours_begin.html
- SSIM paper (IEEE TIP 2004): https://www.cns.nyu.edu/pub/lcv/wang03-reprint.pdf
- SSIM overview: https://en.wikipedia.org/wiki/Structural_similarity_index_measure

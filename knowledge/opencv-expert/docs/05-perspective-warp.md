# Geometric transforms: resize, warpAffine, warpPerspective

**Source:** OpenCV.js Geometric Transformations: https://docs.opencv.org/4.x/dd/d52/tutorial_js_geometric_transformations.html · Template matching: https://docs.opencv.org/4.x/d8/dd1/tutorial_js_template_matching.html

## From the docs
- **resize** `cv.resize(src, dst, dsize, fx, fy, interpolation)`. `dsize = (0,0)` means the size comes from `fx`/`fy`. Use `cv.INTER_AREA` for shrinking, and `cv.INTER_LINEAR` or `cv.INTER_CUBIC` (slower) for zooming.
- **warpAffine** `cv.warpAffine(src, dst, M, dsize, flags, borderMode, borderValue)`. `M` is a **2×3 `CV_64FC1`** matrix, and parallel lines stay parallel. A translation by (tx, ty) is `[1,0,tx, 0,1,ty]`.
- **getPerspectiveTransform** `(srcPts, dstPts)` takes four point pairs as `CV_32FC2`, no three of them collinear, and returns a 3×3 matrix.
- **warpPerspective** `cv.warpPerspective(src, dst, M3x3, dsize, flags, borderMode, borderValue)`. Straight lines stay straight.

## Template matching (used for translation alignment)
- `cv.matchTemplate(image, templ, result, method, mask)`. The result is single-channel 32F of size (W−w+1)×(H−h+1). The template can't be larger than the image and must have the same type.
- With `TM_SQDIFF`, the best match is the **minimum** of `cv.minMaxLoc(result)`. With the other methods, it is the **maximum**.

## How we use it
1. Find the offset with `matchTemplate(cand, centralStripOfBase, TM_CCOEFF_NORMED)` and accept it if `maxVal > 0.8`.
2. `warpAffine(cand, aligned, [1,0,-dx, 0,1,-dy], baseSize, INTER_LINEAR, BORDER_CONSTANT, white)`.
3. Only when the scale differs: ORB + `findHomography` + `warpPerspective`. Forum reports show an empty H when the point Mats are wrong, so always check `H.empty()`: https://forum.opencv.org/t/opencv-js-support-for-findhomography/1126

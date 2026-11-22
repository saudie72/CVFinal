# OpenCV.js worked examples

| # | Example | What it shows | Functions |
|---|---|---|---|
| 1 | `example1_diffRegions` | Two synthetic "screenshots"; the candidate has two planted changes → exactly 2 region boxes | cvtColor, GaussianBlur, absdiff, threshold, getStructuringElement, dilate, findContours, boundingRect, countNonZero |
| 2 | `example2_shapes` | A box and a circle → adaptive threshold, Canny edges, 2 external contours with area, perimeter and centroid | adaptiveThreshold, Canny, threshold(INV), findContours, contourArea, arcLength, moments |
| 3 | `example3_alignment` | Candidate shifted 3 px (a scroll offset) → matchTemplate finds dy = 3, warpAffine undoes it (0 residual pixels); getPerspectiveTransform round-trip | warpAffine, roi, matchTemplate, minMaxLoc, matFromArray, getPerspectiveTransform |

Files: `opencvjs-examples.js` (the examples; call `runOpenCvExamples()`), and `python_mirror.py` (the same inputs and assertions in Python OpenCV).

## Verified results (2026-11-22)

**Real OpenCV.js 4.13.0** (the build served at https://docs.opencv.org/4.x/opencv.js), run in the browser:

| Example | Result | Key numbers |
|---|---|---|
| diffRegions | ✅ ok | regions (37,27,57×27) and (127,77,47×22); 10.69% changed |
| shapes | ✅ ok | 2 contours; box area 2301 (59×39), circle area 1890; 356 edge pixels; centroids (50,50), (160,70) |
| alignment | ✅ ok | dx = 0, dy = 3, score 1.0, residual 0, perspective translation (10, 10) |
| Leak check | ✅ | Wasm heap 134,217,728 bytes before and after 20 + 50 repeated runs (no growth) |

**Python OpenCV 5.0.0** (`python3 python_mirror.py`): all three ok, with identical regions, areas, edge count and offset.

## Lessons the run taught us (now in the docs)
1. **`Mat.clone()` is shallow in opencv.js 4.13.** On the first run, example 1 found **0 changes**, because drawing on the "clone" also drew on the original. `mat_clone()` and `copyTo()` make real copies, which was checked directly. The docs warn about this (embind), and the run confirmed it. Use the `deepCopy()` helper in the example file.
2. **`cv.applyColorMap` exists in the 4.13 docs build** (it returns a 3-channel image). Older builds may lack it, so keep the `typeof` check and the LUT fallback.
3. `cv.findHomography` and `cv.ORB` exist in this build.

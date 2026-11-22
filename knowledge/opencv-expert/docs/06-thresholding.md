# Thresholding: simple, Otsu, adaptive

**Source:** OpenCV.js Image Thresholding: https://docs.opencv.org/4.x/d7/dd0/tutorial_js_thresholding.html · Python tutorial (method names, example values): https://docs.opencv.org/4.x/d7/d4d/tutorial_py_thresholding.html

## Simple threshold
`cv.threshold(src, dst, thresh, maxval, type)`. If a pixel is greater than `thresh` it gets `maxval`, otherwise 0 (`THRESH_BINARY`). The other types are `THRESH_BINARY_INV`, `THRESH_TRUNC`, `THRESH_TOZERO` and `THRESH_TOZERO_INV`.
- With `cv.THRESH_OTSU` (or TRIANGLE) added to the type, the threshold is computed automatically, and **the input must be single-channel**.

## Adaptive threshold
`cv.adaptiveThreshold(src, dst, maxValue, adaptiveMethod, thresholdType, blockSize, C)`
- `src`: **8-bit single-channel**. `thresholdType`: `THRESH_BINARY` or `THRESH_BINARY_INV` only.
- `adaptiveMethod`: `cv.ADAPTIVE_THRESH_MEAN_C` (neighbourhood mean − C) or `cv.ADAPTIVE_THRESH_GAUSSIAN_C` (Gaussian-weighted sum − C).
- `blockSize`: an **odd** neighbourhood size (3, 5, 7…). `C`: a constant subtracted from the (weighted) mean, usually positive.
- The docs' purpose: a different threshold for each region, which gives better results under **varying illumination**. The Python tutorial example uses `blockSize = 11`, `C = 2`.

## In this project
- The **diff mask** uses a simple `THRESH_BINARY` on `absdiff` (T ≈ 25), because the diff is already "dark = same, bright = changed".
- **Adaptive threshold** is for a different job: making a binary "text and lines" layer of each screenshot, which is robust to small rendering-brightness differences between capture machines. It is optional.

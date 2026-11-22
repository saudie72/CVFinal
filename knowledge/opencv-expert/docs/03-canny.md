# Canny edge detection

**Source:** OpenCV.js Canny tutorial: https://docs.opencv.org/5.x/d7/de1/tutorial_js_canny.html · C++ tutorial: https://docs.opencv.org/4.x/da/d5c/tutorial_canny_detector.html

## The four stages (from the docs)
1. **Noise reduction:** a 5×5 Gaussian filter, because edge detection is sensitive to noise.
2. **Intensity gradient:** Sobel filters in x and y give G_x and G_y, then the magnitude and direction of each pixel's gradient. The direction is rounded to one of four angles.
3. **Non-maximum suppression:** keep a pixel only if it is a local maximum along its gradient direction. This leaves thin edges.
4. **Hysteresis thresholding:** gradients above `maxVal` are sure edges and those below `minVal` are discarded. Pixels in between are kept only if they connect to a sure edge.

## Signature
`cv.Canny(image, edges, threshold1, threshold2, apertureSize = 3, L2gradient = false)`
- `image`: 8-bit input. `edges`: single-channel 8-bit output, the same size as the input.
- `threshold1/2`: the hysteresis thresholds. The C++ tutorial uses a lower:upper ratio of 1:3.
- `apertureSize`: the Sobel aperture (default 3). `L2gradient=true` uses the more accurate L2 magnitude.

## When to use it in this project
- **Optional "structure diff":** run Canny on both screenshots and compare the edge maps. This picks up **layout** changes (moved borders, missing fields) and ignores small colour shifts. It's useful for the "style change vs layout change" hint in the report.
- The core diff still uses `absdiff` + threshold (docs/02-image-diff-pipeline.md), because a text-only change can produce weak edges.

```js
const edges = new cv.Mat();
cv.Canny(gray, edges, 50, 150, 3, false);   // 1:3 ratio
// ... use edges ...
edges.delete();
```

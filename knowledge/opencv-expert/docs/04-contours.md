# Contours

**Source:** OpenCV.js "Contours: Getting Started": https://docs.opencv.org/5.0/js_tutorials/js_imgproc/js_contours/js_contours_begin/js_contours_begin.html · Contours index: https://docs.opencv.org/4.x/d0/d43/tutorial_js_table_of_contents_contours.html · Python companion: https://docs.opencv.org/4.x/d4/d73/tutorial_py_contours_begin.html

## Signatures (from the docs)
- `cv.findContours(image, contours, hierarchy, mode, method, offset = new cv.Point(0, 0))`
- `cv.drawContours(image, contours, contourIdx, color, thickness = 1, lineType = cv.LINE_8, hierarchy = new cv.Mat(), maxLevel = INT_MAX, offset = new cv.Point(0, 0))`
- `contours` is a `cv.MatVector`, and `hierarchy` is a `cv.Mat`. Both must be `.delete()`d.

## Parameters
- **mode** (`cv.RetrievalModes`): `RETR_EXTERNAL` gives the outer contours only, `RETR_LIST` gives all of them flat, and `RETR_TREE` gives the full hierarchy.
- **method** (`cv.ContourApproximationModes`): `CHAIN_APPROX_NONE` stores every boundary point. `CHAIN_APPROX_SIMPLE` removes redundant points (e.g., the inside of straight lines) and saves memory.
- **offset**: shifts every point. Use it when you found contours in an ROI and need full-image coordinates.

## Rules from the docs
- Finding contours is like finding a **white object on a black background**. Threshold so the changes are white.
- Use a binary image (from threshold or Canny) for accuracy. Since OpenCV 3.2, `findContours` doesn't modify the source.

## Useful measurements (L7 class material)
`cv.boundingRect(cnt)` → `{x, y, width, height}` · `cv.contourArea(cnt)` · `cv.arcLength(cnt, true)` · `cv.moments(cnt)` (centroid `m10/m00`, `m01/m00`) · `cv.minAreaRect(cnt)`

## Pattern for the diff regions
```js
const contours = new cv.MatVector(), hier = new cv.Mat();
cv.findContours(bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
for (let i = 0; i < contours.size(); i++) {
  const c = contours.get(i);              // must delete!
  const r = cv.boundingRect(c);
  if (r.width * r.height >= MIN_AREA) regions.push(r);
  c.delete();
}
contours.delete(); hier.delete();
```

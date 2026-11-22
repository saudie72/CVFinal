# 05 — Visual Outputs: Boxes, Heatmap, Side-by-Side, Overlay Slider

## Summary

Analysts trust what they can see. For every comparison the inspector shows four views, built from the same diff result:

1. **Boxes:** the candidate screenshot with a numbered red rectangle around each changed region.
2. **Heatmap:** the colour-mapped difference intensity, where blue means no change and red means a strong change.
3. **Side-by-side:** baseline and candidate next to each other, with linked scrolling and zoom.
4. **Overlay slider:** the candidate on top of the baseline, with a draggable divider (or opacity slider) to wipe between them.

## Boxes

```js
for (const [i, r] of regions.entries()) {
  cv.rectangle(out, new cv.Point(r.x, r.y), new cv.Point(r.x + r.width, r.y + r.height),
               new cv.Scalar(220, 38, 38, 255), 3);          // RGBA red
  cv.putText(out, String(i + 1), new cv.Point(r.x, Math.max(14, r.y - 4)),
             cv.FONT_HERSHEY_SIMPLEX, 0.6, new cv.Scalar(220, 38, 38, 255), 2);
}
```

The canvas is RGBA, so red is `(R, G, B, A)`, not the BGR `(0, 0, 255)` from Python (L3). Numbered boxes match the region list in the report ("Region 2: 312×28 px at (40, 610)").

## Heatmap

`cv.applyColorMap` (e.g. `COLORMAP_JET`) is part of OpenCV's colormap module. Forum posts show people needing a **custom build** to get colormaps in opencv.js. Update (verified 2026-11-22): the opencv.js **4.13** build at docs.opencv.org **does** include `applyColorMap` (it returns a 3-channel image). So detect it, and otherwise use a 256-entry lookup table:

```js
function heatmap(diffGray /* CV_8UC1 */) {
  if (typeof cv.applyColorMap === 'function') {
    const rgb = new cv.Mat(); cv.applyColorMap(diffGray, rgb, cv.COLORMAP_JET); return rgb;
  }
  // manual: build RGBA ImageData from a JS LUT (blue → green → yellow → red)
  const n = diffGray.rows * diffGray.cols, src = diffGray.data;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const [r, g, b] = LUT[src[i]];
    out.set([r, g, b, 255], i * 4);
  }
  return new ImageData(out, diffGray.cols, diffGray.rows);
}
```

Stretch the diff before colour-mapping (`cv.normalize(diff, diff, 0, 255, cv.NORM_MINMAX)`), so small changes are still visible. This is the same stretching idea as histogram equalization in L4. Alternatively, blend the heatmap onto the candidate with `cv.addWeighted(cand, 0.6, heat, 0.4, 0, out)`, the L6 watermark trick.

## Side-by-side and overlay

These are pure canvas/CSS and don't need OpenCV:

- Side-by-side: two `<canvas>` elements in a CSS grid, with shared `transform: scale()` and synced `scrollLeft/scrollTop`.
- Overlay slider: stack two canvases. The top one gets `clip-path: inset(0 0 0 X%)`, with an `<input type="range">` controlling X. Add an opacity mode (`globalAlpha`) as an alternative.
- Make it accessible: the slider is keyboard-operable, and regions are listed as text, not only drawn in colour.

## Report export

- **PNG evidence:** draw the boxes view, plus a header bar (page name, timestamp, score, PASS/FAIL), onto one canvas, then `canvas.toBlob()` and download it.
- **HTML/printable report:** baseline thumbnail, candidate thumbnail, boxes view, region table, ignore zones used, thresholds, alignment method. Print to PDF from the browser.
- **CSV / JSON:** list of runs for test-management tools.

## Sources

- OpenCV colormaps (applyColorMap, ColormapTypes): https://docs.opencv.org/4.x/d3/d50/group__imgproc__colormap.html
- OpenCV forum — colormaps in opencv.js need a custom build: https://forum.opencv.org/t/colormaps-in-opencv-js/2737
- OpenCV.js drawing / arithmetic tutorials index: https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html
- MDN Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- MDN HTMLCanvasElement.toBlob: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob

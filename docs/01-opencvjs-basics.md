# 01 — OpenCV.js Basics

## Summary

OpenCV.js is the OpenCV C++ library compiled to WebAssembly with Emscripten, and it exposes a global `cv` object. You load it once (the file is about 10 MB), wait until it is ready, then move pixels between `<canvas>`/`ImageData` and `cv.Mat`. **Every `cv.Mat` lives in the Emscripten (WebAssembly) heap, and you must free it yourself with `.delete()`.** JavaScript's garbage collector does not free it.

## Loading and readiness

```html
<!-- Simple: synchronous -->
<script src="vendor/opencv/opencv.js"></script>

<!-- Better: async + onload -->
<script async src="vendor/opencv/opencv.js" onload="onOpenCvReady()"></script>
```

The official tutorial sets `Module.onRuntimeInitialized` to find out when the runtime is ready:

```js
var Module = {
  onRuntimeInitialized() { setStatus('Ready'); }
};
```

Newer builds sometimes expose `cv` as a Promise or thenable. A defensive pattern that handles both:

```js
async function cvReady() {
  if (cv instanceof Promise) { cv = await cv; return; }          // some 4.x builds
  if (cv.Mat) return;                                             // already ready
  await new Promise(r => (cv.onRuntimeInitialized = r));
}
```

**Project decision:** host a pinned copy at `vendor/opencv/opencv.js` (not a CDN), so the app works offline and the Network panel shows no third-party traffic after the page loads.

## Mats

| Task | API |
|---|---|
| Empty | `new cv.Mat()` |
| Sized | `new cv.Mat(rows, cols, cv.CV_8UC4)` |
| Filled | `new cv.Mat(rows, cols, type, new cv.Scalar(0,0,0,255))` |
| Zeros | `cv.Mat.zeros(rows, cols, cv.CV_8UC1)` |
| From JS array | `cv.matFromArray(rows, cols, type, arr)` |
| From canvas pixels | `cv.matFromImageData(ctx.getImageData(0,0,w,h))` |
| From `<img>`/canvas id | `cv.imread(elOrId)` (main thread only, needs the DOM) |
| To canvas | `cv.imshow(canvasOrId, mat)` (main thread only) |
| Deep copy | `mat.clone()` |
| Masked copy | `src.copyTo(dst, mask)` |

Pixel data is in `mat.data` (a `Uint8Array` for 8-bit Mats). `ucharPtr(row, col)` returns a typed view for one pixel. Check `mat.type()` when debugging, because many OpenCV.js errors come from the wrong data type.

Canvas pixels are always **RGBA** (`CV_8UC4`). This is different from Python OpenCV, which uses BGR.

## Memory rule (most important gotcha)

> "You have to call delete method of cv.Mat to free memory allocated in Emscripten's heap." — OpenCV.js docs

- Delete every `Mat`, every `MatVector`, **and every Mat you got out of a MatVector with `.get(i)`**.
- Use `try/finally`, so an exception can't skip the cleanup:

```js
const mats = [];
const track = m => (mats.push(m), m);
try {
  const gray = track(new cv.Mat());
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  // ...
} finally {
  mats.forEach(m => m.delete());
}
```

- Leak symptom: the app gets slower after many comparisons, and memory keeps growing in DevTools → Memory. See `09-chrome-devtools-testing.md`.

## Gotchas

- `cv.imread`/`cv.imshow` need DOM elements, so they **don't work inside a Web Worker**. In the worker, use `cv.matFromImageData` / `new ImageData(new Uint8ClampedArray(mat.data), w, h)`.
- In prebuilt opencv.js, some functions are missing because they weren't in the build's whitelist (for example `applyColorMap`). Test for a function before you use it (`typeof cv.applyColorMap === 'function'`).
- Load the library **once**. Loading it again leaks the heap and slows startup.

## Sources

- OpenCV.js usage tutorial: https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html
- OpenCV.js basic operations (Mat, memory): https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html
- OpenCV.js tutorials index: https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html

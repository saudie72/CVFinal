# Loading OpenCV.js

**Source:** OpenCV.js "Using OpenCV.js" tutorial: https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html · Intro: https://docs.opencv.org/4.10.0/df/d0a/tutorial_js_intro.html

## What the docs say
- OpenCV.js is a JavaScript binding for a **selected subset** of OpenCV functions, compiled with **Emscripten**. Not every C++/Python function is available.
- Load it with a script tag. You can load synchronously with `<script src="opencv.js">`, or asynchronously with `async` plus an `onload` callback.
- Readiness: the tutorial sets a `Module` object with an `onRuntimeInitialized()` hook, which fires when the WebAssembly runtime is ready. Don't call `cv.*` before that.
- `cv.imread(imgOrCanvas)` creates a `cv.Mat` from an `<img>`/`<canvas>`. Because images load asynchronously, call it from the image's `onload`. `cv.imshow(canvas, mat)` draws a Mat onto a canvas.

## Project rules derived from this
- Self-host `vendor/opencv/4.13.0/opencv.js`. Load it **once, inside the Web Worker** with `importScripts` (see wasm-expert knowledge).
- `cv.imread` and `cv.imshow` need the DOM, so they **can't be used in a worker**. In the worker, use `cv.matFromImageData(imageData)`, and go back with `new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows)` (only for RGBA `CV_8UC4` Mats).
- Some builds expose `cv` as a Promise or thenable. Handle both readiness styles:

```js
async function cvReady() {
  if (typeof cv === 'undefined') throw new Error('opencv.js not loaded');
  if (cv instanceof Promise) { self.cv = await cv; return; }
  if (cv.Mat) return;
  await new Promise(r => (cv.onRuntimeInitialized = r));
}
```

## Check before using a function
Because the build contains only a subset, test for optional functions: `typeof cv.applyColorMap === 'function'`. The OpenCV forum reports that colormaps need a custom build: https://forum.opencv.org/t/colormaps-in-opencv-js/2737

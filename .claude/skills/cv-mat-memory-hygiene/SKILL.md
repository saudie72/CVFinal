---
name: cv-mat-memory-hygiene
description: "Prevent OpenCV.js memory leaks by deleting every cv.Mat, MatVector and extracted object. Use whenever writing, reviewing or testing code that creates OpenCV.js objects."
user-invocable: false
---
# cv.Mat memory hygiene

OpenCV.js objects live in the WebAssembly (Emscripten) heap. JavaScript's garbage collector does **not** free them.

## Rules
- Delete everything you create: `Mat`, `MatVector`, `KeyPointVector`, `DMatchVector`, `ORB`, `BFMatcher`, and **every `contours.get(i)`**.
- Use a tracker plus `finally`:
```js
const bag = []; const T = o => (bag.push(o), o);
try { const g = T(new cv.Mat()); /* ... */ }
finally { for (const o of bag) try { o.delete(); } catch {} }
```
- Never keep Mats between messages. Convert to `ImageData` or `ArrayBuffer` before returning.
- **Deep copies:** always use `mat.mat_clone()` or `src.copyTo(dst)`, never bare `clone()`. Whether `clone()` is deep **depends on the build and how the runtime was started**: the knowledge example saw it share pixels (0 changes found, knowledge/opencv-expert/examples/README.md), but Iris and Volt found that the 4.13.0 docs build's own `onRuntimeInitialized` wrapper sets `Mat.prototype.clone = mat_clone`, so `clone()` was deep there (`cloneIsDeep: true` in the worker's `ready.info`; `docs/worker-notes.md`, `docs/cv-pipeline-notes.md`). `mat_clone()`/`copyTo()` are correct in both cases; `ErpCV.deepCopy` in `js/cv/align.js` is the helper. See the dated note in `knowledge/VERIFICATION.md`.
- In-place operations (`cv.threshold(bin, bin, …)`) are fine and save memory.

## Leak test (qa-tester / wasm-expert)
Run the same comparison 20 times. After each run the worker posts `{heapBytes: cv.HEAPU8.length}`. Growth above one screenshot's size after warm-up counts as a leak. Also watch DevTools → Performance monitor.

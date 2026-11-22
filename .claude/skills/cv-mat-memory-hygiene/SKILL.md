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
- In-place operations (`cv.threshold(bin, bin, …)`) are fine and save memory.

## Leak test (qa-tester / wasm-expert)
Run the same comparison 20 times. After each run the worker posts `{heapBytes: cv.HEAPU8.length}`. Growth above one screenshot's size after warm-up counts as a leak. Also watch DevTools → Performance monitor.

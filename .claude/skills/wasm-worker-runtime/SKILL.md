---
name: wasm-worker-runtime
description: "Load OpenCV.js (WebAssembly) once inside a classic Web Worker and talk to it with the typed message protocol as built (createInspector, transferred inputs, heap probe, watchdog, limits). Use when writing or changing inspector.worker.js, js/worker-client.js or debugging load, hang or CSP issues."
user-invocable: false
---
# Wasm worker runtime

As built (Step 9): `inspector.worker.js` + `js/worker-client.js`. The full protocol, limits, measurements and CSP matrix are in **`docs/worker-notes.md`** (Volt). Background: `docs/06-webassembly.md`, `docs/07-web-workers.md`.

## Load
- **Classic worker** (`importScripts` throws in module workers). Self-host the pinned build at **`vendor/opencv/4.13.0/opencv.js`** (the version is in the path so `immutable` caching is safe). Load it once, first; then the CV files (`js/cv/align`, `ssim`, `heatmap`, `pipeline`), each `importScripts` in its own try/catch so a `fatal` message names the stage (`opencv.js`, `cv-files`, `init`).
- **Readiness:** accept whichever fires first and ignore the rest: `cv.then(cb)`, `Module.onRuntimeInitialized`, or already ready. In the 4.13.0 build `cv.then` fires first. Send `ready` only once `cv.Mat` and `self.ErpCV.compare` both exist.
- **Thenable caution:** the 4.13 module is a thenable that resolves with itself. Never `await cv`, `resolve(cv)` or `return cv` from a `.then`/`async` function: it never settles. Call `cv.then(cb)` directly, have `cb` only store the module, and resolve with a plain object (`ready.info`).
- **CSP:** `script-src` needs `'unsafe-eval'` (embind uses `new Function`). `'wasm-unsafe-eval'` alone fails (measured in `docs/worker-notes.md`).

## Protocol (as built)
| Direction | Message |
|---|---|
| worker → page | `ready {ms, info}` (`info`: version, importMs, initMs, heapBytes, readyStyle, cloneIsDeep) · `fatal {stage, message}` · `progress {id, step}` · `result {id, ...pipeline result, workerMs, heapBytes}` · `error {id, message}` (per job; the worker stays usable) · `heap {after:id \| id, bytes, probe}` |
| page → worker | `compare {id, base:{w,h,buf}, cand:{w,h,buf}, zones, settings}` with `[base.buf, cand.buf]` transferred · `heap {id}` (queued until ready) |
- Progress steps seen: `Received, load, align, diff, mask, threshold, regions, ssim, images, Packing`. The pipeline result must never carry a top-level `type` or `id`. Returned `images.*` buffers are transferred; a view into the Wasm heap is copied first (never detach the heap).

## Client (`js/worker-client.js`)
`createInspector({onStatus, workerUrl?, loadTimeoutMs=60000, jobTimeoutMs=30000})` returns `{ready, status, compare, heap, restart, terminate}`.
- `ready` is a getter (a new Promise after each restart). `compare(base, cand, zones, settings, {onProgress, copy})` takes `ImageData` or `{width,height,data}` and returns a Promise.
- **Inputs are transferred by default:** afterwards `base.data.byteLength === 0`. Re-read from the Blob/canvas, or pass `{copy:true}` (one copy per image). Zones and settings are structured-cloned.
- Jobs are serialised. 30 s watchdog from job post: `terminate()`, reject `"Timed out, restarted"`, respawn, run queued jobs.
- `heap()` resolves `{bytes, probe}`: `cv.HEAPU8.length` plus the address of a fresh 64 KiB `_malloc`. A stable probe means freed memory is reused. It always asks the current worker.
- **Limits:** `maxPixels` 16 MP per image (readable `RangeError` before sending); `recycleHeapBytes` 512 MiB (worker respawned after a job that leaves the heap above it; Wasm memory never shrinks).
- Status pill via `onStatus`: `Loading OpenCV…` → `Ready` → `Working… (<step>)` → `Ready`; failure gives `error`.
- No DOM in the worker: use `ImageData`/`ArrayBuffer`, never `cv.imread`/`cv.imshow`.

Test with `node tools/worker-test/run.js` (also `csp`, `stress`).

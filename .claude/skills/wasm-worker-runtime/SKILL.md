---
name: wasm-worker-runtime
description: "Load OpenCV.js (WebAssembly) once inside a classic Web Worker and talk to it with a typed message protocol, transferables and a watchdog. Use when writing inspector.worker.js, js/worker-client.js or debugging load and hang issues."
user-invocable: false
---
# Wasm worker runtime

References: `docs/06-webassembly.md`, `docs/07-web-workers.md`.

## Load
```js
// inspector.worker.js (classic worker; importScripts fails in module workers)
self.Module = { onRuntimeInitialized: () => postMessage({ type: 'ready' }) };
importScripts('vendor/opencv/opencv.js');
// handle builds where cv is a Promise
if (self.cv instanceof Promise) self.cv.then(m => { self.cv = m; postMessage({ type: 'ready' }); });
```
- Self-host `vendor/opencv/opencv.js` (no CDN). Load it once.

## Protocol
| Direction | Message |
|---|---|
| worker → page | `{type:'ready'}` · `{type:'progress', id, step}` · `{type:'result', id, ...}` · `{type:'error', id, message}` · `{type:'heap', bytes}` |
| page → worker | `{type:'compare', id, base:{w,h,buf}, cand:{w,h,buf}, zones:[...], settings:{...}}` |
Send `buf` with transfer lists (`postMessage(msg, [base.buf, cand.buf])`). Keep the original Blob on the page.

## Client (js/worker-client.js)
- `compare(...)` returns a Promise. Every request has an `id`.
- 30 s watchdog → `worker.terminate()`, spawn a new worker, reject with "Timed out, restarted".
- Status pill: `Loading OpenCV…` → `Ready` → `Working… (<step>)` → `Ready`.
- No DOM in the worker: use `ImageData`/`ArrayBuffer`, never `cv.imread`/`cv.imshow`.

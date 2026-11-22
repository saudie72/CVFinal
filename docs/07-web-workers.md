# 07 — Web Workers: Keeping the UI Responsive

## Summary

A comparison (load, align, diff, contours, SSIM) on two full-page screenshots can take hundreds of milliseconds to several seconds. If it runs on the main thread, the page freezes: buttons stop responding and the spinner stops spinning. A **dedicated Web Worker** runs scripts in a background thread, separate from the UI. OpenCV.js is loaded **inside** the worker, the page sends it pixels, and it sends back results.

## Architecture

```
main thread (index.html, js/app.js)          inspector.worker.js
───────────────────────────────────          ────────────────────────────
new Worker('inspector.worker.js')  ───────►  importScripts('vendor/opencv/4.13.0/opencv.js')
                                   ◄───────  {type:'ready'}
postMessage({type:'compare', id,
  base:{w,h,buf}, cand:{w,h,buf},
  zones, settings}, [baseBuf, candBuf])  ─►  run pipeline (02–05)
                                   ◄───────  {type:'progress', id, step:'Aligning…'}
                                   ◄───────  {type:'result', id, regions, pct, ssim,
                                               boxesBuf, heatBuf}  (transferred)
```

## Key code

```js
// main thread
const worker = new Worker('inspector.worker.js');
const img = ctx.getImageData(0, 0, w, h);
worker.postMessage({ type: 'compare', id, base: { w, h, buf: img.data.buffer }, ... },
                   [img.data.buffer]);          // transfer, not copy
```

```js
// inspector.worker.js
importScripts('vendor/opencv/4.13.0/opencv.js');       // synchronous; throws NETWORK_ERROR if missing
cv['onRuntimeInitialized'] = () => postMessage({ type: 'ready' });
onmessage = ({ data }) => {
  if (data.type !== 'compare') return;
  try { /* pipeline */ postMessage({ type: 'result', ... }, [out.buffer]); }
  catch (e) { postMessage({ type: 'error', id: data.id, message: String(e) }); }
  finally { /* delete all Mats */ }
};
```

## Transferable objects

By default, `postMessage` **copies** data (structured clone). An `ArrayBuffer` is *transferable*: pass it in the second argument and ownership moves to the worker with no copy. Afterwards it is unusable on the sending side (`byteLength` becomes 0). Typed arrays aren't transferable themselves, but their `.buffer` is. For 8 MB screenshots, this is the difference between instant and noticeably slow.

Keep your own copy (the `Blob` from IndexedDB) if the page still needs the image after sending it.

## Watchdog and restart

The guide's troubleshooting table says: *Stuck on "Working…" → auto-restart after 30 s*.

```js
const timer = setTimeout(() => { worker.terminate(); worker = spawnWorker(); showError('Timed out, restarted'); }, 30000);
// clearTimeout(timer) on result/error
```

`worker.terminate()` kills the thread and frees its Wasm heap. That is also a last-resort fix for leaks.

## Worker limitations

- No DOM: `cv.imread`/`cv.imshow` don't work in a worker. Use `ImageData` buffers (see 01).
- The script must be same-origin and served over HTTP(S). Opening `file://` behaves inconsistently, so use a local server (`python -m http.server`).
- `importScripts()` fails inside **module** workers. Use a classic worker for opencv.js.
- Workers *can* use IndexedDB and `fetch`, but this project keeps all database access on the main thread, for simplicity.

## Status pill

The UI shows: `Loading OpenCV…` → `Ready` → `Working… (Aligning / Diffing / Finding regions)` → `Ready`. These match the course troubleshooting states.

## Sources

- MDN Using Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- MDN Transferable objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- HTML Standard — Web workers (module workers, importScripts): https://html.spec.whatwg.org/multipage/workers.html
- Chrome blog — Transferable objects: https://developer.chrome.com/blog/transferable-objects-lightning-fast

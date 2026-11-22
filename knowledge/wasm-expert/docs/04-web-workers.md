# Web Workers for Wasm work

**Sources:** MDN Using Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers · MDN Transferable objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects · HTML Standard, workers: https://html.spec.whatwg.org/multipage/workers.html · Chrome blog, transferables: https://developer.chrome.com/blog/transferable-objects-lightning-fast

## Facts
- Web Workers run scripts in background threads, so work there doesn't block the UI.
- `importScripts('a.js', 'b.js')` loads scripts **synchronously** and runs them in order. If a script fails to load, it throws `NETWORK_ERROR` and the rest of the code doesn't run.
- `importScripts()` **fails inside module workers** (HTML Standard). OpenCV.js uses `importScripts`, so the inspector uses a **classic** worker: `new Worker('inspector.worker.js')` with no `{type:'module'}`.
- `postMessage(data)` **copies** with structured clone by default. An `ArrayBuffer` is **transferable**: `postMessage(msg, [buf])` moves ownership with no copy, and the sender's buffer becomes 0 bytes. Typed arrays themselves aren't transferable, but their `.buffer` is.
- `worker.terminate()` kills the thread immediately, which also frees its whole Wasm heap.
- Workers have no DOM. They can use `fetch`, `IndexedDB` and `WebAssembly.*Streaming`.
- Load worker scripts over HTTP(S) from the same origin. `file://` behaves inconsistently.

## Verified behaviour (example 3, headless Chrome 153)
- Sending a 1366×900 RGBA buffer (4.9 MB) with a transfer list made the sender's `byteLength` 0, and the buffer came back intact (the round trip took about 14 ms).
- A worker stuck in a loop was terminated by a 500 ms watchdog, and a respawned worker reported ready again.

## Inspector protocol (summary; the full version is in skill `wasm-worker-runtime`)
page → worker: `{type:'compare', id, base:{w,h,buf}, cand:{w,h,buf}, zones, settings}`, transferring `[base.buf, cand.buf]`
worker → page: `ready` · `progress {id, step}` · `result {id, ...}` · `error {id, message}` · `heap {bytes}`

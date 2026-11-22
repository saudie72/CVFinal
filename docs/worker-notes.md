# Worker notes: inspector.worker.js and js/worker-client.js

Owner: **Volt (wasm-expert)** · Task A-WASM · Measured 2026-11-22 in headless Chrome 153.0.8010.12 (Playwright), served by `tools/worker-test/serve_test.py` on port 8102. That server applies the real `netlify.toml` headers, including the CSP, through `tools/serve_netlify.py`. Raw numbers are in `tools/worker-test/results.json`.

## Design

```
page (ES module)                      inspector.worker.js (CLASSIC worker)
js/worker-client.js                   importScripts once: opencv.js 4.13.0, js/cv/align, ssim, heatmap, pipeline
createInspector({onStatus}) ──new Worker──►  readiness: cv.then | Module.onRuntimeInitialized | already ready
                            ◄── ready {ms, info}   or   fatal {stage, message}
compare(base,cand,zones,settings,{onProgress})
   ──{type:'compare', id, base:{w,h,buf}, cand:{w,h,buf}, zones, settings}  [transfer base.buf, cand.buf]──►
                            ◄── progress {id, step}  (Received, the pipeline's steps, Packing)
                            ◄── result {id, ...ErpCV result, workerMs, heapBytes}  [transfer images.*.data.buffer]
                            ◄── error {id, message}   (per-job try/catch: the worker stays usable)
                            ◄── heap {after:id, bytes, probe} after every job; heap {id, bytes, probe} on request (queued until ready)
```

* **Classic worker.** `importScripts()` throws in module workers (HTML Standard), and opencv.js registers itself through its `importScripts` UMD branch. Sources: `knowledge/wasm-expert/docs/04-web-workers.md`, skill `wasm-worker-runtime`.
* **Load once.** opencv.js is imported first, then each CV file. Each `importScripts` call has its own try/catch, so a `fatal` message names the file and stage (`opencv.js`, `cv-files` or `init`). `onAbort`, `error` and `unhandledrejection` also produce `fatal` before ready. While loading, queued compares are answered with `error` so nobody hangs.
* **Readiness.** The worker accepts whichever signal fires first and ignores the rest. In this build, **`cv.then` fires first** (`readyStyle: "promise"`). `.then` is called directly and never `await`ed, because awaiting an Emscripten Module thenable can loop. `Module.onRuntimeInitialized` is the fallback. The worker sends `ready` only once `cv.Mat` and `self.ErpCV.compare` both exist.
* **`ready.info`** contains `version` (parsed from `cv.getBuildInformation()`: 4.13.0, Emscripten build of 2025-12-31), the build lines, `importMs`, `initMs`, `heapBytes`, `readyStyle` and `cloneIsDeep`.
* **Finding for Iris and the knowledge folder:** `cloneIsDeep: true`. opencv.js 4.13's own `onRuntimeInitialized` wrapper sets `Mat.prototype.clone = mat_clone` (see the tail of `vendor/opencv/4.13.0/opencv.js`). So **when the runtime is started this way**, `clone()` is deep. The note "clone() is shallow" in `cv-mat-memory-hygiene` may only hold when that wrapper is bypassed. Keep using `mat_clone()` either way; it's correct in both cases.
* **Results pass through unchanged.** The worker copies the pipeline result's own fields as they are (including `alignment: {method, dx, dy, scale, …}`). It only rewrites `images.*` so their pixels can be transferred. A view into the Wasm heap, or into a larger buffer, is copied first, because the heap's ArrayBuffer must never be detached.
* **Thenable safety (Iris's warning).** opencv.js 4.13 is a thenable that resolves with itself, so `resolve(cv)` never settles. The worker calls `cv.then(cb)` directly, and `cb` only stores the module. Nothing ever resolves or returns `cv` from a Promise, and the client's `ready` resolves with a plain info object. Ready was reached through `readyStyle:'promise'` on every run.
* **Progress.** The worker calls `ErpCV.compare(cv, base, cand, zones, settings, {onProgress})`, matching Iris's `hooks.onProgress`. The pipeline must never return top-level `type` or `id`. The real steps it saw are `Received, load, align, diff, mask, threshold, regions, ssim, images, Packing`.
* **Size mismatch is handled in the worker, by Iris's `js/cv/align.js`.** The page (client) checks only that each buffer is `w*h*4` bytes and not already detached. A slightly different size is resized (`alignment.method:'resize'`, `sizeFrom`). A ratio outside 0.5–2 throws `Size mismatch: …`, which reaches the caller as a rejected promise with that message. The worker keeps working afterwards.

## Client API (`js/worker-client.js`)

`createInspector({onStatus, workerUrl?, loadTimeoutMs = 60000, jobTimeoutMs = 30000})` returns `{ready, status, compare, heap, restart, terminate}`:

* `ready` is a getter. It returns a new Promise after each restart, and resolves with `ready.info` plus `workerMs`/`clientMs`.
* `compare(base, cand, zones, settings, {onProgress, copy})` accepts `ImageData` or `{width, height, data}`. It resolves with the pipeline result plus `workerMs`/`heapBytes`, and rejects with the worker's message.
* **Input buffers are TRANSFERRED by default.** After the call, `base.data.byteLength === 0` (measured). The caller has two options: keep the Blob or canvas and read it again, or pass `{copy: true}`, which costs one 4.9 MB copy per image (measured: the sender keeps 4,917,600 bytes). A view into a larger buffer, and base and cand sharing one buffer, are copied automatically. `zones` and `settings` are structured-cloned (copied).
* Jobs are **serialised**: one job in the worker at a time. The watchdog starts when a job is posted, so time spent queued doesn't count. When the watchdog fires, the client calls `terminate()` (this frees the whole Wasm heap), rejects the running job with `"Timed out, restarted"`, spawns a new worker, and runs the queued jobs on it.
* `onStatus({state, label, step?, message?})` runs in this order: `loading "Loading OpenCV…"` → `ready "Ready"` → `working "Working… (<step>)"` → `ready`. A load failure or timeout gives `error`. A watchdog restart gives `error "Timed out, restarted"` → `loading` → `ready`.
* `heap()` resolves `{bytes, probe}`: `cv.HEAPU8.length` plus the address of a fresh 64 KiB `_malloc`. HEAPU8 only grows in big steps, so the probe address is a finer signal: a stable probe means freed memory is being reused. heap() always asks the **current** worker. If a restart happens while it waits, it waits for the new worker's ready, and the worker also queues `heap` until it is ready. `restart()` restarts manually and also retries after a fatal load.
* **Limits (added in review C-REV-CV).**
  * `maxPixels` (default **16 MP** per image): a larger image is rejected before sending, with a readable `RangeError`.
  * `recycleHeapBytes` (default **512 MiB**): after a job that leaves the heap above this, the worker is respawned (about 0.5 s, `loading` → `ready`), because Wasm memory never shrinks. Queued jobs wait for the new worker.

## Measured numbers (headless Chrome 153, 1366×900 RGBA pair, 4,917,600 bytes per image)

| What | Result |
|---|---|
| Time to ready (new Worker → `ready`) | **411–555 ms** over 6 cold starts (import 246–292 ms + init 162–248 ms). Manual restart: 469–525 ms |
| Compare round trip, **real pipeline** (Iris), synthetic fictional pair | **244–323 ms** over two full runs (first run after load up to 474 ms). FAIL, 3 regions, changedPct 2.58, SSIM 0.983, alignment none dx 0 dy 0 |
| Compare round trip, stub pipeline | 30–55 ms |
| Sender buffer after transfer | 0 bytes (both images). Returned images: 3 × 1366×900 `Uint8ClampedArray` |
| Main thread during a 3 s busy compare (stub) | 184 rAF ticks = **59.8 fps**, max frame gap 17 ms, `setTimeout` lag ≤ 6 ms, **0 long tasks** |
| Main thread during 5 back-to-back real compares (1.2 s) | 59.5 fps, max frame gap 17 ms, 0 long tasks |
| Heap over 20 runs, real pipeline and stub | **flat at 134,217,728 B** (growth 0); malloc probe identical on all 20 runs (7,098,176) |
| heap() called during a restart | answered by the new worker: 134,217,728 B (not 0) |
| Leak control (stub leaks 2 Mats per run) | 134,217,728 → 268,435,456 B. The heap check does detect a real leak |
| Watchdog, hanging stub, 2 s timeout | rejected at 2,024 ms with "Timed out, restarted", ready again at 2,529 ms, queued job then PASS/FAIL normally |
| Watchdog, **default 30 s** | rejected at 30,021 ms, ready again at 30,492 ms |
| Per-job error (pipeline throws, bad input) | rejected with the message; the next compare succeeds |
| Console / page errors during all suites | none |

## Large and pathological inputs (real pipeline, review C-REV-CV, `node tools/worker-test/run.js stress`)

Each case starts on a fresh worker (heap 128 MiB). "Heap after" is read from the worker that answers after the job, so it is a recycled worker when the heap had grown above 512 MiB. Results are in `tools/worker-test/results-stress.json`.

| Input | Compare | Result | SSIM ms | Heap after |
|---|---|---|---|---|
| 1366×900 page | 470 ms | FAIL, 2 regions | 154 | 128 MiB |
| 1920×1080 | 645 ms | FAIL, 2 | 196 | 128 MiB |
| 2560×1440 | 1.05 s | FAIL, 2 | 189 | 256 MiB |
| 1366×4000 (full page) | 1.65 s | FAIL, 2 | 275 | 512 MiB (kept, not above the limit) |
| 1920×8000 (15.4 MP) | 4.5 s | FAIL, 2 | 266 | grew to 1 GiB → **recycled** → 128 MiB |
| 1366×900, 300 / 1000 / 2500 speckles | 0.74–1.05 s | 300 / 1000 / 1 region(s) | 110–143 | 128 MiB |
| 4000×8000 (32 MP), default client | 1 ms | rejected by `maxPixels` | n/a | 128 MiB |
| 4000×8000, `maxPixels` disabled | 7.6 s | `OpenCV exception … Insufficient memory, failed to allocate 128000000 bytes` (caught; the worker survives; then recycled) | n/a | 128 MiB |

The build's heap limit is 2 GiB (`_emscripten_resize_heap` in opencv.js). Peak use is about 10 full-size RGBA Mats, so about 20 MP is the real ceiling, which is why the limit is 16 MP. SSIM stays at 110–275 ms because of Iris's ≤ 1.5 MP downscale. At large sizes the `diff` step dominates (2 s at 15 MP). 1000 regions took 28 ms in `regions` (mergeBoxes), so no hang was seen.

## CSP finding: is `'unsafe-eval'` required?

**Yes. With opencv.js 4.13.0 (the official build), `script-src` must include `'unsafe-eval'`.**

| `script-src` (rest of the CSP unchanged) | Result |
|---|---|
| `'self' 'wasm-unsafe-eval' 'unsafe-eval'` (current netlify.toml) | ✅ ready, compare OK |
| `'self' 'wasm-unsafe-eval'` | ❌ fatal: `EvalError: Evaluating a string as JavaScript violates … 'unsafe-eval' is not an allowed source` at `new Function` ← `createNamedFunction` |
| `'self' 'unsafe-eval'` | ✅ ready, compare OK (`'unsafe-eval'` also allows Wasm compilation) |
| `'self'` | ❌ fatal (same EvalError) |

* **Why:** Emscripten's embind (the C++ ↔ JS bindings behind `cv.Mat` and friends) builds its wrapper functions with `new Function(...)` (`createNamedFunction`, `craftInvokerFunction`) when the runtime initialises. Both are visible in `vendor/opencv/4.13.0/opencv.js`. The worker gets its own CSP from the `inspector.worker.js` response, and both responses carry the same header.
* **Recommendation:** keep `'unsafe-eval'`. `'wasm-unsafe-eval'` is redundant with it, but harmless, and documents intent. Removing `'unsafe-eval'` would need a custom opencv.js build with embind's dynamic code generation turned off (**unverified**: such a build was not tested).
* Other CSP checks passed: the worker loads under `worker-src 'self'`, and the harness has no inline scripts or styles (it uses an external module).
* Sources: MDN CSP `script-src` (unsafe-eval / wasm-unsafe-eval): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src · W3C CSP3: https://www.w3.org/TR/CSP3/ · Emscripten embind: https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html · measured in `tools/worker-test/results.json` (`csp`).

## How to re-run

```bash
node tools/worker-test/run.js          # all suites (~2 min: includes the real 30 s watchdog)
node tools/worker-test/run.js csp      # CSP matrix only (also: stub | real | fatal | stress; stress takes ~1 min)
```
`run.js` starts `tools/worker-test/serve_test.py --port 8102` once per suite and kills it afterwards. The `fatal` suite uses the plain `tools/serve_netlify.py`. The stub CV files in `tools/worker-test/stub-cv/` are served at `/js/cv/*` only by the test server (`--stub always` for the hang/leak/busy hooks, `auto` fills in missing files, `never` uses the real ones). They are never used by the real site.

## Sources
`knowledge/wasm-expert/docs/02-memory.md`, `04-web-workers.md`, `05-security-sandbox.md`, `examples/README.md` (ex3 transfer + watchdog) · skills `wasm-worker-runtime`, `cv-mat-memory-hygiene`, `opencvjs-diff-pipeline` · `docs/build-plan.md`, `docs/06`, `07`, `11` · MDN Transferable objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects · HTML Standard workers: https://html.spec.whatwg.org/multipage/workers.html

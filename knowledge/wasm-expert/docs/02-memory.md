# WebAssembly.Memory

**Sources:** MDN `WebAssembly.Memory`: https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory · MDN `Memory.prototype.grow()`: https://developer.mozilla.org/docs/WebAssembly/JavaScript_interface/Memory/grow · Constructor: https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory/Memory

## Facts from MDN
- The `WebAssembly.Memory()` constructor creates an object whose `buffer` is a resizable `ArrayBuffer` (or `SharedArrayBuffer`) holding the raw bytes that a `WebAssembly.Instance` accesses.
- Sizes are in **pages of 64 KiB**. `new WebAssembly.Memory({ initial: 10, maximum: 100 })` is 640 KiB, growable to 6.4 MiB. `maximum` is a hint that lets the engine reserve memory up front.
- `memory.grow(delta)` adds `delta` pages and **returns the previous size in pages**.
- **Detachment:** every call to `grow`, even `grow(0)`, detaches the old buffer. Its `byteLength` becomes 0. Read `memory.buffer` again to get a view of the right length.
- Growing past `maximum` throws a `RangeError`. (Verified by example 2.)

## Why this matters for us
1. **Leaks:** JavaScript's garbage collector frees JS objects, but not bytes inside Wasm memory. A `cv.Mat` handle that's collected without `.delete()` leaves its pixels in the heap for good. Over many comparisons, the heap keeps **growing**.
2. **Stale views:** after OpenCV allocates (which can grow the heap), an old `Uint8Array` you took from `mat.data` may be detached and empty. Take `mat.data` **right before** you use it, and copy it out (`new Uint8ClampedArray(mat.data)`) before you post it.
3. **Monitoring:** the worker reports `cv.HEAPU8.length` after each run. A plateau is healthy, and steady growth means a leak. Verified in the browser: the opencv.js 4.13 heap stayed at 134,217,728 bytes over 70 example runs.

# 06 — WebAssembly (Wasm)

## Summary

WebAssembly is a compact binary instruction format that browsers run at **near-native speed** inside the same security sandbox as JavaScript. Languages like C, C++ and Rust compile to it. OpenCV.js is OpenCV's C++ code compiled to Wasm with **Emscripten**, so `cv.absdiff` on a 2-megapixel screenshot runs as compiled C++, not interpreted JS. This is the course's idea of the browser as the "muscle".

## Key concepts (they map 1:1 to the JS API)

| Concept | Meaning | In our app |
|---|---|---|
| **Module** | Compiled, stateless Wasm code, with imports and exports like an ES module | opencv.js embeds/loads the OpenCV Wasm module |
| **Instance** | A module plus its state (memory, table, imports) | Created once when opencv.js initializes |
| **Memory** | A growable `ArrayBuffer` of raw bytes (linear memory) | Every `cv.Mat`'s pixels live here (the "Emscripten heap") |
| **Table** | Typed array of function references | Internal to Emscripten |

## Why it matters for this project

- **Speed:** pixel loops over millions of values (diff, blur, contours, SSIM) are why OpenCV.js exists. The same code in plain JS would be much slower.
- **Privacy:** the computation comes to the screenshot, instead of the screenshot going to a server. Nothing about an INFORMS page has to leave the analyst's PC.
- **Sandboxing:** Wasm modules run independently and can't escape the sandbox except through the APIs they're given. Their linear memory is isolated from the runtime's own memory.

## Memory model → why `cv.Mat` leaks happen

Wasm linear memory is **not garbage-collected**. A `cv.Mat` in JS is a small handle that points into that memory. When the handle goes out of scope, the JS garbage collector frees the handle **but not the pixels**. Only `mat.delete()` frees the bytes. Leak enough screenshots (8 MB each at 1920×1080 RGBA) and the heap grows until the tab slows down or crashes. This is the "Slowdown after many scans" row in the course troubleshooting table.

Rule: **every `new cv.Mat()`, `cv.MatVector`, `KeyPointVector` and `DMatchVector`, and every result of `.get(i)`, gets a matching `.delete()` in a `finally` block.**

## Loading

- Prebuilt opencv.js inlines the Wasm binary (base64) in a single JS file of about 10 MB, so no separate `.wasm` file is needed. Builds that ship `opencv_js.wasm` separately need the server to send `Content-Type: application/wasm`, which Netlify does for `.wasm`.
- Load it once per worker. The worker (see 07) owns the only Wasm instance.

## Demo talking point

Open DevTools → Sources/Network. The page downloads opencv.js once, then you run 10 comparisons and the Network panel stays quiet. All the work happened in Wasm, on the analyst's own CPU.

## Sources

- MDN WebAssembly concepts: https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Concepts
- MDN WebAssembly reference (Memory, Module, Instance): https://developer.mozilla.org/en-US/docs/WebAssembly
- WebAssembly security model: https://webassembly.org/docs/security/
- WebAssembly home / spec: https://webassembly.org/
- Mozilla Hacks — Memory in WebAssembly: https://hacks.mozilla.org/2017/07/memory-in-webassembly-and-why-its-safer-than-you-think/
- OpenCV.js memory note (delete Mats in Emscripten heap): https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html

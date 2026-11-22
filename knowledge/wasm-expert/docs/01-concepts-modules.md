# WebAssembly concepts: module, memory, table, instance

**Sources:** MDN WebAssembly concepts: https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Concepts · webassembly.org: https://webassembly.org/

## What it is
- WebAssembly (Wasm) is a low-level bytecode format and a compilation target for C, C++ and Rust. It runs on the web at **near-native speed** and isn't meant to be written by hand.
- MDN lists its goals: fast, efficient and portable; readable and debuggable (it has a text format, WAT); **secure** (sandboxed, and it follows the browser's same-origin and permissions policies); and "don't break the web".
- It **complements** JavaScript rather than replacing it. JavaScript calls exported Wasm functions as normal functions, and Wasm can import and call JavaScript functions.

## Four key concepts (they map 1:1 to the JS API)
| Concept | Meaning |
|---|---|
| **Module** | A compiled Wasm binary. It is **stateless**, so it can be shared between windows and workers with `postMessage()`. It declares imports and exports, like an ES module. |
| **Memory** | A growable buffer: the linear array of bytes that Wasm's load and store instructions read and write. |
| **Table** | A growable array of references (e.g., functions) that can't be stored as raw bytes. |
| **Instance** | A Module paired with its runtime state: memories, tables and imported values. |

## Where OpenCV.js fits
- OpenCV.js is C++ compiled by **Emscripten**. MDN describes Emscripten's output as a Wasm binary **plus JavaScript "glue" code** that loads the module and implements library features with Web APIs.
- **Wasm can't touch the DOM.** It calls JavaScript, which makes the Web API call. That's why `cv.imshow` is JS glue that needs a canvas, and why it doesn't work in a worker.
- Every `cv.Mat` is bytes inside the instance's Memory (the "Emscripten heap"). See `02-memory.md`.

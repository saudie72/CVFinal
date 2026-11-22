# WebAssembly security model

**Source:** webassembly.org Security: https://webassembly.org/docs/security/ · Mozilla Hacks, "Memory in WebAssembly": https://hacks.mozilla.org/2017/07/memory-in-webassembly-and-why-its-safer-than-you-think/

## What Wasm guarantees (webassembly.org)
- **Sandboxing:** each module runs in a sandbox separated from the host runtime by fault isolation, and can't escape except through the APIs it's given. Browsers add their own policies on top, such as the same-origin rules.
- **Linear-memory bounds checks:** they apply to the whole memory region. Out-of-bounds accesses **trap**. Memory is isolated from the runtime's own memory and zero-initialised.
- **Control-flow integrity:** calls must target valid functions, indirect calls are type-checked, and the call stack is protected.

## What it does not prevent
- Overflows **inside** a module's own linear memory (one C++ object overwriting its neighbour).
- Race conditions, and side-channel or timing attacks.

## Why this supports the privacy story
OpenCV.js runs inside the page's sandbox, on the analyst's own CPU. The screenshot pixels are copied into the worker's Wasm memory, processed there, and never sent anywhere. The demo proof is DevTools → Network showing no requests during a comparison.

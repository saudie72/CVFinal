# Streaming instantiation and the application/wasm MIME type

**Sources:** W3C WebAssembly Web API (Candidate Recommendation Draft): https://www.w3.org/TR/wasm-web-api-2/ · MDN `WebAssembly.instantiateStreaming()`: https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static · MDN Memory example using it: https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory/Memory

## The APIs
```webidl
[Exposed=(Window,Worker)]
partial namespace WebAssembly {
  Promise<Module> compileStreaming(Promise<Response> source, ...);
  Promise<WebAssemblyInstantiatedSource> instantiateStreaming(Promise<Response> source, optional object importObject, ...);
};
```
- They're exposed on **Window and Worker**, so the worker can use them.
- They compile **while the bytes download**, which is faster than `fetch → arrayBuffer → instantiate`.

## The MIME rule (from the spec)
The returned promise **rejects with a `TypeError`** if the Response:
- is not CORS-same-origin,
- is not an OK status, or
- does **not** have the `application/wasm` MIME type. The spec notes that extra parameters aren't allowed, so even `application/wasm;` fails.

Example 1 verified this: with `application/octet-stream`, the error name was `TypeError`.

## Safe loader (from example 1)
```js
async function loadWasm(url, imports = {}) {
  try { return await WebAssembly.instantiateStreaming(fetch(url), imports); }
  catch (e) {
    if (!(e instanceof TypeError)) throw e;                 // real compile errors still surface
    const bytes = await (await fetch(url)).arrayBuffer();   // MIME fallback
    return WebAssembly.instantiate(bytes, imports);
  }
}
```

## Project notes
- The prebuilt `opencv.js` **embeds** its Wasm (base64) inside the JS file, so there's no separate `.wasm` fetch and no MIME issue. If we switch to a build with a separate `opencv_js.wasm`, Netlify must serve it as `application/wasm`. Netlify serves `.wasm` with that type by default, but check it in DevTools → Network → Headers.
- Python's `http.server` (used for local testing) maps `.wasm` to `application/wasm` in recent versions. Our runner sets it explicitly.

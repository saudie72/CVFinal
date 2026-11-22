// Classic (non-module) worker. The real inspector.worker.js does importScripts('vendor/opencv/4.13.0/opencv.js') here.
let wasm;
(async () => {
  const { instance } = await WebAssembly.instantiateStreaming(fetch('add.wasm'));
  wasm = instance.exports;
  postMessage({ type: 'ready', add: wasm.add(2, 3) });
})();

onmessage = ({ data }) => {
  if (data.type === 'sum') {
    postMessage({ type: 'progress', id: data.id, step: 'received' });
    const px = new Uint8Array(data.buf);
    let sum = 0;
    for (let i = 0; i < px.length; i++) sum = sum + px[i];
    postMessage({ type: 'progress', id: data.id, step: 'summing' });
    postMessage({ type: 'result', id: data.id, sum, buf: data.buf }, [data.buf]); // transfer back
  }
  if (data.type === 'hang') { for (;;) {} }   // simulates a stuck computation
};

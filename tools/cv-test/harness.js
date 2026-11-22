// Page side of the harness: one worker, promise-based calls.
(function () {
  const w = new Worker('test.worker.js');
  let n = 0; const pending = new Map();
  w.onmessage = e => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
  w.onerror = e => { window.__workerError = e.message; };
  window.call = msg => new Promise(res => { const id = ++n; pending.set(id, res); w.postMessage(Object.assign({ id }, msg)); });
})();

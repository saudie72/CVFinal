// js/worker-client.js: main-thread client for inspector.worker.js (owner: Volt). ES module.
//
//   import { createInspector } from './worker-client.js';
//   const insp = createInspector({ onStatus: s => pill.update(s) });
//   await insp.ready;                                   // resolves with the worker's ready info
//   const r = await insp.compare(baseImageData, candImageData, zones, settings, { onProgress });
//   const { bytes } = await insp.heap();
//   insp.restart();
//
// INPUT BUFFERS ARE TRANSFERRED, NOT COPIED (zero-copy). After compare() is called, the
// `data` of `base` and `cand` is detached on the main thread (byteLength 0). If the page
// still needs the pixels, pass { copy: true } (the client copies first) or keep the source
// Blob / canvas and read it again. Two exceptions are copied automatically: a typed array
// that is a view into a larger buffer, and base and cand sharing one buffer.
// Output images (result.images.*.data) are transferred back to the page: no copy either way.
//
// Status (onStatus receives {state, label, step?, message?}):
//   loading  "Loading OpenCV…"     on create and after every restart
//   ready    "Ready"
//   working  "Working… (<step>)"   while a job runs, with the pipeline's progress step
//   error    <message>             load failure/timeout, or a watchdog restart (then loading again)
//
// Watchdog: each job gets `jobTimeoutMs` (default 30 000) from the moment it is sent to the
// worker. If no result or error arrives in time: worker.terminate() (frees its whole Wasm heap),
// spawn a fresh worker, reject with Error('Timed out, restarted'). Jobs are sent one at a time,
// so time spent queued behind another job never counts toward a job's timeout.
// Design and measurements: docs/worker-notes.md.

const DEFAULT_WORKER_URL = new URL('../inspector.worker.js', import.meta.url);
export const TIMEOUT_MESSAGE = 'Timed out, restarted';

function asRGBA(img, name, copy) {
  if (!img) throw new TypeError(`${name}: image is required`);
  const w = img.width ?? img.w, h = img.height ?? img.h;
  let src = img.data ?? img.buf;
  if (src instanceof ArrayBuffer) src = new Uint8Array(src);
  if (!ArrayBuffer.isView(src)) throw new TypeError(`${name}: expected ImageData or {width, height, data}`);
  if (src.byteLength !== w * h * 4) throw new TypeError(`${name}: ${src.byteLength} bytes is not ${w}x${h}x4 RGBA`);
  if (src.buffer.byteLength === 0) throw new TypeError(`${name}: pixel buffer is detached (already transferred)`);
  const whole = src.byteOffset === 0 && src.byteLength === src.buffer.byteLength;
  const buf = (copy || !whole) ? src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength) : src.buffer;
  return { w, h, buf };
}

export function createInspector({
  onStatus = () => {},
  workerUrl = DEFAULT_WORKER_URL,
  loadTimeoutMs = 60000,
  jobTimeoutMs = 30000,
} = {}) {
  let worker = null;
  let generation = 0;           // bumps on every spawn; messages from old workers are ignored
  let readyInfo = null;
  let readyPromise, resolveReady, rejectReady;
  let loadTimer = null;
  let nextId = 1;
  const queue = [];             // jobs waiting to be sent
  let current = null;           // the job inside the worker: {id, msg, transfer, resolve, reject, onProgress, timer}
  const heapWaiters = new Map();
  let lastStatus = null;

  const status = (state, extra = {}) => {
    lastStatus = { state, ...extra };
    try { onStatus(lastStatus); } catch (e) { console.error('onStatus threw', e); }
  };

  function newReadyPromise() {
    readyPromise = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
    readyPromise.catch(() => {});  // callers may never await it; avoid unhandled-rejection noise
  }

  function failAll(message) {
    const err = new Error(message);
    if (current) { clearTimeout(current.timer); current.reject(err); current = null; }
    queue.splice(0).forEach(j => j.reject(err));
    heapWaiters.forEach(w => w.reject(err)); heapWaiters.clear();
  }

  function spawn() {
    const gen = ++generation;
    readyInfo = null;
    newReadyPromise();
    status('loading', { label: 'Loading OpenCV…' });
    const t0 = performance.now();
    const w = new Worker(workerUrl);   // classic worker: importScripts() needs it
    worker = w;
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      if (gen !== generation || readyInfo) return;
      fatal(`OpenCV did not load within ${Math.round(loadTimeoutMs / 1000)} s`);
    }, loadTimeoutMs);

    w.onmessage = (e) => {
      if (gen !== generation) return;
      const m = e.data || {};
      switch (m.type) {
        case 'ready':
          clearTimeout(loadTimer);
          readyInfo = { ...m.info, workerMs: m.ms, clientMs: Math.round(performance.now() - t0) };
          status('ready', { label: 'Ready', info: readyInfo });
          resolveReady(readyInfo);
          pump();
          break;
        case 'fatal':
          if (m.stack) console.error('[inspector.worker] fatal', m.stage, m.stack);
          fatal(`OpenCV failed to load (${m.stage}): ${m.message}`);
          break;
        case 'progress':
          if (current && m.id === current.id) {
            status('working', { label: `Working… (${m.step})`, step: m.step });
            try { current.onProgress?.(m.step); } catch (err) { console.error(err); }
          }
          break;
        case 'result':
        case 'error': {
          if (!current || m.id !== current.id) break;
          const job = current; current = null;
          clearTimeout(job.timer);
          if (m.type === 'result') {
            const { type, id, ...result } = m;
            job.resolve(result);
          } else {
            job.reject(new Error(m.message));
          }
          status('ready', { label: 'Ready', info: readyInfo });
          pump();
          break;
        }
        case 'heap':
          if (m.id != null && heapWaiters.has(m.id)) {
            heapWaiters.get(m.id).resolve({ bytes: m.bytes });
            heapWaiters.delete(m.id);
          }
          break;
      }
    };
    // Script-level failures (404 of the worker file, CSP refusal, uncaught error).
    w.onerror = (ev) => {
      if (gen !== generation) return;
      ev.preventDefault?.();
      const msg = ev.message || 'Worker script error';
      if (!readyInfo) fatal(`OpenCV worker failed to start: ${msg}`);
      else restartWith(`Worker crashed: ${msg}`);
    };
    w.onmessageerror = () => { if (gen === generation && current) restartWith('Worker message could not be decoded'); };
  }

  function fatal(message) {
    clearTimeout(loadTimer);
    try { worker?.terminate(); } catch {}
    generation++;           // ignore anything else the dead worker says
    worker = null;
    status('error', { label: message, message });
    rejectReady(new Error(message));
    failAll(message);
  }

  function restartWith(message) {
    try { worker?.terminate(); } catch {}
    if (current) { clearTimeout(current.timer); current.reject(new Error(message)); current = null; }
    // Queued jobs were never sent, so they survive the restart and run on the new worker.
    heapWaiters.forEach(w => w.reject(new Error(message))); heapWaiters.clear();
    status('error', { label: message, message });
    spawn();
  }

  function pump() {
    if (current || !readyInfo || !queue.length || !worker) return;
    const job = queue.shift();
    current = job;
    status('working', { label: 'Working…', step: null });
    try {
      worker.postMessage(job.msg, job.transfer);
    } catch (e) {          // e.g. DataCloneError
      current = null; job.reject(e); status('ready', { label: 'Ready', info: readyInfo }); pump(); return;
    }
    job.timer = setTimeout(() => {
      if (current === job) restartWith(TIMEOUT_MESSAGE);
    }, jobTimeoutMs);
  }

  function compare(base, cand, zones = [], settings = {}, { onProgress, copy = false } = {}) {
    let b, c;
    try {
      b = asRGBA(base, 'base', copy);
      c = asRGBA(cand, 'cand', copy);
    } catch (e) { return Promise.reject(e); }
    if (b.buf === c.buf) c = { ...c, buf: c.buf.slice(0) };   // one buffer can't be transferred twice
    const id = nextId++;
    // zones/settings are plain data: structured-cloned (copied), never transferred.
    const msg = { type: 'compare', id, base: b, cand: c, zones, settings };
    return new Promise((resolve, reject) => {
      if (!worker && lastStatus?.state === 'error') { reject(new Error(lastStatus.message || 'Inspector is not running')); return; }
      queue.push({ id, msg, transfer: [b.buf, c.buf], resolve, reject, onProgress, timer: null });
      pump();
    });
  }

  function heap() {
    return readyPromise.then(() => new Promise((resolve, reject) => {
      const id = 'h' + (nextId++);
      heapWaiters.set(id, { resolve, reject });
      worker.postMessage({ type: 'heap', id });
    }));
  }

  function restart() {
    // Manual restart: like the watchdog, but a load failure is retried too.
    if (!worker) { failAll('Restarted'); spawn(); pump(); return readyPromise; }
    restartWith('Restarted');
    return readyPromise;
  }

  function terminate() {
    clearTimeout(loadTimer);
    try { worker?.terminate(); } catch {}
    generation++; worker = null;
    failAll('Inspector terminated');
  }

  spawn();

  return {
    get ready() { return readyPromise; },
    get status() { return lastStatus; },
    compare,
    heap,
    restart,
    terminate,
  };
}

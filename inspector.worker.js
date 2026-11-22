/* inspector.worker.js: the ERP Visual Regression Inspector's OpenCV.js worker (owner: Volt).
 *
 * CLASSIC worker on purpose: importScripts() throws inside module workers (HTML Standard), and
 * opencv.js registers itself through the importScripts branch of its UMD wrapper.
 *   new Worker('inspector.worker.js')            // no {type:'module'}
 *
 * It loads opencv.js 4.13.0 and the four CV files ONCE, waits for the Wasm runtime, then serves
 * compare jobs. Full protocol, numbers and the CSP finding: docs/worker-notes.md.
 *
 * page -> worker
 *   {type:'compare', id, base:{w,h,buf}, cand:{w,h,buf}, zones:[{x,y,w,h,label}], settings:{...}}
 *       base.buf / cand.buf are ArrayBuffers of RGBA bytes (w*h*4), sent in the transfer list.
 *   {type:'heap', id}                       ask for the current Wasm heap size
 * worker -> page
 *   {type:'ready', ms, info:{...}}          runtime initialised, pipeline present
 *   {type:'fatal', stage, message}          loading failed; the worker cannot do any work
 *   {type:'progress', id, step}             'Received', then the pipeline's steps, then 'Packing'
 *   {type:'result', id, ...result, workerMs, heapBytes}   image buffers are transferred back
 *   {type:'error', id, message}             this job failed; the worker is still usable
 *   {type:'heap', id?, bytes, after?}       cv.HEAPU8.length (sent after every job, and on request)
 *
 * Sources: knowledge/wasm-expert/docs/04-web-workers.md, 02-memory.md;
 * skills wasm-worker-runtime, cv-mat-memory-hygiene; docs/build-plan.md.
 */
'use strict';

var OPENCV_URL = 'vendor/opencv/4.13.0/opencv.js';
var CV_FILES = ['js/cv/align.js', 'js/cv/ssim.js', 'js/cv/heatmap.js', 'js/cv/pipeline.js'];

var state = { cv: null, fatal: null, readyStyle: null, tImportStart: 0, tImportEnd: 0 };
var pending = []; // compare/heap messages that arrive before the runtime is ready

function post(msg, transfer) { self.postMessage(msg, transfer || []); }

function errText(e) {
  if (e == null) return 'Unknown error';
  if (typeof e === 'number' && state.cv && typeof state.cv.exceptionFromPtr === 'function') {
    try { return 'OpenCV exception: ' + state.cv.exceptionFromPtr(e).msg; } catch (_) { /* fall through */ }
  }
  if (typeof e === 'number') return 'OpenCV exception (pointer ' + e + ')';
  return (e && e.message) ? String(e.message) : String(e);
}

function failFatal(stage, e) {
  if (state.fatal || state.cv) return;          // first fatal wins; never after ready
  state.fatal = { stage: stage, message: errText(e) };
  var stack = (e && e.stack) ? String(e.stack).split('\n').slice(0, 6).join('\n') : undefined;
  post({ type: 'fatal', stage: stage, message: state.fatal.message, stack: stack });
  // Answer anything that was waiting, so no caller hangs on a dead worker.
  pending.splice(0).forEach(function (m) {
    if (m.type === 'compare') post({ type: 'error', id: m.id, message: 'OpenCV failed to load: ' + state.fatal.message });
  });
}

function heapBytes() {
  var cv = state.cv;
  if (!cv) return 0;
  if (cv.HEAPU8) return cv.HEAPU8.length;
  if (cv.wasmMemory) return cv.wasmMemory.buffer.byteLength;
  return 0;
}

function buildInfo(cv) {
  var info = { version: null, build: null };
  try {
    if (typeof cv.getBuildInformation === 'function') {
      var txt = String(cv.getBuildInformation());
      var m = /OpenCV\s+(\d+\.\d+\.\d+)/.exec(txt);
      info.version = m ? m[1] : null;
      info.build = txt.split('\n').filter(function (l) { return /OpenCV|Version control|Timestamp|Emscripten|Platform/i.test(l); })
        .slice(0, 8).map(function (l) { return l.trim(); });
    }
  } catch (_) { /* optional */ }
  if (!info.version) { var v = /opencv\/(\d+\.\d+\.\d+)\//.exec(OPENCV_URL); info.version = v ? v[1] : null; info.versionSource = 'vendored path'; }
  return info;
}

function onRuntimeReady(mod, style) {
  if (state.cv || state.fatal) return;          // the readiness signals can fire more than once
  if (!mod || typeof mod.Mat !== 'function') { failFatal('init', new Error('OpenCV runtime has no cv.Mat')); return; }
  if (!self.ErpCV || typeof self.ErpCV.compare !== 'function') {
    failFatal('cv-files', new Error('self.ErpCV.compare is missing (js/cv/pipeline.js)')); return;
  }
  state.cv = mod;
  self.cv = mod;
  state.readyStyle = style;
  var now = performance.now();
  var info = buildInfo(mod);
  info.readyStyle = style;
  info.importMs = Math.round(state.tImportEnd - state.tImportStart);   // fetch + parse + run opencv.js
  info.initMs = Math.round(now - state.tImportEnd);                     // Wasm compile/instantiate + embind
  info.heapBytes = heapBytes();
  info.cloneIsDeep = !!(mod.Mat.prototype.mat_clone && mod.Mat.prototype.clone === mod.Mat.prototype.mat_clone);
  info.stubs = (self.ErpCV.__stubLoaded || null);
  post({ type: 'ready', ms: Math.round(now), info: info });
  pending.splice(0).forEach(handle);
}

// ---- load opencv.js once ---------------------------------------------------------------------
// opencv.js 4.13 ends with `return cv(Module)`, using a global Module if one exists, and wraps our
// onRuntimeInitialized (it calls it first, then patches Mat.clone). We also handle builds where
// `cv` is a Promise / thenable, and the case where the runtime is already initialised.
self.Module = {
  onRuntimeInitialized: function () {
    // self.cv may not be assigned yet if this fires synchronously inside the factory.
    var mod = self.Module;
    // Run after opencv.js's own wrapper has finished (it patches clone after calling us).
    setTimeout(function () { onRuntimeReady(mod, 'onRuntimeInitialized'); }, 0);
  },
  onAbort: function (what) { failFatal('init', new Error('Wasm runtime aborted: ' + what)); },
  print: function () {}, // keep the console quiet
  printErr: function (t) { if (!state.cv) console.warn('[opencv]', t); }
};

self.addEventListener('error', function (ev) {
  if (!state.cv) { failFatal('init', ev.error || ev.message); ev.preventDefault(); }
});
self.addEventListener('unhandledrejection', function (ev) {
  if (!state.cv) { failFatal('init', ev.reason); ev.preventDefault(); }
});

(function load() {
  state.tImportStart = performance.now();
  try {
    importScripts(OPENCV_URL);
  } catch (e) {
    var err = new Error('Could not load ' + OPENCV_URL + ': ' + errText(e));
    err.stack = e && e.stack;
    failFatal('opencv.js', err);
    return;
  }
  state.tImportEnd = performance.now();
  for (var i = 0; i < CV_FILES.length; i++) {
    try { importScripts(CV_FILES[i]); } catch (e) {
      failFatal('cv-files', new Error('Could not load ' + CV_FILES[i] + ': ' + errText(e)));
      return;
    }
  }
  var cv = self.cv;
  if (cv && typeof cv.Mat === 'function' && (cv.calledRun || cv.runtimeInitialized)) {
    onRuntimeReady(cv, 'already-ready');
  } else if (cv && (cv instanceof Promise || typeof cv.then === 'function')) {
    // Call .then directly. Never `await` an Emscripten Module thenable: resolving a Promise with it
    // re-enters .then and can loop.
    cv.then(function (m) { onRuntimeReady(m && m.Mat ? m : self.Module, 'promise'); },
            function (e) { failFatal('init', e); });
  }
  // Otherwise Module.onRuntimeInitialized will fire.
})();

// ---- jobs ------------------------------------------------------------------------------------
function toImage(part, name) {
  if (!part || !(part.buf instanceof ArrayBuffer)) throw new Error(name + ': expected {w, h, buf: ArrayBuffer}');
  var w = part.w | 0, h = part.h | 0;
  if (w <= 0 || h <= 0 || part.buf.byteLength !== w * h * 4) {
    throw new Error(name + ': ' + part.buf.byteLength + ' bytes is not ' + w + 'x' + h + 'x4 RGBA');
  }
  return { width: w, height: h, data: new Uint8ClampedArray(part.buf) };
}

// Make an output image's pixels safe to transfer: a view into the Wasm heap (or into a larger
// buffer) is copied, because the heap's ArrayBuffer can't be transferred or must not be detached.
function packImage(img, transfer) {
  if (!img || !img.data) return img;
  var d = img.data;
  var heap = state.cv && state.cv.HEAPU8 && state.cv.HEAPU8.buffer;
  if (!(d.buffer instanceof ArrayBuffer) || d.buffer === heap || d.byteOffset !== 0 || d.byteLength !== d.buffer.byteLength
      || transfer.indexOf(d.buffer) !== -1) {
    d = new Uint8ClampedArray(d);
  } else if (!(d instanceof Uint8ClampedArray)) {
    d = new Uint8ClampedArray(d.buffer);
  }
  transfer.push(d.buffer);
  return { width: img.width, height: img.height, data: d };
}

function runCompare(m) {
  var id = m.id;
  var t0 = performance.now();
  var progress = function (step) { post({ type: 'progress', id: id, step: String(step) }); };
  try {
    progress('Received');
    var base = toImage(m.base, 'base');
    var cand = toImage(m.cand, 'cand');
    var res = self.ErpCV.compare(state.cv, base, cand, m.zones || [], m.settings || {}, { onProgress: progress, progress: progress });
    if (!res || typeof res !== 'object') throw new Error('pipeline returned no result');
    progress('Packing');
    var transfer = [];
    var out = {};
    for (var k in res) if (Object.prototype.hasOwnProperty.call(res, k)) out[k] = res[k];
    if (res.images) {
      out.images = {};
      for (var name in res.images) if (Object.prototype.hasOwnProperty.call(res.images, name)) {
        out.images[name] = packImage(res.images[name], transfer);
      }
    }
    out.type = 'result';
    out.id = id;
    out.workerMs = Math.round(performance.now() - t0);
    out.heapBytes = heapBytes();
    post(out, transfer);
  } catch (e) {
    post({ type: 'error', id: id, message: errText(e) });
  } finally {
    post({ type: 'heap', after: id, bytes: heapBytes() });
  }
}

function handle(m) {
  if (!m || typeof m !== 'object') return;
  if (m.type === 'compare') {
    if (state.fatal) { post({ type: 'error', id: m.id, message: 'OpenCV failed to load: ' + state.fatal.message }); return; }
    if (!state.cv) { pending.push(m); return; }
    runCompare(m);
  } else if (m.type === 'heap') {
    post({ type: 'heap', id: m.id, bytes: heapBytes() });
  }
}

self.onmessage = function (e) { handle(e.data); };

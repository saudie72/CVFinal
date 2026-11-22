/* tools/cv-test/test.worker.js — test-only classic worker. Loads the vendored opencv.js and the
 * js/cv/* files in the same order as inspector.worker.js, decodes PNGs with OffscreenCanvas and
 * runs ErpCV.compare. Driven by harness.html (which run.js controls through Playwright). */
importScripts('../../vendor/opencv/4.13.0/opencv.js',
  '../../js/cv/align.js', '../../js/cv/ssim.js', '../../js/cv/heatmap.js', '../../js/cv/pipeline.js');

var ready = new Promise(function (resolve) {
  if (self.cv instanceof Promise || (self.cv && typeof self.cv.then === 'function' && !self.cv.Mat)) {
    self.cv.then(function (m) { self.cv = m; resolve(m); });
  } else if (self.cv && self.cv.Mat) resolve(self.cv);
  else self.cv.onRuntimeInitialized = function () { resolve(self.cv); };
});

async function load(url) {
  const blob = await (await fetch('/' + url)).blob();
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d');
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, bmp.width, bmp.height);
  return { width: d.width, height: d.height, data: d.data };
}
async function png(img) {
  const c = new OffscreenCanvas(img.width, img.height);
  c.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  const b = await c.convertToBlob({ type: 'image/png' });
  const u = new Uint8Array(await b.arrayBuffer());
  let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function probe(cv) {   // address of a fresh 64 KB malloc: stable if freed memory is reused
  if (typeof cv._malloc !== 'function') return null;
  const p = cv._malloc(65536); cv._free(p); return p;
}

self.onmessage = async function (e) {
  const m = e.data, cv = await ready;
  try {
    if (m.type === 'info') {
      const t = new cv.Mat(2, 2, cv.CV_8UC1, [7, 0, 0, 0]), c = t.clone(); c.data[0] = 9;
      const cloneShallow = t.data[0] === 9; t.delete(); c.delete();
      postMessage({ id: m.id, ok: true, info: {
        version: cv.getBuildInformation ? (cv.getBuildInformation().match(/General configuration for OpenCV ([^\s=]+)/) || [])[1] : null,
        applyColorMap: typeof cv.applyColorMap === 'function', ORB: typeof cv.ORB === 'function',
        findHomography: typeof cv.findHomography === 'function', max: typeof cv.max === 'function',
        malloc: typeof cv._malloc === 'function', cloneShallow: cloneShallow, heap: cv.HEAPU8.length } });
      return;
    }
    const base = await load(m.pair.before), cand = await load(m.pair.after);
    if (m.type === 'run') {
      const st0 = Object.assign({}, ErpCV.stats);
      const r = ErpCV.compare(cv, base, cand, m.pair.ignoreZones || [], m.pair.settings || {});
      const imgs = {};
      if (m.savePng && r.images) for (const k of Object.keys(r.images)) imgs[k] = await png(r.images[k]);
      const shapes = r.images ? Object.fromEntries(Object.entries(r.images).map(([k, v]) => [k, [v.width, v.height, v.data.length]])) : null;
      delete r.images;
      postMessage({ id: m.id, ok: true, result: r, shapes, png: imgs,
        tracked: { created: ErpCV.stats.created - st0.created, deleted: ErpCV.stats.deleted - st0.deleted } });
    } else if (m.type === 'leak') {
      const runs = m.runs || 20, heap = [], probes = [], leaked = [];
      const st0 = Object.assign({}, ErpCV.stats);
      for (let i = 0; i < runs; i++) {
        if (m.control) {                       // negative control: leak one full-size RGBA Mat per run
          const x = new cv.Mat(base.height, base.width, cv.CV_8UC4); x.data.set(base.data); leaked.push(x);
        }
        const r = ErpCV.compare(cv, base, cand, m.pair.ignoreZones || [], Object.assign({}, m.pair.settings || {}, { images: true }));
        heap.push(cv.HEAPU8.length); probes.push(probe(cv));
      }
      leaked.forEach(x => x.delete());
      postMessage({ id: m.id, ok: true, heap, probes,
        tracked: { created: ErpCV.stats.created - st0.created, deleted: ErpCV.stats.deleted - st0.deleted } });
    }
  } catch (err) {
    postMessage({ id: m.id, ok: false, error: String(err && err.message || err) });
  }
};
postMessage({ type: 'boot' });

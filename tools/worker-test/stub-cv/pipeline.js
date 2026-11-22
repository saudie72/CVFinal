// TEST STUB (tools/worker-test only). Stands in for js/cv/pipeline.js until Iris's file exists.
// Implements the build-plan contract self.ErpCV.compare(cv, base, cand, zones, settings) with a
// minimal but real OpenCV.js diff, so the worker round trip, transfers and heap are exercised.
// Test hooks in settings.__stub: 'hang' (infinite loop), 'throw', 'leak' (leaks 2 Mats per run),
// 'busy:<ms>' (burns CPU for <ms> inside Wasm-heavy loops).
self.ErpCV = self.ErpCV || {};
self.ErpCV.__stubLoaded = (self.ErpCV.__stubLoaded || []).concat('pipeline');
self.ErpCV.__leaked = self.ErpCV.__leaked || [];
self.ErpCV.compare = function compare(cv, base, cand, zones, settings, hooks) {
  const t0 = performance.now();
  const s = settings || {};
  const step = (hooks && (hooks.onProgress || hooks.progress)) || (() => {});
  const mode = String(s.__stub || '');
  if (mode === 'hang') { for (;;) {} }
  if (mode === 'throw') throw new Error('stub: deliberate failure');
  const T = s.T ?? 25, minArea = s.minArea ?? 64, thresholdPct = s.thresholdPct ?? 0.1;
  const bag = []; const K = o => (bag.push(o), o);
  try {
    step('Aligning');
    if (base.width !== cand.width || base.height !== cand.height) throw new Error('stub: sizes differ');
    const a = K(cv.matFromImageData(base)), b = K(cv.matFromImageData(cand));
    const ga = K(new cv.Mat()), gb = K(new cv.Mat()), diff = K(new cv.Mat()), bin = K(new cv.Mat());
    cv.cvtColor(a, ga, cv.COLOR_RGBA2GRAY); cv.cvtColor(b, gb, cv.COLOR_RGBA2GRAY);
    step('Diffing');
    cv.absdiff(ga, gb, diff);
    for (const z of zones || []) {
      const r = new cv.Rect(z.x, z.y, z.w, z.h);
      const roi = K(diff.roi(r)); roi.setTo(new cv.Scalar(0));
    }
    cv.threshold(diff, bin, T, 255, cv.THRESH_BINARY);
    if (mode.startsWith('busy:')) {            // CPU-heavy Wasm work, to prove the UI stays responsive
      const until = performance.now() + Number(mode.slice(5));
      const tmp = K(new cv.Mat());
      while (performance.now() < until) cv.GaussianBlur(ga, tmp, new cv.Size(15, 15), 0);
    }
    step('Finding regions');
    const contours = K(new cv.MatVector()), hier = K(new cv.Mat());
    cv.findContours(bin.mat_clone ? K(bin.mat_clone()) : bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const regions = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = K(contours.get(i)); const r = cv.boundingRect(c);
      if (r.width * r.height >= minArea) regions.push({ x: r.x, y: r.y, width: r.width, height: r.height, area: r.width * r.height });
    }
    const changedPct = 100 * cv.countNonZero(bin) / (bin.rows * bin.cols);
    const boxes = K(b.mat_clone());
    for (const r of regions) cv.rectangle(boxes, new cv.Point(r.x, r.y), new cv.Point(r.x + r.width, r.y + r.height), new cv.Scalar(255, 0, 0, 255), 2);
    const diffRGBA = K(new cv.Mat()); cv.cvtColor(diff, diffRGBA, cv.COLOR_GRAY2RGBA);
    if (mode === 'leak') self.ErpCV.__leaked.push(a.mat_clone(), b.mat_clone()); // deliberately never deleted
    const out = m => ({ width: m.cols, height: m.rows, data: new Uint8ClampedArray(m.data) }); // copy out of the heap
    return {
      regions, changedPct, ssim: null,
      status: regions.length > 0 && changedPct > thresholdPct ? 'FAIL' : 'PASS',
      alignment: { method: 'none', dx: 0, dy: 0, scale: 1 },
      settings: { T, kernel: 0, minArea, thresholdPct },
      images: { boxes: out(boxes), diff: out(diffRGBA), heatmap: out(diffRGBA) },
      ms: Math.round(performance.now() - t0), stub: true,
    };
  } finally {
    for (const o of bag) try { o.delete(); } catch (e) {}
  }
};

/* js/cv/pipeline.js — ErpCV.compare(): the screenshot diff pipeline (Iris, opencv-expert)
 * Classic script, loaded after align.js, ssim.js, heatmap.js. No DOM: works in a Web Worker.
 *
 *   var result = self.ErpCV.compare(cv, base, cand, zones, settings[, hooks]);
 *   base, cand : {width, height, data: Uint8ClampedArray|Uint8Array RGBA}
 *   zones      : [{x, y, w, h, label}] in baseline pixels (width/height also accepted)
 *   settings   : any subset of ErpCV.DEFAULTS
 *   hooks      : optional {onProgress(step)}
 * Returns (skill opencvjs-diff-pipeline + docs/build-plan.md):
 *   { regions:[{id,x,y,width,height,area,changedPixels}], changedPct, ssim, status:'PASS'|'FAIL',
 *     alignment:{method,dx,dy,scale,score,...}, settings:{T,kernel,minArea,thresholdPct,...}, ms,
 *     images:{boxes, diff, heatmap}  each {width, height, data: Uint8ClampedArray RGBA},
 *     rawChangedPct, ignoredPct, heatmapMethod, timings }
 * Throws an Error with a readable message on bad input (the worker turns it into {type:'error'}).
 * Transfer images.*.data.buffer back to the page; nothing returned references the Wasm heap.
 *
 * Steps: align -> blur(3×3) -> absdiff (max over R,G,B, or gray) -> zero ignore zones + warp
 * border -> threshold(T) -> [erode] -> dilate(kernel, iterations) -> findContours(EXTERNAL)
 * -> boundingRect, area >= minArea -> merge boxes closer than mergeGap -> % changed, SSIM, status
 * (FAIL if any region exists or changedPct > thresholdPct).
 */
(function (root) {
  'use strict';
  var ErpCV = root.ErpCV = root.ErpCV || {};

  ErpCV.VERSION = '1.0.0';
  ErpCV.DEFAULTS = {
    T: 25,               // threshold on the 0–255 absdiff (docs/02: 20–35 for UI screenshots)
    kernel: 5,           // dilate structuring element (square, px)
    dilateIter: 2,
    erodeIter: 0,        // optional speck removal before dilate
    blur: 3,             // Gaussian blur kernel before absdiff (0/1 = off)
    scaledBlur: 5,       // blur used instead when alignment rescaled the candidate (resampling fringe)
    minArea: 64,         // drop boxes smaller than this (px², width*height)
    mergeGap: 3,         // merge boxes only when they overlap or nearly touch (gap < 3 px); dilation already bridges 8 px
    thresholdPct: 0.1,   // FAIL if any region (>= minArea) exists OR changedPct > thresholdPct
    diffMode: 'max-rgb', // 'max-rgb' (catches equal-luminance colour changes) | 'gray' (skill default)
    align: true,
    maxShift: 40,        // translation search radius (px)
    minMatchScore: 0.8,  // accept matchTemplate offset if TM_CCOEFF_NORMED >= this
    fallbackMatchScore: 0.5,
    allowHomography: true,
    orbFeatures: 2000,
    borderPad: 2,        // px of the warp border also ignored (interpolation fringe)
    ssimMaxPixels: 1500000,
    heatmapBlend: 0.55,
    forceLutHeatmap: false,
    drawZones: true,     // grey hatching for ignore zones on the boxes image
    images: true         // set false to skip the RGBA outputs (e.g. leak loops, batch runs)
  };

  var RED = [220, 38, 38, 255], WHITE = [255, 255, 255, 255];
  function now() { return (typeof performance !== 'undefined' ? performance : Date).now(); }

  function settingsOf(user) {
    var s = {}, k;
    for (k in ErpCV.DEFAULTS) s[k] = ErpCV.DEFAULTS[k];
    if (user) for (k in user) if (user[k] !== undefined && user[k] !== null && k in ErpCV.DEFAULTS) s[k] = user[k];
    ['T', 'kernel', 'dilateIter', 'erodeIter', 'blur', 'minArea', 'mergeGap', 'scaledBlur', 'thresholdPct', 'maxShift',
     'minMatchScore', 'fallbackMatchScore', 'orbFeatures', 'borderPad', 'ssimMaxPixels', 'heatmapBlend'].forEach(function (key) {
      var v = Number(s[key]); s[key] = isFinite(v) ? v : ErpCV.DEFAULTS[key];
    });
    s.T = Math.max(0, Math.min(254, Math.round(s.T)));
    s.kernel = Math.max(1, Math.round(s.kernel));
    if (s.blur > 1 && s.blur % 2 === 0) s.blur += 1;          // Gaussian kernels must be odd
    if (s.scaledBlur > 1 && s.scaledBlur % 2 === 0) s.scaledBlur += 1;
    return s;
  }

  function matFromRGBA(cv, img, name, T) {
    if (!img || !(img.width > 0) || !(img.height > 0) || !img.data) throw new Error(name + ': expected {width, height, data}');
    var w = img.width | 0, h = img.height | 0;
    if (img.data.length !== w * h * 4) throw new Error(name + ': data length ' + img.data.length + ' != width*height*4 (' + (w * h * 4) + ')');
    var m = T(new cv.Mat(h, w, cv.CV_8UC4));
    m.data.set(img.data);
    return m;
  }

  function toImage(m) {   // copy out of the Wasm heap (CV_8UC4, continuous)
    return { width: m.cols, height: m.rows, data: new Uint8ClampedArray(m.data) };
  }

  function zoneRects(zones, W, H) {
    var out = [];
    (zones || []).forEach(function (z) {
      if (!z) return;
      var x = Math.round(+z.x), y = Math.round(+z.y);
      var w = Math.round(+(z.w != null ? z.w : z.width)), h = Math.round(+(z.h != null ? z.h : z.height));
      if (![x, y, w, h].every(isFinite)) return;
      var x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
      if (x1 > x0 && y1 > y0) out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, label: z.label || '' });
    });
    return out;
  }

  // Merge rectangles whose gap (between edges, per axis) is < gap. Each pass is a union-find over all
  // pairs (O(n²)); passes repeat until stable because a merged box can reach new neighbours.
  // More than MAX_BOXES raw boxes means the whole page changed: return one whole-extent region.
  ErpCV.MAX_BOXES = 2000;
  ErpCV.mergeBoxes = function (rects, gap) {
    var rs = rects.map(function (r) { return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    if (rs.length > ErpCV.MAX_BOXES) {
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      rs.forEach(function (r) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.width); y1 = Math.max(y1, r.y + r.height); });
      return [{ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }];
    }
    for (;;) {
      var n = rs.length, parent = new Int32Array(n), i, j;
      for (i = 0; i < n; i++) parent[i] = i;
      var find = function (k) { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; };
      for (i = 0; i < n; i++) {
        var a = rs[i];
        for (j = i + 1; j < n; j++) {
          var b = rs[j];
          var gx = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
          var gy = Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height);
          if (gx < gap && gy < gap) { var ri = find(i), rj = find(j); if (ri !== rj) parent[rj] = ri; }
        }
      }
      var groups = {}, out = [];
      for (i = 0; i < n; i++) {
        var root = find(i), r = rs[i], g = groups[root];
        if (!g) { g = groups[root] = { x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height }; out.push(g); }
        else { g.x0 = Math.min(g.x0, r.x); g.y0 = Math.min(g.y0, r.y); g.x1 = Math.max(g.x1, r.x + r.width); g.y1 = Math.max(g.y1, r.y + r.height); }
      }
      var next = out.map(function (g) { return { x: g.x0, y: g.y0, width: g.x1 - g.x0, height: g.y1 - g.y0 }; });
      if (next.length === rs.length) return next;
      rs = next;
    }
  };

  function drawBoxes(cv, img, regions, zones, s, T) {
    var L = ErpCV.track();
    try {
      if (s.drawZones) zones.forEach(function (z) {
        var roi = L(img.roi(new cv.Rect(z.x, z.y, z.w, z.h)));
        var grey = L(new cv.Mat(z.h, z.w, cv.CV_8UC4, [148, 148, 148, 255]));
        cv.addWeighted(roi, 0.55, grey, 0.45, 0, roi);       // writes through to img (roi shares data)
        for (var k = -z.h; k < z.w; k += 10) cv.line(roi, new cv.Point(k, z.h), new cv.Point(k + z.h, 0), [96, 96, 96, 255], 1, cv.LINE_8);
        cv.rectangle(roi, new cv.Point(0, 0), new cv.Point(z.w - 1, z.h - 1), [96, 96, 96, 255], 1, cv.LINE_8);
      });
      regions.forEach(function (r) {
        cv.rectangle(img, new cv.Point(r.x, r.y), new cv.Point(r.x + r.width - 1, r.y + r.height - 1), RED, 3, cv.LINE_8);
        var label = String(r.id), scale = 0.55, th = 1;
        var tw = 11 * label.length + 6, lh = 18;
        var lx = Math.min(Math.max(0, r.x - 1), Math.max(0, img.cols - tw));
        var ly = r.y - lh >= 0 ? r.y - lh : Math.min(img.rows - lh, r.y + r.height);   // tab above, else below
        cv.rectangle(img, new cv.Point(lx, ly), new cv.Point(lx + tw, ly + lh), RED, -1, cv.LINE_8);
        cv.putText(img, label, new cv.Point(lx + 3, ly + 14), cv.FONT_HERSHEY_SIMPLEX, scale, WHITE, th + 1, cv.LINE_AA);
      });
    } finally { L.free(); }
  }

  ErpCV.compare = function (cv, base, cand, zones, settings, hooks) {
    var t0 = now(), times = {}, tl = t0, out = null;
    function step(name) {
      var t = now(); times[name] = +(t - tl).toFixed(1); tl = t;
      if (hooks && typeof hooks.onProgress === 'function') { try { hooks.onProgress(name); } catch (e) {} }
    }
    if (!cv || typeof cv.Mat !== 'function') throw new Error('OpenCV.js is not ready (cv.Mat missing)');
    var s = settingsOf(settings);
    ErpCV.stats = { created: 0, deleted: 0 };     // per-compare counters (reported as result.tracked)
    var T = ErpCV.track();
    try {
      var A = matFromRGBA(cv, base, 'base', T), B0 = matFromRGBA(cv, cand, 'cand', T);
      var W = A.cols, H = A.rows, N = W * H;
      step('load');

      // 1. alignment
      var al = ErpCV.align(cv, A, B0, s, T);
      var B = al.aligned;
      if (B !== B0) T.drop(B0);              // the raw candidate is no longer needed (lower peak heap)
      step('align');

      // 2. blur + absdiff
      var a = A, b = B;
      var rescaled = Math.abs((al.info.scale || 1) - 1) > 0.005;
      var blurK = rescaled ? Math.max(s.blur, s.scaledBlur) : s.blur;
      if (blurK > 1) {
        a = T(new cv.Mat()); b = T(new cv.Mat());
        cv.GaussianBlur(A, a, new cv.Size(blurK, blurK), 0, 0, cv.BORDER_DEFAULT);
        cv.GaussianBlur(B, b, new cv.Size(blurK, blurK), 0, 0, cv.BORDER_DEFAULT);
      }
      var diff = T(new cv.Mat());
      if (s.diffMode === 'gray') {
        var ga = T(new cv.Mat()), gb = T(new cv.Mat());
        cv.cvtColor(a, ga, cv.COLOR_RGBA2GRAY); cv.cvtColor(b, gb, cv.COLOR_RGBA2GRAY);
        cv.absdiff(ga, gb, diff);
      } else {
        var d4 = T(new cv.Mat()); cv.absdiff(a, b, d4);
        var ch = T(new cv.MatVector()); cv.split(d4, ch);
        var c0 = T(ch.get(0)), c1 = T(ch.get(1)), c2 = T(ch.get(2)), c3 = T(ch.get(3));
        cv.max(c0, c1, diff); cv.max(diff, c2, diff);
        [c0, c1, c2, c3, ch, d4].forEach(T.drop);   // free the 4-channel diff and its planes early
      }
      if (a !== A) { T.drop(a); T.drop(b); }
      step('diff');

      // 3. ignore mask: zones (baseline px) + whatever the warp could not fill
      var zr = zoneRects(zones, W, H);
      var ignore = T(cv.Mat.zeros(H, W, cv.CV_8UC1));
      zr.forEach(function (z) {
        cv.rectangle(ignore, new cv.Point(z.x, z.y), new cv.Point(z.x + z.w - 1, z.y + z.h - 1), [255, 0, 0, 0], -1, cv.LINE_8);
      });
      if (al.valid) {
        var inv = T(new cv.Mat());
        cv.threshold(al.valid, inv, 127, 255, cv.THRESH_BINARY_INV);
        if (s.borderPad > 0) {
          var bk = T(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2 * s.borderPad + 1, 2 * s.borderPad + 1)));
          cv.dilate(inv, inv, bk);
        }
        cv.bitwise_or(ignore, inv, ignore);
      }
      var ignoredPx = cv.countNonZero(ignore);
      if (ignoredPx > 0) diff.setTo([0, 0, 0, 0], ignore);
      step('mask');

      // 4. threshold + morphology
      var bin = T(new cv.Mat());
      cv.threshold(diff, bin, s.T, 255, cv.THRESH_BINARY);
      var rawPx = cv.countNonZero(bin);
      if (s.erodeIter > 0) {
        var ek = T(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)));
        cv.erode(bin, bin, ek, new cv.Point(-1, -1), s.erodeIter);
      }
      if (s.dilateIter > 0 && s.kernel > 1) {
        var k = T(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(s.kernel, s.kernel)));
        cv.dilate(bin, bin, k, new cv.Point(-1, -1), s.dilateIter);
      }
      if (ignoredPx > 0) bin.setTo([0, 0, 0, 0], ignore);   // dilation must not leak back into zones
      step('threshold');

      // 5. contours -> boxes
      var contours = T(new cv.MatVector()), hier = T(new cv.Mat());
      cv.findContours(bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      var rects = [];
      for (var i = 0; i < contours.size(); i++) {
        var c = T(contours.get(i));                 // every .get(i) is a new Mat: tracked
        var r = cv.boundingRect(c);
        if (r.width * r.height >= s.minArea) rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
      }
      rects = ErpCV.mergeBoxes(rects, s.mergeGap).filter(function (r) { return r.width * r.height >= s.minArea; });
      rects.sort(function (p, q) { return (p.y - q.y) || (p.x - q.x); });   // reading order = region numbers
      var regions = rects.map(function (r, idx) {
        var roi = T(bin.roi(new cv.Rect(r.x, r.y, r.width, r.height)));
        return { id: idx + 1, x: r.x, y: r.y, width: r.width, height: r.height, area: r.width * r.height,
                 changedPixels: cv.countNonZero(roi) };
      });
      var changedPx = cv.countNonZero(bin);
      var changedPct = 100 * changedPx / N;
      step('regions');

      // 6. SSIM on grayscale (ignore zones and warp border copied from the baseline so they score 1)
      var sa = T(new cv.Mat()), sb = T(new cv.Mat());
      cv.cvtColor(A, sa, cv.COLOR_RGBA2GRAY); cv.cvtColor(B, sb, cv.COLOR_RGBA2GRAY);
      if (ignoredPx > 0) sa.copyTo(sb, ignore);
      var ssim = ErpCV.ssim(cv, sa, sb, { maxPixels: s.ssimMaxPixels });
      step('ssim');

      // Any surviving region is a visible change (it already passed minArea + morphology), so it fails the
      // page; thresholdPct additionally fails pages with widespread sub-minArea speckle (docs/cv-pipeline-notes.md)
      var status = regions.length > 0 || changedPct > s.thresholdPct ? 'FAIL' : 'PASS';

      // 7. images (RGBA copies, safe to transfer)
      var images = null, heatMethod = null;
      if (s.images) {
        var boxes = T(ErpCV.deepCopy(cv, B));
        drawBoxes(cv, boxes, regions, zr, s, T);
        var dview = T(new cv.Mat());
        var dn = T(new cv.Mat());
        var mm = cv.minMaxLoc(diff);
        if (mm.maxVal > 0) cv.normalize(diff, dn, 0, 255, cv.NORM_MINMAX, cv.CV_8U); else diff.copyTo(dn);
        cv.cvtColor(dn, dview, cv.COLOR_GRAY2RGBA);
        var hm = ErpCV.heatmap(cv, diff, B, { blend: s.heatmapBlend, forceLut: s.forceLutHeatmap }, T);
        heatMethod = hm.method;
        images = { boxes: toImage(boxes), diff: toImage(dview), heatmap: toImage(hm.mat) };
        step('images');
      }

      out = {
        regions: regions,
        changedPct: +changedPct.toFixed(4),
        rawChangedPct: +(100 * rawPx / N).toFixed(4),
        ignoredPct: +(100 * ignoredPx / N).toFixed(3),
        ssim: +ssim.toFixed(5),
        status: status,
        alignment: al.info,
        settings: { T: s.T, kernel: s.kernel, minArea: s.minArea, thresholdPct: s.thresholdPct,
                    dilateIter: s.dilateIter, erodeIter: s.erodeIter, mergeGap: s.mergeGap, blur: s.blur,
                    blurUsed: blurK, diffMode: s.diffMode, minMatchScore: s.minMatchScore, maxShift: s.maxShift },
        zones: zr,
        size: { width: W, height: H },
        heatmapMethod: heatMethod,
        timings: times,
        ms: 0,
        images: images
      };
      out.ms = +(now() - t0).toFixed(1);
      return out;
    } finally {
      T.free();
      if (out) out.tracked = { created: ErpCV.stats.created, deleted: ErpCV.stats.deleted };
    }
  };
})(typeof self !== 'undefined' ? self : this);

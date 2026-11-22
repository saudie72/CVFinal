/* js/cv/align.js — ERP Visual Regression Inspector (Iris, opencv-expert)
 * Classic script (importScripts in inspector.worker.js). No DOM, no ES modules.
 * Defines self.ErpCV.track (Mat tracker) and self.ErpCV.align (alignment ladder).
 *
 * Ladder (docs/03-alignment.md, skill screenshot-alignment):
 *   1. same size + matchTemplate best offset (0,0)        -> 'none'
 *   2. different size -> cv.resize (uniform, by width) and
 *      pad/crop to the baseline canvas (white)            -> 'resize'
 *   3. matchTemplate (TM_CCOEFF_NORMED) offset, score > minScore,
 *      coarse on half size then refined at full size       -> 'translate'
 *   4. only if 3 is not accepted: ORB + BFMatcher(HAMMING, crossCheck)
 *      + findHomography(RANSAC, 3) with a sanity check, accepted only
 *      if it lowers the mean residual; otherwise fall back -> 'homography'
 * Every step returns a "valid" mask (255 = real candidate pixels) so the
 * pipeline can ignore the white fill strip a warp brings in.
 * Every Mat / MatVector / KeyPointVector / ORB / BFMatcher is tracked and freed.
 */
(function (root) {
  'use strict';
  var ErpCV = root.ErpCV = root.ErpCV || {};

  // ── Tracker: everything created goes in a bag, freed in finally ─────────
  ErpCV.stats = ErpCV.stats || { created: 0, deleted: 0 };
  ErpCV.track = function () {
    var bag = [];
    var T = function (o) { bag.push(o); ErpCV.stats.created++; return o; };
    T.free = function () {
      while (bag.length) {
        var o = bag.pop();
        try {
          if (o && typeof o.delete === 'function' && !(typeof o.isDeleted === 'function' && o.isDeleted())) {
            o.delete(); ErpCV.stats.deleted++;
          } else { ErpCV.stats.deleted++; }
        } catch (e) { /* already freed */ }
      }
    };
    // release one object early (e.g. a big temporary) and forget it
    T.drop = function (o) {
      var i = bag.indexOf(o);
      if (i >= 0) { bag.splice(i, 1); try { o.delete(); } catch (e) {} ErpCV.stats.deleted++; }
    };
    return T;
  };

  ErpCV.deepCopy = function (cv, m) {        // Mat.clone() may be shallow in 4.13 (knowledge/opencv-expert)
    if (typeof m.mat_clone === 'function') return m.mat_clone();
    var d = new cv.Mat(); m.copyTo(d); return d;
  };

  var WHITE = [255, 255, 255, 255];

  function toGray(cv, rgba, T) { var g = T(new cv.Mat()); cv.cvtColor(rgba, g, cv.COLOR_RGBA2GRAY); return g; }
  function down(cv, g, f, T) {
    if (f === 1) return g;
    var d = T(new cv.Mat());
    cv.resize(g, d, new cv.Size(Math.max(1, Math.round(g.cols * f)), Math.max(1, Math.round(g.rows * f))), 0, 0, cv.INTER_AREA);
    return d;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // matchTemplate on a single region. Returns score for placing tmplRect of `a` at (rect.x+dx, rect.y+dy) of b
  function scoreAt(cv, a, b, rect, dx, dy) {
    var T = ErpCV.track();
    try {
      var bx = rect.x + dx, by = rect.y + dy;
      if (bx < 0 || by < 0 || bx + rect.width > b.cols || by + rect.height > b.rows) return -1;
      var t = T(a.roi(rect)), s = T(b.roi(new cv.Rect(bx, by, rect.width, rect.height))), r = T(new cv.Mat());
      cv.matchTemplate(s, t, r, cv.TM_CCOEFF_NORMED);
      var v = r.floatAt(0, 0);
      return isFinite(v) ? v : -1;
    } finally { T.free(); }
  }

  // Search offsets |dx|,|dy| <= m around (cx,cy) for template `rect` of a inside b. Returns {dx,dy,score}
  function search(cv, a, b, rect, cx, cy, m) {
    var T = ErpCV.track();
    try {
      var x0 = clamp(rect.x + cx - m, 0, b.cols), y0 = clamp(rect.y + cy - m, 0, b.rows);
      var x1 = clamp(rect.x + cx + m + rect.width, 0, b.cols), y1 = clamp(rect.y + cy + m + rect.height, 0, b.rows);
      if (x1 - x0 < rect.width || y1 - y0 < rect.height) return null;
      var t = T(a.roi(rect)), s = T(b.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0))), r = T(new cv.Mat());
      cv.matchTemplate(s, t, r, cv.TM_CCOEFF_NORMED);
      var mm = cv.minMaxLoc(r);
      if (!isFinite(mm.maxVal)) return null;
      return { dx: x0 + mm.maxLoc.x - rect.x, dy: y0 + mm.maxLoc.y - rect.y, score: mm.maxVal };
    } finally { T.free(); }
  }

  // pick the most textured horizontal strip of the baseline (a blank strip gives CCOEFF_NORMED = NaN)
  function pickStrip(cv, g, m) {
    var T = ErpCV.track();
    try {
      var w = g.cols - 2 * m, h = Math.min(g.rows - 2 * m, Math.max(24, Math.round(g.rows * 0.25)));
      if (w < 16 || h < 8) return null;
      var best = null;
      [0.5, 0.3, 0.7, 0.15, 0.85].forEach(function (c) {
        var y = clamp(Math.round(g.rows * c - h / 2), m, g.rows - m - h);
        var roi = T(g.roi(new cv.Rect(m, y, w, h)));
        var mean = T(new cv.Mat()), sd = T(new cv.Mat());
        cv.meanStdDev(roi, mean, sd);
        var s = sd.doubleAt(0, 0);
        if (!best || s > best.sd) best = { rect: new cv.Rect(m, y, w, h), sd: s };
      });
      return best && best.sd > 2 ? best : null;
    } finally { T.free(); }
  }

  // Translation estimate: coarse at factor f, refined at full size (±r px)
  function estimateTranslation(cv, gb, gc, s) {
    var T = ErpCV.track();
    try {
      var f = gb.cols > 900 ? 0.5 : 1;
      var sb = down(cv, gb, f, T), sc = down(cv, gc, f, T);
      var ms = Math.max(2, Math.min(Math.ceil(s.maxShift * f), Math.floor(Math.min(sb.cols, sb.rows) / 4)));
      var strip = pickStrip(cv, sb, ms);
      if (!strip) return { dx: 0, dy: 0, score: 0, reason: 'no textured strip' };
      var coarse = search(cv, sb, sc, strip.rect, 0, 0, ms);
      if (!coarse) return { dx: 0, dy: 0, score: 0, reason: 'search failed' };
      var dx = Math.round(coarse.dx / f), dy = Math.round(coarse.dy / f), score = coarse.score;
      // refine at full size
      var M = Math.round(ms / f), r = f === 1 ? 0 : 3;
      var fullStrip = pickStrip(cv, gb, M);
      if (fullStrip) {
        if (r > 0) {
          var fine = search(cv, gb, gc, fullStrip.rect, dx, dy, r);
          if (fine) { dx = fine.dx; dy = fine.dy; score = fine.score; }
        } else {
          score = scoreAt(cv, gb, gc, fullStrip.rect, dx, dy);
        }
        // prefer "no shift" when it scores (almost) as well — avoids 1-px jitter on changed pages
        var zero = scoreAt(cv, gb, gc, fullStrip.rect, 0, 0);
        if (zero >= score - 0.002) { dx = 0; dy = 0; score = Math.max(score, zero); }
      }
      return { dx: dx, dy: dy, score: score };
    } finally { T.free(); }
  }

  function meanResidual(cv, gb, warpedGray, valid) {
    var T = ErpCV.track();
    try {
      var d = T(new cv.Mat()); cv.absdiff(gb, warpedGray, d);
      return valid ? cv.mean(d, valid)[0] : cv.mean(d)[0];
    } finally { T.free(); }
  }

  // ORB + RANSAC homography (cand -> base), estimated at factor f. Returns {H:[9] full-size, inliers, matches} or {reason}
  function estimateHomography(cv, gb, gc, s) {
    var T = ErpCV.track();
    try {
      if (typeof cv.ORB !== 'function' || typeof cv.findHomography !== 'function') return { reason: 'ORB/findHomography missing in build' };
      var f = gb.cols > 900 ? 0.5 : 1;
      var sb = down(cv, gb, f, T), sc = down(cv, gc, f, T);
      var orb = T(new cv.ORB(s.orbFeatures));
      var kb = T(new cv.KeyPointVector()), kc = T(new cv.KeyPointVector());
      var db = T(new cv.Mat()), dc = T(new cv.Mat()), none = T(new cv.Mat());
      orb.detectAndCompute(sb, none, kb, db);
      orb.detectAndCompute(sc, none, kc, dc);
      if (db.rows < 8 || dc.rows < 8) return { reason: 'too few keypoints (' + db.rows + '/' + dc.rows + ')' };
      var bf = T(new cv.BFMatcher(cv.NORM_HAMMING, true));
      var mv = T(new cv.DMatchVector());
      bf.match(dc, db, mv);                       // query = candidate, train = baseline
      var ms = [];
      for (var i = 0; i < mv.size(); i++) ms.push(mv.get(i));   // DMatch is a value object (plain JS)
      ms.sort(function (a, b) { return a.distance - b.distance; });
      ms = ms.filter(function (m) { return m.distance <= 64; }).slice(0, 500);
      if (ms.length < 10) return { reason: 'too few good matches (' + ms.length + ')' };
      var pc = [], pb = [];
      ms.forEach(function (m) {
        var a = kc.get(m.queryIdx).pt, b = kb.get(m.trainIdx).pt;
        pc.push(a.x / f, a.y / f); pb.push(b.x / f, b.y / f);   // full-size coordinates
      });
      var src = T(cv.matFromArray(ms.length, 1, cv.CV_32FC2, pc));
      var dst = T(cv.matFromArray(ms.length, 1, cv.CV_32FC2, pb));
      var inl = T(new cv.Mat());
      var H = T(cv.findHomography(src, dst, cv.RANSAC, 3 / f, inl));
      if (H.empty() || H.rows !== 3 || H.cols !== 3) return { reason: 'empty homography' };
      var h = []; for (var k = 0; k < 9; k++) h.push(H.doubleAt(Math.floor(k / 3), k % 3));
      if (!h.every(isFinite) || Math.abs(h[8]) < 1e-9) return { reason: 'non-finite homography' };
      h = h.map(function (v) { return v / h[8]; });
      var inliers = cv.countNonZero(inl);
      return { H: h, inliers: inliers, matches: ms.length };
    } finally { T.free(); }
  }

  // UI screenshots never rotate or shear: only near-similarity transforms are plausible
  function sane(h, w, ht, s) {
    var a = h[0], b = h[1], c = h[3], d = h[4];
    var sx = Math.sqrt(a * a + c * c), sy = Math.sqrt(b * b + d * d), det = a * d - b * c;
    if (!(det > 0)) return 'flipped or degenerate';
    if (sx < 0.5 || sx > 2 || sy < 0.5 || sy > 2) return 'scale out of range';
    if (Math.abs(sx / sy - 1) > 0.05) return 'anisotropic scale';
    if (Math.abs(b) > 0.03 * sy || Math.abs(c) > 0.03 * sx) return 'rotation/shear';
    if (Math.abs(h[6]) * w > 0.02 || Math.abs(h[7]) * ht > 0.02) return 'perspective terms too large';
    if (Math.abs(h[2]) > w * 0.25 || Math.abs(h[5]) > ht * 0.25) return 'translation too large';
    return null;
  }

  function fitToCanvas(cv, src, W, H, T) {
    // copy src (top-left anchored) into a white W×H canvas; valid = where real pixels landed
    var out = T(new cv.Mat(H, W, cv.CV_8UC4, WHITE));
    var valid = T(cv.Mat.zeros(H, W, cv.CV_8UC1));
    var w = Math.min(W, src.cols), h = Math.min(H, src.rows);
    var r = new cv.Rect(0, 0, w, h);
    var a = T(src.roi(r)), b = T(out.roi(r)), v = T(valid.roi(r));
    a.copyTo(b); v.setTo([255, 0, 0, 0]);
    return { img: out, valid: valid };
  }

  /**
   * align(cv, base, cand, s, T) — base/cand: CV_8UC4 Mats. T: the caller's tracker (owns the outputs).
   * Returns { aligned: CV_8UC4 base-sized Mat, valid: CV_8UC1 mask or null, info:{method,dx,dy,scale,score,steps,...} }
   */
  ErpCV.align = function (cv, base, cand, s, T) {
    var L = ErpCV.track();
    try {
      var W = base.cols, H = base.rows;
      var info = { method: 'none', dx: 0, dy: 0, scale: 1, score: null, steps: [] };
      var work = cand, valid = null;

      // 2. size ladder
      if (cand.cols !== W || cand.rows !== H) {
        var src = cand;
        if (Math.abs(cand.cols - W) > 2) {
          var sx = W / cand.cols, nh = Math.max(1, Math.round(cand.rows * sx));
          var rs = L(new cv.Mat());
          cv.resize(cand, rs, new cv.Size(W, nh), 0, 0, sx < 1 ? cv.INTER_AREA : cv.INTER_LINEAR);
          src = rs; info.scale = +sx.toFixed(4);
        }
        var fit = fitToCanvas(cv, src, W, H, T);
        work = fit.img; valid = fit.valid;
        info.method = 'resize'; info.steps.push('resize');
        info.sizeFrom = { width: cand.cols, height: cand.rows };
      }
      if (s.align === false) return { aligned: work === cand ? T(ErpCV.deepCopy(cv, cand)) : work, valid: valid, info: info };

      var gb = toGray(cv, base, L), gc = toGray(cv, work, L);

      // 3. translation
      var tr = estimateTranslation(cv, gb, gc, s);
      info.score = +(+tr.score).toFixed(4);
      var accepted = tr.score >= s.minMatchScore;
      if (accepted && (tr.dx !== 0 || tr.dy !== 0)) {
        var M = L(cv.matFromArray(2, 3, cv.CV_64FC1, [1, 0, -tr.dx, 0, 1, -tr.dy]));
        var out = T(new cv.Mat());
        cv.warpAffine(work, out, M, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, WHITE);
        var v0 = valid || L(new cv.Mat(H, W, cv.CV_8UC1, [255, 0, 0, 0]));
        var nv = T(new cv.Mat());
        cv.warpAffine(v0, nv, M, new cv.Size(W, H), cv.INTER_NEAREST, cv.BORDER_CONSTANT, [0, 0, 0, 0]);
        work = out; valid = nv;
        info.method = 'translate'; info.dx = tr.dx; info.dy = tr.dy; info.steps.push('translate');
      }
      if (accepted) return { aligned: work === cand ? T(ErpCV.deepCopy(cv, cand)) : work, valid: valid, info: info };

      // 4. homography (only when translation did not explain the pair)
      info.steps.push('translate-rejected(' + info.score + ')');
      if (s.allowHomography) {
        var est = estimateHomography(cv, gb, gc, s);
        var why = est.reason || sane(est.H, W, H, s);
        if (!why && est.inliers < Math.max(8, 0.25 * est.matches)) why = 'too few RANSAC inliers (' + est.inliers + '/' + est.matches + ')';
        if (!why) {
          var Hm = L(cv.matFromArray(3, 3, cv.CV_64FC1, est.H));
          var hw = T(new cv.Mat());
          cv.warpPerspective(work, hw, Hm, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, WHITE);
          var hv0 = valid || L(new cv.Mat(H, W, cv.CV_8UC1, [255, 0, 0, 0]));
          var hv = T(new cv.Mat());
          cv.warpPerspective(hv0, hv, Hm, new cv.Size(W, H), cv.INTER_NEAREST, cv.BORDER_CONSTANT, [0, 0, 0, 0]);
          // acceptance: the warp must lower the mean residual by >= 10 % versus doing nothing
          var hg = toGray(cv, hw, L);
          var before = meanResidual(cv, gb, gc, valid), after = meanResidual(cv, gb, hg, hv);
          var coverage = cv.countNonZero(hv) / (W * H);
          if (after < before * 0.9 && coverage > 0.6) {
            info.method = 'homography';
            info.scale = +(Math.sqrt(Math.abs(est.H[0] * est.H[4] - est.H[1] * est.H[3])) * info.scale).toFixed(4);
            info.dx = +(-est.H[2]).toFixed(2); info.dy = +(-est.H[5]).toFixed(2);
            info.H = est.H.map(function (v) { return +v.toFixed(6); });
            info.inliers = est.inliers; info.matches = est.matches;
            info.residual = { before: +before.toFixed(2), after: +after.toFixed(2) };
            info.steps.push('homography');
            return { aligned: hw, valid: hv, info: info };
          }
          why = 'homography did not lower the residual (' + before.toFixed(2) + ' -> ' + after.toFixed(2) + ', coverage ' + coverage.toFixed(2) + ')';
        }
        info.fallback = why;
        info.steps.push('homography-rejected');
      }
      // fallback: low-confidence translation if it is still the best guess, otherwise keep as is
      if (tr.score >= s.fallbackMatchScore && (tr.dx !== 0 || tr.dy !== 0)) {
        var M2 = L(cv.matFromArray(2, 3, cv.CV_64FC1, [1, 0, -tr.dx, 0, 1, -tr.dy]));
        var o2 = T(new cv.Mat());
        cv.warpAffine(work, o2, M2, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, WHITE);
        var w0 = valid || L(new cv.Mat(H, W, cv.CV_8UC1, [255, 0, 0, 0]));
        var v2 = T(new cv.Mat());
        cv.warpAffine(w0, v2, M2, new cv.Size(W, H), cv.INTER_NEAREST, cv.BORDER_CONSTANT, [0, 0, 0, 0]);
        work = o2; valid = v2;
        info.method = 'translate'; info.dx = tr.dx; info.dy = tr.dy; info.lowConfidence = true;
      }
      return { aligned: work === cand ? T(ErpCV.deepCopy(cv, cand)) : work, valid: valid, info: info };
    } finally { L.free(); }
  };
})(typeof self !== 'undefined' ? self : this);

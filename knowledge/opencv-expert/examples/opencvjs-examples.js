// OpenCV.js worked examples for the ERP Visual Regression Inspector.
// Run in any page where opencv.js is loaded and ready (window.cv or self.cv):
//   const report = runOpenCvExamples();  console.table(report);
// Every example builds synthetic images, so it needs no files and runs offline.
// Every Mat/MatVector is deleted in a finally block (see docs/02-mat-and-delete.md).

// Deep copy helper. VERIFIED in opencv.js 4.13: Mat.clone() SHARES data (shallow);
// mat_clone() and copyTo() make real copies. Never use clone() for a "before" copy.
function deepCopy(m) {
  if (typeof m.mat_clone === 'function') return m.mat_clone();
  const d = new cv.Mat(); m.copyTo(d); return d;
}

function withBag(fn) {
  const bag = []; const T = o => (bag.push(o), o);
  try { return fn(T); } finally { for (const o of bag) { try { o.delete(); } catch (e) {} } }
}

// ── Example 1: screenshot diff → changed regions ───────────────────────────
// gray → blur → absdiff → threshold → dilate → findContours(EXTERNAL) → boxes
function example1_diffRegions() {
  return withBag(T => {
    const W = 200, H = 120, white = new cv.Scalar(255, 255, 255, 255), dark = new cv.Scalar(30, 30, 30, 255);
    const base = T(new cv.Mat(H, W, cv.CV_8UC4, white));
    const cand = T(deepCopy(base));   // NOT base.clone() — that shares pixels
    cv.rectangle(cand, new cv.Point(40, 30), new cv.Point(90, 50), dark, -1);   // "new button"
    cv.rectangle(cand, new cv.Point(130, 80), new cv.Point(170, 95), dark, -1); // "moved field"

    const ga = T(new cv.Mat()), gb = T(new cv.Mat()), diff = T(new cv.Mat()), bin = T(new cv.Mat());
    cv.cvtColor(base, ga, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(cand, gb, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(ga, ga, new cv.Size(3, 3), 0);
    cv.GaussianBlur(gb, gb, new cv.Size(3, 3), 0);
    cv.absdiff(ga, gb, diff);
    cv.threshold(diff, bin, 25, 255, cv.THRESH_BINARY);
    const k = T(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));
    cv.dilate(bin, bin, k, new cv.Point(-1, -1), 1);

    const contours = T(new cv.MatVector()), hier = T(new cv.Mat());
    cv.findContours(bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const regions = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = T(contours.get(i));
      const r = cv.boundingRect(c);
      if (r.width * r.height >= 64) regions.push(r);
    }
    regions.sort((a, b) => a.x - b.x);
    const changedPct = 100 * cv.countNonZero(bin) / (W * H);
    const ok = regions.length === 2 &&
      Math.abs(regions[0].x - 40) <= 4 && Math.abs(regions[1].x - 130) <= 4 && changedPct > 0;
    return { example: 'diffRegions', ok, regions, changedPct: +changedPct.toFixed(2) };
  });
}

// ── Example 2: shapes → adaptive threshold, Canny, contours & measurements ─
function example2_shapes() {
  return withBag(T => {
    const W = 220, H = 140;
    const gray = T(new cv.Mat(H, W, cv.CV_8UC1, new cv.Scalar(235)));
    cv.rectangle(gray, new cv.Point(20, 30), new cv.Point(79, 69), new cv.Scalar(40), -1); // 60×40 box
    cv.circle(gray, new cv.Point(160, 70), 25, new cv.Scalar(40), -1);                    // r = 25

    // adaptive threshold (blockSize odd, C positive) → dark shapes become white (BINARY_INV)
    const bin = T(new cv.Mat());
    cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 10);

    // Canny edge map (1:3 ratio) — should find edges on both outlines
    const edges = T(new cv.Mat());
    cv.Canny(gray, edges, 50, 150, 3, false);
    const edgePixels = cv.countNonZero(edges);

    // contours on a clean global threshold (white objects on black)
    const solid = T(new cv.Mat());
    cv.threshold(gray, solid, 128, 255, cv.THRESH_BINARY_INV);
    const contours = T(new cv.MatVector()), hier = T(new cv.Mat());
    cv.findContours(solid, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const shapes = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = T(contours.get(i));
      const m = cv.moments(c, false);
      shapes.push({ area: Math.round(cv.contourArea(c)), perimeter: Math.round(cv.arcLength(c, true)),
                    cx: Math.round(m.m10 / m.m00), cy: Math.round(m.m01 / m.m00), box: cv.boundingRect(c) });
    }
    shapes.sort((a, b) => a.cx - b.cx);
    const ok = contours.size() === 2 && edgePixels > 200 && cv.countNonZero(bin) > 3000 &&
      Math.abs(shapes[0].area - 59 * 39) < 60 && Math.abs(shapes[1].area - Math.PI * 25 * 25) < 120;
    return { example: 'shapes', ok, contours: contours.size(), edgePixels, shapes };
  });
}

// ── Example 3: alignment — matchTemplate translation + perspective warp ───
function example3_alignment() {
  return withBag(T => {
    const W = 200, H = 150;
    const base = T(new cv.Mat(H, W, cv.CV_8UC1, new cv.Scalar(255)));
    cv.rectangle(base, new cv.Point(30, 20), new cv.Point(170, 40), new cv.Scalar(60), -1);
    cv.rectangle(base, new cv.Point(30, 60), new cv.Point(100, 120), new cv.Scalar(120), -1);
    cv.circle(base, new cv.Point(140, 95), 18, new cv.Scalar(0), -1);

    // candidate = base shifted down 3 px (like a scroll offset)
    const cand = T(new cv.Mat());
    const shift = T(cv.matFromArray(2, 3, cv.CV_64FC1, [1, 0, 0, 0, 1, 3]));
    cv.warpAffine(base, cand, shift, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255));

    // find offset with a central template from the baseline
    const x0 = 20, y0 = 15, tw = 160, th = 115;
    const tmpl = T(base.roi(new cv.Rect(x0, y0, tw, th)));
    const res = T(new cv.Mat());
    cv.matchTemplate(cand, tmpl, res, cv.TM_CCOEFF_NORMED);
    const mm = cv.minMaxLoc(res);
    const dx = mm.maxLoc.x - x0, dy = mm.maxLoc.y - y0;

    // undo the shift and confirm the images now match (ignore the 3-px border strip)
    const undo = T(cv.matFromArray(2, 3, cv.CV_64FC1, [1, 0, -dx, 0, 1, -dy]));
    const aligned = T(new cv.Mat());
    cv.warpAffine(cand, aligned, undo, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255));
    const diff = T(new cv.Mat());
    cv.absdiff(base, aligned, diff);
    const inner = T(diff.roi(new cv.Rect(0, 0, W, H - 4)));
    const residual = cv.countNonZero(inner);

    // perspective warp: map unit square corners and check one mapped point
    const src = T(cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 100, 0, 100, 100, 0, 100]));
    const dst = T(cv.matFromArray(4, 1, cv.CV_32FC2, [10, 10, 110, 10, 110, 110, 10, 110]));
    const P = T(cv.getPerspectiveTransform(src, dst));          // pure translation (10,10)
    const tx = P.doubleAt(0, 2), ty = P.doubleAt(1, 2);

    const ok = dx === 0 && dy === 3 && mm.maxVal > 0.99 && residual === 0 &&
      Math.abs(tx - 10) < 1e-6 && Math.abs(ty - 10) < 1e-6;
    return { example: 'alignment', ok, dx, dy, score: +mm.maxVal.toFixed(4), residual, perspectiveT: [tx, ty] };
  });
}

function runOpenCvExamples() {
  return [example1_diffRegions(), example2_shapes(), example3_alignment()];
}
if (typeof module !== 'undefined') module.exports = { runOpenCvExamples };

/* js/cv/ssim.js — mean SSIM (Wang, Bovik, Sheikh & Simoncelli 2004) with OpenCV.js primitives.
 * Classic script. Inputs: two CV_8UC1 Mats of the same size. Output: a number in [-1, 1].
 * Gaussian window 11×11, σ = 1.5, C1 = (0.01·255)², C2 = (0.03·255)²  (docs/02-image-diff-pipeline.md)
 * Large pages are downscaled to <= maxPixels first (SSIM is a global score, so this keeps the
 * float buffers small: ~8 CV_32F Mats live at the peak). All Mats are freed in finally.
 */
(function (root) {
  'use strict';
  var ErpCV = root.ErpCV = root.ErpCV || {};

  ErpCV.ssim = function (cv, g1, g2, opts) {
    opts = opts || {};
    var maxPixels = opts.maxPixels || 1500000;
    var T = ErpCV.track();
    try {
      var a = g1, b = g2;
      var n = g1.rows * g1.cols;
      if (n > maxPixels) {
        var f = Math.sqrt(maxPixels / n), sz = new cv.Size(Math.round(g1.cols * f), Math.round(g1.rows * f));
        a = T(new cv.Mat()); b = T(new cv.Mat());
        cv.resize(g1, a, sz, 0, 0, cv.INTER_AREA); cv.resize(g2, b, sz, 0, 0, cv.INTER_AREA);
      }
      var C1 = Math.pow(0.01 * 255, 2), C2 = Math.pow(0.03 * 255, 2);
      var k = new cv.Size(11, 11), sig = 1.5;
      var x = T(new cv.Mat()), y = T(new cv.Mat());
      a.convertTo(x, cv.CV_32F); b.convertTo(y, cv.CV_32F);

      var mx = T(new cv.Mat()), my = T(new cv.Mat());
      cv.GaussianBlur(x, mx, k, sig, sig, cv.BORDER_REPLICATE);
      cv.GaussianBlur(y, my, k, sig, sig, cv.BORDER_REPLICATE);

      var sxx = T(new cv.Mat()), syy = T(new cv.Mat()), sxy = T(new cv.Mat()), t = T(new cv.Mat());
      cv.multiply(x, x, t); cv.GaussianBlur(t, sxx, k, sig, sig, cv.BORDER_REPLICATE);
      cv.multiply(y, y, t); cv.GaussianBlur(t, syy, k, sig, sig, cv.BORDER_REPLICATE);
      cv.multiply(x, y, t); cv.GaussianBlur(t, sxy, k, sig, sig, cv.BORDER_REPLICATE);
      T.drop(x); T.drop(y);

      var mxy = T(new cv.Mat());
      cv.multiply(mx, my, mxy);                 // μxμy
      cv.multiply(mx, mx, t); cv.subtract(sxx, t, sxx);   // σx² = E[x²] − μx²   (t = μx²)
      cv.multiply(my, my, mx); cv.subtract(syy, mx, syy); // σy²                 (mx = μy²)
      cv.subtract(sxy, mxy, sxy);                         // σxy
      cv.add(t, mx, t);                                   // μx² + μy²
      T.drop(my);

      // numerator  (2μxμy + C1)(2σxy + C2)   -> mxy
      mxy.convertTo(mxy, -1, 2, C1);
      sxy.convertTo(sxy, -1, 2, C2);
      cv.multiply(mxy, sxy, mxy);
      // denominator (μx²+μy²+C1)(σx²+σy²+C2) -> t
      t.convertTo(t, -1, 1, C1);
      cv.add(sxx, syy, sxx); sxx.convertTo(sxx, -1, 1, C2);
      cv.multiply(t, sxx, t);
      cv.divide(mxy, t, mxy);
      var v = cv.mean(mxy)[0];
      return isFinite(v) ? v : 0;
    } finally { T.free(); }
  };
})(typeof self !== 'undefined' ? self : this);

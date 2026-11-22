/* js/cv/heatmap.js — difference heatmap (docs/05-visual-outputs.md, skill canvas-comparison-views)
 * Classic script. ErpCV.heatmap(cv, diffGray, candRGBA, opts, T) -> { mat: CV_8UC4, method }
 *   1. stretch the diff with normalize(NORM_MINMAX) so faint changes stay visible
 *   2. colour it: cv.applyColorMap(COLORMAP_JET) when the build has it (4.13 docs build does,
 *      it returns 3-channel BGR), else a 256-entry JS LUT (blue → green → yellow → red)
 *   3. blend onto the aligned candidate (cv.addWeighted) so the reviewer sees where it is
 * The returned Mat is owned by the caller's tracker T; temporaries are freed here.
 */
(function (root) {
  'use strict';
  var ErpCV = root.ErpCV = root.ErpCV || {};

  var LUT = null;
  ErpCV.heatLUT = function () {            // blue(0) → cyan → green → yellow → red(255), RGB
    if (LUT) return LUT;
    LUT = new Uint8Array(256 * 3);
    var stops = [[0, 0, 0, 160], [64, 0, 140, 255], [128, 0, 200, 0], [192, 255, 220, 0], [255, 220, 30, 30]];
    for (var i = 0; i < 256; i++) {
      var j = 0; while (j < stops.length - 2 && i > stops[j + 1][0]) j++;
      var a = stops[j], b = stops[j + 1], t = (i - a[0]) / (b[0] - a[0]);
      for (var c = 0; c < 3; c++) LUT[i * 3 + c] = Math.round(a[c + 1] + (b[c + 1] - a[c + 1]) * t);
    }
    return LUT;
  };

  ErpCV.heatmap = function (cv, diffGray, candRGBA, opts, T) {
    opts = opts || {};
    var L = ErpCV.track();
    try {
      var W = diffGray.cols, H = diffGray.rows;
      var stretched = L(new cv.Mat());
      var mm = cv.minMaxLoc(diffGray);
      if (mm.maxVal > 0) cv.normalize(diffGray, stretched, 0, 255, cv.NORM_MINMAX, cv.CV_8U);
      else diffGray.copyTo(stretched);

      var heat = L(new cv.Mat(H, W, cv.CV_8UC4)), method;
      if (!opts.forceLut && typeof cv.applyColorMap === 'function' && typeof cv.COLORMAP_JET !== 'undefined') {
        var bgr = L(new cv.Mat());
        cv.applyColorMap(stretched, bgr, cv.COLORMAP_JET);
        if (bgr.channels() === 3) cv.cvtColor(bgr, heat, cv.COLOR_BGR2RGBA);
        else if (bgr.channels() === 4) cv.cvtColor(bgr, heat, cv.COLOR_BGRA2RGBA);
        else throw new Error('applyColorMap returned ' + bgr.channels() + ' channels');
        method = 'applyColorMap';
      } else {
        var lut = ErpCV.heatLUT(), src = stretched.data, dst = heat.data, n = W * H;
        for (var i = 0, p = 0; i < n; i++, p += 4) {
          var v = src[i] * 3;
          dst[p] = lut[v]; dst[p + 1] = lut[v + 1]; dst[p + 2] = lut[v + 2]; dst[p + 3] = 255;
        }
        method = 'lut';
      }
      var out = T(new cv.Mat());
      var alpha = opts.blend == null ? 0.55 : opts.blend;        // weight of the heat layer
      if (candRGBA && alpha < 1) cv.addWeighted(candRGBA, 1 - alpha, heat, alpha, 0, out);
      else heat.copyTo(out);
      return { mat: out, method: method };
    } finally { L.free(); }
  };
})(typeof self !== 'undefined' ? self : this);

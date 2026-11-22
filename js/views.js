// js/views.js: the four result views drawn on canvas (boxes, side-by-side, overlay, heatmap).
// Full-resolution canvases (width/height attributes); CSS scales them. Dynamic styles via CSSOM only.
import { $ } from './ui.js';

let hatch = null;
function hatchPattern(ctx) {
  if (!hatch) {
    hatch = document.createElement('canvas'); hatch.width = hatch.height = 10;
    const g = hatch.getContext('2d');
    g.fillStyle = 'rgba(200,200,205,0.55)'; g.fillRect(0, 0, 10, 10);
    g.strokeStyle = 'rgba(90,90,100,0.9)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-1, 11); g.lineTo(11, -1); g.stroke();
  }
  return ctx.createPattern(hatch, 'repeat');
}
/** Ignore zones as grey hatching (a pattern, not only a colour). */
export function drawZones(ctx, zones) {
  ctx.save();
  for (const z of zones || []) {
    ctx.fillStyle = hatchPattern(ctx); ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = '#555a66'; ctx.lineWidth = 1; ctx.setLineDash([6, 3]);
    ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
  }
  ctx.restore();
}

function size(canvas, w, h) { if (canvas.width !== w) canvas.width = w; if (canvas.height !== h) canvas.height = h; }
function paint(canvas, source, w, h) {
  size(canvas, w, h);
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.drawImage(source, 0, 0, w, h);
  return g;
}

/** Numbered badges + highlight on top of the pipeline's boxes image. */
function drawBoxes(canvas, m, highlight) {
  const g = paint(canvas, m.boxes, m.width, m.height);
  g.save();
  g.font = '600 14px system-ui, sans-serif'; g.textBaseline = 'middle';
  m.regions.forEach((r, i) => {
    const n = i + 1, on = highlight === i;
    if (on) {
      const cs = getComputedStyle(document.documentElement);
      const accent = cs.getPropertyValue('--accent').trim() || '#0a5fd0', halo = cs.getPropertyValue('--viewer').trim() || '#000';
      g.lineWidth = 9; g.strokeStyle = halo; g.strokeRect(r.x - 3, r.y - 3, r.width + 6, r.height + 6);
      g.lineWidth = 5; g.strokeStyle = accent; g.strokeRect(r.x - 3, r.y - 3, r.width + 6, r.height + 6);
    }
    const label = String(n), tw = g.measureText(label).width + 10;
    const bx = Math.min(Math.max(0, r.x), m.width - tw), by = r.y - 20 >= 0 ? r.y - 20 : r.y + r.height;
    g.fillStyle = '#b3001b'; g.fillRect(bx, by, tw, 20);
    g.fillStyle = '#fff'; g.fillText(label, bx + 5, by + 10);
  });
  g.restore();
}

/** m = {width,height,baseline,candidate,boxes,heatmap (CanvasImageSource), regions, zones, status} */
export function renderViews(m, highlight = -1) {
  drawBoxes($('canvas-boxes'), m, highlight);
  paint($('canvas-before'), m.baseline, m.width, m.height);
  paint($('canvas-after'), m.candidate, m.width, m.height);
  paint($('canvas-overlay-base'), m.baseline, m.width, m.height);
  paint($('canvas-overlay-top'), m.candidate, m.width, m.height);
  if (m.heatmap) {
    const g = paint($('canvas-heatmap'), m.heatmap, m.width, m.height);
    drawZones(g, m.zones);
  }
  drawZones($('canvas-before').getContext('2d'), m.zones);
  drawZones($('canvas-after').getContext('2d'), m.zones);
  drawZones($('canvas-overlay-base').getContext('2d'), m.zones);
  drawZones($('canvas-overlay-top').getContext('2d'), m.zones);
  const n = m.regions.length;
  $('canvas-boxes').setAttribute('aria-label', `After screenshot with ${n} ${n === 1 ? 'change' : 'changes'} outlined and numbered.`);
  $('canvas-heatmap').setAttribute('aria-label', `Heat map of the differences: blue is no change, red is strong change. ${n} ${n === 1 ? 'change' : 'changes'}.`);
  $('tab-heatmap').hidden = !m.heatmap;
}
export function redrawBoxes(m, highlight) { drawBoxes($('canvas-boxes'), m, highlight); }

export function setOverlay(v) {
  const slider = $('overlay-slider');
  v = Math.max(0, Math.min(100, Number(v)));
  $('canvas-overlay-top').style.setProperty('--split', String(100 - v));   // after-image visible on the right v%
  slider.setAttribute('aria-valuetext', `Showing ${v}% after, ${100 - v}% before`);
}

// ---- tabs ---------------------------------------------------------------------------------------
export function initTabs(onChange) {
  const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    onChange && onChange(tab.dataset.view);
  };
  tabs.forEach((t) => t.addEventListener('click', () => select(t, false)));
  $('tab-boxes').parentElement.addEventListener('keydown', (e) => {
    const vis = tabs.filter((t) => !t.hidden);
    const i = vis.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % vis.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + vis.length) % vis.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = vis.length - 1;
    if (j === null) return;
    e.preventDefault(); select(vis[j], true);
  });
  // overlay slider: native arrows +/-1, Home/End; add PageUp/PageDown +/-10
  const slider = $('overlay-slider');
  slider.addEventListener('input', () => setOverlay(slider.value));
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      slider.value = String(Math.max(0, Math.min(100, Number(slider.value) + (e.key === 'PageUp' ? 10 : -10))));
      setOverlay(slider.value);
    }
  });
  // side-by-side: scroll one, sync the other
  const [a, b] = [...document.querySelectorAll('#view-side .canvas-wrap')];
  let lock = false;
  const sync = (from, to) => from.addEventListener('scroll', () => { if (lock) return; lock = true; to.scrollLeft = from.scrollLeft; to.scrollTop = from.scrollTop; requestAnimationFrame(() => { lock = false; }); });
  if (a && b) { sync(a, b); sync(b, a); }
  setOverlay(slider.value);
  return { select: (view) => select(tabs.find((t) => t.dataset.view === view) || tabs[0], false) };
}

// ---- change cards: crops, locator, hit-test, reveal (docs/design/ux-flows.md 12.6 and 12.8). Canvas 2D only, no cv.Mat. ----
/** Before/After crop of one change: the region plus a margin, with a dashed outline on the exact box. */
export function drawCrop(canvas, src, r, m) {
  const mg = Math.max(16, Math.round(0.25 * Math.max(r.width, r.height)));
  const sx = Math.max(0, r.x - mg), sy = Math.max(0, r.y - mg);
  const sw = Math.min(m.width, r.x + r.width + mg) - sx, sh = Math.min(m.height, r.y + r.height + mg) - sy;
  const k = Math.min(280 / sw, 180 / sh), dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = Math.max(1, Math.round(sw * k)), cssH = Math.max(1, Math.round(sh * k));
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  canvas.style.setProperty('width', cssW + 'px'); canvas.style.setProperty('height', cssH + 'px');
  const g = canvas.getContext('2d');
  g.drawImage(src, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const f = canvas.width / sw, bx = (r.x - sx) * f, by = (r.y - sy) * f, bw = r.width * f, bh = r.height * f;
  g.save(); g.setLineDash([6, 4]);
  g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeRect(bx, by, bw, bh);
  g.lineWidth = 2; g.strokeStyle = '#e9152d'; g.strokeRect(bx, by, bw, bh);
  g.restore();
}
/** 72 x 48 page outline with the change filled in (decorative; the text header carries the meaning). */
export function drawLocator(canvas, r, m) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#f2f2f4'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#8a8a90'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
  g.fillStyle = '#b3001b';
  g.fillRect(Math.round(r.x / m.width * W), Math.round(r.y / m.height * H), Math.max(3, Math.round(r.width / m.width * W)), Math.max(3, Math.round(r.height / m.height * H)));
}
/** Index of the box under the pointer (boxes grown by 6 CSS px; the smaller of two overlapping boxes wins), or -1. */
export function hitBox(canvas, m, e) {
  const rect = canvas.getBoundingClientRect(); if (!rect.width) return -1;
  const k = canvas.width / rect.width, x = (e.clientX - rect.left) * k, y = (e.clientY - rect.top) * k, pad = 6 * k;
  let best = -1, area = Infinity;
  m.regions.forEach((r, i) => {
    if (x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad && r.width * r.height < area) { area = r.width * r.height; best = i; }
  });
  return best;
}
/** Scroll the boxes view so box i is visible (no smooth scrolling anywhere). */
export function revealBox(m, i) {
  const canvas = $('canvas-boxes'), wrap = canvas.parentElement, r = m.regions[i];
  if (!r) return;
  const k = canvas.clientWidth / canvas.width;
  if (wrap.scrollHeight > wrap.clientHeight + 1) wrap.scrollTop = Math.max(0, (r.y + r.height / 2) * k - wrap.clientHeight / 2);
  if (wrap.scrollWidth > wrap.clientWidth + 1) wrap.scrollLeft = Math.max(0, (r.x + r.width / 2) * k - wrap.clientWidth / 2);
  wrap.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

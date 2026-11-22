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
    if (on) { g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4);
              g.lineWidth = 3; g.strokeStyle = '#e9152d'; g.strokeRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4); }
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
  $('canvas-boxes').setAttribute('aria-label', `After-change screenshot with ${n} changed region${n === 1 ? '' : 's'} outlined and numbered.`);
  $('canvas-heatmap').setAttribute('aria-label', `Heatmap of the differences: blue is no change, red is strong change. ${n} changed region${n === 1 ? '' : 's'}.`);
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

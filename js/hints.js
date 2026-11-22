// js/hints.js: advisory "Likely ..." hint per region (rule by Dex, docs/erp/change-catalogue.md section 4).
// First match wins; W and H in baseline px. Text comes from js/region-hints.json by id.
// Never assigned automatically: page-definition-field, peoplecode-visibility, style-branding,
// dynamic-content, configuration-values (not distinguishable from pixels alone).
let table = null;
export async function loadHints() {
  try { const r = await fetch('js/region-hints.json'); table = new Map((await r.json()).map((h) => [h.id, h])); }
  catch { table = new Map(); }
}

/** regions: [{x,y,width,height}] -> array of hint ids, same order. Pure function. */
export function classify(regions, changedPct) {
  if (changedPct > 30) return regions.map(() => 'whole-page');
  if (regions.length >= 20) return regions.map(() => 'capture-artifact');
  const size = (r) => [r.width ?? r.w, r.height ?? r.h];
  const centre = (r) => { const [w, h] = size(r); return [r.x + w / 2, r.y + h / 2]; };
  return regions.map((r, i) => {
    const [W, H] = size(r);
    if (H >= 100 && W >= 300) return 'reflow';
    if (H >= 100) return 'grid-layout';
    const [cx, cy] = centre(r);
    const moved = regions.some((o, j) => {
      if (j === i) return false;
      const [W2, H2] = size(o), [ox, oy] = centre(o);
      return Math.abs(W - W2) <= 1 && Math.abs(H - H2) <= 1 && Math.hypot(cx - ox, cy - oy) >= 10;
    });
    if (moved) return 'control-moved';
    if (H < 30) return 'label-text';
    return 'unclassified';
  });
}
export function hintFor(id) { return table && table.get(id) ? table.get(id) : null; }

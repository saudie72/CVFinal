// js/hints.js: "Likely ..." suggestions per region from js/region-hints.json (Dex, docs/erp/change-catalogue.md section 4).
// Hints, never verdicts. Rules 2 (grid) and the label-column test cannot be known from pixels alone, so
// they use geometry only: unverified heuristics, flagged in the report.
let table = null;
export async function loadHints() {
  try { const r = await fetch('js/region-hints.json'); table = new Map((await r.json()).map((h) => [h.id, h])); }
  catch { table = new Map(); }
}
const near = (a, b, t = 3) => Math.abs(a - b) <= t;

/** regions: [{x,y,width,height}], returns array of hint ids in the same order. */
export function classify(regions, changedPct, pageW) {
  if (changedPct > 30) return regions.map(() => 'whole-page');
  const areas = regions.map((r) => r.width * r.height).sort((a, b) => a - b);
  const median = areas.length ? areas[Math.floor(areas.length / 2)] : 0;
  return regions.map((r, i) => {
    const moved = regions.some((o, j) => j !== i && near(o.width, r.width) && near(o.height, r.height) && (Math.abs(o.x - r.x) > 8 || Math.abs(o.y - r.y) > 8));
    if (moved) return 'control-moved';
    if (r.width > 0.8 * pageW * 0.5 && r.height > 60) return 'grid-layout';           // unverified geometry guess
    if (r.height < 30 && r.x < pageW * 0.3) return 'label-text';
    const touches = regions.some((o, j) => j !== i && (near(o.y + o.height, r.y, 6) || near(o.x + o.width, r.x, 6) || near(r.y + r.height, o.y, 6)));
    if (regions.length > 1 && r.width * r.height > 4 * median && touches) return 'reflow';
    return 'unclassified';
  });
}
export function hintFor(id) { return table && table.get(id) ? table.get(id) : null; }

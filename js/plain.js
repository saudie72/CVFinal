// js/plain.js: turns box numbers into words (docs/design/ux-flows.md 12.6, Morgan 4b). Pure functions, no DOM.
import { copy } from './copy.js';

/** Where a box is, in words. W/H = page size; changedPct optional (> 30 means most of the page). */
export function position(r, W, H, changedPct = 0) {
  const w = r.width ?? r.w, h = r.height ?? r.h;
  if (changedPct > 30 || (w * h) / (W * H) >= 0.8) return copy.position.most;
  const col = Math.min(2, Math.floor(3 * (r.x + w / 2) / W)), row = Math.min(2, Math.floor(3 * (r.y + h / 2) / H));
  const rn = ['top', 'middle', 'bottom'][row], cn = ['left', 'centre', 'right'][col];
  if (w >= (2 / 3) * W) return copy.position.fullwidth(rn);
  return copy.position[`${rn}-${cn}`];
}
/** What a box looks like, first match wins (same thresholds as js/hints.js). */
export function shape(r) {
  const w = r.width ?? r.w, h = r.height ?? r.h;
  if (h >= 100 && w < 300) return copy.shape.tall;
  if (h >= 100) return copy.shape.large;
  if (h < 30) return copy.shape.thin;
  if (w >= 3 * h) return copy.shape.wide;
  return copy.shape.small;
}
export const areaName = (m) => copy.samples.area[m] || m || '';

// js/zones-ui.js: ignore zones, three equal ways to add one: drag on the baseline, from a region
// (openDialog with a prefill), or the numeric form (keyboard / screen reader).
// Zones belong to the page, are stored in baseline pixels via js/db.js, and apply to every later compare.
import { zones as zonesDb } from './db.js';
import { $, announce, openDialog, undoable, copy } from './ui.js';
import { drawZones } from './views.js';
import { position } from './plain.js';

const MIN_DRAG = 8;

export function initZones({ onChange = () => {}, canStore = () => true } = {}) {
  let page = null, img = null, list = [], memId = -1;   // img = {bitmap, width, height}
  let drag = null;

  const canvas = $('zone-canvas');
  const dlg = $('zone-dialog');
  const f = { label: $('zone-label'), x: $('zone-x'), y: $('zone-y'), w: $('zone-w'), h: $('zone-h') };

  const num = (el) => Number(el.value);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function coverage() {
    if (!img || !list.length) return 0;
    const { width: W, height: H } = img;
    const mask = new Uint8Array(W * H);
    for (const z of list) {
      for (let y = clamp(z.y, 0, H); y < clamp(z.y + z.h, 0, H); y++) mask.fill(1, y * W + clamp(z.x, 0, W), y * W + clamp(z.x + z.w, 0, W));
    }
    let n = 0; for (let i = 0; i < mask.length; i++) n += mask[i];
    return +(100 * n / (W * H)).toFixed(1);
  }

  function redraw(preview) {
    if (!img) return;
    if (canvas.width !== img.width) { canvas.width = img.width; canvas.height = img.height; }
    const g = canvas.getContext('2d');
    g.drawImage(img.bitmap, 0, 0);
    drawZones(g, list);
    if (preview) {
      g.save(); g.setLineDash([8, 4]); g.lineWidth = 3; g.strokeStyle = '#005fcc';
      g.strokeRect(preview.x, preview.y, preview.w, preview.h); g.restore();
    }
  }

  function renderList() {
    const ul = $('zone-list'), tpl = $('tpl-zone');
    ul.replaceChildren(...list.map((z) => {
      const li = tpl.content.firstElementChild.cloneNode(true);
      li.dataset.zoneId = z.id;
      li.querySelector('.zone-text').textContent = copy.zone.line(z.label, position(z, img.width, img.height));
      li.querySelector('.zone-remove').addEventListener('click', () => remove(z));
      return li;
    }));
    const pct = coverage();
    const sum = $('zone-summary');
    sum.replaceChildren();
    if (pct > 15) {
      sum.dataset.level = 'warn';
      const ic = document.createElement('span'); ic.className = 'icon'; ic.setAttribute('aria-hidden', 'true');
      sum.append(ic, document.createTextNode(copy.zone.large(list.length, pct)));
    } else { delete sum.dataset.level; sum.textContent = copy.zone.summary(list.length, pct); }
    redraw();
  }

  function remove(z) {
    list = list.filter((q) => q !== z);
    renderList(); onChange('remove', z);
    announce(`Zone '${z.label}' removed. Undo is available for 5 seconds.`);
    undoable(`Zone '${z.label}' removed.`,
      async () => { if (page && page.id != null && z.id > 0) await zonesDb.remove(z.id); },
      () => { list.push(z); list.sort((a, b) => a.id - b.id); renderList(); onChange('restore', z); });
  }

  async function add(z) {
    const rec = { pageId: page ? page.id : null, x: z.x, y: z.y, w: z.w, h: z.h, label: z.label };
    if (page && page.id != null && canStore()) {
      try { rec.id = await zonesDb.put(rec); } catch (e) { console.error(e); rec.id = memId--; }
    } else rec.id = memId--;
    list.push(rec);
    renderList(); onChange('add', rec);
    announce(copy.zone.added(rec.label, img ? position(rec, img.width, img.height) : 'on the page'));
    return rec;
  }

  // ---- dialog -----------------------------------------------------------------------------------
  function previewFromFields() {
    if (!img) return;
    const p = $('zone-preview');
    if (p.width !== img.width) { p.width = img.width; p.height = img.height; }
    const g = p.getContext('2d');
    g.drawImage(img.bitmap, 0, 0); drawZones(g, list);
    const r = { x: num(f.x) || 0, y: num(f.y) || 0, w: num(f.w) || 0, h: num(f.h) || 0 };
    g.save(); g.lineWidth = 4; g.strokeStyle = '#005fcc'; g.strokeRect(r.x, r.y, r.w, r.h); g.restore();
  }
  function validate() {
    const label = f.label.value.trim();
    const z = { label, x: Math.round(num(f.x)), y: Math.round(num(f.y)), w: Math.round(num(f.w)), h: Math.round(num(f.h)) };
    if (!label) return { err: copy.zone.labelRequired, field: f.label };
    if (![z.x, z.y, z.w, z.h].every(Number.isFinite) || z.w < 1 || z.h < 1) return { err: copy.zone.size, field: z.w < 1 || !Number.isFinite(z.w) ? f.w : f.h };
    if (z.x < 0 || z.y < 0 || z.x + z.w > img.width || z.y + z.h > img.height) return { err: copy.zone.outside(img.width, img.height), field: f.x };
    return { z };
  }

  /** prefill {x,y,w,h,label}; resolves with the added zone or null. */
  async function openDialog_(prefill = {}, opener) {
    if (!img) return null;
    f.label.value = prefill.label || '';
    f.x.value = prefill.x ?? 0; f.y.value = prefill.y ?? 0; f.w.value = prefill.w ?? 100; f.h.value = prefill.h ?? 24;
    f.x.max = img.width; f.y.max = img.height;
    $('zone-bounds').textContent = copy.zone.bounds(img.width, img.height);
    $('zone-error').hidden = true; $('zone-error').textContent = '';
    previewFromFields();
    const p = openDialog(dlg, opener);
    f.label.focus();
    const v = await p;
    if (v !== 'add') return null;
    const r = validate();
    return r.z ? add(r.z) : null;
  }

  $('zone-form').addEventListener('submit', (e) => {
    if (!e.submitter || e.submitter.value !== 'add') return;
    const r = validate();
    if (r.err) {
      e.preventDefault();
      const box = $('zone-error'); box.textContent = r.err; box.hidden = false;
      r.field.setAttribute('aria-invalid', 'true'); r.field.focus();
    }
  });
  Object.values(f).forEach((el) => el.addEventListener('input', () => { el.removeAttribute('aria-invalid'); previewFromFields(); }));

  // ---- pointer drawing --------------------------------------------------------------------------
  const toImg = (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = img.width / (canvas.clientWidth || rect.width), sy = img.height / (canvas.clientHeight || rect.height);
    return { x: clamp(Math.round((e.clientX - rect.left) * sx), 0, img.width), y: clamp(Math.round((e.clientY - rect.top) * sy), 0, img.height) };
  };
  const rectOf = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  const cancelDrag = () => { if (drag) { drag = null; window.removeEventListener('keydown', onKey); redraw(); } };
  const onKey = (e) => { if (e.key === 'Escape') cancelDrag(); };
  canvas.addEventListener('pointerdown', (e) => {
    if (!img || e.button > 0) return;
    drag = { start: toImg(e), pid: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    window.addEventListener('keydown', onKey);
  });
  canvas.addEventListener('pointermove', (e) => { if (drag) redraw(rectOf(drag.start, toImg(e))); });
  canvas.addEventListener('pointerup', async (e) => {
    if (!drag) return;
    const r = rectOf(drag.start, toImg(e));
    cancelDrag();
    if (r.w < MIN_DRAG || r.h < MIN_DRAG) return;
    await openDialog_(r, canvas);
  });
  canvas.addEventListener('pointercancel', cancelDrag);

  $('btn-add-zone').addEventListener('click', (e) => openDialog_({}, e.currentTarget));

  return {
    get zones() { return list; },
    coverage,
    /** Replace the shown page. pageObj {id}; image {bitmap,width,height}; zoneRecords from db. */
    load(pageObj, image, zoneRecords) {
      page = pageObj; img = image; list = (zoneRecords || []).slice();
      if (img) renderList(); else { list = []; $('zone-list').replaceChildren(); $('zone-summary').textContent = copy.zone.summary(0, 0); }
    },
    redraw: () => redraw(),
    add, open: openDialog_,
    /** Dialog prefilled from a region box, expanded by 4 px and clamped. */
    fromRegion(r, opener) {
      const x = clamp(r.x - 4, 0, img.width), y = clamp(r.y - 4, 0, img.height);
      const w = clamp(r.x + r.width + 4, 0, img.width) - x, h = clamp(r.y + r.height + 4, 0, img.height) - y;
      return openDialog_({ x, y, w, h }, opener);
    },
  };
}

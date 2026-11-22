// js/ui.js: small DOM helpers shared by the app modules (no state, no storage).
import { copy } from './copy.js';

export const $ = (id) => document.getElementById(id);

let announceTimer = null;
/** Polite announcement through #announcer (one sentence, never duplicated in the pill). */
export function announce(text) {
  const el = $('announcer');
  if (!el) return;
  el.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { el.textContent = text; }, 40);
}

/** Status pill: state loading|ready|working|error. step = 1..4 shows a determinate bar. */
export function setPill(state, text, step) {
  const pill = $('status-pill'), bar = $('status-progress');
  if (pill.dataset.state !== state) pill.dataset.state = state;
  if ($('status-text').textContent !== text) $('status-text').textContent = text;
  if (!bar) return;
  if (state === 'working' && step) { bar.max = 4; bar.value = step; bar.hidden = false; }
  else if (state === 'loading') { bar.removeAttribute('value'); bar.hidden = false; }
  else bar.hidden = true;
}

/** aria-disabled buttons stay focusable; clicks are ignored by the caller via isDisabled(). */
export function setDisabled(btn, disabled) {
  if (disabled) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
}
export const isDisabled = (btn) => btn.getAttribute('aria-disabled') === 'true';

/** Opens a modal <dialog>, resolves with its returnValue when it closes. Focus returns to the opener. */
export function openDialog(dlg, opener) {
  const from = opener || document.activeElement;
  return new Promise((resolve) => {
    const done = () => {
      dlg.removeEventListener('close', done);
      if (from && from.isConnected && typeof from.focus === 'function') from.focus();
      resolve(dlg.returnValue);
    };
    dlg.returnValue = '';
    dlg.addEventListener('close', done);
    dlg.showModal();
  });
}

/** Shared confirm dialog (#confirm-dialog). Resolves true when the destructive button is chosen. */
export async function confirmDialog({ title, body, ok }, opener) {
  $('confirm-title').textContent = title;
  $('confirm-body').textContent = body;
  $('confirm-ok').textContent = ok;
  const v = await openDialog($('confirm-dialog'), opener);
  return v === 'ok';
}

// ---- undo bar: remove now, commit after 5 s unless Undo is pressed -----------------------------
let pending = null;
export function undoable(text, commit, restore) {
  if (pending) flushUndo();
  const bar = $('undo-bar');
  $('undo-text').textContent = text;
  bar.hidden = false;
  const p = pending = { commit, restore, timer: setTimeout(() => flushUndo(), 5000) };
  $('btn-undo').onclick = () => {
    if (pending !== p) return;
    clearTimeout(p.timer); pending = null; bar.hidden = true;
    restore();
  };
}
export function flushUndo() {
  if (!pending) return;
  const p = pending; pending = null;
  clearTimeout(p.timer);
  $('undo-bar').hidden = true;
  Promise.resolve().then(p.commit).catch((e) => console.error('commit failed', e));
}

// ---- formatting ----------------------------------------------------------------------------------
export function fmtPct(p) {
  if (p == null) return '';
  if (p > 0 && p < 0.1) return 'under 0.1%';
  return (Math.round(p * 10) / 10) + '%';
}
export function fmtMs(ms) {
  if (ms == null) return '—';
  return ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(1) + ' s';
}
export function fmtDuration(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + (s % 60) + ' s';
}
export function fmtDate(t) {
  const d = new Date(t);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function alignmentText(al) {
  if (!al || al.method === 'none' || (!al.dx && !al.dy && (!al.scale || al.scale === 1))) return 'No alignment needed';
  const dx = Math.round(al.dx || 0), dy = Math.round(al.dy || 0);
  const scale = al.scale && Math.abs(al.scale - 1) > 0.005 ? `, scale ${(+al.scale).toFixed(2)}` : '';
  return `Aligned: shift (${dx}, ${dy})${scale}`;
}
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export { copy };

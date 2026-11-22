// js/report.js: evidence outputs. Layout per docs/erp/evidence-standard.md section 2.
// buildReport -> JSON that passes tools/validate_evidence.py; evidencePng; printReport; runsToCsv.
import { copy } from './copy.js';
import { fmtDate, fmtMs } from './ui.js';

const iso = (t) => (t == null ? null : new Date(t).toISOString());
const TOOL = 'ERP Visual Regression Inspector';

/** One run record (from db.runs) + its page -> the exportable report object. No images. */
export function buildReport(run, page) {
  const ev = run.evidence || {};
  const evidence = {};
  for (const k of ['testCaseId', 'ticketId', 'toolsVersion', 'tester']) evidence[k] = ev[k] || '';
  for (const k of ['businessUnit', 'role', 'environment', 'note', 'expectedDifference']) if (ev[k]) evidence[k] = ev[k];
  const so = run.signOff || {};
  const s = run.settings || {};
  return {
    tool: TOOL,
    pageName: page ? page.name : (run.pageName || ''),
    module: page ? page.module : (run.module || ''),
    status: run.status,
    changedPct: run.changedPct,
    ssim: run.ssim,
    alignment: run.alignment ? { method: run.alignment.method, dx: run.alignment.dx, dy: run.alignment.dy, scale: run.alignment.scale } : null,
    settings: { T: s.T, kernel: s.kernel, minArea: s.minArea, thresholdPct: s.thresholdPct },
    regions: (run.regions || []).map((r, i) => ({
      n: i + 1, x: r.x, y: r.y, w: r.width ?? r.w, h: r.height ?? r.h, decision: r.decision || null, note: r.note || '',
    })),
    ignoreZones: (run.ignoreZones || []).map((z) => ({ x: z.x, y: z.y, w: z.w, h: z.h, label: z.label })),
    ignoredPct: run.ignoredPct ?? null,
    evidence,
    note: run.note || '',
    signOff: { signedOff: !!so.signedOff, reviewer: so.reviewer || '', signedOffAt: iso(so.signedOffAt), baselinePromoted: !!so.baselinePromoted },
    createdAt: iso(run.createdAt),
    compareMs: run.ms ?? null,
    reviewMs: run.reviewMs ?? null,
    disclaimer: copy.disclaimer,
  };
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function runsToCsv(reports) {
  const head = ['date', 'page', 'module', 'status', 'regions', 'changedPct', 'ssim', 'testCaseId', 'ticketId', 'toolsVersion', 'tester', 'signedOff', 'reviewer', 'baselinePromoted'];
  const rows = reports.map((r) => [r.createdAt, r.pageName, r.module, r.status, r.regions.length, r.changedPct, r.ssim,
    r.evidence.testCaseId, r.evidence.ticketId, r.evidence.toolsVersion, r.evidence.tester, r.signOff.signedOff, r.signOff.reviewer, r.signOff.baselinePromoted]);
  return [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Evidence PNG: header bar (page, module, date, status, % changed, SSIM, test case ID) + the boxes view. */
export function evidencePng(m, meta) {
  const pad = 20, head = 130, W = Math.max(m.width, 900);
  const c = document.createElement('canvas');
  c.width = W; c.height = head + m.height;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#1d3557'; g.fillRect(0, 0, W, head);
  g.fillStyle = '#fff'; g.textBaseline = 'top';
  g.font = '700 26px system-ui, sans-serif';
  g.fillText(`${meta.pageName} (${meta.module})`, pad, 14);
  g.font = '600 20px system-ui, sans-serif';
  const regs = m.regions.length;
  g.fillText(`${m.status} — ${regs} ${regs === 1 ? 'change' : 'changes'} · ${m.changedPct}% of page · SSIM ${m.ssim}`, pad, 52);
  g.font = '16px system-ui, sans-serif';
  g.fillText(`${fmtDate(meta.date)} · Test case: ${meta.testCaseId || 'not saved yet'} · Ticket: ${meta.ticketId || '-'} · Tester: ${meta.tester || '-'}`, pad, 88);
  g.fillText(copy.disclaimer, pad, 108);
  g.drawImage(m.boxesFinal || m.boxes, 0, head, m.width, m.height);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

function el(tag, text, cls) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
function thumb(src, w, h, label) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.className = 'report-thumb';
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', label);
  c.getContext('2d').drawImage(src, 0, 0, w, h);
  return c;
}

/** Fills #print-report with the printable layout and opens the print dialog. */
export function printReport(m, rep) {
  const root = document.getElementById('print-report');
  root.replaceChildren();
  root.append(el('h1', `${rep.pageName} (${rep.module})`));
  root.append(el('p', `${rep.status} · ${fmtDate(rep.createdAt || Date.now())}`, 'report-status'));
  const ev = rep.evidence;
  const dl = el('dl', null, 'report-evidence');
  const add = (k, v) => { const d = el('div'); d.append(el('dt', k), el('dd', v || '-')); dl.append(d); };
  add('Test case ID', ev.testCaseId); add('Ticket / change ID', ev.ticketId); add('PeopleSoft version or update image', ev.toolsVersion);
  add('Business unit', ev.businessUnit); add('Role', ev.role); add('Environment', ev.environment); add('Tester', ev.tester);
  add('Reviewer', rep.signOff.reviewer);
  add('Sign-off', rep.signOff.signedOff ? `Signed off ${fmtDate(rep.signOff.signedOffAt)}` : 'Not signed off');
  root.append(dl);
  const th = el('div', null, 'report-thumbs');
  const w = 320, h = Math.round(320 * m.height / m.width);
  th.append(thumb(m.baseline, w, h, 'Before screenshot thumbnail'), thumb(m.candidate, w, h, 'After screenshot thumbnail'));
  root.append(th);
  const big = document.createElement('canvas'); big.width = m.width; big.height = m.height; big.className = 'report-boxes';
  big.setAttribute('role', 'img'); big.setAttribute('aria-label', 'Boxes view');
  big.getContext('2d').drawImage(m.boxesFinal || m.boxes, 0, 0);
  root.append(el('h2', 'Boxes view'), big);
  root.append(el('h2', 'Changes'));
  const t = el('table', null, 'report-table');
  t.innerHTML = '';
  const hr = t.createTHead().insertRow();
  ['#', 'Size (w × h)', 'Position (x, y)', 'Decision', 'Note'].forEach((x) => hr.append(el('th', x)));
  const body = t.createTBody();
  rep.regions.forEach((r) => {
    const row = body.insertRow();
    row.insertCell().textContent = r.n; row.insertCell().textContent = `${r.w} × ${r.h}`; row.insertCell().textContent = `${r.x}, ${r.y}`;
    row.insertCell().textContent = r.decision || 'NOT DECIDED (open)'; row.insertCell().textContent = r.note;
  });
  if (!rep.regions.length) body.insertRow().insertCell().textContent = 'No changes found.';
  root.append(t);
  root.append(el('h2', 'Ignore zones'));
  root.append(el('p', rep.ignoreZones.length
    ? `${rep.ignoreZones.map((z) => `${z.label} (${z.w}×${z.h} at ${z.x}, ${z.y})`).join('; ')} — ${rep.ignoredPct ?? 0}% of page ignored.` : 'None.'));
  const s = rep.settings, a = rep.alignment;
  root.append(el('h2', 'Settings'));
  root.append(el('p', `Threshold T ${s.T}, kernel ${s.kernel}, minimum area ${s.minArea}, fail above ${s.thresholdPct}% changed. Alignment: ${a ? `${a.method} (dx ${a.dx}, dy ${a.dy}, scale ${a.scale})` : 'none'}. Compared in ${fmtMs(rep.compareMs)}.`));
  root.append(el('p', `Sign-off: ${rep.signOff.signedOff ? rep.signOff.reviewer : 'none'}; baseline promoted: ${rep.signOff.baselinePromoted ? 'yes' : 'no'}.`));
  root.append(el('p', copy.disclaimer, 'disclaimer'));
  if (rep.evidence.role) root.append(el('p', copy.roleNote, 'disclaimer'));
  if (rep.ignoreZones.length) root.append(el('p', copy.zonesDisclaimer, 'disclaimer'));
  window.print();
}

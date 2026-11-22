// js/app.js: routing, state, and wiring of db.js, worker-client.js, views, zones, report.
// Plain ES module, no framework. Spec: docs/design/ux-flows.md (state table section 6, rules 3a).
import { openDB, pages as pagesDb, zones as zonesDb, runs as runsDb, settings as settingsDb, storageEstimate, resetAppData } from './db.js';
import { createInspector, TIMEOUT_MESSAGE } from './worker-client.js';
import { copy } from './copy.js';
import { $, announce, setPill, setDisabled, isDisabled, openDialog, confirmDialog, undoable, flushUndo,
         fmtPct, fmtMs, fmtDuration, fmtDate, alignmentText, plural, download } from './ui.js';
import { renderViews, redrawBoxes, initTabs, setOverlay, drawCrop, drawLocator, hitBox, revealBox } from './views.js';
import { initZones } from './zones-ui.js';
import { buildReport, runsToCsv, evidencePng, printReport } from './report.js';
import { classify } from './hints.js';
import { position, shape, areaName } from './plain.js';

const DEFAULTS = { T: 25, minArea: 64, kernel: 5, thresholdPct: 0.1, alignment: 'auto' };
const ROUTES = ['library', 'compare', 'result', 'history', 'settings'];
const S = {
  screen: 'library', dbOK: true, engineReady: false, everReady: false, engineSeen: false, onboardingSeen: false, hasRuns: false, tour: null,
  working: false, cancelled: false, error: null,
  pages: [], page: null, base: null, cand: null, candUrl: null,
  result: null, runId: null, signOff: { signedOff: false, reviewer: '', signedOffAt: null, baselinePromoted: false },
  selected: -1, hover: -1, looked: new Set(), lastStep: null,
  evidence: null, runNote: '', reviewStart: 0, reviewMs: null, zoneAdded: null,
  settings: { ...DEFAULTS }, samples: [], thumbUrls: [], notice: 'none', historyPage: null, runsCache: [],
};
let insp = null, zonesUI = null, tabs = null;

// ============================== helpers ==============================
const pageThreshold = () => (S.page && S.page.thresholdPct != null ? S.page.thresholdPct : S.settings.thresholdPct);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class UserError extends Error {}
const closeBmp = (x) => { try { x && x.bitmap && x.bitmap.close(); } catch { /* already closed */ } };

async function decode(blob) {
  try {
    const bitmap = await createImageBitmap(blob);
    return { blob, bitmap, width: bitmap.width, height: bitmap.height };
  } catch { throw new UserError(copy.errors.undecodable); }
}
function checkPng(file) {
  const ok = file && (file.type === 'image/png' || /\.png$/i.test(file.name || ''));
  if (!ok) throw new UserError(copy.errors.notPng);
}
function imageData(bitmap) {
  const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bitmap, 0, 0);
  return g.getImageData(0, 0, c.width, c.height);
}
function rgbaToCanvas(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const d = img.data;
  const clamped = d instanceof Uint8ClampedArray ? d : new Uint8ClampedArray(d.buffer, d.byteOffset, d.length);
  c.getContext('2d').putImageData(new ImageData(clamped, img.width, img.height), 0, 0);
  return c;
}
const toBlob = (canvas) => new Promise((res) => canvas.toBlob(res, 'image/png'));
async function guard(fn) { try { await fn(); } catch (e) { console.error(e); showNotice('storage-quota', e && e.name === 'QuotaExceededError' ? copy.notice.quota : String((e && e.message) || e)); } }

// ============================== state -> DOM ==============================
function syncMain() {
  const main = $('main');
  let st;
  if (S.error) st = S.error.kind;
  else if (S.working) st = 'working';
  else if (S.screen === 'result' && S.result) st = S.result.status === 'PASS' ? 'result-pass' : 'result-fail';
  else if (!S.engineReady) st = 'loading-opencv';
  else st = (S.screen === 'library' && S.pages.length === 0) ? 'ready-empty' : 'ready';
  main.dataset.state = st; main.dataset.screen = S.screen;
  updateCompareControls();
  updateSampleButton();
}
function updateSampleButton() {
  setDisabled($('btn-load-sample'), !heroSample());
}
function pillReady() { setPill('ready', copy.pill.ready); }
function pillLoading() { setPill('loading', S.engineSeen ? copy.pill.loadingSeen : copy.pill.loading); }

function onEngineStatus(s) {
  if (s.state === 'loading') { S.engineReady = false; if (!S.working) pillLoading(); }
  else if (s.state === 'ready') {
    S.engineReady = true; S.everReady = true;
    if (!S.working) pillReady();
    if (!S.engineSeen) { S.engineSeen = true; if (S.dbOK) settingsDb.set('engineSeen', true).catch(() => {}); }
  } else if (s.state === 'error') {
    if (!S.everReady) { S.engineReady = false; setPill('error', copy.pill.error); showError('error-opencv'); }
  }
  syncMain();
}

function showError(kind, message, retry) {
  S.error = { kind, message, retry };
  const p = copy.states[kind];
  $('error-panel').dataset.kind = kind;
  $('error-title').textContent = p.title;
  $('error-body').textContent = typeof p.body === 'function' ? p.body(message) : (message && kind !== 'error-opencv' ? message : p.body);
  if (kind === 'error-compare' && message && retry === 'raw') $('error-body').textContent = message;
  $('error-primary').textContent = p.primary;
  $('error-panel').hidden = false;
  syncMain();
  if (kind !== 'error-opencv' || true) $('error-title').focus();
}
function clearError() {
  if (!S.error) return;
  S.error = null; $('error-panel').hidden = true; syncMain();
}

function showNotice(state, text, actions = []) {
  const n = $('notice');
  S.notice = state;
  n.dataset.state = state; n.hidden = state === 'none';
  $('notice-text').textContent = text || '';
  const [a1, a2] = [$('notice-action'), $('notice-action2')];
  [a1, a2].forEach((b, i) => { const a = actions[i]; b.hidden = !a; if (a) { b.textContent = a.label; b.onclick = a.run; } });
  updateStorageGates();
}
function updateStorageGates() {
  setDisabled($('btn-new-page'), !S.dbOK);
  if (S.result) updateActions();
}

// ============================== routing ==============================
function currentRoute() {
  const r = (location.hash || '').replace(/^#\/?/, '');
  return ROUTES.includes(r) ? r : 'library';
}
let firstRoute = true;
async function route() {
  let r = currentRoute();
  if (r === 'result' && !S.result) r = S.page ? 'compare' : 'library';
  if (r === 'compare' && !S.page) r = 'library';
  if (location.hash !== '#/' + r) history.replaceState(null, '', '#/' + r);
  if (S.error && S.error.kind !== 'error-opencv') clearError();
  S.screen = r;
  if (S.tour && r !== 'compare' && r !== 'result') endTour('skip');
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = tourHides() || s.dataset.screen !== r; });
  document.querySelectorAll('.app-nav a[data-route]').forEach((a) => {
    const on = a.dataset.route === (r === 'result' ? 'compare' : r);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = `${copy.screens[r]} - ${copy.title}`;
  updateNav();
  syncMain();
  if (r === 'library') await renderLibrary();
  else if (r === 'compare') renderCompare();
  else if (r === 'history') await renderHistory();
  else if (r === 'settings') await renderSettings();
  if (!firstRoute && !S.tour) {
    const target = r === 'result' ? $('result-status') : $('screen-' + r).querySelector('h1');
    if (target) target.focus();
  }
  firstRoute = false;
}
function updateNav() {
  const set = (k, show) => { const li = document.querySelector(`.app-nav li[data-nav="${k}"]`); if (li) li.hidden = !show; };
  set('compare', S.pages.length > 0 || !!S.page); set('history', S.hasRuns || S.screen === 'history');
}
const go = (r) => { if (location.hash === '#/' + r) route(); else location.hash = '#/' + r; };

// ============================== library ==============================
async function refreshPages() {
  if (!S.dbOK) { S.pages = []; return; }
  try { S.pages = (await pagesDb.list()).sort((a, b) => a.name.localeCompare(b.name)); }
  catch (e) { console.error(e); S.pages = []; }
  if (!S.hasRuns) {
    try { for (const p of S.pages) { if ((await runsDb.forPage(p.id)).length) { S.hasRuns = true; break; } } } catch { /* nav only */ }
  }
  updateNav();
}
async function renderLibrary() {
  await refreshPages();
  S.thumbUrls.forEach((u) => URL.revokeObjectURL(u)); S.thumbUrls = [];
  const has = S.pages.length > 0;
  $('h-library').textContent = has ? copy.screens.library : copy.landing.h1;
  $('library-purpose').textContent = copy.purpose.pages; $('library-purpose').hidden = !has;
  $('library-empty').hidden = has;
  $('your-pages').hidden = !has;
  $('btn-new-page').textContent = has ? copy.landing.secondaryWithPages : copy.landing.secondary;
  $('tour-again').hidden = !(has && !S.onboardingSeen && !S.tour && heroSample());
  $('tour-again').querySelector('p').textContent = copy.landing.tourAgain;
  $('intro-title').textContent = copy.intro.title; $('intro-body').textContent = copy.intro.body;
  $('intro-positioning').textContent = copy.intro.positioning; $('intro-more').textContent = copy.intro.more;
  const ul = $('page-list'), tpl = $('tpl-page');
  ul.replaceChildren(...S.pages.map((p, idx) => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.dataset.pageId = p.id;
    const img = li.querySelector('.card-thumb');
    const url = URL.createObjectURL(p.baseline); S.thumbUrls.push(url);
    img.src = url; img.alt = `Before screenshot of ${p.name}`;
    li.querySelector('.card-title').textContent = p.name;
    li.querySelector('.card-meta').textContent = `${areaName(p.module)} · Before screenshot added ${fmtDate(p.createdAt)}`;
    const open = li.querySelector('.page-open');
    if (idx > 0) open.classList.remove('btn-primary');
    open.addEventListener('click', () => openPage(p).then(() => go('compare')));
    li.querySelector('.page-history').addEventListener('click', () => { S.historyPage = p.id; go('history'); });
    li.querySelector('.page-delete').addEventListener('click', (e) => deletePage(p, e.currentTarget));
    return li;
  }));
  renderExamples();
  syncMain();
}
async function deletePage(p, opener) {
  const c = copy.confirm.del;
  if (!(await confirmDialog({ title: c.title(p.name), body: c.body, ok: c.ok }, opener))) return;
  await guard(async () => {
    await pagesDb.remove(p.id);
    if (S.page && S.page.id === p.id) clearWork(true);
    announce(`${p.name} deleted.`);
    await renderLibrary();
  });
}
function clearWork(clearPage) {
  S.result = null; S.runId = null; S.zoneAdded = null; setCandidateNone();
  if (clearPage) { S.page = null; S.base = null; zonesUI.load(null, null, []); }
}

async function openPage(page, cand = null) {
  const base = await decode(page.baseline);
  if (S.base) closeBmp(S.base);
  S.page = page; S.base = base; S.result = null; S.runId = null; S.zoneAdded = null;
  let zs = [];
  if (S.dbOK && page.id != null) { try { zs = await zonesDb.forPage(page.id); } catch (e) { console.error(e); } }
  zonesUI.load(page, base, zs);
  if (cand) await applyCandidate(cand); else setCandidateNone();
  fillSettingsForm();
}

// New page form
let newPageFile = null;
function showNewPageForm(show) {
  $('new-page-form').hidden = !show;
  if (show) { $('new-page-form').dataset.state = 'idle'; $('page-name-error').hidden = true; $('btn-open-existing').hidden = true; $('page-name').focus(); }
  else { newPageFile = null; $('new-page-form').reset(); }
}
function pageNameError(text, duplicate) {
  const e = $('page-name-error');
  e.textContent = text; e.hidden = !text;
  $('page-name').setAttribute('aria-invalid', text ? 'true' : 'false');
  $('new-page-form').dataset.state = duplicate ? 'duplicate-page-name' : 'idle';
  $('btn-open-existing').hidden = !duplicate;
  if (text) $('page-name').focus();
}
async function createPage(e) {
  e.preventDefault();
  const name = $('page-name').value.trim();
  if (!name) return pageNameError('Enter a page name.', false);
  const dupe = S.pages.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (dupe) { S.dupePage = dupe; return pageNameError(copy.duplicate(name), true); }
  if (!newPageFile) return pageNameError('Choose a Before screenshot (PNG) first.', false);
  try {
    checkPng(newPageFile);
    const base = await decode(newPageFile);
    const rec = { name, module: $('page-module').value, notes: '', baseline: newPageFile, width: base.width, height: base.height, thresholdPct: S.settings.thresholdPct };
    rec.id = await pagesDb.put(rec);
    showNewPageForm(false);
    S.tip = true;
    await openPage(rec);
    announce(`Page ${name} created.`);
    go('compare');
  } catch (err) {
    if (err && err.name === 'ConstraintError') { S.dupePage = null; await refreshPages(); S.dupePage = S.pages.find((p) => p.name.toLowerCase() === name.toLowerCase()); return pageNameError(copy.duplicate(name), true); }
    if (err instanceof UserError) return pageNameError(err.message, false);
    if (err && err.name === 'QuotaExceededError') return showNotice('storage-quota', copy.notice.quota);
    console.error(err); pageNameError(String(err.message || err), false);
  }
}

// ============================== samples ==============================
const sampleName = (s) => s.title || `${s.module} – ${s.page}`;
const sortedSamples = () => S.samples.map((x, i) => ({ x, i })).sort((a, b) => (a.x.order ?? a.i) - (b.x.order ?? b.i)).map((o) => o.x);
const heroSample = () => { const l = sortedSamples(); return l.find((x) => x.group === copy.samples.groupOrder[0]) || l[0] || null; };
async function loadManifest() {
  try {
    const r = await fetch('samples/manifest.json');
    if (!r.ok) throw new Error('manifest ' + r.status);
    S.samples = await r.json();
  } catch (e) { console.error(e); S.samples = []; }
  syncMain();
}
function fillSampleCard(el, s) {
  el.querySelector('.sample-title').textContent = sampleName(s);
  el.querySelector('.sample-area').textContent = areaName(s.module);
  el.querySelector('.sample-story').textContent = s.story || '';
  const ex = el.querySelector('.sample-expect'); ex.replaceChildren();
  const t = s.whatToExpect || '';
  if (t) {
    const b = document.createElement('strong'); b.textContent = copy.samples.expectLead;
    ex.append(b, document.createTextNode(' ' + t.replace(/^Expect:\s*/i, '')));
  }
}
function renderExamples() {
  const list = sortedSamples(), order = copy.samples.groupOrder;
  const hero = heroSample(), has = S.pages.length > 0;
  const heroEl = $('sample-hero');
  heroEl.hidden = !hero || has;
  if (hero) fillSampleCard(heroEl, hero);
  const err = $('examples-error');
  err.hidden = list.length > 0; err.textContent = list.length ? '' : copy.samples.loadError;
  const mk = (s) => {
    const el = $('tpl-sample').content.firstElementChild.cloneNode(true);
    fillSampleCard(el, s);
    const btn = el.querySelector('.sample-open'); btn.dataset.sampleId = s.page;
    btn.addEventListener('click', () => loadSample(s, { btn }));
    if (S.pages.some((p) => p.name.toLowerCase() === sampleName(s).toLowerCase())) {
      const tag = document.createElement('span'); tag.className = 'sample-tag'; tag.textContent = copy.samples.inLibrary;
      el.querySelector('.sample-area').after(tag);
    }
    return el;
  };
  const group = (g, items) => {
    const sec = document.createElement('div'); sec.className = 'sample-group';
    const h = document.createElement('h3'); h.textContent = g;
    const grid = document.createElement('div'); grid.className = 'sample-grid'; grid.append(...items.map(mk));
    sec.append(h, grid); return sec;
  };
  const fill = (box, groups) => { box.querySelectorAll('.sample-group').forEach((e) => e.remove()); box.append(...groups); };
  const grp = (g) => list.filter((x) => x.group === g);
  const more = grp(order[1]), tricky = grp(order[2]);
  const dm = $('examples-more'), dt = $('examples-tricky'), da = $('examples');
  dm.hidden = has || !more.length; dt.hidden = has || !tricky.length; da.hidden = !has || !list.length;
  dm.querySelector('summary').textContent = copy.samples.moreSummary(more.length);
  dt.querySelector('summary').textContent = copy.samples.trickySummary(tricky.length);
  fill(dm, [group(order[1], more)]); fill(dt, [group(order[2], tricky)]);
  da.querySelector('summary').textContent = copy.samples.tryExample;
  fill(da, order.map((g) => [g, grp(g)]).filter(([, it]) => it.length).map(([g, it]) => group(g, it)));
}
async function fetchBlob(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${url}`);
  return r.blob();
}
async function loadSample(s, { tour = false, btn = null } = {}) {
  btn = btn || $('btn-load-sample');
  if (!s || isDisabled(btn) || btn.getAttribute('aria-busy') === 'true' || S.opening) return;
  S.opening = true;
  btn.setAttribute('aria-busy', 'true');
  announce(copy.samples.opening(sampleName(s)));
  try {
    clearError();
    const [before, after] = await Promise.all([fetchBlob(s.before), fetchBlob(s.after)]);
    const name = sampleName(s);
    await refreshPages();
    let page = S.pages.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!page) {
      const base = await decode(before);
      page = { name, module: s.module, notes: 'Sample (fictional)', baseline: before, width: base.width, height: base.height, thresholdPct: S.settings.thresholdPct };
      if (S.dbOK) {
        try { page.id = await pagesDb.put(page); }
        catch (e) {
          if (!e || e.name !== 'QuotaExceededError') throw e;           // surfaces as error-compare, never swallowed
          page.id = null; showNotice('storage-quota', copy.notice.quota);   // compare in memory; saving is refused
        }
      } else page.id = null;
      S.tip = !tour;
    }
    await openPage(page, after);
    S.opening = false;
    if (tour) startTour();
    go('compare');
    await doCompare();               // queues until the engine is ready
  } catch (e) {
    console.error(e);
    showError('error-compare', e instanceof UserError ? e.message : `${e.message || e}`, 'raw');
  } finally { S.opening = false; btn.removeAttribute('aria-busy'); }
}
function suggestedZones() {
  if (!S.page) return [];
  const s = S.samples.find((x) => sampleName(x).toLowerCase() === S.page.name.toLowerCase());
  if (!s || !s.ignoreZones) return [];
  return s.ignoreZones.filter((z) => !zonesUI.zones.some((q) => q.x === z.x && q.y === z.y && q.w === z.w && q.h === z.h));
}

// ============================== compare screen ==============================
function setCandidateNone() {
  closeBmp(S.cand); S.cand = null;
  if (S.candUrl) { URL.revokeObjectURL(S.candUrl); S.candUrl = null; }
  $('candidate-thumb').hidden = true; $('candidate-thumb').removeAttribute('src');
}
async function applyCandidate(blob, announceIt) {
  checkPng(blob);
  const c = await decode(blob);
  if (S.candUrl) URL.revokeObjectURL(S.candUrl);
  closeBmp(S.cand);
  S.result = null; S.runId = null; S.zoneAdded = null;     // a new screenshot invalidates the old result
  S.cand = c; S.candUrl = URL.createObjectURL(blob);
  const t = $('candidate-thumb'); t.src = S.candUrl; t.hidden = false;
  if (announceIt) announce(`After screenshot added.`);
  updateCompareControls();
}
async function setCandidateFromFile(file) {
  try { clearError(); await applyCandidate(file, true); }
  catch (e) { if (e instanceof UserError) showError('error-compare', e.message, 'raw'); else console.error(e); }
}
function renderCompare() {
  $('compare-page-name').textContent = S.page ? `${S.page.name} · ${areaName(S.page.module)}` : '';
  $('zones-details').open = zonesUI.zones.length > 0 || $('zones-details').open;
  $('capture-tip').hidden = !S.tip;
  zonesUI.redraw();
  updateCompareControls();
}
function updateCompareControls() {
  const btn = $('btn-compare'), hint = $('compare-hint');
  let why = '';
  if (S.working) why = '';
  else if (!S.engineReady) why = copy.states['loading-opencv'].hint;
  else if (!S.cand) why = copy.states.candidateNone;
  else why = copy.states.candidateReady;
  const blocked = !S.working && (!S.engineReady || !S.cand || !S.page);
  hint.textContent = S.working ? '' : why;
  setDisabled(btn, blocked);
  btn.hidden = S.working; $('btn-cancel').hidden = !S.working;
  for (const id of ['baseline-panel', 'candidate-panel', 'advanced']) { const e = $(id); if (e) e.inert = S.working; }
  $('compare-panel').setAttribute('aria-busy', String(S.working));
}

const STEP_IDX = { Received: 1, load: 1, align: 2, diff: 2, mask: 2, threshold: 3, regions: 3, ssim: 4, images: 4, Packing: 4 };
function compareSettingsForRun() {
  return { T: S.settings.T, minArea: S.settings.minArea, kernel: S.settings.kernel, thresholdPct: pageThreshold(), align: S.settings.alignment !== 'off' };
}
async function doCompare() {
  if (S.working) return;
  if (!S.page || !S.base) return showError('error-compare', copy.errors.noBaseline, 'raw');
  if (!S.cand) return;
  clearError();
  S.working = true; S.cancelled = false; flushUndo();
  if (S.screen !== 'compare') go('compare');
  syncMain();
  let idx = 1;
  if (S.engineReady) setPill('working', copy.pill.comparing(copy.pill.steps[0], 1), 1);
  else { pillLoading(); $('btn-load-sample').setAttribute('aria-busy', 'true'); }
  try {
    await insp.ready;
    setPill('working', copy.pill.comparing(copy.pill.steps[0], 1), 1);
    const zs = zonesUI.zones.map(({ x, y, w, h, label }) => ({ x, y, w, h, label }));
    const res = await insp.compare(imageData(S.base.bitmap), imageData(S.cand.bitmap), zs, compareSettingsForRun(), {
      onProgress: (step) => {
        const i = STEP_IDX[step]; if (i && i > idx) idx = i;
        setPill('working', copy.pill.comparing(copy.pill.steps[idx - 1], idx), idx);
      },
    });
    S.working = false;
    await showResult(res, zs);
  } catch (e) {
    S.working = false; pillReady();
    const msg = String((e && e.message) || e);
    if (S.cancelled) { S.cancelled = false; announce('Comparison cancelled. Your screenshots are still here.'); syncMain(); $('btn-compare').focus(); return; }
    if (S.tour) { S.tour.error = true; renderTour(); }
    else if (msg === TIMEOUT_MESSAGE) showError('error-timeout');
    else if (e instanceof RangeError || /\bMP\b|megapixel/i.test(msg)) showError('error-compare', copy.errors.tooLarge, 'raw');
    else if (/Size mismatch/i.test(msg)) showError('error-compare', copy.errors.sizes(`${S.base.width}×${S.base.height}`, `${S.cand.width}×${S.cand.height}`), 'raw');
    else if (/align/i.test(msg)) showError('error-compare', copy.errors.alignment, 'raw');
    else showError('error-compare', msg);
    if (!S.engineReady) pillLoading();
  } finally {
    $('btn-load-sample').removeAttribute('aria-busy');
    syncMain();
  }
}
function cancelCompare() {
  if (!S.working) return;
  S.cancelled = true;
  insp.restart();
}

// ============================== result ==============================
async function showResult(res, zs) {
  const w = S.base.width, h = S.base.height;
  const hints = classify(res.regions, res.changedPct);
  const m = {
    width: res.size ? res.size.width : w, height: res.size ? res.size.height : h,
    baseline: S.base.bitmap, candidate: S.cand.bitmap,
    boxes: rgbaToCanvas(res.images.boxes), heatmap: res.images.heatmap ? rgbaToCanvas(res.images.heatmap) : null,
    regions: res.regions.map((r, i) => ({ ...r, id: i + 1, decision: null, note: '', hintId: hints[i] })),
    zones: zs, status: res.status, changedPct: res.changedPct, ssim: res.ssim, alignment: res.alignment,
    settings: res.settings, ms: res.ms, ignoredPct: res.ignoredPct ?? zonesUI.coverage(),
  };
  S.result = m; S.runId = null; S.evidence = null; S.runNote = ''; S.reviewMs = null; S.zoneAdded = null;
  S.signOff = { signedOff: false, reviewer: '', signedOffAt: null, baselinePromoted: false };
  S.reviewStart = Date.now();
  renderResultAll();
  pillReady();
  if (S.tour) tourResultReady(); else go('result');
  if (!S.tour) announce(m.status === 'PASS' ? copy.result.announcePass : copy.result.announceFail(m.regions.length, Math.round(m.changedPct * 10) / 10));
}

function renderResultAll() {
  const m = S.result;
  m.regions.forEach((r) => { r.pos = position(r, m.width, m.height, m.changedPct); r.shp = shape(r); });
  S.selected = -1; S.hover = -1; S.lastStep = null;
  S.looked = new Set(m.regions.map((r, i) => (r.decision ? i : -1)).filter((i) => i >= 0));
  $('btn-back-to-card').hidden = true;
  renderViews(m, -1);
  m.boxesFinal = $('canvas-boxes');
  tabs.select('boxes');
  setOverlay($('overlay-slider').value);
  renderStats();
  renderRegionList();
  updateActions();
}
function alignInfo(al) {
  const t = copy.stats.alignment;
  const dx = Math.round((al && al.dx) || 0), dy = Math.round((al && al.dy) || 0);
  const scaled = !!(al && al.scale && Math.abs(al.scale - 1) > 0.005);
  if (!al || al.method === 'none' || (!dx && !dy && !scaled)) return { value: t.none, note: t.noteNone };
  return { value: t.lined, note: t.noteShift(dx, dy, scaled) };
}
function renderStats() {
  const m = S.result, n = m.regions.length, st = copy.stats;
  $('result-text').textContent = m.status === 'PASS' ? copy.result.statusPass : copy.result.statusFail(n, fmtPct(m.changedPct));
  $('result-explain').textContent = m.status === 'PASS' ? copy.result.explainPass : copy.result.explainFail;
  $('stat-changed').textContent = `${fmtPct(m.changedPct)} of the page`;
  $('note-changed').textContent = st.changed.note(`${pageThreshold()}%`);
  $('stat-ssim').textContent = st.ssim.value(m.ssim); $('note-ssim').textContent = st.ssim.note;
  const al = alignInfo(m.alignment);
  $('stat-alignment').textContent = al.value; $('note-alignment').textContent = al.note;
  $('stat-ignored').textContent = m.zones.length ? `${plural(m.zones.length, 'zone', 'zones')} (${m.ignoredPct}% of page)` : st.ignored.none;
  $('note-ignored').textContent = st.ignored.note;
  $('stat-ms').textContent = fmtMs(m.ms);
  $('stat-review').textContent = S.reviewMs != null ? fmtDuration(S.reviewMs) : '—';
  $('zones-disclaimer').hidden = m.zones.length === 0;
  $('regions').hidden = n === 0;
  $('btn-back-to-card').hidden = true;
}
function fillStatsHelp() {
  const dl = $('stats-help-list');
  dl.replaceChildren(...copy.stats.help.flatMap(([k, v]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; return [dt, dd]; }));
}
const regionLabel = (r, i, n) => copy.card.aria(i + 1, n, r.pos, r.shp, r.decision);
let cropObserver = null;
function renderRegionList() {
  const m = S.result, n = m.regions.length, tpl = $('tpl-region');
  if (cropObserver) cropObserver.disconnect();
  const draw = (li) => {
    if (li._drawn) return; li._drawn = true;
    const r = li._r;
    drawCrop(li.querySelector('.crop-before'), m.baseline, r, m);
    drawCrop(li.querySelector('.crop-after'), m.candidate, r, m);
    drawLocator(li.querySelector('.region-locator'), r, m);
  };
  cropObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { draw(e.target); cropObserver.unobserve(e.target); } }), { rootMargin: '200px' }) : null;
  const items = m.regions.map((r, i) => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li._r = r;
    li.dataset.region = String(i + 1); li.dataset.decision = r.decision || 'unreviewed';
    li.setAttribute('aria-label', regionLabel(r, i, n));
    li.querySelector('.region-badge').textContent = i + 1;
    const title = li.querySelector('.region-title'); title.id = `region-${i + 1}-title`;
    title.textContent = copy.card.title(i + 1, n, r.pos, r.shp);
    li.querySelector('.region-decided').textContent = r.decision ? copy.card.decided(r.decision) : '';
    const show = li.querySelector('.region-show'); show.textContent = copy.card.show;
    show.setAttribute('aria-label', `${copy.card.show}, change ${i + 1}`);
    li.querySelector('.region-locate').textContent = copy.locate(i + 1);
    for (const [cls, which] of [['crop-before', copy.card.before], ['crop-after', copy.card.after]]) {
      const c = li.querySelector('.' + cls); c.id = `${cls.replace('crop-', 'crop-')}-${i + 1}`;
      c.setAttribute('aria-label', copy.card.cropAria(which, i + 1, n, r.pos, r.shp));
    }
    li.querySelector('.region-locator').id = `locator-${i + 1}`;
    const cz = copy.cause[r.hintId] || copy.cause.unclassified;
    li.querySelector('.cause-lead').textContent = copy.cause.lead; li.querySelector('.cause-what').textContent = cz[0];
    li.querySelector('.cause-check').textContent = copy.cause.check; li.querySelector('.cause-do').textContent = cz[1];
    li.querySelector('.cause-guess').textContent = copy.cause.guess;
    li.querySelector('.credit a').textContent = copy.card.causeCredit;
    li.querySelector('legend').textContent = copy.decision.legend(i + 1);
    li.querySelector('.decision-intro').textContent = copy.decision.intro;
    const noiseTip = li.querySelector('.region-noise-tip'); noiseTip.textContent = copy.decision.noiseTip;
    li.querySelector('.region-rule').textContent = copy.decision.rule;
    const note = li.querySelector('.region-note');
    const setPh = () => { note.placeholder = r.decision === 'Regression' ? copy.decision.notePhRegression : copy.decision.notePh; noiseTip.hidden = r.decision !== 'Noise'; };
    li.querySelectorAll('input[type=radio]').forEach((rad) => {
      rad.name = `decision-${i + 1}`; rad.checked = r.decision === rad.value;          // none pre-selected (D15)
      rad.closest('label').querySelector('.choice-desc').textContent = copy.decision[rad.value];
      rad.addEventListener('change', () => { setDecision(i, rad.value); setPh(); });
    });
    note.value = r.note || ''; setPh();
    note.addEventListener('change', () => { if (S.signOff.baselinePromoted) { note.value = r.note || ''; return; } r.note = note.value; persistRegions(false); });
    const zbtn = li.querySelector('.region-zone'); zbtn.textContent = copy.card.zoneBtn;
    zbtn.addEventListener('click', (e) => zonesUI.fromRegion(r, e.currentTarget));
    li.querySelector('.region-zone-hint').textContent = copy.decision.zoneHelp;
    li.querySelector('summary').textContent = copy.detailsSummary;
    li.querySelector('.region-details-line').textContent = copy.detailsLine(r.width, r.height, r.x, r.y, m.width, m.height);
    // two-way link with the screenshot (12.8)
    show.addEventListener('click', () => {
      selectRegion(i, { announceIt: false });
      tabs.select('boxes'); announce(copy.card.showAnnounce(i + 1));
      revealBox(m, i);
      const back = $('btn-back-to-card'); back.textContent = copy.result.backToCard(i + 1); back.dataset.region = String(i + 1); back.hidden = false;
    });
    li.addEventListener('click', () => { if (S.selected !== i) selectRegion(i, { announceIt: true }); });
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === li) selectRegion(i, { announceIt: true }); });
    const on = () => setHover(i), off = () => setHover(-1);
    li.addEventListener('focusin', () => { setHover(i); markLooked(i); });
    li.addEventListener('focusout', (e) => { if (!li.contains(e.relatedTarget)) off(); });
    li.addEventListener('mouseenter', on); li.addEventListener('mouseleave', off);
    if (cropObserver) cropObserver.observe(li);
    return li;
  });
  $('region-list').replaceChildren(...items);
  if (!cropObserver) items.forEach(draw);
  $('regions-lede').textContent = copy.result.regionsLede;
  updateProgress();
}
function markLooked(i) { if (!S.looked.has(i)) { S.looked.add(i); if (S.result) updateActions(); } }
function setHover(i) {
  if (!S.result || S.hover === i) return;
  S.hover = i;
  $('region-list').querySelectorAll('li.region').forEach((li, j) => { if (j === i) li.dataset.linked = 'true'; else delete li.dataset.linked; });
  redrawBoxes(S.result, S.hover >= 0 ? S.hover : S.selected);
}
function selectRegion(i, { announceIt = false } = {}) {
  const m = S.result; if (!m) return;
  S.selected = i;
  $('region-list').querySelectorAll('li.region').forEach((li, j) => { if (j === i) li.dataset.selected = 'true'; else delete li.dataset.selected; });
  redrawBoxes(m, S.hover >= 0 ? S.hover : S.selected);
  markLooked(i);
  if (announceIt) announce(copy.card.selectAnnounce(i + 1, m.regions.length, m.regions[i].pos, m.regions[i].shp));
}
function bindBoxesCanvas() {
  const canvas = $('canvas-boxes'), wrap = canvas.parentElement;
  canvas.addEventListener('pointermove', (e) => {
    if (!S.result) return;
    const i = hitBox(canvas, S.result, e);
    wrap.classList.toggle('is-over-box', i >= 0);
    setHover(i);
  });
  canvas.addEventListener('pointerleave', () => { wrap.classList.remove('is-over-box'); setHover(-1); });
  canvas.addEventListener('click', (e) => {
    if (!S.result) return;
    const i = hitBox(canvas, S.result, e);
    if (i < 0) return;
    selectRegion(i, { announceIt: true });
    const li = $('region-list').children[i];
    li.scrollIntoView({ block: 'center', behavior: 'auto' });
    li.focus({ preventScroll: true });
  });
  $('btn-back-to-card').addEventListener('click', (e) => {
    const li = $('region-list').children[Number(e.currentTarget.dataset.region) - 1];
    if (li) { li.scrollIntoView({ block: 'center', behavior: 'auto' }); li.focus({ preventScroll: true }); }
    e.currentTarget.hidden = true;
  });
}
const reviewedCount = () => S.result.regions.filter((r) => r.decision).length;
function updateProgress() {
  const m = S.result;
  $('regions-progress').textContent = copy.result.progress(reviewedCount(), m.regions.length);
}
async function setDecision(i, value) {
  const m = S.result, r = m.regions[i];
  const li = $('region-list').children[i];
  if (S.signOff.baselinePromoted) {              // promoted results are read-only: never clear sign-off on them
    li.querySelectorAll('input[type=radio]').forEach((rad) => { rad.checked = r.decision === rad.value; });
    announce(copy.signoff.promotedLocked);
    return;
  }
  r.decision = value; S.looked.add(i);
  li.dataset.decision = value; li.setAttribute('aria-label', regionLabel(r, i, m.regions.length));
  li.querySelector('.region-decided').textContent = copy.card.decided(value);
  updateProgress();
  const cleared = S.runId != null && S.signOff.signedOff;
  const ok = await persistRegions(cleared);
  if (cleared && ok) S.signOff = { signedOff: false, reviewer: '', signedOffAt: null, baselinePromoted: false };
  updateActions();
  announce(copy.card.marked(i + 1, value, reviewedCount(), m.regions.length) + (S.stepChanged ? ' ' + nextText() : ''));
  if (cleared && ok) $('signoff-hint').textContent = copy.signoff.cleared;
}
async function persistRegions(clearSignOff) {
  if (S.runId == null || !S.dbOK) return true;
  try {
    // safety net: clearing sign-off always resets baselinePromoted too ("promoted without sign-off" is invalid)
    await runsDb.update(S.runId, { regions: storedRegions(), ...(clearSignOff ? { signOff: { signedOff: false, reviewer: '', signedOffAt: null, baselinePromoted: false } } : {}) });
    return true;
  } catch (e) { guard(() => { throw e; }); return false; }
}
const storedRegions = () => S.result.regions.map((r) => ({ id: r.id, x: r.x, y: r.y, width: r.width, height: r.height, w: r.width, h: r.height, area: r.area, decision: r.decision, note: r.note || '' }));

function computeReview() {
  const m = S.result, fail = m.status === 'FAIL';
  const undecided = fail ? m.regions.filter((r) => !r.decision).length : 0;
  const hasReg = m.regions.some((r) => r.decision === 'Regression');
  return { fail, undecided, hasReg };
}
function nextText() {
  const m = S.result, n = m.regions.length, N = copy.next, fail = m.status === 'FAIL';
  const { undecided, hasReg } = computeReview();
  const saved = S.runId != null, signed = S.signOff.signedOff;
  if (signed) return fail && !S.signOff.baselinePromoted ? N.signedFail : N.signedPass;
  if (!fail) return saved ? N.passSaved : N.passUnsaved;
  if (undecided === n) return N.failNone(n);
  if (undecided > 0) return N.failSome(n - undecided, n);
  if (hasReg) return saved ? N.failRegSaved : N.failRegUnsaved;
  return saved ? N.failOkSaved : N.failOkUnsaved;
}
function updateGuide() {
  const m = S.result, n = m.regions.length, fail = m.status === 'FAIL', T = copy.steps;
  const { undecided, hasReg } = computeReview();
  const saved = S.runId != null, signed = S.signOff.signedOff;
  const looked = Math.min(S.looked.size, n), decided = n - undecided;
  const rows = {
    review: { done: !fail || looked >= n, text: !fail ? T.reviewNone : looked >= n ? T.reviewDone(n) : T.reviewTodo(looked, n) },
    decide: { done: !fail || undecided === 0, text: !fail ? T.decideNone : undecided === 0 ? T.decideDone(n) : T.decideTodo(decided, n) },
    save: { done: saved, text: saved ? T.saveDone(S.runId) : (fail && undecided) ? T.saveWait(undecided) : T.saveTodo },
    signoff: { done: signed, text: signed ? T.signDone(S.signOff.reviewer) : hasReg ? T.signBlocked : !saved ? T.signNeedSave : T.signTodo },
  };
  let current = null;
  for (const li of $('result-steps').children) {
    const k = li.dataset.step, r = rows[k];
    let st = r.done ? 'done' : 'todo';
    if (!r.done && !current) { current = k; st = 'current'; }
    if (k === 'signoff' && !r.done && hasReg) st = 'blocked';
    li.dataset.status = st;
    li.querySelector('.strip-status').textContent = r.text;
    if (k === current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  }
  const next = $('result-next');
  next.dataset.step = current || 'done'; next.textContent = nextText();
  S.stepChanged = S.lastStep !== null && S.lastStep !== next.dataset.step;
  S.lastStep = next.dataset.step;
  const page = S.page ? S.page.name : '';
  let sum = fail ? copy.result.summaryFail(n, page) : copy.result.summaryPass(page);
  if (signed) sum += ' ' + copy.result.summarySigned(S.signOff.reviewer, fmtDate(S.signOff.signedOffAt));
  else if (saved) sum += ' ' + copy.result.summarySaved(S.runId);
  $('result-summary').textContent = sum;
}
function updateActions() {
  const m = S.result; if (!m) return;
  const { fail, undecided, hasReg } = computeReview();
  const saved = S.runId != null, signed = S.signOff.signedOff, promoted = S.signOff.baselinePromoted;
  const review = fail ? (undecided ? 'undecided' : hasReg ? 'regression' : 'decided') : 'decided';
  const r = $('result');
  r.dataset.state = fail ? 'result-fail' : 'result-pass'; r.dataset.review = review;
  r.dataset.saved = saved ? 'yes' : 'no'; r.dataset.signoff = signed ? 'yes' : 'no';
  $('result-guide').dataset.state = r.dataset.state;

  let action;
  if (S.zoneAdded) action = 'compare-again';
  else if (!fail) action = !saved ? 'save' : !signed ? 'signoff' : 'library';
  else if (undecided) action = 'review';
  else if (!saved) action = 'save';
  else if (hasReg) action = 'download';
  else if (!signed) action = 'signoff';
  else if (!promoted) action = 'promote';
  else action = 'library';
  const prim = $('btn-result-primary');
  prim.dataset.action = action; prim.textContent = copy.actions[action];

  const canSign = saved && !signed && (!fail || (undecided === 0 && !hasReg));
  const so = $('btn-signoff'), pr = $('btn-promote');
  setDisabled(so, !canSign); setDisabled(pr, !signed);
  so.hidden = !canSign || action === 'signoff';                         // the primary button carries it in its turn
  pr.hidden = !fail || promoted || !S.dbOK || !signed || action === 'promote';
  let hint = '';
  if (signed) hint = copy.signoff.line(S.signOff.reviewer, fmtDate(S.signOff.signedOffAt));
  else if (fail && undecided) hint = copy.signoff.undecided(undecided);
  else if (hasReg) hint = copy.signoff.regression;
  else if (!saved) hint = copy.signoff.saveFirst;
  else if (fail) hint = copy.signoff.promoteFirst;
  $('signoff-hint').textContent = hint;
  const storageBlocked = !S.dbOK && action === 'save';
  setDisabled(prim, storageBlocked);
  if (storageBlocked) $('signoff-hint').textContent = copy.notice.storageHint;
  $('save-state').textContent = saved ? copy.actions.saved(S.runId) : copy.actions.notSaved;
  const locked = promoted;
  $('region-list').querySelectorAll('input[type=radio], .region-note').forEach((el) => {
    if (locked) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    if (el.classList.contains('region-note')) el.readOnly = locked;
  });
  if (locked) $('signoff-hint').textContent = `${$('signoff-hint').textContent} ${copy.signoff.promotedLocked}`.trim();
  const sug = suggestedZones();
  $('btn-suggest-zone').hidden = !(fail && sug.length);
  const zn = $('zone-added-note');
  zn.hidden = !S.zoneAdded; zn.textContent = S.zoneAdded ? `Zone '${S.zoneAdded}' added. Compare again to apply it.` : '';
  $('stat-review').textContent = S.reviewMs != null ? fmtDuration(S.reviewMs) : '—';
  updateGuide();
}

function focusFirstUndecided() {
  const i = S.result.regions.findIndex((r) => !r.decision);
  const li = $('region-list').children[Math.max(0, i)];
  if (li) { const rad = li.querySelector('input[type=radio]'); (rad || li).focus(); li.scrollIntoView({ block: 'center' }); }
}
async function primaryAction() {
  const b = $('btn-result-primary');
  if (isDisabled(b)) return;
  switch (b.dataset.action) {
    case 'review': return focusFirstUndecided();
    case 'save': return openSave(b);
    case 'download': return downloadPng();
    case 'signoff': return openSignoff(b);
    case 'promote': return promote(b);
    case 'library': return go('library');
    case 'compare-again': S.zoneAdded = null; return doCompare();
  }
}

// ---- evidence + save ----
function runLike() {
  const m = S.result, ev = S.evidence || {};
  return {
    status: m.status, changedPct: m.changedPct, ssim: m.ssim, alignment: m.alignment, settings: m.settings,
    regions: storedRegions(), ignoreZones: m.zones, ignoredPct: m.ignoredPct, evidence: ev, note: S.runNote,
    signOff: S.signOff, ms: m.ms, reviewMs: S.reviewMs, createdAt: S.savedAt || Date.now(),
  };
}
const pageMeta = () => ({ name: S.page.name, module: S.page.module });
async function openSave(opener) {
  const m = S.result;
  const { fail, undecided } = computeReview();
  if (fail && undecided) { focusFirstUndecided(); announce(`Decide every change before saving (${undecided} left).`); return; }
  const cur = S.evidence || {};
  const last = { ...(S.dbOK ? await settingsDb.get('lastEvidence', {}).catch(() => ({})) : {}), ...cur };
  const set = (id, v) => { $(id).value = v || ''; $(id).removeAttribute('aria-invalid'); };
  const keep = S.evidence != null;
  set('ev-testcase', keep ? cur.testCaseId : ''); set('ev-ticket', keep ? cur.ticketId : '');
  set('ev-tools', last.toolsVersion); set('ev-tester', last.tester);
  set('ev-bu', cur.businessUnit); set('ev-role', cur.role); set('ev-env', cur.environment);
  set('ev-note', S.runNote); set('ev-expected', cur.expectedDifference);
  $('evidence-error').hidden = true;
  await openDialog($('save-dialog'), opener);
  m.boxesFinal = $('canvas-boxes');
}
async function submitEvidence(e) {
  if (!e.submitter || e.submitter.value !== 'save') return;
  e.preventDefault();
  const req = [['ev-testcase', 'Test case ID'], ['ev-ticket', 'Ticket / change ID'], ['ev-tools', 'PeopleSoft version or update image'], ['ev-tester', 'Tester']];
  const box = $('evidence-error');
  req.forEach(([id]) => $(id).removeAttribute('aria-invalid'));
  const miss = req.filter(([id]) => !$(id).value.trim());
  if (miss.length) {
    miss.forEach(([id]) => $(id).setAttribute('aria-invalid', 'true'));
    box.textContent = `${miss[0][1]} is required. Nothing was saved.`; box.hidden = false;
    $(miss[0][0]).focus(); return;
  }
  const { fail, undecided } = computeReview();
  if (fail && undecided) { box.textContent = `Decide every change before saving (${undecided} left).`; box.hidden = false; return; }
  const v = (id) => $(id).value.trim();
  const evidence = { testCaseId: v('ev-testcase'), ticketId: v('ev-ticket'), toolsVersion: v('ev-tools'), tester: v('ev-tester'),
    businessUnit: v('ev-bu'), role: v('ev-role') };
  if (v('ev-env')) evidence.environment = v('ev-env');
  if (v('ev-note')) evidence.note = v('ev-note');
  if (v('ev-expected')) evidence.expectedDifference = v('ev-expected');
  const m = S.result;
  try {
    if (!S.dbOK || S.page.id == null) throw Object.assign(new Error(copy.notice.storageHint + ' This page is not stored, so the run cannot be saved. Download the evidence instead.'), { name: 'StorageBlocked' });
    if (S.runId == null) {
      redrawBoxes(m, -1);
      const rec = {
        pageId: S.page.id, baseline: S.page.baseline, candidate: S.cand.blob, result: await toBlob(m.boxes), heatmap: m.heatmap ? await toBlob(m.heatmap) : null,
        regions: storedRegions(), changedPct: m.changedPct, ssim: m.ssim, status: m.status, alignment: m.alignment, settings: m.settings,
        ignoreZones: m.zones, ignoredPct: m.ignoredPct, evidence, note: evidence.note || '', ms: m.ms, reviewMs: Date.now() - S.reviewStart,
        signOff: S.signOff,
      };
      S.reviewMs = rec.reviewMs; S.savedAt = rec.createdAt = Date.now();
      S.runId = await runsDb.add(rec);
    } else {
      await runsDb.update(S.runId, { evidence, note: evidence.note || '', regions: storedRegions() });
    }
  } catch (err) {
    if (err && err.name === 'QuotaExceededError') { showNotice('storage-quota', copy.notice.quota, [{ label: 'Download evidence PNG', run: downloadPng }, { label: 'Open Past results', run: () => go('history') }]); box.textContent = copy.notice.quota; box.hidden = false; return; }
    box.textContent = `${err.message || err}`; box.hidden = false; return;
  }
  S.evidence = evidence; S.runNote = evidence.note || '';
  try { await settingsDb.set('lastEvidence', { tester: evidence.tester, toolsVersion: evidence.toolsVersion }); } catch { /* convenience only */ }
  $('save-dialog').close('save');
  updateActions();
  S.hasRuns = true; updateNav();
  announce(`${copy.actions.saved(S.runId)}. ${nextText()}`);
}

async function downloadPng() {
  const m = S.result;
  redrawBoxes(m, -1);
  const ev = S.evidence || {};
  const blob = await evidencePng(m, { pageName: S.page.name, module: S.page.module, date: S.savedAt || Date.now(), testCaseId: ev.testCaseId, ticketId: ev.ticketId, tester: ev.tester });
  download(blob, `${S.page.name.replace(/[^\w]+/g, '_')}_${m.status}_${new Date().toISOString().slice(0, 10)}.png`);
}
function printNow() {
  const m = S.result; redrawBoxes(m, -1);
  printReport(m, buildReport(runLike(), pageMeta()));
}

// ---- sign-off + promote ----
async function openSignoff(opener) {
  if (isDisabled($('btn-signoff')) && opener === $('btn-signoff')) return;
  $('so-reviewer').value = (S.evidence && S.evidence.tester) || ''; $('signoff-error').hidden = true;
  await openDialog($('signoff-dialog'), opener);
}
async function submitSignoff(e) {
  if (!e.submitter || e.submitter.value !== 'signoff') return;
  e.preventDefault();
  const who = $('so-reviewer').value.trim();
  if (!who) { $('signoff-error').textContent = 'Enter a name or initials to sign off.'; $('signoff-error').hidden = false; $('so-reviewer').focus(); return; }
  const { fail, undecided, hasReg } = computeReview();
  if (S.runId == null || (fail && (undecided || hasReg))) return;     // rules 3a (button is aria-disabled anyway)
  const so = { signedOff: true, reviewer: who, signedOffAt: new Date().toISOString(), baselinePromoted: false };
  try { await runsDb.update(S.runId, { signOff: so }); } catch (err) { $('signoff-error').textContent = String(err.message || err); $('signoff-error').hidden = false; return; }
  S.signOff = so;
  $('signoff-dialog').close('signoff');
  updateActions();
  announce(`Signed off. ${nextText()}`);
}
async function promote(opener) {
  if (isDisabled($('btn-promote')) || !S.signOff.signedOff) return;
  const c = copy.confirm.promote;
  if (!(await confirmDialog({ title: c.title, body: c.body(S.page.name), ok: c.ok }, opener))) return;
  await guard(async () => {
    const rec = { ...S.page, baseline: S.cand.blob, width: S.cand.width, height: S.cand.height };
    await pagesDb.put(rec);
    try { await runsDb.update(S.runId, { signOff: { baselinePromoted: true } }); }
    catch (e1) {
      console.error(e1); await sleep(300);
      try { await runsDb.update(S.runId, { signOff: { baselinePromoted: true } }); }
      catch (e2) { showNotice('storage-quota', 'The baseline was replaced, but the run could not be marked as promoted. Reload and check Past results.'); throw e2; }
    }
    S.signOff = { ...S.signOff, baselinePromoted: true };
    S.page = rec; S.base = await decode(rec.baseline);
    zonesUI.load(rec, S.base, zonesUI.zones);
    updateActions();
    announce(`Before screenshot replaced for ${S.page.name}.`);
  });
}

// ============================== history ==============================
async function renderHistory() {
  await refreshPages();
  const sel = $('history-page');
  sel.replaceChildren(...S.pages.map((p) => { const o = document.createElement('option'); o.value = String(p.id); o.textContent = p.name; return o; }));
  if (!S.pages.length) { S.runsCache = []; showRuns([]); $('history-empty').textContent = copy.historyNoPages; return; }
  if (S.historyPage == null || !S.pages.some((p) => p.id === S.historyPage)) S.historyPage = S.page && S.page.id != null ? S.page.id : S.pages[0].id;
  sel.value = String(S.historyPage);
  await loadRuns();
}
async function loadRuns() {
  try { S.runsCache = await runsDb.forPage(S.historyPage); } catch (e) { console.error(e); S.runsCache = []; }
  showRuns(S.runsCache);
}
function showRuns(list) {
  $('history-empty').textContent = copy.historyEmpty;
  $('history-empty-wrap').hidden = list.length > 0; $('run-table-wrap').hidden = list.length === 0;
  const tpl = $('tpl-run');
  $('run-rows').replaceChildren(...list.map((r) => {
    const tr = tpl.content.firstElementChild.cloneNode(true);
    tr.dataset.runId = r.id; tr.querySelector('.run-status').dataset.status = r.status;
    tr.querySelector('.run-date').textContent = fmtDate(r.createdAt);
    tr.querySelector('.run-status-text').textContent = r.status;
    tr.querySelector('.run-regions').textContent = r.regions.length;
    const ev = r.evidence || {};
    tr.querySelector('.run-testcase').textContent = ev.testCaseId || '';
    const open = r.regions.some((x) => x.decision === 'Regression');
    tr.querySelector('.run-signoff').textContent = r.signOff && r.signOff.signedOff ? copy.historyUi.signed(r.signOff.reviewer) : open ? copy.historyUi.openDefect : copy.historyUi.notSigned;
    tr.querySelector('.run-view').addEventListener('click', () => viewRun(r));
    tr.querySelector('.run-delete').addEventListener('click', () => {
      S.runsCache = S.runsCache.filter((q) => q.id !== r.id); showRuns(S.runsCache);
      announce('Result deleted. Undo is available for 5 seconds.');
      undoable('Result deleted.', () => runsDb.remove(r.id), () => { S.runsCache.push(r); S.runsCache.sort((a, b) => b.createdAt - a.createdAt); showRuns(S.runsCache); });
    });
    return tr;
  }));
}
async function viewRun(r) {
  try {
    const page = S.pages.find((p) => p.id === r.pageId);
    const base = await decode(r.baseline || page.baseline);
    const cand = await decode(r.candidate);
    closeBmp(S.base); setCandidateNone();
    S.page = page; S.base = base; S.cand = cand;
    S.candUrl = URL.createObjectURL(r.candidate);
    let zs = []; try { zs = await zonesDb.forPage(page.id); } catch { /* ignore */ }
    zonesUI.load(page, base, zs);                 // one decode of the baseline
    const boxes = (await decode(r.result)).bitmap;
    const heat = r.heatmap ? (await decode(r.heatmap)).bitmap : null;
    S.result = {
      width: base.width, height: base.height, baseline: base.bitmap, candidate: cand.bitmap, boxes, heatmap: heat,
      regions: r.regions.map((x, i) => ({ ...x, id: i + 1, width: x.width ?? x.w, height: x.height ?? x.h })).map((x, i, all) => ({ ...x, hintId: classify(all, r.changedPct)[i] })),
      zones: r.ignoreZones || [], status: r.status, changedPct: r.changedPct, ssim: r.ssim, alignment: r.alignment, settings: r.settings, ms: r.ms, ignoredPct: r.ignoredPct ?? 0,
    };
    S.runId = r.id; S.evidence = r.evidence; S.runNote = r.note || ''; S.reviewMs = r.reviewMs; S.savedAt = r.createdAt;
    S.signOff = { ...r.signOff }; S.zoneAdded = null;
    renderResultAll();
    go('result');
  } catch (e) { console.error(e); showError('error-compare', String(e.message || e), 'raw'); }
}
async function exportRuns(kind) {
  const page = S.pages.find((p) => p.id === S.historyPage);
  if (!page) return;
  const list = await runsDb.forPage(page.id);
  const reports = list.map((r) => buildReport(r, page));
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === 'json') download(new Blob([JSON.stringify({ tool: copy.title, exportedAt: new Date().toISOString(), runs: reports }, null, 2)], { type: 'application/json' }), `runs_${page.name.replace(/[^\w]+/g, '_')}_${stamp}.json`);
  else download(new Blob([runsToCsv(reports)], { type: 'text/csv' }), `runs_${page.name.replace(/[^\w]+/g, '_')}_${stamp}.csv`);
}

// ============================== settings + reset ==============================
function fillSettingsForm() {
  $('set-T').value = S.settings.T; $('set-minarea').value = S.settings.minArea; $('set-kernel').value = S.settings.kernel;
  $('set-thresholdpct').value = pageThreshold(); $('set-alignment').value = S.settings.alignment;
}
async function onSettingChange() {
  const n = (id, d) => { const v = Number($(id).value); return Number.isFinite(v) && $(id).value !== '' ? v : d; };
  S.settings.T = n('set-T', DEFAULTS.T); S.settings.minArea = n('set-minarea', DEFAULTS.minArea); S.settings.kernel = n('set-kernel', DEFAULTS.kernel);
  S.settings.alignment = $('set-alignment').value;
  const thr = n('set-thresholdpct', DEFAULTS.thresholdPct);
  if (S.dbOK) {
    try { await settingsDb.set('compareSettings', { ...S.settings }); } catch { /* convenience */ }
    if (S.page && S.page.id != null && S.page.thresholdPct !== thr) { S.page.thresholdPct = thr; try { await pagesDb.put(S.page); } catch (e) { console.error(e); } }
  } else if (S.page) S.page.thresholdPct = thr;
}
const mb = (b) => (b / 1048576 >= 10 ? Math.round(b / 1048576) : (b / 1048576).toFixed(1)) + ' MB';
async function renderSettings() {
  const e = await storageEstimate().catch(() => ({}));
  $('storage-estimate').textContent = e.quota ? `This app uses ${mb(e.usage)} of about ${mb(e.quota)} available on this device (${e.percent.toFixed(2)}%).` : 'Storage figures are not available in this browser.';
  $('storage-estimate').dataset.level = e.percent >= 80 ? 'warn' : '';
  if (e.percent >= 80) $('storage-estimate').textContent += ' Storage is almost full. Delete old results in Past results or export them, then reset if needed.';
  $('persist-status').textContent = e.persisted === true ? 'Persistent storage: granted. The browser will not clear this data on its own.' : e.persisted === false ? 'Persistent storage: not granted. The browser may clear the data if the device runs low on space.' : '';
}
function resetUi(state) {
  const d = $('reset-dialog'); d.dataset.state = state;
  const done = state === 'reset-done';
  $('reset-title').textContent = done ? copy.reset.doneTitle : copy.reset.confirmTitle;
  $('reset-body').textContent = done ? copy.reset.doneBody : copy.reset.confirmBody;
  $('reset-cancel').hidden = done; $('reset-confirm').hidden = done; $('reset-back').hidden = !done;
  if (!done) $('reset-blocked').hidden = true;
}
async function openReset(opener) {
  resetUi('reset-confirm');
  const p = openDialog($('reset-dialog'), opener);
  $('reset-cancel').focus();
  const v = await p;
  const wasDone = $('reset-dialog').dataset.state === 'reset-done';
  resetUi('reset-confirm');
  if (wasDone) { go('library'); if (currentRoute() === 'library') route(); }
  return v;
}
async function doReset() {
  const btn = $('reset-confirm');
  btn.setAttribute('aria-busy', 'true');
  try {
    const { blocked } = await resetAppData();   // waits while another tab blocks; onBlocked shows the message
    S.pages = []; clearWork(true); S.engineSeen = false; S.onboardingSeen = false; S.hasRuns = false;
    S.dbOK = true; showNotice('none');
    try { await openDB(); } catch (e) { S.dbOK = false; }
    $('reset-blocked').hidden = true;
    resetUi('reset-done');
    announce(copy.reset.announce + (blocked ? '' : ''));
    $('reset-back').focus();
  } catch (e) {
    console.error(e);
    $('reset-blocked').textContent = String((e && e.message) || e); $('reset-blocked').hidden = false;
  } finally { btn.removeAttribute('aria-busy'); }
}

// ============================== boot ==============================
function bindEvents() {
  $('tour-next').addEventListener('click', () => { if (S.tour && !isDisabled($('tour-next'))) { if (S.tour.step >= 5) endTour('finish'); else goStep(S.tour.step + 1); } });
  $('tour-back').addEventListener('click', () => { if (S.tour && S.tour.step > 1) goStep(S.tour.step - 1); });
  $('tour-skip').addEventListener('click', () => endTour('skip'));
  $('tour-flip').addEventListener('click', () => { if (S.tour) { S.tour.flip = !S.tour.flip; renderTour(); } });
  $('tour-retry').addEventListener('click', () => { if (S.tour) { S.tour.error = false; renderTour(); doCompare(); } });
  $('tour').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); endTour('skip'); } });
  $('btn-tour-again').addEventListener('click', (e) => loadSample(heroSample(), { tour: true, btn: e.currentTarget }));
  $('btn-tour-again-dismiss').addEventListener('click', () => { markOnboarded(); $('tour-again').hidden = true; });
  $('btn-load-sample').addEventListener('click', () => loadSample(heroSample(), { tour: true }));
  $('btn-new-page').addEventListener('click', () => { if (isDisabled($('btn-new-page'))) return; showNewPageForm(true); });
  $('btn-new-page-cancel').addEventListener('click', () => { showNewPageForm(false); $('btn-new-page').focus(); });
  $('new-page-form').addEventListener('submit', createPage);
  $('btn-open-existing').addEventListener('click', async () => { const p = S.dupePage; if (p) { showNewPageForm(false); await openPage(p); go('compare'); } });
  $('baseline-file').addEventListener('change', (e) => { newPageFile = e.target.files[0] || null; if (newPageFile && !$('page-name').value) $('page-name').value = newPageFile.name.replace(/\.png$/i, '').replace(/[_-]+/g, ' '); });
  bindDrop($('candidate-drop'), (f) => setCandidateFromFile(f));
  bindDrop(document.querySelector('#new-page-form .drop'), (f) => { newPageFile = f; document.querySelector('#new-page-form .drop .hint').textContent = `Chosen: ${f.name}`; if (!$('page-name').value) $('page-name').value = f.name.replace(/\.png$/i, '').replace(/[_-]+/g, ' '); });
  $('candidate-file').addEventListener('change', (e) => { if (e.target.files[0]) setCandidateFromFile(e.target.files[0]); e.target.value = ''; });
  document.addEventListener('paste', (e) => {
    if (S.screen !== 'compare' || S.working || !S.page) return;
    const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault(); setCandidateFromFile(item.getAsFile());
  });
  $('btn-replace-baseline').addEventListener('click', () => { if (S.page) $('replace-file').click(); });
  $('replace-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || !S.page) return;
    try {
      checkPng(f); const c = copy.confirm.promote;
      if (!(await confirmDialog({ title: c.title, body: c.body(S.page.name), ok: c.ok }, $('btn-replace-baseline')))) return;
      const base = await decode(f);
      const rec = { ...S.page, baseline: f, width: base.width, height: base.height };
      if (S.dbOK && rec.id != null) await pagesDb.put(rec);
      S.page = rec; S.base = base; S.tip = true; S.result = null;
      zonesUI.load(rec, base, zonesUI.zones); renderCompare();
      announce(`Before screenshot replaced for ${rec.name}.`);
    } catch (err) { if (err instanceof UserError) showError('error-compare', err.message, 'raw'); else guard(() => { throw err; }); }
  });
  $('btn-tip-dismiss').addEventListener('click', () => { S.tip = false; $('capture-tip').hidden = true; $('btn-compare').focus(); });
  $('btn-compare').addEventListener('click', () => { if (!isDisabled($('btn-compare'))) doCompare(); });
  $('btn-cancel').addEventListener('click', cancelCompare);
  for (const id of ['set-T', 'set-minarea', 'set-kernel', 'set-thresholdpct', 'set-alignment']) $(id).addEventListener('change', onSettingChange);
  $('btn-defaults').addEventListener('click', async () => { S.settings = { ...DEFAULTS }; if (S.page) S.page.thresholdPct = DEFAULTS.thresholdPct; fillSettingsForm(); await onSettingChange(); announce('Settings restored to defaults.'); });

  $('btn-result-primary').addEventListener('click', primaryAction);
  $('btn-signoff').addEventListener('click', (e) => { if (!isDisabled(e.currentTarget)) openSignoff(e.currentTarget); });
  $('btn-promote').addEventListener('click', (e) => promote(e.currentTarget));
  $('btn-download-png').addEventListener('click', downloadPng);
  $('btn-print').addEventListener('click', printNow);
  $('btn-compare-again').addEventListener('click', () => { S.zoneAdded = null; doCompare(); });
  $('btn-suggest-zone').addEventListener('click', async () => {
    for (const z of suggestedZones()) { await zonesUI.add({ x: z.x, y: z.y, w: z.w, h: z.h, label: z.label || 'Suggested zone' }); }
    $('btn-compare-again').focus();
  });
  $('evidence-form').addEventListener('submit', (e) => { submitEvidence(e); });
  $('signoff-dialog').querySelector('form').addEventListener('submit', (e) => { submitSignoff(e); });

  $('history-page').addEventListener('change', () => { S.historyPage = Number($('history-page').value); loadRuns(); });
  $('btn-history-pages').addEventListener('click', () => go('library'));
  $('btn-export-json').addEventListener('click', () => exportRuns('json'));
  $('btn-export-csv').addEventListener('click', () => exportRuns('csv'));

  $('btn-reset').addEventListener('click', (e) => openReset(e.currentTarget));
  $('error-reset').addEventListener('click', (e) => openReset(e.currentTarget));
  $('reset-confirm').addEventListener('click', doReset);
  $('error-primary').addEventListener('click', () => {
    const k = S.error && S.error.kind;
    if (k === 'error-opencv') return location.reload();
    clearError();
    if (!S.page) go('library'); else if (S.cand) doCompare();
  });
  $('notice-dismiss').addEventListener('click', () => showNotice('none'));

  window.addEventListener('hashchange', route);
  const off = () => { $('offline-note').hidden = navigator.onLine; $('offline-note').textContent = copy.offline; };
  window.addEventListener('online', off); window.addEventListener('offline', off); off();
}
function bindDrop(label, onFile) {
  if (!label) return;
  ['dragenter', 'dragover'].forEach((t) => label.addEventListener(t, (e) => { e.preventDefault(); label.classList.add('is-dragover'); }));
  ['dragleave', 'drop'].forEach((t) => label.addEventListener(t, () => { label.classList.remove('is-dragover'); }));
  label.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); });
}

async function boot() {
  bindEvents();
  zonesUI = initZones({
    canStore: () => S.dbOK,
    onChange: (kind, z) => { if (S.screen === 'result' && kind === 'add') { S.zoneAdded = z.label; if (S.result) updateActions(); } },
  });
  tabs = initTabs(); bindBoxesCanvas(); fillStatsHelp();
  insp = createInspector({ onStatus: onEngineStatus });

  try {
    await openDB({
      onBlocked: (msg) => {
        if ($('reset-dialog').open) { $('reset-blocked').textContent = copy.reset.blocked; $('reset-blocked').hidden = false; }
        else showNotice('storage-blocked', msg || copy.notice.otherTab);
      },
      onVersionChange: (info) => { S.dbOK = false; showNotice('storage-blocked', info.message, [{ label: 'Reload', run: () => location.reload() }]); },
    });
    const [cs, seen, ob] = await Promise.all([settingsDb.get('compareSettings', null), settingsDb.get('engineSeen', false), settingsDb.get('onboardingSeen', false)]);
    S.onboardingSeen = !!ob;
    if (cs) S.settings = { ...DEFAULTS, ...cs };
    S.engineSeen = !!seen;
    if (!S.engineReady) pillLoading();
  } catch (e) {
    console.error(e);
    S.dbOK = false;
    showNotice('storage-blocked', copy.notice.blocked, [{ label: copy.notice.blockedAction, run: () => { location.href = 'how-it-works.html#storage'; } }]);
  }
  updateStorageGates();
  await loadManifest();
  if (!location.hash) history.replaceState(null, '', '#/library');
  await route();
  if (S.dbOK && S.pages.length && S.notice === 'none') { /* nothing else to announce */ }
}
boot().catch((e) => { console.error(e); showError('error-opencv'); });

// ============================== guided demo (docs/design/ux-flows.md 12.16.2) ==============================
// Docked, non-modal panel. Uses the real result; adds no computation and no cv.Mat. No tour state is stored.
function markOnboarded() { S.onboardingSeen = true; if (S.dbOK) settingsDb.set('onboardingSeen', true).catch(() => {}); }
function tourHides() {
  const t = S.tour;
  return !!t && (t.step < 3 || (t.step === 3 && (!S.result || t.error)));
}
function applyScreens() {
  document.querySelectorAll('.screen').forEach((el) => { el.hidden = tourHides() || el.dataset.screen !== S.screen; });
}
function drawTourImages() {
  for (const [id, bmp] of [['tour-before', S.base && S.base.bitmap], ['tour-after', S.cand && S.cand.bitmap]]) {
    const c = $(id); if (!bmp) continue;
    c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0);
  }
}
function startTour() {
  S.tour = { step: 1, flip: false, error: false, announced: false };
  document.body.dataset.tour = 'on';
  $('tour').hidden = false; $('tour-again').hidden = true;
  drawTourImages();
  renderTour(); focusTour();
}
const focusTour = () => $('tour-title').focus({ preventScroll: true });
function goStep(n) { S.tour.step = Math.max(1, Math.min(5, n)); renderTour(); focusTour(); }
function renderTour() {
  const t = S.tour; if (!t) return;
  const T = copy.tour, m = S.result, step = t.step;
  const waiting = step === 3 && !m && !t.error;
  $('tour').dataset.step = t.error && step === 3 ? 'error' : waiting ? 'wait' : String(step);
  let sentence;
  if (step === 1) sentence = T.s1; else if (step === 2) sentence = T.s2;
  else if (step === 3) sentence = t.error ? T.error : m ? (m.regions.length ? T.s3(m.regions.length) : T.s3none) : T.s3wait;
  else if (step === 4) sentence = T.s4; else sentence = T.s5;
  $('tour-title').textContent = `${T.stepOf(step)} ${sentence}`;
  const help = $('tour-help');
  help.textContent = step === 4 ? T.s4help : step === 5 ? T.s5help + ((!S.dbOK || (S.page && S.page.id == null)) ? ' ' + T.s5blocked : '') : '';
  help.hidden = !help.textContent;
  // stage: before/after images for steps 1 and 2
  $('tour-stage').hidden = step > 2;
  const showBefore = step === 1 ? !t.flip : !!t.flip;
  $('tour-before-fig').hidden = !showBefore; $('tour-after-fig').hidden = showBefore;
  $('tour-before-cap').textContent = T.captionBefore; $('tour-after-cap').textContent = T.captionAfter;
  $('tour-flip').hidden = step !== 2;
  $('tour-wait').hidden = !waiting; $('tour-wait').textContent = T.s3waitHint;
  $('tour-back').hidden = step === 1;
  $('tour-next').textContent = step === 5 ? T.finish : T.next;
  $('tour-next').hidden = !!(t.error && step === 3);
  setDisabled($('tour-next'), waiting);
  $('tour-retry').hidden = !(t.error && step === 3); $('tour-retry').textContent = T.retry;
  $('tour-back').textContent = T.back; $('tour-skip').textContent = T.skip; $('tour-flip').textContent = T.flip;
  applyScreens();
  document.querySelectorAll('.tour-focus').forEach((e) => e.classList.remove('tour-focus'));
  if (m && step === 3 && !t.announced) { t.announced = true; announce(T.foundAnnounce(m.regions.length)); }
  if (m && step === 3) $('canvas-boxes').parentElement.scrollIntoView({ block: 'center', behavior: 'auto' });   // the panel is sticky, so the red boxes sit right below it
  if (m && step === 4 && m.regions.length) {
    const li = $('region-list').children[0];
    if (li) { li.classList.add('tour-focus'); selectRegion(0); li.scrollIntoView({ block: 'center', behavior: 'auto' }); }
  }
  if (m && step === 5) $('btn-result-primary').classList.add('tour-focus');
}
function tourResultReady() {
  go('result');
  renderTour();
  setTimeout(() => { if (S.tour && S.tour.step === 3 && S.result) $('canvas-boxes').parentElement.scrollIntoView({ block: 'center', behavior: 'auto' }); }, 150);
}
function endTour(kind) {
  if (!S.tour) return;
  S.tour = null; delete document.body.dataset.tour; document.body.dataset.tour = 'off';
  $('tour').hidden = true;
  document.querySelectorAll('.tour-focus').forEach((e) => e.classList.remove('tour-focus'));
  markOnboarded();
  applyScreens();
  if (kind === 'finish') {
    announce(copy.tour.doneAnnounce);
    const li = S.result && $('region-list').children[0];
    (li || $('btn-result-primary')).focus();
  } else if (S.result && S.screen !== 'result') go('result');
}

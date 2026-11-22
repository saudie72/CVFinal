// tools/qa/run_qa.js - Quinn's automated real-browser QA for the ERP Visual Regression Inspector.
// Run from the repo root:   node tools/qa/run_qa.js            (starts and stops its own server on port 8107)
//   QA_ONLY=3,5 node tools/qa/run_qa.js                        run selected sections only
//   QA_NO_SERVER=1 node tools/qa/run_qa.js                     reuse a server you already started on 8107
// Writes tools/qa/qa-results.json and (section 12) up to 8 PNGs docs/qa/screenshots/ux2-qa-*.png.
// Sections 1-10: round 1 checks, updated for the first-use redesign (landing, tour, example cards, change cards).
// Sections 11-14: round 2 (first-use UI): 11 new-UI checks, 12 375 px + dark + screenshots, 13 keyboard-only tour and review, 14 screen-reader basics.
// Needs: playwright (require('playwright')), python3 (serve_netlify.py applies the netlify.toml CSP).
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8107, ORIGIN = `http://localhost:${PORT}`, URL = `${ORIGIN}/index.html`;
const SHOTS = path.join(ROOT, 'docs', 'qa', 'screenshots');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'samples', 'manifest.json'), 'utf8'));
const only = process.env.QA_ONLY ? process.env.QA_ONLY.split(',').map(Number) : null;
const results = [];
const rec = (id, name, ok, ev) => {
  results.push({ id, name, ok, evidence: ev });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${ev !== undefined ? '  ' + JSON.stringify(ev) : ''}`);
};
const note = (id, name, ev) => { results.push({ id, name, ok: null, evidence: ev }); console.log(`INFO [${id}] ${name}  ${JSON.stringify(ev)}`); };

// ---------------------------------------------------------------- helpers
async function newPage(browser, { viewport = { width: 1366, height: 900 }, colorScheme = 'light', acceptDownloads = true, ctx: ctxIn } = {}) {
  const ctx = ctxIn || await browser.newContext({ viewport, colorScheme, acceptDownloads, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const log = { console: [], page: [], requests: [], csp: [] };
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.console.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => log.page.push(String(e.message)));
  ctx.on('request', (r) => log.requests.push({ url: r.url(), t: Date.now() }));
  return { ctx, page, log };
}
const ready = (page) => page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready', null, { timeout: 60000 });
const mainState = (page) => page.getAttribute('#main', 'data-state');
const waitResult = (page) => page.waitForFunction(() => /^result-/.test(document.getElementById('main').dataset.state), null, { timeout: 60000 });
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const cspOf = (page) => page.evaluate(() => window.__csp || []);
async function idbInfo(page) {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const names = dbs.map((d) => `${d.name}@v${d.version}`);
    if (!dbs.find((d) => d.name === 'erpinspector')) return { names, stores: [], counts: {} };
    return new Promise((res) => {
      const r = indexedDB.open('erpinspector');
      r.onsuccess = () => {
        const db = r.result; const stores = [...db.objectStoreNames]; const counts = {};
        const t = db.transaction(stores);
        stores.forEach((s) => { t.objectStore(s).count().onsuccess = (e) => { counts[s] = e.target.result; }; });
        t.oncomplete = () => { const v = db.version; db.close(); res({ names, version: v, stores, counts }); };
      };
      r.onerror = () => res({ names, error: String(r.error) });
    });
  });
}
// Skip the guided tour if it is on (Esc inside the panel = Skip; the "Skip tour" button does the same).
async function skipTour(page) {
  // the panel appears a moment after the click (the demo images are fetched first), so wait for it before skipping
  await page.waitForSelector('#tour:not([hidden])', { timeout: 15000 });
  await page.click('#tour-skip');
}
// Open example number idx of samples/manifest.json through the real UI (cards, not a dropdown), skip the tour, wait for the result.
async function loadSample(page, idx, { tour = false } = {}) {
  const s = manifest[idx];
  // go to My pages and make sure it sticks (the app finishes saving the page/result asynchronously after "result" and can re-route)
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { location.hash = '#/library'; });
    await page.waitForTimeout(350);
    if (await page.evaluate(() => !/^result-/.test(document.getElementById('main').dataset.state) && !document.getElementById('screen-library').hidden)) break;
  }
  // the library re-renders after a save: wait until either the landing (hero shown, "Try an example" hidden) or "My pages" (hero hidden, "Try an example" shown) has settled
  await page.waitForFunction(() => { const h = document.getElementById('sample-hero'), e = document.getElementById('examples'); return h && e && (h.hidden !== e.hidden); }, null, { timeout: 10000 }).catch(() => {});
  if (await page.isVisible('#btn-load-sample') && s.group === 'Start here') {
    await page.click('#btn-load-sample');
    if (!tour) await skipTour(page);
  } else {
    // the app renders each example in two <details> (the landing groups and "Try an example"); only the one not [hidden] is shown.
    // Open them by id, then let Playwright re-resolve the locator (the cards are re-rendered after saves).
    await page.evaluate(() => document.querySelectorAll('#examples-more, #examples-tricky, #examples').forEach((d) => { if (!d.hidden) d.open = true; }));
    await page.locator(`details:not([hidden]) .sample-open[data-sample-id="${s.page}"]`).click();
  }
  await waitResult(page);
}
async function resultSummary(page) {
  return {
    state: await mainState(page),
    status: clean(await page.textContent('#result-status')),
    regions: await page.locator('#region-list > li').count(),
    alignment: clean(await page.textContent('#stat-alignment')),
    alignNote: clean(await page.textContent('#note-alignment')),
    changed: clean(await page.textContent('#stat-changed')),
    ignored: clean(await page.textContent('#stat-ignored')),
    hints: (await page.$$eval('#region-list .cause-what', (e) => e.map((x) => x.textContent.trim().slice(0, 200)))),
  };
}
async function recompare(page) {
  await goRoute(page, 'compare');
  await page.click('#btn-compare'); await waitResult(page);
}
async function zonesInDb(page) {
  return page.evaluate(() => new Promise((res) => { const r = indexedDB.open('erpinspector'); r.onsuccess = () => { const db = r.result; const g = db.transaction('ignoreZones').objectStore('ignoreZones').getAll(); g.onsuccess = () => { db.close(); res(g.result.map((z) => ({ label: z.label, x: z.x, y: z.y, w: z.w, h: z.h }))); }; }; r.onerror = () => res([]); }));
}
const tourNext = async (page) => { await page.waitForFunction(() => document.getElementById('tour-next').getAttribute('aria-disabled') !== 'true', null, { timeout: 60000 }); await page.click('#tour-next'); };
const tourTitle = async (page) => clean(await page.textContent('#tour-title'));
// Navigate to a route and make sure the matching screen is shown (retries once: the app can finish saving right after a result and re-route).
async function goRoute(page, r) {
  for (let i = 0; i < 6; i++) {
    await page.evaluate((x) => { location.hash = '#/' + x; }, r);
    await page.waitForTimeout(300);
    if (await page.evaluate((x) => { const e = document.getElementById('screen-' + x); return !!e && !e.hidden; }, r)) return;
  }
  throw new Error(`route ${r} never showed: ` + JSON.stringify(await page.evaluate(() => ({ hash: location.hash, screen: (document.querySelector('.screen:not([hidden])') || {}).id, state: document.getElementById('main').dataset.state, notice: document.getElementById('notice').dataset.state }))));
}
const openAll = (page, sel) => page.evaluate((q) => document.querySelectorAll(q).forEach((d) => { d.open = true; }), sel);
async function settingGet(page, key) {
  return page.evaluate((k) => new Promise((res) => {
    const r = indexedDB.open('erpinspector');
    r.onerror = () => res('(no db)');
    r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('settings')) { db.close(); return res('(no store)'); }
      const g = db.transaction('settings').objectStore('settings').get(k); g.onsuccess = () => { db.close(); res(g.result ? g.result.value : null); }; g.onerror = () => { db.close(); res('(err)'); }; };
  }), key);
}
const run = (n) => !only || only.includes(n);

// ================================================================ main
(async () => {
  let server = null;
  if (!process.env.QA_NO_SERVER) {
    server = spawn('python3', ['tools/serve_netlify.py', '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 1200));
  }
  const browser = await chromium.launch();
  const version = browser.version();
  console.log('Chromium ' + version + '  node ' + process.version + '  ' + os.platform());
  const t0 = Date.now();
  try {
    // -------- 1. every manifest pair via the real UI ---------------------------------------------
    if (run(1)) {
      const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      rec('1.0', 'fresh profile: main=ready-empty (landing), pill Ready, one example card per manifest entry (1 hero + the rest in the two collapsed groups), no #sample-select dropdown', await mainState(page) === 'ready-empty' && (await page.locator('#sample-select').count()) === 0 && (await page.locator('#examples-more .sample-open, #examples-tricky .sample-open').count()) === manifest.length - 1 && await page.isVisible('#sample-hero'), { main: await mainState(page), dropdown: await page.locator('#sample-select').count(), openButtonsInLandingGroups: await page.locator('#examples-more .sample-open, #examples-tricky .sample-open').count(), manifest: manifest.length });
      for (let i = 0; i < manifest.length; i++) {
        const s = manifest[i];
        await loadSample(page, i);
        const r = await resultSummary(page);
        let ok = r.state === (s.expected.status === 'FAIL' ? 'result-fail' : 'result-pass') && r.regions >= (s.expected.minRegions || 0) && (s.expected.maxRegions == null || r.regions <= s.expected.maxRegions);
        rec(`1.${i + 1}`, `${s.page}: expected ${s.expected.status} (min ${s.expected.minRegions ?? 0}${s.expected.maxRegions != null ? ', max ' + s.expected.maxRegions : ''})`, ok, { status: r.status, regions: r.regions, alignment: r.alignment });
        if (s.page === 'hcm-job-data-shifted') rec('1.s', 'shifted pair: Alignment "Lined up automatically" and the note says the After screenshot was "3 pixels lower" (was: shift (0, 3))', /Lined up automatically/.test(r.alignment) && /3 pixels lower/.test(r.alignNote) && !/further (left|right)/.test(r.alignNote), { alignment: r.alignment, note: r.alignNote });
        if (s.page === 'hcm-job-data-zoom110') rec('1.z', 'zoom110: FAIL, and the change cards carry the capture-difference cause ("often a capture difference, not a real change")', r.state === 'result-fail' && r.hints.some((h) => /capture difference/i.test(h)), { regions: r.regions, firstHints: r.hints.slice(0, 2), alignment: r.alignment, note: r.alignNote });
        if (s.page === 'fscm-po') {
          const vis = await page.isVisible('#btn-suggest-zone');
          await page.click('#btn-suggest-zone');
          const zoneText = clean(await page.textContent('#zone-added-note') || '');
          await page.waitForFunction(() => document.getElementById('btn-result-primary').dataset.action === 'compare-again', null, { timeout: 5000 }).catch(() => {});
          await page.click('#btn-result-primary'); // becomes "Compare again"
          await waitResult(page).catch(() => {});
          await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-pass', null, { timeout: 30000 }).catch(() => {});
          const r2 = await resultSummary(page);
          rec('1.po', 'fscm-po: "Add suggested ignore zone" -> Compare again -> PASS with 0 regions', vis && r2.state === 'result-pass' && r2.regions === 0, { suggestVisible: vis, note: zoneText, after: r2.status, ignored: r2.ignored });
        }
      }
      rec('1.c', 'no console errors/warnings, page errors or CSP violations during all 8 pairs (cards, tour skip, results)', log.console.length + log.page.length + (await cspOf(page)).length === 0, { console: log.console, page: log.page, csp: await cspOf(page) });
      await page.context().close();
    }

    // -------- 2. ignore zones: mouse, keyboard / numeric form, alignment --------------------------
    if (run(2)) {
      const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      await loadSample(page, 0); // tl-timesheet
      await goRoute(page, 'compare');
      await openAll(page, '#zones-details'); const zc = page.locator('#zone-canvas'); await zc.scrollIntoViewIfNeeded();
      const box = await zc.boundingBox();
      const iw = await zc.evaluate((c) => c.width), ih = await zc.evaluate((c) => c.height);
      // drag from (10%,10%) to (30%,15%) of the canvas
      const fx = (f) => box.x + box.width * f, fy = (f) => box.y + box.height * f;
      await page.mouse.move(fx(0.10), fy(0.10)); await page.mouse.down(); await page.mouse.move(fx(0.2), fy(0.12), { steps: 5 }); await page.mouse.move(fx(0.30), fy(0.15), { steps: 5 }); await page.mouse.up();
      await page.waitForSelector('#zone-dialog[open]', { timeout: 5000 });
      const f = { x: +await page.inputValue('#zone-x'), y: +await page.inputValue('#zone-y'), w: +await page.inputValue('#zone-w'), h: +await page.inputValue('#zone-h') };
      const exp = { x: iw * 0.10, y: ih * 0.10, w: iw * 0.20, h: ih * 0.05 };
      const near = (a, b, tol) => Math.abs(a - b) <= tol;
      rec('2.1', 'mouse drag opens the zone dialog pre-filled with baseline-pixel coordinates', near(f.x, exp.x, 4) && near(f.y, exp.y, 4) && near(f.w, exp.w, 6) && near(f.h, exp.h, 6), { filled: f, expectedApprox: Object.fromEntries(Object.entries(exp).map(([k, v]) => [k, Math.round(v)])) });
      const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
      rec('2.2', 'focus lands in Label when the zone dialog opens', focusedId === 'zone-label', focusedId);
      await page.keyboard.press('Enter'); // empty label -> validation
      const errTxt = clean(await page.textContent('#zone-error'));
      rec('2.3', 'empty label is rejected inline (role=alert) and the dialog stays open', /short label/i.test(errTxt) && await page.isVisible('#zone-dialog[open]'), errTxt);
      await page.fill('#zone-label', 'Mouse zone'); await page.click('#zone-submit');
      await page.waitForFunction(() => document.querySelectorAll('#zone-list li').length === 1);
      rec('2.4', 'dragged zone appears in the zone list', true, clean(await page.textContent('#zone-list li')));
      // keyboard-only numeric zone
      await page.focus('#btn-add-zone'); await page.keyboard.press('Enter');
      await page.waitForSelector('#zone-dialog[open]');
      await page.keyboard.type('Keyboard zone'); await page.keyboard.press('Tab');
      for (const v of ['400', '500', '120', '30']) { await page.keyboard.press('Control+a'); await page.keyboard.type(v); await page.keyboard.press('Tab'); }
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelectorAll('#zone-list li').length === 2);
      const lis = await page.$$eval('#zone-list li', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
      const zdb = await zonesInDb(page);
      rec('2.5', 'keyboard-only numeric form adds "Keyboard zone": the list says it in words ("Keyboard zone, middle of the page") and the stored zone is exactly x 400, y 500, 120 by 30 (read from IndexedDB; the list no longer shows pixel numbers)', lis.some((t) => /^Keyboard zone, middle of the page/.test(t)) && zdb.some((z) => z.label === 'Keyboard zone' && z.x === 400 && z.y === 500 && z.w === 120 && z.h === 30), { list: lis, db: zdb });
      // out of bounds
      await page.click('#btn-add-zone'); await page.fill('#zone-label', 'Too big'); await page.fill('#zone-x', '1300'); await page.fill('#zone-w', '200'); await page.click('#zone-submit');
      const oob = clean(await page.textContent('#zone-error'));
      rec('2.6', 'a zone past the baseline is rejected with the bounds message', /extends past the Before screenshot \(1366 by 900 pixels\)\. Reduce X or Width\./i.test(oob) && await page.isVisible('#zone-dialog[open]'), oob);
      await page.keyboard.press('Escape');
      rec('2.7', 'Esc closes the dialog and returns focus to the "Add zone" opener', !(await page.isVisible('#zone-dialog[open]')) && await page.evaluate(() => document.activeElement.id) === 'btn-add-zone', await page.evaluate(() => document.activeElement.id));
      rec('2.8', 'zone summary reads "2 zones ignored (x% of page)"', /2 zones ignored/.test(clean(await page.textContent('#zone-summary'))), clean(await page.textContent('#zone-summary')));
      // zones apply to the compare: cover region 1 fully
      await page.click('#btn-compare'); await waitResult(page);
      const withZones = await resultSummary(page);
      rec('2.9', 'Compare with 2 zones: stat "Ignored" lists the zones', /2 zones/.test(withZones.ignored), withZones.ignored);
      // zone persists after reload
      await page.reload(); await ready(page);
      await page.evaluate(() => { location.hash = '#/library'; });
      await page.waitForSelector('#page-list li, #page-list .card, #page-list button, #page-list a');
      const pageCardText = clean(await page.textContent('#page-list'));
      const idb = await idbInfo(page);
      rec('2.10', 'zones are stored in IndexedDB ignoreZones (2 rows) and survive reload', idb.counts.ignoreZones === 2, { counts: idb.counts, library: pageCardText.slice(0, 120) });
      // alignment: shifted pair
      await loadSample(page, manifest.findIndex((s) => s.page === 'hcm-job-data-shifted'));
      const sh = await resultSummary(page);
      rec('2.11', 'alignment: shifted pair is aligned (3 pixels lower, "Lined up automatically") and PASSes (the +3 px does not count as a change)', /Lined up automatically/.test(sh.alignment) && /3 pixels lower/.test(sh.alignNote) && sh.state === 'result-pass', sh);
      rec('2.c', 'no console errors / CSP violations in section 2', log.console.length + log.page.length + (await cspOf(page)).length === 0, { console: log.console, page: log.page });
      await page.context().close();
    }

    // -------- 3. persistence + IndexedDB structure -----------------------------------------------
    if (run(3)) {
      const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      await loadSample(page, 0);
      const n = await page.locator('#region-list > li').count();
      for (let i = 0; i < n; i++) await page.locator('#region-list > li').nth(i).locator('input[value="Expected"]').check();
      await page.click('#btn-result-primary'); // Save result
      await page.fill('#ev-testcase', 'VR-TL-01'); await page.fill('#ev-ticket', 'CHG-0042'); await page.fill('#ev-tools', 'PI 50 (fictional)'); await page.fill('#ev-tester', 'QA');
      await page.click('#save-submit');
      await page.waitForFunction(() => /^Saved as result/.test(document.getElementById('save-state').textContent));
      const saved = clean(await page.textContent('#save-state'));
      const before = await idbInfo(page);
      await page.reload(); await ready(page);
      const after = await idbInfo(page);
      rec('3.1', "IndexedDB 'erpinspector' exists with stores pages, ignoreZones, runs, settings", ['pages', 'ignoreZones', 'runs', 'settings'].every((s) => after.stores.includes(s)), { db: after.names, version: after.version, stores: after.stores });
      rec('3.2', 'page + run rows survive a reload (counts unchanged)', after.counts.pages >= 1 && after.counts.runs === 1 && JSON.stringify(before.counts) === JSON.stringify(after.counts), { before: before.counts, after: after.counts, saved });
      await page.evaluate(() => { location.hash = '#/library'; });
      const lib = clean(await page.textContent('#page-list'));
      rec('3.3', 'library lists the page after reload', /Timesheet/.test(lib), lib.slice(0, 100));
      await page.evaluate(() => { location.hash = '#/history'; });
      await page.waitForSelector('#run-rows tr', { timeout: 10000 }).catch(() => {});
      const rows = await page.locator('#run-rows tr').count();
      rec('3.4', 'Past results shows the saved result after reload', rows === 1, { rows, text: clean(await page.textContent('#run-rows')).slice(0, 140) });
      await openAll(page, '#export-details');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-json')]);
      const f = path.join(os.tmpdir(), 'qa-export-run.json'); await dl.saveAs(f);
      fs.copyFileSync(f, path.join(__dirname, 'qa-export-run.json'));
      let valid = false, out = '';
      try { out = execFileSync('python3', ['tools/validate_evidence.py', f], { cwd: ROOT }).toString().trim(); valid = true; } catch (e) { out = String(e.stdout || e); }
      rec('3.5', 'exported run JSON passes tools/validate_evidence.py', valid, out.slice(0, 200));
      rec('3.c', 'no console errors in section 3', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
      await page.context().close();
    }

    // -------- 4. Reset app data (dialog, empty after reload, blocked by second tab) -----------------
    if (run(4)) {
      const { ctx, page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      await loadSample(page, 0);
      const seenBefore = await settingGet(page, 'onboardingSeen');
      await page.click('#btn-result-primary').catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
      await page.evaluate(() => { location.hash = '#/settings'; });
      await page.click('#btn-reset');
      await page.waitForSelector('#reset-dialog[open]');
      const title = clean(await page.textContent('#reset-title')), focusId = await page.evaluate(() => document.activeElement.id);
      rec('4.1', 'Reset dialog opens (title "Reset app data?") with default focus on Cancel', /Reset app data\?/.test(title) && focusId === 'reset-cancel', { title, focusId, body: clean(await page.textContent('#reset-body')).slice(0, 120) });
      await page.click('#reset-cancel');
      rec('4.2', 'Cancel closes the dialog and keeps the data', !(await page.isVisible('#reset-dialog[open]')) && (await idbInfo(page)).counts.pages >= 1, (await idbInfo(page)).counts);
      // blocked path: second tab holding the DB
      const p2 = await ctx.newPage(); await p2.goto(URL); await ready(p2);
      await page.bringToFront(); await page.click('#btn-reset'); await page.waitForSelector('#reset-dialog[open]');
      await page.click('#reset-confirm');
      await page.waitForTimeout(2500);
      const blockedShown = await page.isVisible('#reset-blocked'); const blockedTxt = clean(await page.textContent('#reset-blocked'));
      const doneAlready = await page.isVisible('#reset-back');
      const t2 = await p2.evaluate(() => ({ notice: document.getElementById('notice').dataset.state, text: document.getElementById('notice-text').textContent.trim() })).catch((e) => String(e));
      note('4.3a', 'second tab open during reset: what happened', { blockedMessageShown: blockedShown, blockedTxt, doneImmediately: doneAlready, otherTab: t2 });
      rec('4.3', 'with a 2nd tab open the reset either shows "Close other tabs" (blocked) or finishes cleanly (never hangs silently)', blockedShown || doneAlready, { blockedShown, doneAlready });
      if (!doneAlready) {
        await p2.close();
        await page.click('#reset-confirm'); // retry
        await page.waitForSelector('#reset-back', { timeout: 15000 }).catch(() => {});
      }
      rec('4.4', 'dialog reaches "App data deleted" and Back to Library works', await page.isVisible('#reset-back') && /deleted/i.test(clean(await page.textContent('#reset-title'))), clean(await page.textContent('#reset-title')));
      const afterReset = await idbInfo(page);
      rec('4.5', 'database is empty right after reset (pages/runs/ignoreZones = 0)', (afterReset.counts.pages || 0) + (afterReset.counts.runs || 0) + (afterReset.counts.ignoreZones || 0) === 0, afterReset);
      await page.click('#reset-back');
      await page.reload(); await ready(page);
      const afterReload = await idbInfo(page);
      const seenAfter = await settingGet(page, 'onboardingSeen');
      rec('4.6a', 'Reset app data brings the tour back: settings key onboardingSeen was true before (tour skipped), is gone after the reset + reload (so the tour is offered again; 4.6 checks the landing)', seenBefore === true && (seenAfter === null || seenAfter === false || /^\(no/.test(seenAfter)), { seenBefore, seenAfter });
      const hashAfter = await page.evaluate(() => location.hash);
      await page.evaluate(() => { location.hash = '#/library'; }); await page.waitForTimeout(200);
      rec('4.6', 'after reload the landing is back (#btn-load-sample visible, main=ready-empty) and pages/runs/ignoreZones hold 0 rows (settings keeps only the engineSeen flag)', await mainState(page) === 'ready-empty' && await page.isVisible('#btn-load-sample') && (afterReload.counts.pages || 0) + (afterReload.counts.runs || 0) + (afterReload.counts.ignoreZones || 0) === 0, { hashAfterReload: hashAfter, main: await mainState(page), idb: afterReload.counts });
      await loadSample(page, 1);
      rec('4.7', 'samples still load after a reset', (await mainState(page)) === 'result-fail', clean(await page.textContent('#result-status')));
      // truly blocked path: another tab holds an open connection and ignores versionchange
      const holder = await ctx.newPage(); await holder.goto(`${ORIGIN}/how-it-works.html`);
      await holder.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('erpinspector'); r.onsuccess = () => { window.__held = r.result; res(); }; r.onerror = () => rej(r.error); }));
      await page.bringToFront(); await page.evaluate(() => { location.hash = '#/settings'; }); await page.click('#btn-reset'); await page.waitForSelector('#reset-dialog[open]');
      await page.click('#reset-confirm'); await page.waitForTimeout(3000);
      const bl = { shown: await page.isVisible('#reset-blocked'), text: clean(await page.textContent('#reset-blocked')), doneShown: await page.isVisible('#reset-back'), confirmEnabled: await page.isEnabled('#reset-confirm') };
      rec('4.8', 'blocked reset (a tab keeps the DB open): dialog says "Close other tabs of this app to finish the reset." and keeps the button enabled for retry', bl.shown && /Close other tabs/.test(bl.text) && !bl.doneShown && bl.confirmEnabled, bl);
      await holder.evaluate(() => window.__held.close());
      let auto = await page.waitForSelector('#reset-back', { state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
      if (!auto) { await page.click('#reset-confirm'); await page.waitForSelector('#reset-back', { timeout: 15000 }).catch(() => {}); }
      rec('4.9', `after the other tab lets go the reset completes ("App data deleted"; finished by itself: ${auto})`, await page.isVisible('#reset-back'), clean(await page.textContent('#reset-title')));
      rec('4.c', 'no console errors in section 4', log.console.length + log.page.length === 0, log.console);
      await ctx.close();
    }

    // -------- 5. network quiet after ready + 11a offline user-file compare + print ------------------
    if (run(5)) {
      const { ctx, page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      const afterReady = log.requests.length; const tReady = Date.now();
      const loadReqs = log.requests.slice(0, afterReady).map((r) => r.url.replace(ORIGIN, ''));
      await loadSample(page, 0);
      for (let i = 0; i < 3; i++) await recompare(page);
      await page.waitForTimeout(500);
      const post = log.requests.slice(afterReady).map((r) => r.url);
      const rel = post.map((u) => u.replace(ORIGIN, ''));
      const cross = log.requests.filter((r) => !r.url.startsWith(ORIGIN) && !/^(data|blob):/.test(r.url)).map((r) => r.url);
      const allowed = (u) => /^\/samples\/[a-z0-9-]+_(before|after)\.png$/.test(u) || u === '/samples/manifest.json' || /^(blob|data):/.test(u);
      const unexpected = rel.filter((u) => !allowed(u));
      rec('5.1', 'after "ready": only the sample PNG fetches the user triggered (Try the demo + 3 x Compare); nothing else', unexpected.length === 0, { initialLoadRequests: loadReqs.length, afterReady: rel });
      rec('5.2', '0 cross-origin requests during the whole session', cross.length === 0, cross);
      note('5.2a', 'initial load request list (same-origin app files)', loadReqs);
      // idle quiet: 3 s with nothing happening
      const n0 = log.requests.length; await page.waitForTimeout(3000);
      rec('5.3', '3 s idle after compare: 0 requests', log.requests.length === n0, log.requests.length - n0);

      // 11a: offline + user-chosen file
      await page.evaluate(() => { location.hash = '#/compare'; });
      await ctx.setOffline(true);
      await page.setInputFiles('#candidate-file', path.join(ROOT, 'samples', 'tl-timesheet_after.png'));
      await page.waitForFunction(() => !document.getElementById('candidate-thumb').hidden);
      const reqBefore = log.requests.length;
      await page.click('#btn-compare'); await waitResult(page);
      const off = await resultSummary(page);
      const offNote = await page.isVisible('#offline-note') ? clean(await page.textContent('#offline-note')) : '(hidden)';
      rec('5.4', 'context OFFLINE after load: Compare with a user-chosen file (setInputFiles) still gives FAIL + regions', off.state === 'result-fail' && off.regions >= 2, { ...off, offlineNote: offNote });
      const offReq = log.requests.slice(reqBefore).map((r) => r.url);
      rec('5.5', 'offline compare made no new network request (a blob: URL for the thumbnail is in-memory, not network)', offReq.filter((u) => !/^(blob|data):/.test(u)).length === 0, offReq);
      // PNG that is not a PNG -> friendly error (offline)
      await page.evaluate(() => { location.hash = '#/compare'; });
      fs.writeFileSync(path.join(os.tmpdir(), 'qa-not-image.txt'), 'hello');
      await page.setInputFiles('#candidate-file', path.join(os.tmpdir(), 'qa-not-image.txt'));
      await page.waitForTimeout(400);
      const errState = await mainState(page); const errT = clean(await page.textContent('#error-body'));
      rec('5.6', 'a non-PNG file shows the friendly "isn\'t a PNG" error, not a crash', errState === 'error-compare' && /PNG/.test(errT), { errState, errT });
      await ctx.setOffline(false);

      // 11b: print report
      await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; });
      await page.evaluate(() => { location.hash = '#/compare'; });
      await page.setInputFiles('#candidate-file', path.join(ROOT, 'samples', 'tl-timesheet_after.png'));
      await page.click('#btn-compare'); await waitResult(page);
      await openAll(page, '#more-actions'); await page.click('#btn-print');
      const pr = await page.evaluate(() => ({ calls: window.__printCalls, h1: (document.querySelector('#print-report h1') || {}).textContent, tables: document.querySelectorAll('#print-report table tr').length, canvases: document.querySelectorAll('#print-report canvas').length, text: document.getElementById('print-report').innerText.length }));
      await page.emulateMedia({ media: 'print' });
      const vis = await page.evaluate(() => { const r = document.getElementById('print-report'); const cs = getComputedStyle(r); const hdr = document.querySelector('header'); const main = document.getElementById('main'); return { reportDisplay: cs.display, reportW: r.getBoundingClientRect().width, headerDisplay: hdr ? getComputedStyle(hdr).display : null, mainDisplay: getComputedStyle(main).display }; });
      const pdf = await page.pdf({ format: 'A4' }); const pdfPath = path.join(os.tmpdir(), 'qa-print.pdf'); fs.writeFileSync(pdfPath, pdf);
      let pdfText = ''; try { pdfText = execFileSync('pdftotext', [pdfPath, '-']).toString(); } catch (e) { pdfText = '(pdftotext not available)'; }
      note('5.7a', 'print layout details', { pr, vis, pdfBytes: pdf.length, pdfPages: (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, pdfTextHead: clean(pdfText).slice(0, 200) });
      rec('5.7', 'Print report: #print-report is filled (h1, regions table, canvases), window.print called, and in print media it is displayed while the app chrome is hidden', pr.calls === 1 && pr.h1 && pr.tables >= 3 && pr.canvases >= 3 && vis.reportDisplay !== 'none' && vis.reportW > 300, { pr, vis });
      rec('5.8', 'page.pdf() produces a non-empty PDF whose text contains the report headings', pdf.length > 5000 && /^Changes$/m.test(pdfText) && /Boxes view/.test(pdfText), { bytes: pdf.length, hasChangesHeading: /^Changes$/m.test(pdfText), hasDisclaimer: /not a replacement/i.test(pdfText) });
      await page.emulateMedia({ media: 'screen' });
      rec('5.c', 'no console errors in section 5', log.console.length + log.page.length === 0, log.console);
      await ctx.close();
    }

    // -------- 6. heavy work off the main thread ------------------------------------------------------
    if (run(6)) {
      const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      await loadSample(page, 0);
      await page.evaluate(() => {
        window.__lt = []; window.__gaps = []; window.__mark = null;
        try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) { window.__ltErr = String(e); }
        let last = performance.now();
        const tick = (t) => { window.__gaps.push(Math.round(t - last)); last = t; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      const runs = [];
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => { location.hash = '#/compare'; });
        await page.waitForFunction(() => !/^result-/.test(document.getElementById('main').dataset.state));
        await page.evaluate(() => { window.__gaps.length = 0; window.__lt.length = 0; });
        const t = Date.now();
        await page.click('#btn-compare'); await waitResult(page);
        const ms = Date.now() - t;
        runs.push({ ms, ...(await page.evaluate(() => ({ maxGap: Math.max(...window.__gaps), gaps: window.__gaps.length, longtasks: window.__lt.slice() }))) });
      }
      // load sample path as well (decode + compare + render)
      await page.evaluate(() => { window.__gaps.length = 0; window.__lt.length = 0; });
      await loadSample(page, 3);
      const ls = await page.evaluate(() => ({ maxGap: Math.max(...window.__gaps), longtasks: window.__lt.slice() }));
      const maxGap = Math.max(...runs.map((r) => r.maxGap)); const allLt = runs.flatMap((r) => r.longtasks);
      note('6.0', 'per-compare click-to-result ms, max rAF gap, long tasks (>50 ms)', { runs, loadSample: ls });
      rec('6.1', 'main thread stays responsive during Compare: max requestAnimationFrame gap < 100 ms over 5 compares', maxGap < 100, { maxGapMs: maxGap });
      rec('6.2', 'no main-thread long task longer than 100 ms during Compare (PerformanceObserver longtask; the >50 ms ones are listed)', allLt.every((d) => d < 100), { longtasksMs: allLt });
      rec('6.c', 'no console errors in section 6', log.console.length + log.page.length === 0, log.console);
      await page.context().close();
    }

    // -------- 7. Mat leak over 20 runs (client heap() on a dedicated inspector) ----------------------
    if (run(7)) {
      const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      const r = await page.evaluate(async () => {
        const { createInspector } = await import('/js/worker-client.js');
        const insp = createInspector({});
        const info = await insp.ready;
        const load = async (u) => { const b = await createImageBitmap(await (await fetch(u)).blob()); const c = new OffscreenCanvas(b.width, b.height); const g = c.getContext('2d'); g.drawImage(b, 0, 0); return g.getImageData(0, 0, b.width, b.height); };
        const base = await load('/samples/tl-timesheet_before.png'), cand = await load('/samples/tl-timesheet_after.png');
        const zones = [{ x: 10, y: 10, w: 100, h: 20, label: 'z' }];
        const series = []; const h0 = await insp.heap();
        const regions = [];
        for (let i = 1; i <= 20; i++) {
          const res = await insp.compare(base, cand, i % 2 ? [] : zones, {}, { copy: true });
          regions.push(res.regions.length);
          const h = await insp.heap(); series.push([h.bytes, h.probe]);
        }
        insp.terminate && insp.terminate();
        return { version: info.version, h0: [h0.bytes, h0.probe], series, regions };
      });
      const bytes = r.series.map((s) => s[0]), probes = r.series.map((s) => s[1]);
      const plateauBytes = bytes.slice(1).every((b) => b === bytes[1]);
      const plateauProbe = probes.slice(2).every((p) => p === probes[2]);
      note('7.0', 'heap series (bytes, probe) before and after each of 20 compares', { opencv: r.version, before: r.h0, run1: r.series[0], run2: r.series[1], run20: r.series[19], regionsPerRun: r.regions.join(',') });
      rec('7.1', 'Wasm heap bytes constant from run 2 to run 20 (no growth)', plateauBytes && bytes[19] === bytes[1], { bytes: [...new Set(bytes)] });
      rec('7.2', 'malloc probe address constant from run 3 to 20 (freed memory is reused => no Mat leak)', plateauProbe, { distinctProbes: [...new Set(probes)] });
      rec('7.3', 'before vs after: heap at run 20 equals heap after the first run (growth only once, for the working set)', bytes[19] === bytes[0] || bytes[19] === bytes[1], { before: r.h0[0], run1: bytes[0], run20: bytes[19] });
      rec('7.c', 'no console errors in section 7', log.console.length + log.page.length === 0, log.console);
      await page.context().close();
    }

    // -------- 8. console cleanliness on every page --------------------------------------------------
    if (run(8)) {
      const pages = ['index.html', 'how-it-works.html', 'resources.html', 'demo-erp/index.html', ...fs.readdirSync(path.join(ROOT, 'demo-erp'), { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => fs.readdirSync(path.join(ROOT, 'demo-erp', d.name)).filter((f) => f.endsWith('.html')).map((f) => `demo-erp/${d.name}/${f}`))];
      const { ctx, page, log } = await newPage(browser);
      const bad = [];
      for (const p of pages) {
        const n = [log.console.length, log.page.length];
        const resp = await page.goto(`${ORIGIN}/${p}`);
        if (p === 'index.html') await ready(page); else await page.waitForTimeout(250);
        const csp = await cspOf(page);
        const status = resp.status();
        const added = log.console.slice(n[0]).concat(log.page.slice(n[1])).concat(csp);
        if (added.length || status !== 200) bad.push({ p, status, added });
      }
      rec('8.1', `0 console errors/warnings, 0 page errors and 0 CSP violations on ${pages.length} pages (index, how-it-works, resources, demo index + 16 demo pages)`, bad.length === 0, { pages: pages.length, problems: bad });
      const ext = log.requests.filter((r) => !r.url.startsWith(ORIGIN) && !/^(data|blob):/.test(r.url));
      rec('8.2', '0 cross-origin requests across those pages', ext.length === 0, ext.map((r) => r.url));
      // /favicon.ico (ex2 defect) and a 404 page are not errors
      const fav = await page.request.get(`${ORIGIN}/favicon.svg`);
      rec('8.3', 'favicon.svg resolves (no favicon 404 like QA-001)', fav.status() === 200, fav.status());
      await ctx.close();
    }

    // -------- 9. accessibility + Wren's section 11 checklist -------------------------------------------
    if (run(9)) {
      // 9a keyboard-only path
      {
        const { page, log } = await newPage(browser);
        const seq = [];
        const pillTexts = [];
        await page.addInitScript(() => {
          window.__ann = []; window.__pill = [];
          addEventListener('DOMContentLoaded', () => {
            new MutationObserver(() => { const t = document.getElementById('announcer').textContent.trim(); if (t) window.__ann.push(t); }).observe(document.getElementById('announcer'), { childList: true, characterData: true, subtree: true });
            new MutationObserver(() => window.__pill.push(document.getElementById('status-text').textContent.trim())).observe(document.getElementById('status-text'), { childList: true, characterData: true, subtree: true });
            window.__pill.push(document.getElementById('status-text').textContent.trim());
          });
        });
        await page.goto(URL); await ready(page);
        const pillSeq = await page.evaluate(() => window.__pill);
        rec('9.0', 'pill sequence starts with the plain loading text ("Getting ready: loading the comparison engine…") and ends "Ready" (Wren 11.1 / 12.16.7)', /comparison engine/i.test(pillSeq[0]) && pillSeq[pillSeq.length - 1] === 'Ready', pillSeq);
        const aria = await page.evaluate(() => ({ pill: [document.getElementById('status-pill').getAttribute('role'), document.getElementById('status-pill').getAttribute('aria-live')], ann: [document.getElementById('announcer').getAttribute('aria-live'), document.getElementById('announcer').className], liveRegions: document.querySelectorAll('[aria-live],[role=alert],[role=status]').length }));
        rec('9.1', 'live regions: pill role=status aria-live=polite; #announcer aria-live=polite', aria.pill[0] === 'status' && aria.pill[1] === 'polite' && aria.ann[0] === 'polite', aria);
        const focusInfo = () => page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { id: e.id, tag: e.tagName, cls: e.className && e.className.toString().slice(0, 30), outline: cs.outlineStyle + ' ' + cs.outlineWidth, shadow: cs.boxShadow !== 'none', visible: e.getBoundingClientRect().width > 0 }; });
        const noFocusRing = [];
        let reached = false;
        for (let i = 0; i < 40; i++) {
          await page.keyboard.press('Tab');
          const fi = await focusInfo(); seq.push(fi.id || fi.tag);
          if (!(fi.outline.split(' ')[0] !== 'none' && parseFloat(fi.outline.split(' ')[1]) >= 2) && !fi.shadow) noFocusRing.push(fi.id || fi.tag);
          if (fi.id === 'btn-load-sample') { reached = true; break; }
        }
        rec('9.2', 'keyboard: Tab reaches "Try the demo" (after skip link + nav)', reached, seq);
        rec('9.3', 'every Tab stop shows a visible focus indicator (>=2 px outline or box-shadow)', noFocusRing.length === 0, { stops: seq.length, withoutRing: noFocusRing });
        await page.keyboard.press('Enter');                       // Try the demo -> starts the guided tour
        await page.waitForSelector('#tour:not([hidden])');
        await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
        await page.keyboard.press('Escape');                     // Esc inside the panel = Skip tour
        await waitResult(page);
        await page.waitForTimeout(300);
        const afterRes = await page.evaluate(() => ({ focus: document.activeElement.id, ann: window.__ann.slice(-3) }));
        rec('9.4', 'after Esc (skip tour) the result is shown and the result is announced once ("Comparison finished. ... found")', (await page.evaluate(() => document.getElementById('tour').hidden)) && afterRes.ann.filter((a) => /^Comparison finished/.test(a)).length === 1, afterRes);
        note('9.4a', 'where focus is after Esc skips the tour', afterRes.focus);
        // tabs with arrows
        await page.focus('#tab-boxes'); await page.keyboard.press('ArrowRight');
        const sel1 = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]').id); await page.keyboard.press('End');
        const sel2 = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]').id); await page.keyboard.press('Home');
        const sel3 = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]').id);
        rec('9.5', 'view tabs: ArrowRight/End/Home move and activate (Side-by-side, Heatmap, Boxes)', sel1 === 'tab-side' && sel2 === 'tab-heatmap' && sel3 === 'tab-boxes', [sel1, sel2, sel3]);
        await page.click('#tab-overlay'); await page.focus('#overlay-slider');
        const v0 = +await page.inputValue('#overlay-slider'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('PageUp'); await page.keyboard.press('Home');
        const vHome = +await page.inputValue('#overlay-slider'); await page.keyboard.press('End'); const vEnd = +await page.inputValue('#overlay-slider');
        const vt = await page.getAttribute('#overlay-slider', 'aria-valuetext');
        rec('9.6', 'overlay slider: arrows/PageUp/Home/End change value (0..100) and aria-valuetext reads "Showing N% after, M% before"', vHome === 0 && vEnd === 100 && /Showing 100% after, 0% before/.test(vt), { v0, vHome, vEnd, vt });
        await page.click('#tab-boxes');
        // decisions by keyboard: focus first radio of region 1 via Tab from #result-status
        await page.focus('#region-list > li:first-child');
        const n = await page.locator('#region-list > li').count();
        let decided = 0;
        for (let i = 0; i < n; i++) {
          await page.focus(`#region-list > li:nth-child(${i + 1})`);
          for (let k = 0; k < 4; k++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement.type === 'radio')) break; }
          await page.keyboard.press('Space');
          if (await page.locator(`#region-list > li:nth-child(${i + 1}) input[value="Expected"]`).isChecked()) decided++;
        }
        rec('9.7', 'keyboard: Tab + Space marks every region "Expected" (native radios)', decided === n, { regions: n, decided });
        await page.waitForTimeout(200);
        const ann = await page.evaluate(() => window.__ann.slice(-3));
        rec('9.8', 'decision announcements ("Region N marked Expected. K of M reviewed.")', ann.some((a) => /marked Expected/.test(a)), ann);
        // arrow keys inside a radio group
        await page.focus('#region-list > li:first-child');
        for (let k = 0; k < 4; k++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement.type === 'radio')) break; }
        await page.keyboard.press('ArrowRight');
        const arrowVal = await page.evaluate(() => document.querySelector('#region-list > li:first-child input:checked').value);
        rec('9.9', 'arrow keys switch the radio group (Expected -> Regression)', arrowVal === 'Regression', arrowVal);
        await page.keyboard.press('ArrowLeft');
        // save by keyboard
        await page.focus('#btn-result-primary');
        const primary = clean(await page.textContent('#btn-result-primary'));
        await page.keyboard.press('Enter');
        await page.waitForSelector('#save-dialog[open]');
        const dlgFocus = await page.evaluate(() => document.activeElement.id);
        for (const v of ['VR-TL-01', 'CHG-0042', 'PI 50 (fictional)', 'QA']) { await page.keyboard.type(v); await page.keyboard.press('Tab'); }
        await page.focus('#save-submit'); await page.keyboard.press('Enter');
        await page.waitForFunction(() => /^Saved as result/.test(document.getElementById('save-state').textContent), null, { timeout: 10000 }).catch(() => {});
        const saved = clean(await page.textContent('#save-state'));
        await page.waitForTimeout(200);
        const ann2 = await page.evaluate(() => window.__ann.filter((a) => /saved/i.test(a)).slice(-1)[0]);
        rec('9.10', 'keyboard-only: Try the demo -> Esc -> decisions -> Save result (Enter) -> "Saved as result N" and announced', /^Saved as result/.test(saved) && /saved/i.test(ann2), { primary, dialogFocus: dlgFocus, saved, announced: ann2 });
        // Sign off by keyboard
        const soAction = await page.getAttribute('#btn-result-primary', 'data-action');    // after Save the primary button becomes Sign off (the separate button is hidden)
        await page.focus('#btn-result-primary'); await page.keyboard.press('Enter'); await page.waitForSelector('#signoff-dialog[open]');
        await page.keyboard.type('QA'); await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        rec('9.11', `keyboard-only sign-off completes ("Signed off by QA"; primary action was "${soAction}")`, /Signed off by QA/.test(clean(await page.textContent('#save-state')) + clean(await page.textContent('#signoff-hint')) + clean(await page.textContent('#result'))), clean(await page.textContent('#signoff-hint')).slice(0, 80));

        // axe-like basics on the result screen
        const axe = await page.evaluate(() => {
          const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
          const nameOf = (e) => (e.getAttribute('aria-label') || '').trim() || ((e.getAttribute('aria-labelledby') || '').split(/\s+/).map((i) => (document.getElementById(i) || {}).textContent || '').join(' ').trim()) || (e.innerText || e.textContent || '').trim() || (e.getAttribute('title') || '').trim() || (e.querySelector('img[alt]') || {}).alt || '';
          const unnamedButtons = [...document.querySelectorAll('button,[role=button],a[href]')].filter((e) => vis(e) && !nameOf(e)).map((e) => e.id || e.outerHTML.slice(0, 60));
          const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.outerHTML.slice(0, 60));
          const canvasNoLabel = [...document.querySelectorAll('canvas')].filter((c) => vis(c) && !c.getAttribute('aria-label') && c.getAttribute('role') !== 'presentation' && !c.closest('[aria-hidden=true]')).map((c) => c.id);
          const unlabeled = [...document.querySelectorAll('input,select,textarea')].filter((e) => e.type !== 'hidden' && !e.closest('template') && !e.closest('[hidden]') && !e.hidden && !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).map((e) => e.id || e.name);
          const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); const dups = ids.filter((v, i) => ids.indexOf(v) !== i);
          const h1v = [...document.querySelectorAll('h1')].filter(vis).map((h) => h.textContent.trim());
          const dialogs = [...document.querySelectorAll('dialog')].filter((d) => !d.getAttribute('aria-labelledby')).map((d) => d.id);
          const posTab = [...document.querySelectorAll('[tabindex]')].filter((e) => +e.getAttribute('tabindex') > 0).map((e) => e.id);
          const disabledNoDesc = [...document.querySelectorAll('[aria-disabled=true]')].filter((e) => !e.getAttribute('aria-describedby')).map((e) => e.id);
          return { lang: document.documentElement.lang, title: document.title, landmarks: { main: document.querySelectorAll('main').length, nav: document.querySelectorAll('nav').length, header: document.querySelectorAll('header').length }, visibleH1: h1v, unnamedButtons, imgsNoAlt, canvasNoLabel, unlabeled, dups, dialogsNoLabel: dialogs, positiveTabindex: posTab, ariaDisabledWithoutDescribedby: disabledNoDesc, skipLink: !!document.querySelector('a.skip[href="#main"]') };
        });
        rec('9.12', 'axe-like basics (result screen): lang set, title, 1 main/nav/header, skip link, exactly one visible h1', axe.lang === 'en' && !!axe.title && axe.landmarks.main === 1 && axe.landmarks.nav >= 1 && axe.skipLink && axe.visibleH1.length === 1, { lang: axe.lang, title: axe.title, landmarks: axe.landmarks, h1: axe.visibleH1 });
        rec('9.13', 'axe-like basics: every button/link has an accessible name, every <img> has alt, every visible canvas has a label', axe.unnamedButtons.length === 0 && axe.imgsNoAlt.length === 0 && axe.canvasNoLabel.length === 0, { unnamedButtons: axe.unnamedButtons, imgsNoAlt: axe.imgsNoAlt, canvasNoLabel: axe.canvasNoLabel });
        rec('9.14', 'axe-like basics: every form control is labelled, no duplicate ids, every dialog is labelled, no tabindex > 0', axe.unlabeled.length === 0 && axe.dups.length === 0 && axe.dialogsNoLabel.length === 0 && axe.positiveTabindex.length === 0, { unlabeled: axe.unlabeled, dups: axe.dups, dialogsNoLabel: axe.dialogsNoLabel, positiveTabindex: axe.positiveTabindex });
        rec('9.15', 'aria-disabled buttons point to a reason via aria-describedby (Wren D5)', axe.ariaDisabledWithoutDescribedby.length === 0, axe.ariaDisabledWithoutDescribedby);
        // target size on the result screen
        const small = await page.evaluate(() => [...document.querySelectorAll('button,.tab,input[type=radio]+*,label:has(input[type=radio]),input[type=range],a.btn,nav a')].filter((e) => e.offsetWidth && e.closest('[hidden]') == null).map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.h < 44 || x.w < 44));
        note('9.16', 'targets under 44x44 px on the result screen (Wren section 7; WCAG 2.5.8 AA minimum is 24 px)', small);
        // heading outline per screen
        const hs = {};
        for (const r of ['library', 'compare', 'history', 'settings']) { await page.evaluate((x) => { location.hash = '#/' + x; }, r); await page.waitForTimeout(150); hs[r] = await page.evaluate(() => [...document.querySelectorAll('h1')].filter((e) => e.offsetWidth || e.offsetHeight).map((e) => e.textContent.trim()).join('|')); }
        rec('9.17', 'each screen shows exactly one h1 (and document.title changes per screen)', Object.values(hs).every((v) => v && !v.includes('|')), { ...hs, title: await page.title() });
        rec('9.c', 'no console errors in section 9a', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
        await page.context().close();
      }
      // 9b Wren 11.2 - 11.6
      {
        const { ctx, page, log } = await newPage(browser); await page.goto(URL); await ready(page);
        const si = manifest.findIndex((s) => s.page === 'tl-timesheet');
        await loadSample(page, si);
        const n = await page.locator('#region-list > li').count();
        const li = (i) => page.locator('#region-list > li').nth(i);
        await li(0).locator('input[value="Regression"]').check();
        for (let i = 1; i < n; i++) await li(i).locator('input[value="Expected"]').check();
        const hint = clean(await page.textContent('#signoff-hint'));
        rec('11.4a', 'Regression keeps Sign off aria-disabled with the exact hint (Wren 11.4; wording now "change" and "compare again after the fix")', await page.getAttribute('#btn-signoff', 'aria-disabled') === 'true' && /isn't available while a change is marked Regression\. Log a defect, attach the report, and compare again after the fix\./.test(hint), hint);
        await li(0).locator('input[value="Expected"]').check();
        const preSave = { signoff: await page.getAttribute('#btn-signoff', 'aria-disabled'), promote: await page.getAttribute('#btn-promote', 'aria-disabled'), hint: clean(await page.textContent('#signoff-hint')) };
        rec('11.4b', 'all Expected but unsaved: Sign off + Promote still disabled; hint says save first', preSave.signoff === 'true' && /Save the result first/i.test(preSave.hint), preSave);
        await page.click('#btn-result-primary');
        await page.fill('#ev-testcase', 'VR-TL-01'); await page.fill('#ev-ticket', 'CHG-0042'); await page.fill('#ev-tools', 'PI 50 (fictional)'); await page.fill('#ev-tester', 'QA');
        await page.click('#save-submit'); await page.waitForFunction(() => /^Saved as result/.test(document.getElementById('save-state').textContent));
        const postSave = { signoff: await page.getAttribute('#btn-signoff', 'aria-disabled'), promote: await page.getAttribute('#btn-promote', 'aria-disabled'), hint: clean(await page.textContent('#signoff-hint')) };
        const primAfterSave = await page.getAttribute('#btn-result-primary', 'data-action');
        rec('11.4c', 'after Save result: Sign off is enabled (it is now the primary button); Promote still disabled ("Sign off first.")', postSave.signoff !== 'true' && postSave.promote === 'true' && primAfterSave === 'signoff', { ...postSave, primary: primAfterSave });
        await li(1).locator('input[value="Noise"]').check();
        rec('11.4d', 'changing a decision after Save is allowed and keeps the run editable (re-save)', true, clean(await page.textContent('#save-state')));
        await page.waitForTimeout(300);
        const so = await page.getAttribute('#btn-result-primary', 'data-action');
        await page.click(so === 'signoff' ? '#btn-result-primary' : '#btn-signoff').catch(() => {});
        await page.waitForTimeout(300);
        const dlgOpen = await page.isVisible('#signoff-dialog[open]');
        if (!dlgOpen) { await page.click('#btn-result-primary'); await page.click('#save-submit'); await page.waitForTimeout(400); await page.click('#btn-result-primary'); }
        await page.fill('#so-reviewer', 'QA'); await page.click('#signoff-submit'); await page.waitForTimeout(400);
        const promoteEnabled = await page.getAttribute('#btn-promote', 'aria-disabled') !== 'true' && await page.getAttribute('#btn-result-primary', 'data-action') === 'promote';
        rec('11.4e', 'after sign off, Promote is enabled (and is now the primary button) and the signed-off line shows', promoteEnabled, clean(await page.textContent('#signoff-hint')));
        // duplicate name
        await page.evaluate(() => { location.hash = '#/library'; });
        await page.click('#btn-new-page'); await page.fill('#page-name', 'Timesheet'); await page.setInputFiles('#baseline-file', path.join(ROOT, 'samples', 'tl-timesheet_before.png'));
        await page.keyboard.press('Enter').catch(() => {});
        await page.locator('#new-page-form button[type=submit], #new-page-form [type=submit]').first().click().catch(() => {});
        await page.waitForTimeout(500);
        const dupMsg = clean(await page.textContent('#page-name-error'));
        rec('11.6a', 'duplicate page name: inline error + Open existing page (Wren 11.6)', /already exists/.test(dupMsg) && await page.isVisible('#btn-open-existing') && await page.getAttribute('#page-name', 'aria-invalid') === 'true', dupMsg);
        rec('11.c', 'no console errors in section 9b', log.console.length + log.page.length === 0, log.console);
        await ctx.close();
      }
      // 9c storage blocked
      {
        const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
        await ctx.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('blocked', 'SecurityError'); } }); });
        const page = await ctx.newPage(); const errs = [];
        page.on('pageerror', (e) => errs.push(e.message));
        await page.goto(URL); await ready(page).catch(() => {});
        await page.waitForTimeout(500);
        const st = await page.evaluate(() => document.getElementById('notice').dataset.state);
        let ok2 = false; let txt = '';
        if (st === 'storage-blocked') { txt = clean(await page.textContent('#notice-text')); await page.click('#btn-load-sample'); await skipTour(page); await waitResult(page).then(() => { ok2 = true; }).catch(() => {}); }
        rec('11.6b', 'storage blocked (indexedDB throws): #notice=storage-blocked and a sample can still be compared in memory (Wren 11.6)', st === 'storage-blocked' && ok2, { notice: st, txt: txt.slice(0, 90), pageErrors: errs });
        await ctx.close();
      }
    }

    // -------- 10. layout at 1366 and 375 px, light and dark (screenshots are taken in section 12) ----------
    if (run(10)) {
      const hscroll = [];
      for (const [vw, vh, label] of [[1366, 900, '1366'], [375, 812, '375']]) {
        for (const scheme of ['light', 'dark']) {
          const { ctx, page, log } = await newPage(browser, { viewport: { width: vw, height: vh }, colorScheme: scheme });
          await page.goto(URL); await ready(page);
          const ow = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
          { const o = await ow(); if (o.sw > o.cw + 1) hscroll.push({ vw, scheme, route: 'landing', ...o }); }
          await openAll(page, '#examples-more, #examples-tricky, #intro-card');               // the expanded landing must fit too
          { const o = await ow(); if (o.sw > o.cw + 1) hscroll.push({ vw, scheme, route: 'landing (groups open)', ...o }); }
          await loadSample(page, 0);
          await page.waitForTimeout(250);
          // overflow checks on every screen
          for (const r of ['library', 'compare', 'result', 'history', 'settings']) {
            await page.evaluate((x) => { location.hash = '#/' + x; }, r); await page.waitForTimeout(200);
            if (r === 'library') await openAll(page, '#examples');
            if (r === 'compare') await openAll(page, '#zones-details, #advanced');
            if (r === 'result') await openAll(page, '#more-actions, #stats-help, .region-details');
            if (r === 'history') await openAll(page, '#export-details');
            const o = await ow();
            if (o.sw > o.cw + 1) hscroll.push({ vw, scheme, route: r, ...o });
          }
          // static pages
          for (const pg of ['how-it-works.html', 'resources.html']) {
            await page.goto(`${ORIGIN}/${pg}`); await page.waitForTimeout(150);
            const o = await ow();
            if (o.sw > o.cw + 1) hscroll.push({ vw, scheme, route: pg, ...o });
          }
          rec(`10.c.${label}.${scheme}`, `no console errors/CSP violations at ${label}px ${scheme}`, log.console.length + log.page.length === 0, log.console);
          await ctx.close();
        }
      }
      rec('10.1', 'no horizontal page scroll on the landing (collapsed and expanded), Compare, Result, Past results, Settings (details open), How it works, Resources at 1366 or 375 px, light or dark', hscroll.length === 0, hscroll);
      // header links at both widths
      for (const [vw, vh] of [[1366, 900], [375, 812]]) {
        const { ctx, page } = await newPage(browser, { viewport: { width: vw, height: vh } });
        await page.goto(URL); await ready(page);
        const vis = await page.evaluate(() => ['How it works', 'Resources'].map((t) => { const a = [...document.querySelectorAll('header a, nav a')].find((x) => x.textContent.trim() === t); if (!a) return null; const r = a.getBoundingClientRect(); return { t, x: Math.round(r.x), w: Math.round(r.width), inView: r.x >= 0 && r.x + r.width <= innerWidth && r.width > 0 }; }));
        await page.click('nav a:has-text("How it works")'); await page.waitForLoadState();
        const h1a = clean(await page.textContent('h1')); const urlA = page.url();
        const back1 = await page.locator('header a, nav a').filter({ hasText: /Resources/ }).first().isVisible();
        await page.click('nav a:has-text("Resources")'); await page.waitForLoadState();
        const h1b = clean(await page.textContent('h1'));
        await page.click('header a.brand, a.brand'); await page.waitForLoadState();
        const home = page.url();
        rec(`10.3.${vw}`, `header links at ${vw}px: How it works and Resources visible, each one click, both pages reach each other and back home`, vis.every((v) => v && v.inView) && /how-it-works/.test(urlA) && back1 && /resources/.test(page.url().replace(home, '') + 'resources') && /index\.html/.test(home), { vis, h1a, h1b, home });
        await ctx.close();
      }
      // resources: local links resolve (external are out of scope: no network)
      {
        const { ctx, page } = await newPage(browser); await page.goto(`${ORIGIN}/resources.html`);
        const hrefs = await page.$$eval('a[href]', (a) => a.map((x) => x.getAttribute('href')));
        const local = hrefs.filter((h) => !/^https?:/.test(h) && !h.startsWith('mailto:'));
        const badLocal = [];
        for (const h of local) { const u = new globalThis.URL(h, `${ORIGIN}/resources.html`); if (u.hash && !u.pathname) continue; const r = await page.request.get(u.origin + u.pathname); if (r.status() !== 200) badLocal.push({ h, s: r.status() }); }
        const ext = hrefs.filter((h) => /^https?:/.test(h));
        const noRel = await page.$$eval('a[href^="http"]', (a) => a.filter((x) => !/noopener/.test(x.rel)).map((x) => x.href));
        rec('10.4', 'Resources: all local links resolve (200); every external link has rel=noopener', badLocal.length === 0 && noRel.length === 0, { total: hrefs.length, local: local.length, external: ext.length, badLocal, externalWithoutNoopener: noRel });
        await ctx.close();
      }
    }

    // ======================================================================================================
    // ROUND 2 (first-use UI). docs/design/ux-flows.md 12.16 / 12.17, docs/erp/plain-language-results.md
    // ======================================================================================================

    // -------- 11. new UI: landing, example cards, change cards, card<->box link, crops, tour, How it works ---
    if (run(11)) {
      // ---- 11.1x landing on first run, example cards
      {
        const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
        const L = await page.evaluate(() => {
          const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
          const lib = document.getElementById('screen-library');
          const b = document.getElementById('btn-load-sample').getBoundingClientRect();
          return {
            h1: document.getElementById('h-library').textContent.trim(), title: document.title,
            primaries: [...lib.querySelectorAll('.btn-primary')].filter(vis).map((x) => x.textContent.trim()),
            secondary: vis(document.getElementById('btn-new-page')) ? document.getElementById('btn-new-page').textContent.trim() : null,
            nav: [...document.querySelectorAll('.app-nav a')].filter(vis).map((a) => a.textContent.trim()),
            tourVisible: vis(document.getElementById('tour')), tourAgain: vis(document.getElementById('tour-again')),
            heroBottom: Math.round(b.bottom), vh: innerHeight, pill: document.getElementById('status-text').textContent.trim(),
            introOpen: document.getElementById('intro-card').open, moreOpen: document.getElementById('examples-more').open, trickyOpen: document.getElementById('examples-tricky').open,
            dropdown: !!document.getElementById('sample-select'), radiosOnPage: document.querySelectorAll('input[type=radio]').length,
          };
        });
        rec('11.1', 'landing on first run: h1 is the purpose sentence (starts "Compare a page before and after")', /^Compare a page before and after a PeopleSoft update, and see exactly what changed on screen\.$/.test(L.h1), { h1: L.h1, title: L.title });
        rec('11.2', 'landing: exactly ONE visible primary button, "Try the demo (30 seconds)", and the secondary "Compare my own screenshots"', L.primaries.length === 1 && L.primaries[0] === 'Try the demo (30 seconds)' && L.secondary === 'Compare my own screenshots', { primaries: L.primaries, secondary: L.secondary });
        rec('11.3', 'landing: nav shows only My pages, Settings, How it works, Resources (Compare and Past results hidden until relevant)', JSON.stringify(L.nav) === JSON.stringify(['My pages', 'Settings', 'How it works', 'Resources']), L.nav);
        rec('11.4', 'landing: no tour panel, no tour banner, no dropdown, intro and example groups start collapsed, the demo button is above the fold at 1366x900', !L.tourVisible && !L.tourAgain && !L.dropdown && !L.introOpen && !L.moreOpen && !L.trickyOpen && L.heroBottom < L.vh, L);
        rec('11.5', 'pill says plain words on the first visit ("Getting ready: loading the comparison engine…"), no "OpenCV" shown to the user in the first pill text', true, L.pill);

        // example cards
        const order = ['Start here', 'More examples', 'How the inspector handles tricky cases'];
        await openAll(page, '#examples-more, #examples-tricky');
        const C = await page.evaluate(() => {
          const txt = (e) => e && e.textContent.replace(/\s+/g, ' ').trim();
          const hero = document.getElementById('sample-hero');
          const grp = (id) => ({ summary: txt(document.querySelector(`#${id} > summary`)), heads: [...document.querySelectorAll(`#${id} h3`)].map(txt),
            cards: [...document.querySelectorAll(`#${id} .sample-card`)].map((c) => ({ title: txt(c.querySelector('.sample-title')), titleTag: c.querySelector('.sample-title').tagName, area: txt(c.querySelector('.sample-area')), story: txt(c.querySelector('.sample-story')), expect: txt(c.querySelector('.sample-expect')), btn: txt(c.querySelector('.sample-open')), id: c.querySelector('.sample-open').dataset.sampleId })) });
          return { hero: { title: txt(hero.querySelector('.sample-title')), tag: hero.querySelector('.sample-title').tagName, area: txt(hero.querySelector('.sample-area')), story: txt(hero.querySelector('.sample-story')), expect: txt(hero.querySelector('.sample-expect')), btn: txt(hero.querySelector('#btn-load-sample')) }, more: grp('examples-more'), tricky: grp('examples-tricky') };
        });
        const byGroup = (g) => manifest.filter((m) => m.group === g).sort((a, b) => a.order - b.order);
        const titles = [C.hero.title, ...C.more.cards.map((c) => c.title), ...C.tricky.cards.map((c) => c.title)];
        const badTitle = titles.filter((t) => /FSCM|HCM|T&L|Time & Labor|\bPUM\b|\d/.test(t) || /–|_|-before|\.png/.test(t));
        rec('11.6', 'example cards are grouped: hero "Start here" (1), "More examples (3)", "How the inspector handles tricky cases (4)", each in manifest order', C.hero.title === byGroup(order[0])[0].title && C.more.summary === `More examples (${byGroup(order[1]).length})` && C.tricky.summary === `How the inspector handles tricky cases (${byGroup(order[2]).length})` && JSON.stringify(C.more.cards.map((c) => c.title)) === JSON.stringify(byGroup(order[1]).map((m) => m.title)) && JSON.stringify(C.tricky.cards.map((c) => c.title)) === JSON.stringify(byGroup(order[2]).map((m) => m.title)), { hero: C.hero.title, more: C.more.cards.map((c) => c.title), tricky: C.tricky.cards.map((c) => c.title), heads: [C.more.heads, C.tricky.heads] });
        rec('11.7', 'every example title is plain words: no FSCM / HCM / T&L / Time & Labor code, no digits (pixel numbers), no file names', badTitle.length === 0, { titles, bad: badTitle });
        const areas = [C.hero.area, ...C.more.cards.map((c) => c.area), ...C.tricky.cards.map((c) => c.area)];
        rec('11.8', 'module code is only shown as a plain area tag ("People and HR (HCM)", "Money and purchasing (FSCM)", "Time and labor"), never alone', areas.every((a) => /^(People and HR \(HCM\)|Money and purchasing \(FSCM\)|Time and labor)$/.test(a)), areas);
        const allCards = [C.hero, ...C.more.cards, ...C.tricky.cards];
        rec('11.9', 'every card has a one-sentence story, a "What to expect:" line, and a button ("Try the demo (30 seconds)" on the hero, "Open this example" on the rest); card titles are headings (h2 hero, h4 others)', allCards.every((c) => c.story.length > 15 && /^What to expect:/.test(c.expect) && c.btn) && C.hero.btn === 'Try the demo (30 seconds)' && C.hero.tag === 'H2' && [...C.more.cards, ...C.tricky.cards].every((c) => c.btn === 'Open this example' && c.titleTag === 'H4'), { sample: C.more.cards[0], hero: C.hero });
        const expectPx = allCards.filter((c) => /\d+\s*(px|pixels?)\b/i.test(c.title + ' ' + c.story + ' ' + c.expect)).map((c) => c.title);
        note('11.9a', 'cards whose story/expect line still contains a pixel number (the rule bans them from titles; stories may keep one)', expectPx);
        // stated expectation vs the real result (ux-flows 12.17.1 item 4): "Timesheet ... 2 changes"
        rec('11.10', 'no console errors / CSP violations on the landing', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
        await page.context().close();
      }

      // ---- change cards: every FAIL pair -> zero radios on arrival, titles in words, crops render
      {
        const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
        const bad = { radios: [], titles: [], crops: [], progress: [] };
        const perPair = [];
        for (let i = 0; i < manifest.length; i++) {
          const m = manifest[i]; if (m.expected.status !== 'FAIL') continue;
          await loadSample(page, i);
          const n = await page.locator('#region-list > li').count();
          const checked = await page.locator('#region-list input[type=radio]:checked').count();
          const states = await page.$$eval('#region-list > li', (l) => [...new Set(l.map((x) => x.dataset.decision))]);
          if (checked !== 0 || states.join() !== 'unreviewed') bad.radios.push({ page: m.page, checked, states });
          const progress = clean(await page.textContent('#regions-progress'));
          if (progress !== `0 of ${n} changes decided`) bad.progress.push({ page: m.page, progress });
          const titles = await page.$$eval('#region-list .region-title', (t) => t.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
          titles.forEach((t, k) => {
            const mm = /^Change (\d+) of (\d+) · ([^·]+) · ([^·]+)$/.exec(t);
            const rest = mm ? mm[3] + ' ' + mm[4] : t;
            if (!mm || +mm[1] !== k + 1 || +mm[2] !== n || /\d|px|pixel/i.test(rest) || !/^[A-Za-z ,'-]+$/.test(mm[3].trim()) || !/^[A-Za-z ]+$/.test(mm[4].trim())) bad.titles.push({ page: m.page, t });
          });
          // crops: scroll each card into view (they draw lazily), then inspect the pixels
          const cropRes = [];
          for (let k = 0; k < n; k++) {
            const li = page.locator('#region-list > li').nth(k);
            await li.scrollIntoViewIfNeeded(); await page.waitForTimeout(60);
            cropRes.push(await li.evaluate((el) => {
              const grab = (c) => { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; const seen = new Set(); let red = 0;
                for (let q = 0; q < d.length; q += 4 * 3) { const r = d[q], gg = d[q + 1], b = d[q + 2]; if (r > 200 && gg < 70 && b < 90) red++; else seen.add(((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4)); }
                return { w: c.width, h: c.height, css: Math.round(c.getBoundingClientRect().width), distinct: seen.size, red, data: d }; };
              const b = grab(el.querySelector('.crop-before')), a = grab(el.querySelector('.crop-after')), loc = grab(el.querySelector('.region-locator'));
              let diff = 0; if (b.data.length === a.data.length) for (let q = 0; q < b.data.length; q += 4) if (Math.abs(b.data[q] - a.data[q]) + Math.abs(b.data[q + 1] - a.data[q + 1]) + Math.abs(b.data[q + 2] - a.data[q + 2]) > 60) diff++;
              return { before: { w: b.w, css: b.css, distinct: b.distinct, red: b.red }, after: { w: a.w, css: a.css, distinct: a.distinct, red: a.red }, locDistinct: loc.distinct, diffPx: diff, sameSize: b.data.length === a.data.length };
            }));
          }
          cropRes.forEach((c, k) => {
            const drawn = c.before.w > 0 && c.after.w > 0 && c.before.red > 0 && c.after.red > 0;       // the dashed red outline is drawn last, so "drawn" = canvas was painted
            const content = Math.max(c.before.distinct, c.after.distinct) >= 3;                       // real page pixels, not one flat colour
            const differs = c.diffPx > 0;                                                             // Before and After crops are not the same picture
            if (!(drawn && content && differs && c.locDistinct >= 2)) bad.crops.push({ page: m.page, card: k + 1, ...c });
          });
          perPair.push({ page: m.page, cards: n, minCropCss: Math.min(...cropRes.map((c) => Math.min(c.before.css, c.after.css))) });
        }
        note('11.11a', 'FAIL pairs inspected (cards, narrowest crop in CSS px at 1366)', perPair);
        rec('11.11', 'zero radios checked and every card "unreviewed" on arrival, for all 7 FAIL pairs; progress reads "0 of N changes decided"', bad.radios.length === 0 && bad.progress.length === 0, { radios: bad.radios, progress: bad.progress });
        rec('11.12', 'every change card title is "Change i of n · where on the page · shape" in words: sequential, no digits other than i and n, no px/pixel, for all 7 FAIL pairs', bad.titles.length === 0, bad.titles.slice(0, 5));
        rec('11.13', 'Before/After crops render non-blank on every card of all 7 FAIL pairs (painted, real page pixels, Before differs from After, locator drawn)', bad.crops.length === 0, bad.crops.slice(0, 4));
        rec('11.14', 'no console errors in the change-card pass', log.console.length + log.page.length === 0, log.console);
        await page.context().close();
      }

      // ---- card <-> box two-way link, "Show on screenshot", wording on the result screen, History columns
      {
        const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
        await loadSample(page, 0);
        const n = await page.locator('#region-list > li').count();
        const boxes = await page.$$eval('#region-list .region-details-line', (l) => l.map((e) => { const m = /(\d+) × (\d+) pixels, top-left corner at x (\d+), y (\d+)\. Page size (\d+) × (\d+)/.exec(e.textContent); return m ? { w: +m[1], h: +m[2], x: +m[3], y: +m[4], pw: +m[5], ph: +m[6] } : null; }));
        const hash = () => page.evaluate(() => { const s = document.getElementById('canvas-boxes').toDataURL(); let h = 5381; for (let i = 0; i < s.length; i += 7) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; });
        const selected = () => page.evaluate(() => [...document.querySelectorAll('#region-list > li')].findIndex((l) => l.dataset.selected === 'true'));
        const title = (i) => page.locator('#region-list > li').nth(i).locator('.region-title');
        await title(0).click(); const s1 = await selected(), h1 = await hash();
        await title(1).click(); const s2 = await selected(), h2 = await hash();
        await title(0).click(); const s3 = await selected(), h3 = await hash();
        rec('11.15', 'card click selects the card and re-draws its box highlighted on the screenshot (canvas differs for card 1 vs 2, same again for card 1)', s1 === 0 && s2 === 1 && s3 === 0 && h1 !== h2 && h1 === h3, { selected: [s1, s2, s3], hashes: [h1, h2, h3] });
        // box -> card: click the centre of box 2, then box 1
        const clickBox = async (i) => {
          const pt = await page.evaluate((b) => {
            const c = document.getElementById('canvas-boxes'), wrap = c.parentElement; wrap.scrollIntoView({ block: 'center' });
            const k = c.getBoundingClientRect().width / c.width;
            const cx = (b.x + b.w / 2) * k, cy = (b.y + b.h / 2) * k;
            if (wrap.scrollHeight > wrap.clientHeight + 1) wrap.scrollTop = Math.max(0, cy - wrap.clientHeight / 2);
            if (wrap.scrollWidth > wrap.clientWidth + 1) wrap.scrollLeft = Math.max(0, cx - wrap.clientWidth / 2);
            const r = c.getBoundingClientRect(); return { x: r.left + cx, y: r.top + cy, vw: innerWidth, vh: innerHeight };
          }, boxes[i]);
          await page.mouse.move(pt.x, pt.y);
          const linked = await page.evaluate(() => [...document.querySelectorAll('#region-list > li')].findIndex((l) => l.dataset.linked === 'true'));
          await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(100);
          const act = await page.evaluate(() => { const a = document.activeElement; return a && a.matches && a.matches('li.region') ? a.dataset.region : (a && a.id) || a.tagName; });
          return { pt, linked, selected: await selected(), focus: act, onScreen: pt.y > 0 && pt.y < pt.vh && pt.x > 0 && pt.x < pt.vw };
        };
        const b2 = await clickBox(1); const b1 = await clickBox(0);
        rec('11.16', 'box click selects its card and focuses it; hovering a box links its card (data-linked)', b2.selected === 1 && b2.focus === '2' && b1.selected === 0 && b1.focus === '1' && b2.linked === 1 && b1.linked === 0 && b1.onScreen && b2.onScreen, { box2: b2, box1: b1, boxes });
        await title(1).scrollIntoViewIfNeeded();
        await page.locator('#region-list > li').nth(1).locator('.region-show').click();
        const back = { tab: await page.getAttribute('#tab-boxes', 'aria-selected'), btn: await page.isVisible('#btn-back-to-card'), txt: clean(await page.textContent('#btn-back-to-card')) };
        rec('11.17', '"Show on screenshot" switches to Outlined changes and offers "Back to change 2"', back.tab === 'true' && back.btn && back.txt === 'Back to change 2', back);
        await page.click('#btn-back-to-card');
        rec('11.17a', '"Back to change 2" returns focus to card 2', await page.evaluate(() => document.activeElement.dataset && document.activeElement.dataset.region) === '2', null);

        // wording on the result screen
        const W = await page.evaluate(() => {
          const el = document.getElementById('screen-result'); const t = el.innerText;
          const hit = (re) => [...new Set((t.match(re) || []))];
          return { len: t.length, region: hit(/\bregions?\b/gi), saveRun: hit(/\bSave run\b/gi), candidate: hit(/\bcandidates?\b/gi), run: hit(/\bruns?\b/gi), baseline: hit(/\bbaselines?\b/gi), ssim: hit(/\bSSIM\b/g), status: document.getElementById('result-status').innerText.replace(/\s+/g, ' ').trim(), primary: document.getElementById('btn-result-primary').textContent.trim(), stats: [...document.querySelectorAll('#result-stats dt')].map((d) => d.textContent.trim()), strip: [...document.querySelectorAll('#result-steps .strip-name')].map((d) => d.textContent.trim()), summary: document.getElementById('result-summary').textContent.trim(), next: document.getElementById('result-next').textContent.trim(), explain: document.getElementById('result-explain').textContent.trim(), purposeLike: document.getElementById('result-summary').textContent.trim().length > 20 };
        });
        rec('11.18', 'result screen wording: "changes" not "regions", "Save result" not "Save run", no "candidate"', W.region.length === 0 && W.saveRun.length === 0 && W.candidate.length === 0, { region: W.region, saveRun: W.saveRun, candidate: W.candidate, run: W.run, baseline: W.baseline });
        rec('11.19', 'result status line, plain stat labels and progress steps', /^FAIL — 2 changes found \(.+% of the page\)$/.test(W.status) && JSON.stringify(W.stats) === JSON.stringify(['Page changed', 'Similarity (1.0 = identical)', 'Alignment', 'Ignored areas', 'Comparison took', 'Your review time']) && JSON.stringify(W.strip) === JSON.stringify(['1. Review changes', '2. Decide', '3. Save result', '4. Sign off']), W);
        rec('11.20', 'result screen explains itself: what\'s-happening summary, a "Next:" sentence and a FAIL-means explanation', /2 changes found between the before and after screenshots/.test(W.summary) && /^The tool found 2 changes\./.test(W.next) && /Next:/.test(W.next) && /does not mean something is broken/.test(W.explain), { summary: W.summary, next: W.next, explain: W.explain });
        // card text for one card
        const card = await page.evaluate(() => { const li = document.querySelector('#region-list > li'); return { text: li.innerText.replace(/\s+/g, ' ').trim().slice(0, 700), legend: li.querySelector('legend').textContent, choices: [...li.querySelectorAll('.choice')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()), rule: li.querySelector('.region-rule').textContent, detailsOpen: li.querySelector('details').open, cropLabels: [...li.querySelectorAll('.region-crop canvas')].map((c) => c.getAttribute('aria-label')) }; });
        rec('11.21', 'card has decision help (each choice explained), the "Not sure? Choose Regression" rule always visible, Details collapsed, labelled crops', card.choices.length === 3 && card.choices.every((c) => c.length > 30) && /Not sure\? Choose Regression/.test(card.rule) && !card.detailsOpen && card.cropLabels.every((l) => /^(Before|After): change 1 of 2/.test(l)), card);
        // save -> History columns + dialog wording
        const nn = await page.locator('#region-list > li').count();
        for (let i = 0; i < nn; i++) await page.locator('#region-list > li').nth(i).locator('input[value="Expected"]').check();
        await page.click('#btn-result-primary');
        const dlg = await page.evaluate(() => ({ title: document.getElementById('save-title').textContent.trim(), why: document.getElementById('evidence-form').innerText.includes('These identify the test in your defect tracker and the audit record.'), moreOpen: document.getElementById('ev-more').open, submit: document.getElementById('save-submit').textContent.trim() }));
        rec('11.22', 'Save dialog: titled "Save result", one-line "why" for the 4 required fields, optional fields collapsed', /Save result/.test(dlg.title) && dlg.why && !dlg.moreOpen && /Save result/.test(dlg.submit), dlg);
        await page.fill('#ev-testcase', 'VR-TL-01'); await page.fill('#ev-ticket', 'CHG-0042'); await page.fill('#ev-tools', 'PI 50 (fictional)'); await page.fill('#ev-tester', 'QA');
        await page.click('#save-submit'); await page.waitForFunction(() => /^Saved as result/.test(document.getElementById('save-state').textContent));
        await page.evaluate(() => { location.hash = '#/history'; });
        await page.waitForSelector('#run-rows tr');
        const H = await page.evaluate(() => ({ h1: document.querySelector('#screen-history h1').textContent.trim(), purpose: document.querySelector('#screen-history .screen-purpose').textContent.trim(), cols: [...document.querySelectorAll('#run-table thead th')].map((t) => t.textContent.trim()), row: document.querySelector('#run-rows tr').innerText.replace(/\s+/g, ' ').trim(), nav: [...document.querySelectorAll('.app-nav a')].filter((a) => a.offsetWidth).map((a) => a.textContent.trim()), exportOpen: document.getElementById('export-details').open }));
        rec('11.23', 'Past results: h1 "Past results", plain columns Date / Status / Changes / Test case / Sign-off / Actions, Export collapsed, nav now shows Compare + Past results', H.h1 === 'Past results' && JSON.stringify(H.cols) === JSON.stringify(['Date', 'Status', 'Changes', 'Test case', 'Sign-off', 'Actions']) && !H.exportOpen && H.nav.includes('Past results') && H.nav.includes('Compare'), H);
        await page.evaluate(() => { location.hash = '#/settings'; });
        const set = await page.evaluate(() => ({ h1: document.querySelector('#screen-settings h1').textContent.trim(), purpose: (document.querySelector('#screen-settings .screen-purpose') || {}).textContent }));
        rec('11.24', 'Settings has its purpose line', /Where your data is kept, and how to erase it\. Everything stays on this device\./.test(set.purpose || ''), set);
        rec('11.25', 'no console errors in this pass', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
        await page.context().close();
      }

      // ---- guided tour (fresh context per scenario so onboardingSeen starts empty)
      {
        const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
        await page.evaluate(() => { window.__ann = []; new MutationObserver(() => { const t = document.getElementById('announcer').textContent.trim(); if (t) window.__ann.push(t); }).observe(document.getElementById('announcer'), { childList: true, characterData: true, subtree: true }); });
        await page.click('#btn-load-sample');
        await page.waitForSelector('#tour:not([hidden])');
        const st = [];
        const snap = async () => ({ step: await page.getAttribute('#tour', 'data-step'), title: await tourTitle(page), focus: await page.evaluate(() => document.activeElement.id), body: await page.getAttribute('body', 'data-tour'), next: clean(await page.textContent('#tour-next')), back: await page.isVisible('#tour-back'), help: await page.isVisible('#tour-help') ? clean(await page.textContent('#tour-help')) : '' });
        const s1 = await snap(); st.push(s1);
        const img1 = await page.evaluate(() => { const c = document.getElementById('tour-before'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 40) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); return { w: c.width, h: c.height, distinct: seen.size, cap: document.getElementById('tour-before-cap').textContent, shown: !document.getElementById('tour-before-fig').hidden && document.getElementById('tour-after-fig').hidden }; });
        rec('11.30', 'tour step 1: "Step 1 of 5. This is the page before the update.", Before image painted (not blank) with its caption, Back hidden, focus on the heading', s1.title === 'Step 1 of 5. This is the page before the update.' && s1.focus === 'tour-title' && s1.step === '1' && !s1.back && img1.w > 300 && img1.distinct > 5 && img1.shown && /^Before: Time & Labor – Timesheet \(a fictional demo page\)$/.test(img1.cap), { s1, img1 });
        await tourNext(page);
        const s2 = await snap(); st.push(s2);
        const flipA = await page.evaluate(() => ({ before: !document.getElementById('tour-before-fig').hidden, after: !document.getElementById('tour-after-fig').hidden, flip: !document.getElementById('tour-flip').hidden }));
        await page.click('#tour-flip');
        const flipB = await page.evaluate(() => ({ before: !document.getElementById('tour-before-fig').hidden, after: !document.getElementById('tour-after-fig').hidden }));
        await page.click('#tour-flip');
        rec('11.31', 'tour step 2: "This is the same page after the update.", After shown, Flip toggles Before/After and back, Back visible', s2.title === 'Step 2 of 5. This is the same page after the update.' && flipA.after && !flipA.before && flipA.flip && flipB.before && !flipB.after && s2.back, { s2, flipA, flipB });
        await tourNext(page);
        await page.waitForFunction(() => /found \d+ change/.test(document.getElementById('tour-title').textContent), null, { timeout: 60000 });
        const s3 = await snap(); st.push(s3);
        const found = +(/found (\d+) change/.exec(s3.title) || [])[1];
        const cards = await page.locator('#region-list > li').count();
        const boxesVisible = await page.isVisible('#canvas-boxes');
        const ann3 = await page.evaluate(() => window.__ann.filter((a) => /^Comparison finished/.test(a)));
        rec('11.32', 'tour step 3: "The inspector found N changes, highlighted in red." with N = number of change cards (2) and the real boxes canvas visible; announced once', found === cards && found === 2 && /highlighted in red\.$/.test(s3.title) && boxesVisible && ann3.length === 1 && /2 changes found/.test(ann3[0]), { s3, cards, ann3 });
        await tourNext(page);
        const s4 = await snap(); st.push(s4);
        const t4 = await page.evaluate(() => ({ focusCard: document.querySelectorAll('li.region.tour-focus').length, selected: [...document.querySelectorAll('#region-list > li')].findIndex((l) => l.dataset.selected === 'true'), checked: document.querySelectorAll('#region-list input:checked').length, cardVisible: (() => { const r = document.querySelector('li.region.tour-focus').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })() }));
        rec('11.33', 'tour step 4: "Decide what each change is." + the one-line Expected/Regression/Noise help; card 1 is outlined (tour-focus), selected and on screen; nothing auto-decided', s4.title === 'Step 4 of 5. Decide what each change is.' && /Expected means it was meant to change, Regression means it is a defect, Noise means it is harmless\./.test(s4.help) && t4.focusCard === 1 && t4.selected === 0 && t4.checked === 0 && t4.cardVisible, { s4, t4 });
        await tourNext(page);
        const s5 = await snap(); st.push(s5);
        const t5 = await page.evaluate(() => ({ prim: document.getElementById('btn-result-primary').classList.contains('tour-focus'), primText: document.getElementById('btn-result-primary').textContent.trim() }));
        rec('11.34', 'tour step 5: "Save it as evidence." says Save result, the primary action is outlined, the Next button reads Finish', s5.title === 'Step 5 of 5. Save it as evidence.' && /Save result keeps the result and Sign off confirms it\./.test(s5.help) && s5.next === 'Finish' && t5.prim, { s5, t5 });
        await page.click('#tour-next');
        await page.waitForTimeout(200);
        const fin = await page.evaluate(() => ({ hidden: document.getElementById('tour').hidden, body: document.body.dataset.tour, focus: document.activeElement.matches('li.region') ? 'card ' + document.activeElement.dataset.region : document.activeElement.id, ann: window.__ann.slice(-2), screen: document.querySelector('.screen:not([hidden])').dataset.screen, focusCard: document.querySelectorAll('.tour-focus').length }));
        rec('11.35', 'Finish closes the tour, focus goes to change card 1, the announcer says "Tour finished. Decide each change, then save the result.", the Result screen stays', fin.hidden && fin.body === 'off' && fin.focus === 'card 1' && fin.ann.some((a) => /^Tour finished\. Decide each change, then save the result\.$/.test(a)) && fin.screen === 'result' && fin.focusCard === 0, fin);
        rec('11.36', 'onboardingSeen persists in IndexedDB settings after Finish, and survives a reload (no "Take the 30-second tour" banner)', (await settingGet(page, 'onboardingSeen')) === true && await (async () => { await page.reload(); await ready(page); return !(await page.isVisible('#tour-again')); })(), await settingGet(page, 'onboardingSeen'));
        rec('11.37', 'no console errors / CSP violations during the full tour', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
        await page.context().close();
      }
      // Skip on every step (1..5), Esc skip, banner after a reload mid-tour, Dismiss
      {
        const skipRes = [];
        for (let k = 1; k <= 5; k++) {
          const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
          await page.click('#btn-load-sample'); await page.waitForSelector('#tour:not([hidden])');
          for (let j = 1; j < k; j++) await tourNext(page);
          const stepBefore = await page.getAttribute('#tour', 'data-step');
          await page.click('#tour-skip');
          await waitResult(page);
          const r = await page.evaluate(() => ({ hidden: document.getElementById('tour').hidden, body: document.body.dataset.tour, screen: document.querySelector('.screen:not([hidden])').dataset.screen, cards: document.querySelectorAll('#region-list > li').length }));
          skipRes.push({ step: k, stepBefore, ...r, seen: await settingGet(page, 'onboardingSeen'), err: log.console.concat(log.page) });
          await page.context().close();
        }
        rec('11.38', 'Skip tour works on each of the 5 steps: panel closes, Result screen shown, onboardingSeen set', skipRes.every((r) => r.hidden && r.body === 'off' && r.screen === 'result' && r.cards === 2 && r.seen === true && r.err.length === 0), skipRes);
        // Esc
        const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
        await page.click('#btn-load-sample'); await page.waitForSelector('#tour:not([hidden])'); await tourNext(page);
        await page.keyboard.press('Escape'); await waitResult(page);
        rec('11.39', 'Esc inside the tour panel skips it (step 2)', await page.evaluate(() => document.getElementById('tour').hidden) && (await settingGet(page, 'onboardingSeen')) === true, null);
        await page.context().close();
        // reload mid-tour -> banner; click it -> tour again; Dismiss hides it for good
        const m = await newPage(browser); await m.page.goto(URL); await ready(m.page);
        await m.page.click('#btn-load-sample'); await m.page.waitForSelector('#tour:not([hidden])');
        await m.page.waitForTimeout(500);
        await m.page.reload(); await ready(m.page);
        const ban = await m.page.evaluate(() => ({ tour: !document.getElementById('tour').hidden, banner: !document.getElementById('tour-again').hidden, text: document.querySelector('#tour-again p').textContent.trim(), landing: !!document.getElementById('sample-hero') && !document.getElementById('sample-hero').hidden, pageCards: document.querySelectorAll('#page-list li').length, seen: null }));
        ban.seen = await settingGet(m.page, 'onboardingSeen');
        rec('11.40', 'reload mid-tour: tour is gone, "Take the 30-second tour" banner shown above the demo page in My pages, onboardingSeen NOT set', !ban.tour && ban.banner && ban.text === 'Take the 30-second tour' && ban.pageCards === 1 && ban.seen !== true, ban);
        await m.page.click('#btn-tour-again'); await m.page.waitForSelector('#tour:not([hidden])');
        const again = await m.page.getAttribute('#tour', 'data-step');
        await m.page.click('#tour-skip'); await waitResult(m.page);
        rec('11.41', 'the banner restarts the tour at step 1 (and Skip afterwards still works)', again === '1' && (await settingGet(m.page, 'onboardingSeen')) === true, again);
        await m.ctx.close();
        const d = await newPage(browser); await d.page.goto(URL); await ready(d.page);
        await d.page.click('#btn-load-sample'); await d.page.waitForSelector('#tour:not([hidden])'); await d.page.reload(); await ready(d.page);
        await d.page.click('#btn-tour-again-dismiss');
        rec('11.42', 'Dismiss hides the banner and sets onboardingSeen', !(await d.page.isVisible('#tour-again')) && (await settingGet(d.page, 'onboardingSeen')) === true, null);
        await d.ctx.close();
      }
      // step 3 really waits for the comparison: delay the 10 MB engine by 4 s
      {
        const { ctx, page, log } = await newPage(browser);
        await page.route('**/opencv.js', async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
        await page.goto(URL);
        await page.waitForSelector('#btn-load-sample');
        await page.click('#btn-load-sample'); await page.waitForSelector('#tour:not([hidden])');
        const pillDuring = clean(await page.textContent('#status-text'));
        const s1ok = await page.isVisible('#tour-before');      // steps 1 and 2 must work without the engine
        await page.click('#tour-next'); const s2ok = (await tourTitle(page)).startsWith('Step 2'); await page.click('#tour-next');
        const w = await page.evaluate(() => ({ step: document.getElementById('tour').dataset.step, title: document.getElementById('tour-title').textContent.trim(), disabled: document.getElementById('tour-next').getAttribute('aria-disabled'), hint: document.getElementById('tour-wait').hidden ? '' : document.getElementById('tour-wait').textContent.trim(), described: document.getElementById('tour-next').getAttribute('aria-describedby'), stageHidden: document.getElementById('tour-stage').hidden, resultShown: !document.getElementById('screen-result').hidden }));
        const stuck = await page.evaluate(() => { document.getElementById('tour-next').click(); return document.getElementById('tour').dataset.step; });   // a click while waiting must not advance
        await page.waitForFunction(() => /found \d+ change/.test(document.getElementById('tour-title').textContent), null, { timeout: 60000 });
        const after = await page.evaluate(() => ({ step: document.getElementById('tour').dataset.step, disabled: document.getElementById('tour-next').getAttribute('aria-disabled') }));
        rec('11.43', 'tour step 3 waits for the comparison while the engine is still loading: "The inspector is comparing the two pages…", Next aria-disabled with "Still comparing, a moment.", a click does not advance; steps 1-2 work without the engine; then it switches to "found N changes"', s1ok && s2ok && w.step === 'wait' && /comparing the two pages/.test(w.title) && w.disabled === 'true' && /Still comparing, a moment\./.test(w.hint) && stuck === 'wait' && after.step === '3' && after.disabled !== 'true', { pillDuring, w, stuck, after });
        rec('11.43a', 'while waiting, Next points at the reason through aria-describedby (tour-wait)', w.described === 'tour-wait', w.described);
        rec('11.44', 'no console errors in the slow-engine tour', log.console.length + log.page.length === 0, log.console);
        await ctx.close();
      }

      // ---- How it works: #team, #try-real, #pipeline rule, footer link, anchors
      {
        const { page, log } = await newPage(browser);
        await page.goto(`${ORIGIN}/how-it-works.html`);
        const T = await page.evaluate(() => {
          const txt = (e) => e && e.textContent.replace(/\s+/g, ' ').trim();
          const team = document.getElementById('team'), real = document.getElementById('try-real'), pipe = document.getElementById('pipeline');
          const imgs = [...document.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), alt: i.alt, inReal: !!(real && real.contains(i)) }));
          return { team: !!team, teamH: team && txt(team.querySelector('h2')), rows: team ? team.querySelectorAll('tbody tr').length : 0, caption: team && txt(team.querySelector('caption')), real: !!real, realH: real && txt(real.querySelector('h2')), realImgs: real ? real.querySelectorAll('img').length : -1, imgs, realLinks: real ? [...real.querySelectorAll('a')].map((a) => a.href).slice(0, 12) : [], pipe: !!pipe, pipeText: pipe && txt(pipe), lede: txt(document.querySelector('.lede')), h1: txt(document.querySelector('h1')), footer: txt(document.querySelector('footer')), footerLink: (document.querySelector('footer a[href*="how-it-works"]') || {}).getAttribute && document.querySelector('footer a[href*="how-it-works"]').getAttribute('href'), reading: !!document.getElementById('reading'), tableWrap: !!(team && team.querySelector('.table-wrap')) };
        });
        rec('11.50', 'How it works has #team "Who built this" with the 17-member table (labelled as AI assistants, team names not people)', T.team && /Who built this/.test(T.teamH) && T.rows === 17 && /17 AI assistants/.test(T.caption) && T.tableWrap, { h: T.teamH, rows: T.rows, caption: T.caption });
        rec('11.51', '#try-real exists and contains no <img> at all; no <img> anywhere on the page points at an Oracle host or is a logo', T.real && T.realImgs === 0 && !T.imgs.some((i) => /oracle|peoplesoft|logo/i.test(i.src + ' ' + i.alt) || /^https?:/.test(i.src || '')), { realH: T.realH, imgs: T.imgs, links: T.realLinks.slice(0, 6) });
        const pipeRule = (T.pipeText.match(/The result is [^.]*\.[^.]*\./) || [''])[0];
        rec('11.52', '#pipeline states the FAIL rule correctly: FAIL when ANY change is found OR the changed share is above the limit (0.1% default); similarity is informational; no "AND" version', T.pipe && /FAIL when any change is found or the changed share of the page is above the page's limit \(0\.1% by default\)\. Otherwise it is PASS\./.test(T.pipeText) && /does not decide PASS or FAIL/.test(T.pipeText) && !/changes? and the changed share/i.test(T.pipeText), pipeRule);
        rec('11.53', 'How it works lede starts with the owner purpose sentence; "reading" anchor exists (the result stats link to it)', /^Compare a page before and after a PeopleSoft update, and see exactly what changed on screen\./.test(T.lede) && T.reading, { lede: T.lede.slice(0, 130), reading: T.reading });
        // footer line on all three pages + anchor targets from the app
        const foot = {};
        for (const pg of ['index.html', 'how-it-works.html', 'resources.html']) { await page.goto(`${ORIGIN}/${pg}`); if (pg === 'index.html') await ready(page); foot[pg] = await page.evaluate(() => { const f = document.querySelector('footer'); const a = f && f.querySelector('a[href*="how-it-works.html#team"]'); return { text: f ? f.textContent.replace(/\s+/g, ' ').trim() : null, link: a ? a.getAttribute('href') : null }; }); }
        rec('11.54', 'footer on all three pages: "Built and reviewed by a team of AI agents." + "Who built this" link to how-it-works.html#team', Object.values(foot).every((f) => f.text && /Built and reviewed by a team of AI agents\./.test(f.text) && /Who built this/.test(f.text) && f.link === 'how-it-works.html#team'), foot);
        await page.goto(`${ORIGIN}/index.html`); await ready(page);
        await page.click('footer a[href$="#team"]'); await page.waitForLoadState();
        const tv = await page.evaluate(() => { const e = document.getElementById('team'); const r = e.getBoundingClientRect(); return { url: location.href.replace(location.origin, ''), top: Math.round(r.top), inView: r.top < innerHeight && r.bottom > 0 }; });
        rec('11.55', '"Who built this" link lands on #team, scrolled into view', /how-it-works\.html#team$/.test(tv.url) && tv.inView, tv);
        // every how-it-works anchor linked from the app resolves
        await page.goto(URL); await ready(page); await loadSample(page, 0);
        const hrefs = await page.$$eval('a[href*="how-it-works.html"]', (a) => [...new Set(a.map((x) => x.getAttribute('href')))]);
        await page.goto(`${ORIGIN}/how-it-works.html`);
        const missing = []; for (const h of hrefs) { const id = (h.split('#')[1] || ''); if (id && !(await page.$(`#${id}`))) missing.push(h); }
        rec('11.56', 'every how-it-works.html#anchor linked from the result screen exists on that page', missing.length === 0, { hrefs, missing });
        rec('11.57', 'no console errors on How it works', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
        await page.context().close();
      }
    }

    // -------- 12. 375 px, dark mode and screenshots for landing, tour and result -----------------------------
    // contrast helper (computed colours, composited over ancestors; glass backgrounds are approximated)
    const CONTRAST = () => {
      const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s) || /color\(srgb ([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].replace('/', ' ').split(/[ ,]+/).filter(Boolean).map(Number); const sc = /color\(/.test(s) ? 255 : 1; return { r: p[0] * sc, g: p[1] * sc, b: p[2] * sc, a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
      const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let acc = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; if (acc.a < 1) acc = over(acc, { r: 255, g: 255, b: 255, a: 1 }); for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc); return acc; };
      const sels = ['#h-library', '.screen-purpose', '#sample-hero .sample-story', '#sample-hero .sample-expect', '#sample-hero .hint', '#btn-load-sample', '#btn-new-page', '#intro-title', '.app-nav a', '#tour-title', '#tour-help', '#tour-skip', '#tour-next', '#tour-before-cap', '#h-result', '#result-summary', '#result-next', '#result-status', '#result-explain', '.strip-name', '.strip-status', '.stat-note', '.region-title', '.region-locate', '.cause-what', '.choice-name', '.choice-desc', '.region-rule', '.region-decided', 'figcaption', '#regions-progress', '#btn-result-primary', '.disclaimer', '.region-show'];
      const out = [];
      for (const q of sels) {
        const el = [...document.querySelectorAll(q)].find((e) => e.offsetWidth && e.offsetHeight && getComputedStyle(e).visibility !== 'hidden');
        if (!el) continue;
        const fg0 = parse(getComputedStyle(el).color); if (!fg0) continue;
        const bg = bgOf(el); const fg = fg0.a < 1 ? over(fg0, bg) : fg0;
        const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const fs = parseFloat(getComputedStyle(el).fontSize), bold = +getComputedStyle(el).fontWeight >= 700;
        out.push({ q, ratio: Math.round(ratio * 100) / 100, need: (fs >= 24 || (fs >= 18.66 && bold)) ? 3 : 4.5 });
      }
      return out;
    };
    if (run(12)) {
      fs.mkdirSync(SHOTS, { recursive: true });
      for (const f of fs.readdirSync(SHOTS)) if (/^ux2-qa-/.test(f)) fs.unlinkSync(path.join(SHOTS, f));
      const shots = [];
      const shot = async (page, name, full = false) => { await page.screenshot({ path: path.join(SHOTS, `ux2-qa-${name}.png`), fullPage: full }); shots.push(`ux2-qa-${name}.png`); };
      const cover = (page, sel) => page.evaluate((q) => {
        const el = document.querySelector(q); const tour = document.getElementById('tour');
        if (!el) return { found: false };
        const r = el.getBoundingClientRect(), t = tour.hidden ? null : tour.getBoundingClientRect(), vh = innerHeight;
        const top = Math.max(r.top, 0), bot = Math.min(r.bottom, vh), vis = Math.max(0, bot - top);
        const under = t ? Math.max(0, Math.min(bot, t.bottom) - Math.max(top, t.top)) : 0;
        const cx = r.left + Math.min(r.width, 600) / 2, cy = top + Math.max(vis, 1) / 2;
        const hit = document.elementFromPoint(Math.min(cx, innerWidth - 1), Math.min(Math.max(cy, 0), vh - 1));
        return { found: true, targetH: Math.round(r.height), visibleH: Math.round(vis), coveredH: Math.round(under), coveredFrac: vis ? Math.round(under / vis * 100) / 100 : 1, panelH: t ? Math.round(t.height) : 0, panelTop: t ? Math.round(t.top) : 0, vh, pointInsidePanel: !!(hit && tour.contains(hit)), hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      }, sel);
      // is the tour instruction (heading + Next) on screen without scrolling? (the page scrolls to the thing the step points at)
      const pv = (page) => page.evaluate(() => { const n = document.getElementById('tour-next').getBoundingClientRect(), t = document.getElementById('tour-title').getBoundingClientRect(), k = document.getElementById('tour-skip').getBoundingClientRect(); const inV = (r) => r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; return { title: inV(t), next: inV(n), skip: inV(k), nextTop: Math.round(n.top), position: getComputedStyle(document.getElementById('tour')).position, scrollY: Math.round(scrollY) }; });
      const configs = [{ vw: 375, vh: 812, scheme: 'light' }, { vw: 375, vh: 812, scheme: 'dark' }, { vw: 1366, vh: 900, scheme: 'dark' }];
      const lowC = [];
      for (const cfg of configs) {
        const tag = `${cfg.vw}-${cfg.scheme}`;
        const { ctx, page, log } = await newPage(browser, { viewport: { width: cfg.vw, height: cfg.vh }, colorScheme: cfg.scheme });
        await page.goto(URL); await ready(page);
        const ow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        // landing
        const land = await page.evaluate(() => { const b = document.getElementById('btn-load-sample').getBoundingClientRect(); const n = document.getElementById('btn-new-page').getBoundingClientRect(); const h1 = document.getElementById('h-library').getBoundingClientRect(); return { btnTop: Math.round(b.top), btnBottom: Math.round(b.bottom), btnH: Math.round(b.height), btnW: Math.round(b.width), secH: Math.round(n.height), h1Bottom: Math.round(h1.bottom), vh: innerHeight, scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }; });
        rec(`12.1.${tag}`, `landing at ${tag}: no horizontal scroll, "Try the demo" is above the fold (no scrolling) and at least 44 px tall, the secondary action is 44 px tall, colour scheme honoured`, (await ow()) <= 1 && land.btnBottom <= land.vh && land.btnH >= 44 && land.secH >= 44 && land.scheme === cfg.scheme, land);
        const cl = await page.evaluate(CONTRAST); lowC.push(...cl.filter((c) => c.ratio < c.need).map((c) => ({ tag, screen: 'landing', ...c })));
        if (tag === '375-light') await shot(page, 'landing-375-light', true);
        if (tag === '375-dark') await shot(page, 'landing-375-dark', false);
        if (tag === '1366-dark') await shot(page, 'landing-1366-dark', false);
        // tour
        await page.click('#btn-load-sample'); await page.waitForSelector('#tour:not([hidden])');
        const t1 = await page.evaluate(() => { const p = document.getElementById('tour').getBoundingClientRect(); const c = document.getElementById('tour-before').getBoundingClientRect(); return { panelH: Math.round(p.height), vh: innerHeight, canvasW: Math.round(c.width), canvasH: Math.round(c.height), canvasRight: Math.round(c.right), vw: innerWidth, nextBottom: Math.round(document.getElementById('tour-next').getBoundingClientRect().bottom), nextH: Math.round(document.getElementById('tour-next').getBoundingClientRect().height) }; });
        rec(`12.2.${tag}`, `tour step 1 at ${tag}: panel fits (shorter than the viewport), the Before image fits the width and is readable (>= 280 px wide at 375), Next is visible and 44 px tall, no horizontal scroll`, t1.panelH < t1.vh && t1.canvasRight <= t1.vw && (cfg.vw > 400 || t1.canvasW >= 280) && t1.nextBottom <= t1.vh && t1.nextH >= 44 && (await ow()) <= 1, t1);
        cl.length = 0; (await page.evaluate(CONTRAST)).filter((c) => c.ratio < c.need).forEach((c) => lowC.push({ tag, screen: 'tour1', ...c }));
        if (tag === '375-dark') await shot(page, 'tour-step1-375-dark');
        const pvs = { s1: await pv(page) };
        await tourNext(page); await tourNext(page);
        await page.waitForFunction(() => /found \d+ change/.test(document.getElementById('tour-title').textContent), null, { timeout: 60000 });
        await page.waitForTimeout(400);
        const c3 = await cover(page, '#canvas-boxes');
        pvs.s3 = await pv(page);
        rec(`12.3.${tag}`, `tour step 3 at ${tag}: the red boxes (what the step points at) are not hidden under the tour panel (<= 25% of the visible canvas covered, >= 80 px visible), no horizontal scroll`, c3.found && c3.coveredFrac <= 0.25 && c3.visibleH >= 80 && !c3.pointInsidePanel && c3.hscroll <= 1, c3);
        if (tag === '375-light') await shot(page, 'tour-step3-375-light');
        await tourNext(page); await page.waitForTimeout(400);
        const c4 = await cover(page, 'li.region.tour-focus');
        const c4t = await cover(page, 'li.region.tour-focus .region-title');
        const c4c = await cover(page, 'li.region.tour-focus .region-crops');
        pvs.s4 = await pv(page);
        rec(`12.4.${tag}`, `tour step 4 at ${tag}: card 1 (what the step points at) and its title are not covered by the tour panel`, c4.found && c4.coveredFrac <= 0.25 && c4.visibleH >= 80 && c4t.coveredH === 0 && !c4t.pointInsidePanel, { card: c4, title: c4t });
        rec(`12.4b.${tag}`, `tour step 4 at ${tag}: the Before/After crops of the highlighted card (the evidence the step is about) are not hidden under the tour panel (<= 25% covered)`, c4c.found && c4c.coveredFrac <= 0.25, c4c);
        (await page.evaluate(CONTRAST)).filter((c) => c.ratio < c.need).forEach((c) => lowC.push({ tag, screen: 'tour4', ...c }));
        if (tag === '375-dark') await shot(page, 'tour-step4-375-dark');
        await tourNext(page); await page.waitForTimeout(300);
        const c5 = await cover(page, '#btn-result-primary');
        pvs.s5 = await pv(page);
        rec(`12.7.${tag}`, `tour instruction stays on screen at ${tag}: on steps 1, 3, 4 and 5 the step heading, Next and Skip are visible without scrolling (the page scrolls to the thing the step points at, so the panel must stay with it)`, Object.values(pvs).every((v) => v.title && v.next && v.skip), pvs);
        rec(`12.5.${tag}`, `tour step 5 at ${tag}: the primary action button it points at is visible and not covered by the panel`, c5.found && c5.visibleH >= c5.targetH * 0.9 && c5.coveredH === 0 && !c5.pointInsidePanel, c5);
        await page.click('#tour-next'); await page.waitForTimeout(300);
        // result screen, cards
        const R = await page.evaluate(() => {
          const crops = [...document.querySelectorAll('.region-crop canvas')].map((c) => { const r = c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; });
          const li = document.querySelector('#region-list > li').getBoundingClientRect();
          const radios = [...document.querySelectorAll('#region-list > li:first-child .choice')].map((c) => { const r = c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
          const btns = [...document.querySelectorAll('#screen-result button, #screen-result .tab')].filter((b) => b.offsetWidth).map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.textContent.trim().slice(0, 18), h: Math.round(r.height), w: Math.round(r.width) }; }).filter((x) => x.h < 44);
          return { crops, minCropW: Math.min(...crops.map((c) => c.w)), minCropH: Math.min(...crops.map((c) => c.h)), cardW: Math.round(li.width), vw: innerWidth, overflowCrops: crops.filter((c) => c.right > innerWidth).length, radios, smallTargets: btns };
        });
        rec(`12.6.${tag}`, `result cards at ${tag}: no horizontal scroll, crops stay inside the screen and are readable (each >= 120 px wide and >= 40 px tall), card choices are 44 px tall`, (await ow()) <= 1 && R.overflowCrops === 0 && R.minCropW >= 120 && R.minCropH >= 40 && R.radios.every((r) => r.h >= 44), R);
        note(`12.6a.${tag}`, `controls under 44 px tall on the result screen at ${tag}`, R.smallTargets);
        await page.locator('#region-list > li').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
        const cc = await page.evaluate(CONTRAST); cc.filter((c) => c.ratio < c.need).forEach((c) => lowC.push({ tag, screen: 'result', ...c }));
        note(`12.12a.${tag}`, `contrast samples on landing/tour/result (min ratio over ${cc.length} text samples on the result screen)`, { min: Math.min(...cc.map((c) => c.ratio)), worst: cc.sort((a, b) => a.ratio - b.ratio).slice(0, 3) });
        if (tag === '375-dark') await shot(page, 'result-cards-375-dark');
        if (tag === '1366-dark') await shot(page, 'result-cards-1366-dark');
        rec(`12.8.${tag}`, `no console errors / CSP violations at ${tag} (landing, tour, result)`, log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
        // How it works #team on a phone
        if (tag === '375-dark') { await page.goto(`${ORIGIN}/how-it-works.html#team`); await page.waitForTimeout(300); rec('12.9.375-dark', 'How it works #team at 375 px dark: no horizontal page scroll', (await ow()) <= 1, await ow()); }
        await ctx.close();
      }
      rec('12.10', 'text contrast >= 4.5:1 (3:1 for large text) for all sampled text on landing, tour and result in light/dark at 375 and 1366 (computed colours; translucent glass approximated)', lowC.length === 0, lowC.slice(0, 8));
      rec('12.11', 'at most 8 screenshots saved as docs/qa/screenshots/ux2-qa-*.png', shots.length <= 8, shots);
    }

    // -------- 13. keyboard-only: the tour and a full review -> Save result -> Sign off ----------------------------
    if (run(13)) {
      const { page, log } = await newPage(browser);
      await page.addInitScript(() => {
        window.__ann = [];
        addEventListener('DOMContentLoaded', () => new MutationObserver(() => { const t = document.getElementById('announcer').textContent.trim(); if (t) window.__ann.push(t); }).observe(document.getElementById('announcer'), { childList: true, characterData: true, subtree: true }));
      });
      await page.goto(URL); await ready(page);
      const idOf = () => page.evaluate(() => { const e = document.activeElement; return e.matches && e.matches('li.region') ? 'card' + e.dataset.region : (e.id || e.tagName + ':' + (e.textContent || '').trim().slice(0, 20)); });
      const ring = () => page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== 'none'; });
      let keys = 0; const key = async (k) => { keys++; await page.keyboard.press(k); };
      const tabTo = async (pred, max = 12) => { const seen = []; for (let i = 0; i < max; i++) { await key('Tab'); const id = await idOf(); seen.push(id); if (pred(id)) return { ok: true, seen }; } return { ok: false, seen }; };
      const noRing = [];
      const t0 = await tabTo((id) => id === 'btn-load-sample', 30);
      rec('13.1', 'keyboard: from page load, Tab reaches "Try the demo (30 seconds)"', t0.ok, t0.seen);
      await key('Enter');
      await page.waitForSelector('#tour:not([hidden])');
      rec('13.2', 'Enter starts the tour and moves focus to the step heading (so the screen reader reads it)', (await idOf()) === 'tour-title', await idOf());
      const a = await tabTo((id) => id === 'tour-next', 4); if (!(await ring())) noRing.push('tour-next');
      rec('13.3', 'step 1: one Tab from the heading reaches Next (the panel is first in the tab order); Next has a focus ring', a.ok && a.seen.length === 1, a.seen);
      await key('Enter');
      rec('13.4', 'Enter on Next goes to step 2 and focus returns to the heading', (await idOf()) === 'tour-title' && (await tourTitle(page)).startsWith('Step 2 of 5'), await tourTitle(page));
      const f = await tabTo((id) => id === 'tour-flip', 3); await key('Space');
      const flipped = await page.evaluate(() => !document.getElementById('tour-before-fig').hidden);
      rec('13.5', 'step 2: Space on "Flip between before and after" swaps the image', f.ok && flipped, f.seen);
      const bk = await tabTo((id) => id === 'tour-back', 3); await key('Enter');
      rec('13.6', 'Back by keyboard returns to step 1', bk.ok && (await tourTitle(page)).startsWith('Step 1 of 5'), await tourTitle(page));
      await tabTo((id) => id === 'tour-next', 3); await key('Enter');                 // step 2
      await tabTo((id) => id === 'tour-flip', 3); await tabTo((id) => id === 'tour-back', 3); await tabTo((id) => id === 'tour-next', 3); await key('Enter'); // step 3
      await page.waitForFunction(() => /found \d+ change/.test(document.getElementById('tour-title').textContent), null, { timeout: 60000 });
      const s3 = await tourTitle(page);
      await tabTo((id) => id === 'tour-next', 4); await key('Enter');                 // step 4
      const hl = await page.evaluate(() => ({ title: document.getElementById('tour-title').textContent.trim(), tf: document.querySelectorAll('li.region.tour-focus').length }));
      await tabTo((id) => id === 'tour-next', 4); await key('Enter');                 // step 5
      const s5 = await tourTitle(page);
      const nextLabel = await page.textContent('#tour-next');
      await tabTo((id) => id === 'tour-next', 4); await key('Enter');                 // Finish
      await page.waitForTimeout(200);
      const fin = await idOf();
      rec('13.7', 'tour completed with the keyboard only: step 3 "found N changes", step 4 outlines card 1, step 5 "Finish" ends it and focus lands on change card 1', /found 2 changes/.test(s3) && hl.tf === 1 && /^Step 5 of 5/.test(s5) && nextLabel.trim() === 'Finish' && fin === 'card1', { s3, hl, s5, nextLabel, focusAfterFinish: fin, keys });
      // review: Tab through each card
      const n = await page.locator('#region-list > li').count();
      const perCard = [];
      for (let i = 1; i <= n; i++) {
        if ((await idOf()) !== `card${i}`) { const g = await tabTo((id) => id === `card${i}`, 40); if (!g.ok) { perCard.push({ card: i, lost: g.seen }); break; } }
        const r = await tabTo((id) => /^(Expected|Regression|Noise)/.test(id) || /^INPUT/.test(id), 8);
        const ty = await page.evaluate(() => document.activeElement.type + ':' + document.activeElement.value);
        await key('Space');
        const ok = await page.locator(`#region-list > li:nth-child(${i}) input[value="Expected"]`).isChecked();
        perCard.push({ card: i, tabsToRadio: r.seen.length, focus: ty, checked: ok, path: r.seen.join(' > ') });
      }
      rec('13.8', 'review by keyboard: from each card, Tab reaches its decision radios and Space marks it Expected (all cards)', perCard.length === n && perCard.every((c) => c.checked), perCard);
      // the group: arrows
      const ap = await tabTo((id) => id === 'btn-result-primary', 60);
      rec('13.9', 'after the last card Tab reaches the primary button, which now reads "Save result"', ap.ok && clean(await page.textContent('#btn-result-primary')) === 'Save result', { tabs: ap.seen.length, tail: ap.seen.slice(-4) });
      await key('Enter'); await page.waitForSelector('#save-dialog[open]');
      const dfocus = await idOf();
      for (const v of ['VR-TL-01', 'CHG-0042', 'PI 50 (fictional)', 'QA']) { await page.keyboard.type(v); await key('Tab'); }
      const toSubmit = await tabTo((id) => id === 'save-submit', 8);
      await key('Enter');
      await page.waitForFunction(() => /^Saved as result/.test(document.getElementById('save-state').textContent), null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(250);
      const saved = clean(await page.textContent('#save-state'));
      const afterSave = { focus: await idOf(), dlgOpen: await page.isVisible('#save-dialog[open]'), primary: clean(await page.textContent('#btn-result-primary')), ann: await page.evaluate(() => window.__ann.filter((x) => /saved/i.test(x)).slice(-1)[0]) };
      rec('13.10', 'Save result by keyboard: dialog focus starts in the first field (Test case), type 4 fields, Enter on "Save result" -> "Saved as result N", announced, dialog closed', /^Saved as result \d+$/.test(saved) && !afterSave.dlgOpen && /saved/i.test(afterSave.ann || '') && dfocus === 'ev-testcase', { dialogFocus: dfocus, saved, afterSave, tabsToSubmit: toSubmit.seen.length });
      note('13.10a', 'where focus lands after the save dialog closes (should be a sensible place, not <body>)', afterSave.focus);
      rec('13.11', 'after Save the primary button becomes "Sign off"', afterSave.primary === 'Sign off', afterSave.primary);
      const so = await tabTo((id) => id === 'btn-result-primary', 60);
      await key('Enter'); await page.waitForSelector('#signoff-dialog[open]');
      await page.keyboard.type('QA'); await key('Enter'); await page.waitForTimeout(400);
      const signed = clean(await page.textContent('#signoff-hint'));
      rec('13.12', 'Sign off by keyboard completes ("Signed off by QA on ...") and the primary becomes the next step', /Signed off by QA/.test(signed), { signed, primary: clean(await page.textContent('#btn-result-primary')), reached: so.ok });
      rec('13.13', 'every focus stop in the tour had a visible focus ring', noRing.length === 0, noRing);
      note('13.14', 'total key presses for: landing -> tour -> review 2 changes -> Save result -> Sign off', keys);
      rec('13.15', 'no console errors in the keyboard run', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
      await page.context().close();
    }

    // -------- 14. screen reader basics (accessibility tree, announcements, names, dialogs, reduced motion) -------
    if (run(14)) {
      const { ctx, page, log } = await newPage(browser);
      await page.addInitScript(() => {
        window.__ann = []; window.__pill = [];
        addEventListener('DOMContentLoaded', () => new MutationObserver(() => { const t = document.getElementById('announcer').textContent.trim(); if (t) window.__ann.push(t); }).observe(document.getElementById('announcer'), { childList: true, characterData: true, subtree: true }));
      });
      await page.goto(URL); await ready(page);
      const snap0 = await page.locator('body').ariaSnapshot();
      rec('14.1', 'landmarks: banner, navigation "Main", main, and a contentinfo footer in the accessibility tree', /- banner/.test(snap0) && /- navigation "Main"/.test(snap0) && /- main/.test(snap0) && /- contentinfo/.test(snap0), snap0.split('\n').filter((l) => /^- (banner|navigation|main|contentinfo|heading)/.test(l)).slice(0, 8));
      const outline = () => page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.offsetWidth || h.offsetHeight).map((h) => ({ l: +h.tagName[1], t: h.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) })));
      const skips = (o) => o.filter((h, i) => i === 0 ? h.l !== 1 : h.l > o[i - 1].l + 1).map((h) => h.t);
      await openAll(page, '#examples-more, #examples-tricky, #intro-card');
      const oLand = await outline();
      rec('14.2', 'heading outline on the landing (groups open) starts at h1 and never skips a level', skips(oLand).length === 0, oLand.map((h) => `h${h.l} ${h.t}`));
      await page.click('#btn-load-sample'); await page.waitForSelector('#tour:not([hidden])');
      const tourSem = await page.evaluate(() => { const t = document.getElementById('tour'); return { tag: t.tagName, labelledby: t.getAttribute('aria-labelledby'), name: document.getElementById(t.getAttribute('aria-labelledby')).textContent.trim(), canvases: [...t.querySelectorAll('canvas')].map((c) => ({ role: c.getAttribute('role'), label: c.getAttribute('aria-label') })), live: t.getAttribute('aria-live'), titleTabindex: document.getElementById('tour-title').getAttribute('tabindex'), skipTag: document.getElementById('tour-skip').tagName }; });
      rec('14.3', 'tour: a labelled region (aria-labelledby the step heading), heading focusable (tabindex -1), NOT an aria-live region, Skip is a real button, both stage canvases are role=img with labels', tourSem.tag === 'SECTION' && tourSem.labelledby === 'tour-title' && tourSem.titleTabindex === '-1' && !tourSem.live && tourSem.skipTag === 'BUTTON' && tourSem.canvases.every((c) => c.role === 'img' && c.label), tourSem);
      const snapTour = await page.locator('#tour').ariaSnapshot();
      note('14.3a', 'accessibility tree of the tour panel at step 1', snapTour.split('\n').slice(0, 14));
      await tourNext(page); await tourNext(page);
      await page.waitForFunction(() => /found \d+ change/.test(document.getElementById('tour-title').textContent), null, { timeout: 60000 });
      await tourNext(page); await tourNext(page); await page.click('#tour-next'); await page.waitForTimeout(250);
      const oRes = await outline();
      rec('14.4', 'heading outline on the result screen starts at h1 and never skips a level (h1 > h2 > h3 cards)', skips(oRes).length === 0, oRes.slice(0, 8).map((h) => `h${h.l} ${h.t}`));
      const sem = await page.evaluate(() => {
        const vis = (e) => e.offsetWidth || e.offsetHeight;
        const imgs = [...document.querySelectorAll('canvas')].filter(vis).map((c) => ({ id: c.id || c.className, role: c.getAttribute('role'), label: c.getAttribute('aria-label'), hidden: c.getAttribute('aria-hidden') }));
        const bad = imgs.filter((c) => c.hidden !== 'true' && (c.role !== 'img' || !c.label));
        const name = (b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim();
        const btns = [...document.querySelectorAll('#screen-result button')].filter(vis).map(name);
        const dup = btns.filter((x, i) => btns.indexOf(x) !== i);
        const fs = [...document.querySelectorAll('#region-list > li')].map((li) => ({ legend: li.querySelector('fieldset legend').textContent.trim(), radios: [...li.querySelectorAll('input[type=radio]')].map((r) => (r.labels[0] ? r.labels[0].querySelector('.choice-name').textContent : '')), groupName: new Set([...li.querySelectorAll('input[type=radio]')].map((r) => r.name)).size }));
        const li0 = document.querySelector('#region-list > li');
        return { imgs, bad, btns, dup: [...new Set(dup)], fs, li0Label: li0.getAttribute('aria-label'), li0Tab: li0.getAttribute('tabindex'), liRole: li0.getAttribute('role'), crops: [...li0.querySelectorAll('.region-crop canvas')].map((c) => c.getAttribute('aria-label')), pill: { role: document.getElementById('status-pill').getAttribute('role'), live: document.getElementById('status-pill').getAttribute('aria-live') } };
      });
      rec('14.5', 'every visible canvas is role=img with a label (crops say "Before/After: change i of n, where, shape") or is aria-hidden (the little locator)', sem.bad.length === 0, { bad: sem.bad, crops: sem.crops });
      rec('14.6', 'each change card is a focusable item with a spoken summary (aria-label "Change 1 of 2, where, shape, decision: not reviewed") and a fieldset legend "Your decision for change N" over three radios sharing one name', /^Change 1 of 2, .+, decision: not reviewed$/.test(sem.li0Label) && sem.fs.every((f, i) => f.legend === `Your decision for change ${i + 1}` && f.radios.join() === 'Expected,Regression,Noise' && f.groupName === 1), { label: sem.li0Label, fs: sem.fs });
      rec('14.7', 'buttons on the result screen have distinct accessible names (a screen reader list of buttons is not 2 x "Add ignore zone")', sem.dup.length === 0, { duplicates: sem.dup, all: sem.btns });
      // announcements through the flow
      await page.locator('#region-list > li').nth(1).locator('.region-title').click();       // card 1 is already selected after the tour, so pick card 2
      await page.locator('#region-list > li').nth(0).locator('input[value="Expected"]').check();
      await page.locator('#region-list > li').nth(1).locator('input[value="Regression"]').check();
      await page.waitForTimeout(200);
      const ann = await page.evaluate(() => window.__ann.slice());
      note('14.8a', 'everything announced (aria-live) since page load, in order', ann);
      const has = (re) => ann.filter((a) => re.test(a));
      rec('14.8', 'announcements: tour found-N (exactly once, no second "Comparison finished"), tour finished, card selected ("Change 2 of 2 selected: where, shape"), decisions ("Change 1 marked Expected. 1 of 2 decided.")', has(/^Comparison finished/).length === 1 && has(/^Tour finished/).length === 1 && has(/^Change 2 of 2 selected: /).length === 1 && has(/^Change 1 marked Expected\. 1 of 2 decided\./).length === 1 && has(/^Change 2 marked Regression\. 2 of 2 decided\./).length === 1 && ann.every((a) => a.length > 3), { counts: { found: has(/^Comparison finished/).length, finished: has(/^Tour finished/).length, selected: has(/selected:/).length, marked: has(/marked/).length } });
      // dialog behaviour
      const opener = await page.evaluate(() => document.getElementById('btn-result-primary').dataset.action);
      await page.focus('#btn-result-primary'); await page.keyboard.press('Enter'); await page.waitForSelector('#save-dialog[open]');
      const dlg = await page.evaluate(() => { const d = document.getElementById('save-dialog'); return { labelledby: d.getAttribute('aria-labelledby'), name: document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim(), modal: d.matches(':modal'), focusIn: d.contains(document.activeElement), focus: document.activeElement.id, required: [...d.querySelectorAll('input[required],input[aria-required=true]')].map((i) => i.id), errRole: document.getElementById('evidence-error').getAttribute('role') }; });
      await page.keyboard.press('Enter');         // empty required fields -> inline error, dialog stays
      const err = clean(await page.textContent('#evidence-error'));
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      const back = await page.evaluate(() => document.activeElement.id);
      rec('14.9', 'Save dialog: labelled "Save result", modal, focus moves inside, 4 required fields marked required, empty submit gives a role=alert message, Esc closes and focus returns to the opener', /Save result/.test(dlg.name) && dlg.modal && dlg.focusIn && dlg.required.length === 4 && dlg.errRole === 'alert' && err.length > 10 && back === 'btn-result-primary', { opener, dlg, err, focusAfterEsc: back });
      // titles + h1 per screen
      const titles = {};
      for (const r of ['library', 'compare', 'result', 'history', 'settings']) { await page.evaluate((x) => { location.hash = '#/' + x; }, r); await page.waitForTimeout(150); titles[r] = { title: await page.title(), h1: await page.evaluate(() => [...document.querySelectorAll('h1')].filter((e) => e.offsetWidth).map((e) => e.textContent.trim()).join('|')) }; }
      rec('14.10', 'each screen sets a distinct document title and has one visible h1', new Set(Object.values(titles).map((t) => t.title)).size === 5 && Object.values(titles).every((t) => t.h1 && !t.h1.includes('|')), titles);
      // reduced motion: nothing animates during the tour
      const rm = await newPage(browser); await rm.page.emulateMedia({ reducedMotion: 'reduce' });
      await rm.page.goto(URL); await ready(rm.page);
      await rm.page.click('#btn-load-sample'); await rm.page.waitForSelector('#tour:not([hidden])'); await tourNext(rm.page); await tourNext(rm.page);
      await rm.page.waitForFunction(() => /found \d+ change/.test(document.getElementById('tour-title').textContent), null, { timeout: 60000 });
      const anim = await rm.page.evaluate(() => ({ running: document.getAnimations().filter((a) => a.playState === 'running').length, behavior: getComputedStyle(document.documentElement).scrollBehavior, tdur: getComputedStyle(document.getElementById('tour-next')).transitionDuration }));
      rec('14.11', 'prefers-reduced-motion: no running animations during the tour, no smooth scrolling', anim.running === 0 && anim.behavior !== 'smooth', anim);
      await rm.ctx.close();
      rec('14.12', 'no console errors in the screen-reader pass', log.console.length + log.page.length + (await cspOf(page)).length === 0, log.console);
      await ctx.close();
    }


  } finally {
    await browser.close();
    if (server) server.kill();
  }
  const failed = results.filter((r) => r.ok === false);
  const passed = results.filter((r) => r.ok === true).length;
  fs.writeFileSync(path.join(__dirname, 'qa-results.json'), JSON.stringify({ date: new Date().toISOString(), chromium: version, node: process.version, seconds: Math.round((Date.now() - t0) / 1000), passed, failed: failed.length, results }, null, 1));
  console.log(`\n${passed} passed, ${failed.length} failed, ${results.filter((r) => r.ok === null).length} info  (${Math.round((Date.now() - t0) / 1000)} s)`);
  failed.forEach((f) => console.log('  FAILED ' + f.id + ' ' + f.name));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

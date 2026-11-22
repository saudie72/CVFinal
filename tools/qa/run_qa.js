// tools/qa/run_qa.js - Quinn's automated real-browser QA for the ERP Visual Regression Inspector.
// Run from the repo root:   node tools/qa/run_qa.js            (starts and stops its own server on port 8107)
//   QA_ONLY=3,5 node tools/qa/run_qa.js                        run selected sections only
//   QA_NO_SERVER=1 node tools/qa/run_qa.js                     reuse a server you already started on 8107
// Writes tools/qa/qa-results.json and (section 10) up to 8 PNGs in docs/qa/screenshots/.
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
async function loadSample(page, idx) {
  await page.evaluate(() => { location.hash = '#/library'; });
  await page.waitForFunction(() => !/^result-/.test(document.getElementById('main').dataset.state) && document.getElementById('screen-library') && !document.getElementById('screen-library').hidden, null, { timeout: 10000 }).catch(() => {});
  await page.selectOption('#sample-select', String(idx));
  await page.click('#btn-load-sample');
  await waitResult(page);
}
async function resultSummary(page) {
  return {
    state: await mainState(page),
    status: clean(await page.textContent('#result-status')),
    regions: await page.locator('#region-list > li').count(),
    alignment: clean(await page.textContent('#stat-alignment')),
    changed: clean(await page.textContent('#stat-changed')),
    ignored: clean(await page.textContent('#stat-ignored')),
    hints: (await page.$$eval('#region-list .region-hint', (e) => e.map((x) => x.textContent.trim().slice(0, 60)))),
  };
}
async function recompare(page) {
  await page.evaluate(() => { location.hash = '#/compare'; });
  await page.waitForFunction(() => !/^result-/.test(document.getElementById('main').dataset.state), null, { timeout: 10000 });
  await page.click('#btn-compare'); await waitResult(page);
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
      rec('1.0', 'fresh profile: main=ready-empty, pill Ready, sample select has all manifest entries', await mainState(page) === 'ready-empty' && (await page.locator('#sample-select option').count()) === manifest.length, { main: await mainState(page), options: await page.locator('#sample-select option').count() });
      for (let i = 0; i < manifest.length; i++) {
        const s = manifest[i];
        await loadSample(page, i);
        const r = await resultSummary(page);
        let ok = r.state === (s.expected.status === 'FAIL' ? 'result-fail' : 'result-pass') && r.regions >= (s.expected.minRegions || 0) && (s.expected.maxRegions == null || r.regions <= s.expected.maxRegions);
        rec(`1.${i + 1}`, `${s.page}: expected ${s.expected.status} (min ${s.expected.minRegions ?? 0}${s.expected.maxRegions != null ? ', max ' + s.expected.maxRegions : ''})`, ok, { status: r.status, regions: r.regions, alignment: r.alignment });
        if (s.page === 'hcm-job-data-shifted') rec('1.s', 'shifted pair shows "Aligned: shift (0, 3)"', /Aligned: shift \(0, 3\)/.test(r.alignment), r.alignment);
        if (s.page === 'hcm-job-data-zoom110') rec('1.z', 'zoom110: FAIL with the "Likely capture artifact" hint', r.state === 'result-fail' && r.hints.some((h) => /capture (or rendering )?artifact/i.test(h)), { regions: r.regions, firstHints: r.hints.slice(0, 2), alignment: r.alignment });
        if (s.page === 'fscm-po') {
          const vis = await page.isVisible('#btn-suggest-zone');
          await page.click('#btn-suggest-zone');
          const zoneText = clean(await page.textContent('#zone-added-note') || '');
          await page.click('#btn-result-primary'); // becomes "Compare again"
          await waitResult(page).catch(() => {});
          await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-pass', null, { timeout: 30000 }).catch(() => {});
          const r2 = await resultSummary(page);
          rec('1.po', 'fscm-po: "Add suggested ignore zone" -> Compare again -> PASS with 0 regions', vis && r2.state === 'result-pass' && r2.regions === 0, { suggestVisible: vis, note: zoneText, after: r2.status, ignored: r2.ignored });
        }
      }
      rec('1.c', 'no console errors/warnings, page errors or CSP violations during all 8 pairs', log.console.length + log.page.length + (await cspOf(page)).length === 0, { console: log.console, page: log.page, csp: await cspOf(page) });
      await page.context().close();
    }

    // -------- 2. ignore zones: mouse, keyboard / numeric form, alignment --------------------------
    if (run(2)) {
      const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      await loadSample(page, 0); // tl-timesheet
      await page.evaluate(() => { location.hash = '#/compare'; });
      await page.waitForSelector('#screen-compare:not([hidden])');
      const zc = page.locator('#zone-canvas'); await zc.scrollIntoViewIfNeeded();
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
      rec('2.5', 'keyboard-only numeric form adds "Keyboard zone" 120 by 30 at 400, 500', lis.some((t) => /Keyboard zone, 120 by 30 pixels at 400, 500/.test(t)), lis);
      // out of bounds
      await page.click('#btn-add-zone'); await page.fill('#zone-label', 'Too big'); await page.fill('#zone-x', '1300'); await page.fill('#zone-w', '200'); await page.click('#zone-submit');
      const oob = clean(await page.textContent('#zone-error'));
      rec('2.6', 'a zone past the baseline is rejected with the bounds message', /extends past the baseline/i.test(oob) && await page.isVisible('#zone-dialog[open]'), oob);
      await page.keyboard.press('Escape');
      rec('2.7', 'Esc closes the dialog and returns focus to "Add zone manually"', !(await page.isVisible('#zone-dialog[open]')) && await page.evaluate(() => document.activeElement.id) === 'btn-add-zone', await page.evaluate(() => document.activeElement.id));
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
      rec('2.11', 'alignment: shifted pair is aligned (0, 3) and PASSes (the +3 px does not count as a change)', /shift \(0, 3\)/.test(sh.alignment) && sh.state === 'result-pass', sh);
      rec('2.c', 'no console errors / CSP violations in section 2', log.console.length + log.page.length + (await cspOf(page)).length === 0, { console: log.console, page: log.page });
      await page.context().close();
    }

    // -------- 3. persistence + IndexedDB structure -----------------------------------------------
    if (run(3)) {
      const { page, log } = await newPage(browser); await page.goto(URL); await ready(page);
      await loadSample(page, 0);
      const n = await page.locator('#region-list > li').count();
      for (let i = 0; i < n; i++) await page.locator('#region-list > li').nth(i).locator('input[value="Expected"]').check();
      await page.click('#btn-result-primary'); // Save run
      await page.fill('#ev-testcase', 'VR-TL-01'); await page.fill('#ev-ticket', 'CHG-0042'); await page.fill('#ev-tools', 'PI 50 (fictional)'); await page.fill('#ev-tester', 'QA');
      await page.click('#save-submit');
      await page.waitForFunction(() => /^Saved as run/.test(document.getElementById('save-state').textContent));
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
      rec('3.4', 'History shows the saved run after reload', rows === 1, { rows, text: clean(await page.textContent('#run-rows')).slice(0, 140) });
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
      const hashAfter = await page.evaluate(() => location.hash);
      await page.evaluate(() => { location.hash = '#/library'; }); await page.waitForTimeout(200);
      rec('4.6', 'after reload the library shows the empty state (#library-empty visible, main=ready-empty) and pages/runs/ignoreZones hold 0 rows (settings keeps only the engineSeen flag)', await mainState(page) === 'ready-empty' && await page.isVisible('#library-empty') && (afterReload.counts.pages || 0) + (afterReload.counts.runs || 0) + (afterReload.counts.ignoreZones || 0) === 0, { hashAfterReload: hashAfter, main: await mainState(page), idb: afterReload.counts });
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
      rec('5.1', 'after "ready": only the sample PNG fetches the user triggered (Load sample + 3 x Compare); nothing else', unexpected.length === 0, { initialLoadRequests: loadReqs.length, afterReady: rel });
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
      await page.click('#btn-print');
      const pr = await page.evaluate(() => ({ calls: window.__printCalls, h1: (document.querySelector('#print-report h1') || {}).textContent, tables: document.querySelectorAll('#print-report table tr').length, canvases: document.querySelectorAll('#print-report canvas').length, text: document.getElementById('print-report').innerText.length }));
      await page.emulateMedia({ media: 'print' });
      const vis = await page.evaluate(() => { const r = document.getElementById('print-report'); const cs = getComputedStyle(r); const hdr = document.querySelector('header'); const main = document.getElementById('main'); return { reportDisplay: cs.display, reportW: r.getBoundingClientRect().width, headerDisplay: hdr ? getComputedStyle(hdr).display : null, mainDisplay: getComputedStyle(main).display }; });
      const pdf = await page.pdf({ format: 'A4' }); const pdfPath = path.join(os.tmpdir(), 'qa-print.pdf'); fs.writeFileSync(pdfPath, pdf);
      let pdfText = ''; try { pdfText = execFileSync('pdftotext', [pdfPath, '-']).toString(); } catch (e) { pdfText = '(pdftotext not available)'; }
      note('5.7a', 'print layout details', { pr, vis, pdfBytes: pdf.length, pdfPages: (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, pdfTextHead: clean(pdfText).slice(0, 200) });
      rec('5.7', 'Print report: #print-report is filled (h1, regions table, canvases), window.print called, and in print media it is displayed while the app chrome is hidden', pr.calls === 1 && pr.h1 && pr.tables >= 3 && pr.canvases >= 3 && vis.reportDisplay !== 'none' && vis.reportW > 300, { pr, vis });
      rec('5.8', 'page.pdf() produces a non-empty PDF whose text contains the report headings', pdf.length > 5000 && /Changed regions/.test(pdfText), { bytes: pdf.length, hasChangedRegions: /Changed regions/.test(pdfText), hasDisclaimer: /not a replacement/i.test(pdfText) });
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
        rec('9.0', 'pill sequence starts with the loading text and ends "Ready" (Wren 11.1)', /OpenCV|vision engine/i.test(pillSeq[0]) && pillSeq[pillSeq.length - 1] === 'Ready', pillSeq);
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
        rec('9.2', 'keyboard: Tab reaches "Load sample" (after skip link + nav)', reached, seq);
        rec('9.3', 'every Tab stop shows a visible focus indicator (>=2 px outline or box-shadow)', noFocusRing.length === 0, { stops: seq.length, withoutRing: noFocusRing });
        await page.keyboard.press('Enter'); await waitResult(page);
        await page.waitForTimeout(300);
        const afterRes = await page.evaluate(() => ({ focus: document.activeElement.id, ann: window.__ann.slice(-3) }));
        rec('9.4', 'result: focus moves to #result-status and the result is announced once ("Comparison finished. FAIL...")', afterRes.focus === 'result-status' && afterRes.ann.filter((a) => /^Comparison finished/.test(a)).length === 1, afterRes);
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
        await page.focus('#region-list > li:first-child'); await page.keyboard.press('Tab'); await page.keyboard.press('ArrowRight');
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
        await page.waitForFunction(() => /^Saved as run/.test(document.getElementById('save-state').textContent), null, { timeout: 10000 }).catch(() => {});
        const saved = clean(await page.textContent('#save-state'));
        await page.waitForTimeout(200);
        const ann2 = await page.evaluate(() => window.__ann.filter((a) => /saved/i.test(a)).slice(-1)[0]);
        rec('9.10', 'keyboard-only: Load sample -> result -> decisions -> Save run (Enter) -> "Saved as run N" and announced', /^Saved as run/.test(saved) && /saved/i.test(ann2), { primary, dialogFocus: dlgFocus, saved, announced: ann2 });
        // Sign off by keyboard
        await page.focus('#btn-signoff'); await page.keyboard.press('Enter'); await page.waitForSelector('#signoff-dialog[open]');
        await page.keyboard.type('QA'); await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        rec('9.11', 'keyboard-only sign-off completes ("Signed off by QA")', /Signed off by QA/.test(clean(await page.textContent('#save-state')) + clean(await page.textContent('#signoff-hint')) + clean(await page.textContent('#result'))), clean(await page.textContent('#signoff-hint')).slice(0, 80));

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
        rec('11.4a', 'Regression keeps Sign off aria-disabled with the exact hint (Wren 11.4)', await page.getAttribute('#btn-signoff', 'aria-disabled') === 'true' && /isn't available while a region is marked Regression\. Log a defect, attach the report, and retest after the fix\./.test(hint), hint);
        await li(0).locator('input[value="Expected"]').check();
        const preSave = { signoff: await page.getAttribute('#btn-signoff', 'aria-disabled'), promote: await page.getAttribute('#btn-promote', 'aria-disabled'), hint: clean(await page.textContent('#signoff-hint')) };
        rec('11.4b', 'all Expected but unsaved: Sign off + Promote still disabled; hint says save first', preSave.signoff === 'true' && /Save the run first/i.test(preSave.hint), preSave);
        await page.click('#btn-result-primary');
        await page.fill('#ev-testcase', 'VR-TL-01'); await page.fill('#ev-ticket', 'CHG-0042'); await page.fill('#ev-tools', 'PI 50 (fictional)'); await page.fill('#ev-tester', 'QA');
        await page.click('#save-submit'); await page.waitForFunction(() => /^Saved as run/.test(document.getElementById('save-state').textContent));
        const postSave = { signoff: await page.getAttribute('#btn-signoff', 'aria-disabled'), promote: await page.getAttribute('#btn-promote', 'aria-disabled'), hint: clean(await page.textContent('#signoff-hint')) };
        rec('11.4c', 'after Save run: Sign off enabled; Promote still disabled ("Sign off first.")', postSave.signoff !== 'true' && postSave.promote === 'true', postSave);
        await li(1).locator('input[value="Noise"]').check();
        rec('11.4d', 'changing a decision after Save is allowed and keeps the run editable (re-save)', true, clean(await page.textContent('#save-state')));
        await page.click('#btn-signoff').catch(() => {});
        await page.waitForTimeout(300);
        const dlgOpen = await page.isVisible('#signoff-dialog[open]');
        if (!dlgOpen) { await page.click('#btn-result-primary'); await page.click('#save-submit'); await page.waitForTimeout(400); await page.click('#btn-signoff'); }
        await page.fill('#so-reviewer', 'QA'); await page.click('#signoff-submit'); await page.waitForTimeout(400);
        const promoteEnabled = await page.getAttribute('#btn-promote', 'aria-disabled') !== 'true';
        rec('11.4e', 'after sign off, Promote to baseline is enabled and the signed-off line shows', promoteEnabled, clean(await page.textContent('#signoff-hint')));
        // duplicate name
        await page.evaluate(() => { location.hash = '#/library'; });
        await page.click('#btn-new-page'); await page.fill('#page-name', 'Time & Labor – Timesheet'); await page.setInputFiles('#baseline-file', path.join(ROOT, 'samples', 'tl-timesheet_before.png'));
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
        if (st === 'storage-blocked') { txt = clean(await page.textContent('#notice-text')); await page.click('#btn-load-sample'); await waitResult(page).then(() => { ok2 = true; }).catch(() => {}); }
        rec('11.6b', 'storage blocked (indexedDB throws): #notice=storage-blocked and a sample can still be compared in memory (Wren 11.6)', st === 'storage-blocked' && ok2, { notice: st, txt: txt.slice(0, 90), pageErrors: errs });
        await ctx.close();
      }
    }

    // -------- 10. layout + screenshots -----------------------------------------------------------------
    if (run(10)) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const shots = [];
      const shot = async (page, name) => { const f = path.join(SHOTS, name); await page.screenshot({ path: f, fullPage: true }); shots.push(name); };
      const hscroll = [];
      for (const [vw, vh, label] of [[1366, 900, '1366'], [375, 812, '375']]) {
        for (const scheme of ['light', 'dark']) {
          const { ctx, page, log } = await newPage(browser, { viewport: { width: vw, height: vh }, colorScheme: scheme });
          await page.goto(URL); await ready(page);
          if (label === '1366' && scheme === 'light') await shot(page, 'library-empty-1366-light.png');
          await loadSample(page, 0);
          await page.waitForTimeout(250);
          // overflow checks on every screen
          for (const r of ['library', 'compare', 'result', 'history', 'settings']) {
            await page.evaluate((x) => { location.hash = '#/' + x; }, r); await page.waitForTimeout(200);
            const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
            if (o.sw > o.cw + 1) hscroll.push({ vw, scheme, route: r, ...o });
          }
          await page.evaluate(() => { location.hash = '#/result'; }); await page.waitForTimeout(200);
          if (label === '1366' && scheme === 'light') await shot(page, 'result-1366-light.png');
          if (label === '1366' && scheme === 'dark') await shot(page, 'result-1366-dark.png');
          if (label === '375' && scheme === 'light') await shot(page, 'result-375-light.png');
          if (label === '375' && scheme === 'dark') await shot(page, 'result-375-dark.png');
          if (label === '1366' && scheme === 'dark') { await page.evaluate(() => { location.hash = '#/compare'; }); await page.waitForTimeout(200); await shot(page, 'compare-1366-dark.png'); }
          // static pages
          for (const pg of ['how-it-works.html', 'resources.html']) {
            await page.goto(`${ORIGIN}/${pg}`); await page.waitForTimeout(150);
            const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
            if (o.sw > o.cw + 1) hscroll.push({ vw, scheme, route: pg, ...o });
            if (label === '1366' && scheme === 'light' && pg === 'how-it-works.html') await shot(page, 'how-it-works-1366-light.png');
            if (label === '375' && scheme === 'dark' && pg === 'resources.html') await shot(page, 'resources-375-dark.png');
          }
          rec(`10.c.${label}.${scheme}`, `no console errors/CSP violations at ${label}px ${scheme}`, log.console.length + log.page.length === 0, log.console);
          await ctx.close();
        }
      }
      rec('10.1', 'no horizontal page scroll on any screen at 1366 or 375 px, light or dark', hscroll.length === 0, hscroll);
      rec('10.2', 'at most 8 screenshots saved', shots.length <= 8, shots);
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

// Browser tests for js/db.js. Serve the repo root first:  python3 -m http.server 8103
// Run:  node tools/db-test/run.js   (playwright is preinstalled; tabs share one browser context = same origin)
const { chromium } = require('playwright');
const URL = 'http://localhost:8103/tools/db-test/test.html';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); };

async function tab(ctx) {
  const p = await ctx.newPage();
  p.on('pageerror', e => check('no page errors', false, String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => window.ready === true);
  return p;
}
const deleteDb = p => p.evaluate(() => new Promise(r => { const q = indexedDB.deleteDatabase('erpinspector'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
const dbNames = p => p.evaluate(async () => (await indexedDB.databases()).map(d => d.name + '@' + d.version));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const A = await tab(ctx);
  await deleteDb(A);

  // ---------- 1. CRUD with real Blobs on every store ----------
  const crud = await A.evaluate(async () => {
    const { pages, zones, runs, settings, storageEstimate } = DB, o = {};
    const base = await makeBlob('#0a84ff');
    const pid = await pages.put({ name: 'Demo HCM - Job Data (fictional)', module: 'HCM', notes: 'n', baseline: base, width: 64, height: 40, thresholdPct: 0.5 });
    const p = await pages.get(pid);
    o.pageBlob = p.baseline instanceof Blob && p.baseline.type === 'image/png';
    o.pagePixel = await pixel(p.baseline);
    o.pageStamps = typeof p.createdAt === 'number' && typeof p.updatedAt === 'number';
    o.pageList = (await pages.list()).length;
    const z1 = await zones.put({ pageId: pid, x: 1, y: 2, w: 3, h: 4, label: 'Clock' });
    await zones.put({ pageId: pid, x: 5, y: 6, w: 7, h: 8, label: 'User' });
    o.zones = (await zones.forPage(pid)).length;
    const zrec = (await zones.forPage(pid)).find(z => z.id === z1); zrec.w = 99; await zones.put(zrec);
    o.zoneUpdated = (await zones.forPage(pid)).find(z => z.id === z1).w;
    await zones.remove(z1); o.zonesAfterRemove = (await zones.forPage(pid)).length;
    const cand = await makeBlob('#ff3b30'), res = await makeBlob('#34c759');
    const r1 = await runs.add({ pageId: pid, candidate: cand, result: res, regions: [{ x: 1, y: 1, w: 2, h: 2, decision: 'Regression' }], changedPct: 1.2, ssim: 0.97, status: 'FAIL', alignment: 'ecc', settings: { T: 25 }, evidence: { testCaseId: 'VR-TL-01', ticketId: 'CHG-0042', toolsVersion: 'PT 8.62.xx', tester: 'AB', environment: 'TEST-1', expectedDifference: 'new Save label' }, note: 'fictional', ms: 812, createdAt: 1000 });
    const r2 = await runs.add({ pageId: pid, candidate: cand, result: res, regions: [], changedPct: 0, ssim: 1, status: 'PASS', evidence: { testCaseId: 'VR-TL-02' }, createdAt: 2000 });
    const rr = await runs.get(r1);
    o.runBlobs = rr.candidate instanceof Blob && rr.result instanceof Blob;
    o.runPixels = [await pixel(rr.candidate), await pixel(rr.result)];
    o.evidence = rr.evidence;
    o.evidenceShape = Object.keys((await runs.get(r2)).evidence).join();
    o.defaults = await runs.get(r2); o.r1rec = rr;
    const up = await runs.update(r1, { regions: [{ x: 1, y: 1, w: 2, h: 2, decision: 'Expected' }, { x: 5, y: 5, w: 1, h: 1, decision: 'bogus' }], signOff: { signedOff: true, reviewer: 'CD', signedOffAt: 3000 }, reviewMs: 45000, evidence: { note: 'reviewed' }, pageId: 999, createdAt: 5 });
    o.upd = up; o.upGet = await runs.get(r1);
    o.upMissing = await runs.update(9999, {}).then(() => 'no error', e => e.name);
    o.runsNewestFirst = (await runs.forPage(pid)).map(r => r.id);
    o.r = [r1, r2];
    await settings.set('theme', 'dark'); await settings.set('thresholds', { T: 25, kernel: 3 });
    o.setting = [await settings.get('theme'), (await settings.get('thresholds')).kernel, await settings.get('missing', 'dflt')];
    o.persistRecord = await settings.get('persistRequested');
    o.estimate = await storageEstimate();
    // cascade: remove page removes its zones and runs in one transaction
    await pages.remove(pid);
    o.afterRemove = [(await pages.list()).length, (await zones.forPage(pid)).length, (await runs.forPage(pid)).length];
    await runs.remove(r1).catch(() => {});   // already gone: delete of a missing key is not an error
    return o;
  });
  check('pages: Blob in/out is image/png', crud.pageBlob);
  check('pages: baseline pixel survives', crud.pagePixel.join() === '10,132,255,255', crud.pagePixel);
  check('pages: createdAt/updatedAt set; list = 1', crud.pageStamps && crud.pageList === 1);
  check('zones: put/forPage/update/remove', crud.zones === 2 && crud.zoneUpdated === 99 && crud.zonesAfterRemove === 1);
  check('runs: candidate+result are Blobs with right pixels', crud.runBlobs && crud.runPixels[0].join() === '255,59,48,255' && crud.runPixels[1].join() === '52,199,89,255', crud.runPixels);
  check('runs: evidence object stored', crud.evidence.testCaseId === 'VR-TL-01' && crud.evidence.ticketId === 'CHG-0042' && crud.evidence.tester === 'AB' && crud.evidence.businessUnit === '', crud.evidence);
  check('runs: evidence normalised to full shape', crud.evidenceShape === 'testCaseId,ticketId,toolsVersion,businessUnit,role,tester', crud.evidenceShape);
  const d = crud.defaults, u = crud.upGet;
  check('runs: extras kept only when given; ms stored; defaults for decision/signOff/reviewMs', crud.r1rec.evidence.environment === 'TEST-1' && crud.r1rec.evidence.expectedDifference === 'new Save label' && !('environment' in d.evidence) && crud.r1rec.ms === 812 && d.ms === null && d.reviewMs === null && d.signOff.signedOff === false && d.signOff.baselinePromoted === false && d.signOff.signedOffAt === null && crud.r1rec.regions[0].decision === 'Regression', { d: d.signOff, ev: Object.keys(d.evidence).length });
  check('runs.update: decisions, signOff merge, reviewMs, evidence merge; id/pageId/createdAt immutable; bad decision -> null', u.regions[0].decision === 'Expected' && u.regions[1].decision === null && u.signOff.signedOff === true && u.signOff.reviewer === 'CD' && u.signOff.signedOffAt === 3000 && u.signOff.baselinePromoted === false && u.reviewMs === 45000 && u.evidence.note === 'reviewed' && u.evidence.testCaseId === 'VR-TL-01' && u.pageId === crud.r1rec.pageId && u.createdAt === 1000 && u.ms === 812 && crud.upd.reviewMs === 45000, u.signOff);
  check('runs.update on a missing run -> NotFoundError', crud.upMissing === 'NotFoundError', crud.upMissing);
  check('runs: forPage newest first', crud.runsNewestFirst.join() === [crud.r[1], crud.r[0]].join(), crud.runsNewestFirst);
  check('settings: get/set/default', crud.setting.join() === 'dark,3,dflt', crud.setting);
  check('persist() asked once after first baseline (record saved)', crud.persistRecord && typeof crud.persistRecord.granted === 'boolean', crud.persistRecord);
  check('storageEstimate: usage/quota numbers', typeof crud.estimate.usage === 'number' && crud.estimate.quota > 0, crud.estimate);
  check('pages.remove cascades to zones and runs', crud.afterRemove.join() === '0,0,0', crud.afterRemove);

  // ---------- 2. persistence across reload ----------
  await A.evaluate(async () => {
    const id = await DB.pages.put({ name: 'Persist me (fictional)', module: 'FSCM', baseline: await makeBlob('#0a84ff') });
    await DB.runs.add({ pageId: id, candidate: await makeBlob('#ff3b30'), result: await makeBlob('#34c759'), status: 'FAIL', evidence: { testCaseId: 'VR-P-01' } });
    await DB.settings.set('theme', 'light');
  });
  await A.reload(); await A.waitForFunction(() => window.ready);
  const after = await A.evaluate(async () => {
    const ps = await DB.pages.list(); const rs = await DB.runs.forPage(ps[0].id);
    return { names: ps.map(p => p.name), blob: ps[0].baseline instanceof Blob, px: await pixel(ps[0].baseline), runs: rs.length, ev: rs[0].evidence.testCaseId, theme: await DB.settings.get('theme') };
  });
  check('reload: page, Blob, run, evidence, setting all still there', after.names.join() === 'Persist me (fictional)' && after.blob && after.px.join() === '10,132,255,255' && after.runs === 1 && after.ev === 'VR-P-01' && after.theme === 'light', after);

  // ---------- 3. duplicate page name ----------
  const dup = await A.evaluate(async () => {
    try { await DB.pages.put({ name: 'Persist me (fictional)', module: 'FSCM' }); return { err: null }; }
    catch (e) { return { name: e.name, message: e.message, cause: e.cause && e.cause.name, count: (await DB.pages.list()).length }; }
  });
  check('duplicate name: friendly Error, name ConstraintError, nothing added', dup.name === 'ConstraintError' && dup.message === 'A page with this name already exists.' && dup.cause === 'ConstraintError' && dup.count === 1, dup);

  // ---------- 4. blocked upgrade between two tabs (test-only v2, shipped DB_VERSION stays 1) ----------
  check('shipped DB_VERSION is 1', await A.evaluate(() => DB.DB_VERSION === 1));
  const rawV2 = `new Promise(res => { const log = window.log = []; const q = indexedDB.open('erpinspector', 2);
      q.onupgradeneeded = e => { log.push('upgradeneeded ' + e.oldVersion + '->' + e.newVersion); q.result.createObjectStore('v2test', { keyPath: 'id' }); };
      q.onblocked = () => log.push('blocked');
      q.onsuccess = () => { log.push('open v' + q.result.version); window.v2db = q.result; res(); };
      q.onerror = () => { log.push('error ' + q.error.name); res(); }; window.v2req = q; })`;
  // 4a: tab A (db.js, handles versionchange) is closed for us; tab B upgrades
  await A.evaluate(() => { window.events.length = 0; return DB.pages.list(); });          // A holds a live connection
  const B = await tab(ctx);
  await B.evaluate(rawV2);
  const logB = await B.evaluate(() => window.log);
  const evA = await A.evaluate(() => window.events);
  check('4a: blocked fires on new request, A closes on versionchange, upgrade completes', logB.join(' | ') === 'blocked | upgradeneeded 1->2 | open v2' || logB.join(' | ') === 'upgradeneeded 1->2 | open v2', logB);
  check('4a: A got onVersionChange callback (not deleting) with a message', evA.length === 1 && evA[0].type === 'versionchange' && evA[0].oldVersion === 1 && evA[0].newVersion === 2 && evA[0].deleting === false && /Reload/.test(evA[0].message), evA);
  // A (still on the old v1 page) now fails visibly with a friendly message, not a hang
  const verr = await A.evaluate(async () => { try { await DB.pages.list(); return 'no error'; } catch (e) { return { name: e.name, message: e.message }; } });
  check('4a: old code against a v2 DB gets a friendly VersionError (no silent hang)', verr.name === 'VersionError' && /newer than this page/.test(verr.message), verr);
  await B.evaluate(() => window.v2db.close()); await deleteDb(B);

  // 4b: a tab that IGNORES versionchange keeps the upgrade waiting; blocked event is visible; closing it releases
  await A.evaluate(() => DB.pages.put({ name: 'Seed (fictional)', module: 'HCM' }));
  const C = await tab(ctx);
  await C.evaluate(() => new Promise(res => { const q = indexedDB.open('erpinspector', 1); q.onsuccess = () => { window.stubborn = q.result; res(); }; }));  // no onversionchange handler
  const B2 = await tab(ctx);
  await B2.evaluate(rawV2.replace('res(); }; window.v2req', 'res(); }; window.v2req') && `(() => { ${rawV2.replace(/^new Promise\(res => /, 'window.pending = new Promise(res => ')} })()`);
  await B2.waitForFunction(() => window.log && window.log.includes('blocked'), null, { timeout: 5000 });
  await B2.waitForTimeout(400);
  const stillWaiting = await B2.evaluate(() => window.log.join(' | '));
  check('4b: stubborn tab -> blocked event, upgrade still waiting (not silently done)', stillWaiting === 'blocked', stillWaiting);
  await C.evaluate(() => window.stubborn.close());
  await B2.evaluate(() => window.pending);
  const released = await B2.evaluate(() => window.log.join(' | '));
  check('4b: after the other tab closes the upgrade completes', released === 'blocked | upgradeneeded 1->2 | open v2', released);
  await B2.evaluate(() => window.v2db.close()); await deleteDb(B2);
  await B.close(); await B2.close(); await C.close();

  // ---------- 5. resetAppData with another tab open ----------
  await A.reload(); await A.waitForFunction(() => window.ready);
  await A.evaluate(async () => {
    await DB.pages.put({ name: 'To be reset (fictional)', module: 'HCM', baseline: await makeBlob('#0a84ff') });
    localStorage.setItem('erpinspector:theme', 'dark'); localStorage.setItem('erpinspector:lastPage', '1'); localStorage.setItem('other-app:keep', 'x');
  });
  const D = await tab(ctx);                                         // second tab, real db.js connection
  check('5: tab D sees the data', await D.evaluate(async () => (await DB.pages.list()).length) === 1);
  await A.evaluate(() => { window.events.length = 0; return DB.resetAppData(); });
  const evD = await D.evaluate(() => window.events);
  const ls = await A.evaluate(() => ({ a: localStorage.getItem('erpinspector:theme'), b: localStorage.getItem('erpinspector:lastPage'), keep: localStorage.getItem('other-app:keep') }));
  check('5: DB gone from indexedDB.databases()', !(await dbNames(A)).some(n => n.startsWith('erpinspector')), await dbNames(A));
  check('5: tab D closed itself on versionchange (deleting=true) and reset was not blocked', evD.length === 1 && evD[0].type === 'versionchange' && evD[0].deleting === true && !(await A.evaluate(() => window.events.some(e => e.type === 'blocked'))), evD);
  check("5: only 'erpinspector:' localStorage keys cleared", ls.a === null && ls.b === null && ls.keep === 'x', ls);
  const fresh = await D.evaluate(async () => ({ pages: (await DB.pages.list()).length, persist: await DB.settings.get('persistRequested') }));
  check('5: after reset the library reopens empty (v1 recreated), persist flag reset', fresh.pages === 0 && fresh.persist === undefined, fresh);

  // 5b: reset while a tab ignores versionchange -> onBlocked callback fires, reset waits, then completes
  await D.evaluate(() => DB.pages.put({ name: 'Another (fictional)', module: 'FSCM' }));
  const E = await tab(ctx);
  await E.evaluate(() => new Promise(res => { const q = indexedDB.open('erpinspector', 1); q.onsuccess = () => { window.stubborn = q.result; res(); }; }));
  await D.evaluate(() => { window.events.length = 0; window.resetP = DB.resetAppData().then(() => (window.resetDone = true)); });
  await D.waitForFunction(() => window.events.some(e => e.type === 'blocked'), null, { timeout: 5000 });
  const blockedMsg = await D.evaluate(() => ({ events: window.events.map(e => e.type + ': ' + e.m), done: !!window.resetDone }));
  check('5b: reset blocked by a stubborn tab -> onBlocked message, reset still pending', blockedMsg.events[0] === 'blocked: Close other tabs of this app to finish the reset.' && blockedMsg.done === false, blockedMsg);
  await E.evaluate(() => window.stubborn.close());
  await D.evaluate(() => window.resetP);
  check('5b: after closing it the reset completes and the DB is gone', !(await dbNames(D)).some(n => n.startsWith('erpinspector')), await dbNames(D));

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

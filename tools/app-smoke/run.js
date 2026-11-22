// End-to-end smoke test of the app. Serve first:  python3 tools/serve_netlify.py --port 8106
// Run:  node tools/app-smoke/run.js     (playwright is preinstalled)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const URL = 'http://localhost:8106/index.html';
const out = [];
const check = (n, ok, d) => { out.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const problems = [], requests = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('request', r => requests.push(r.url()));

  await page.goto(URL);
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready', null, { timeout: 60000 });
  check('pill Ready after OpenCV loads', true);
  check('empty library state', await page.getAttribute('#main', 'data-state') === 'ready-empty');
  check('sample select filled from manifest', await page.locator('#sample-select option').count() >= 8);

  await page.click('#btn-load-sample');
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-fail', null, { timeout: 60000 });
  const regions = await page.locator('#region-list > li').count();
  check('Timesheet sample: FAIL with >= 2 regions', regions >= 2, { regions, text: await page.textContent('#result-text') });
  check('hints rendered', (await page.textContent('#region-list > li .region-hint')).startsWith('Likely'));
  check('Sign off disabled before decisions', await page.getAttribute('#btn-signoff', 'aria-disabled') === 'true');
  check('stats show alignment', (await page.textContent('#stat-alignment')).length > 0, await page.textContent('#stat-alignment'));
  for (const v of ['side', 'overlay', 'heatmap', 'boxes']) { await page.click(`#tab-${v}`); }
  await page.click('#tab-overlay'); await page.focus('#overlay-slider'); await page.keyboard.press('ArrowRight');
  check('overlay valuetext', /Showing \d+% after/.test(await page.getAttribute('#overlay-slider', 'aria-valuetext')));
  check('overlay --split set via CSSOM', (await page.$eval('#canvas-overlay-top', e => e.style.getPropertyValue('--split'))) !== '');

  // decisions: region 1 Regression, rest Expected; Sign off stays disabled
  const lis = page.locator('#region-list > li');
  for (let i = 0; i < regions; i++) await lis.nth(i).locator(`input[value="${i === 0 ? 'Regression' : 'Expected'}"]`).check();
  check('Sign off disabled with a Regression', await page.getAttribute('#btn-signoff', 'aria-disabled') === 'true');
  check('regression hint', (await page.textContent('#signoff-hint')).includes('Regression'));
  await page.click('#btn-result-primary');                    // Save run
  await page.click('#save-submit');
  check('evidence required', (await page.textContent('#evidence-error')).includes('Test case ID is required'));
  await page.fill('#ev-testcase', 'VR-TL-01'); await page.fill('#ev-ticket', 'CHG-0042'); await page.fill('#ev-tools', 'PI 50 (fictional)'); await page.fill('#ev-tester', 'SA');
  await page.click('#save-submit');
  await page.waitForFunction(() => document.getElementById('save-state').textContent.startsWith('Saved as run'));
  check('run saved', true, await page.textContent('#save-state'));

  // reload: run + page persist
  await page.goto(URL + '#/history');
  await page.waitForSelector('#run-rows tr');
  check('run persists after reload', await page.locator('#run-rows tr').count() === 1, await page.textContent('#run-rows tr'));
  // export JSON and validate
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-json')]);
  const f = path.join(os.tmpdir(), 'erp-smoke-export.json'); await dl.saveAs(f);
  let valid = false, outp = '';
  try { outp = execFileSync('python3', ['tools/validate_evidence.py', f]).toString(); valid = true; } catch (e) { outp = String(e.stdout || e); }
  check('exported JSON passes validate_evidence.py', valid, outp.trim());
  // view the saved run
  await page.click('.run-view');
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-fail');
  check('saved run opens with its decisions', await page.locator('#region-list input[value="Regression"]:checked').count() === 1);

  // ignore zone from a region -> compare again
  // Purchase Order: FAIL -> suggested zone -> PASS
  await page.goto(URL + '#/library');
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready');
  await page.selectOption('#sample-select', { label: 'FSCM – Purchase Order (timestamp only)' });
  await page.click('#btn-load-sample');
  await page.waitForFunction(() => /^result-/.test(document.getElementById('main').dataset.state), null, { timeout: 30000 });
  const poFirst = await page.getAttribute('#main', 'data-state');
  check('PO pair FAILs before the ignore zone (manifest expectation)', poFirst === 'result-fail', poFirst);
  if (poFirst === 'result-fail') {
    await page.click('#btn-suggest-zone');
    await page.click('#btn-result-primary');                    // Compare again
    await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-pass', null, { timeout: 30000 });
    check('PO pair PASS after the ignore zone', true);
  }

  // sign-off + promote + zone from a region (HCM Job Data)
  await page.goto(URL + '#/library');
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready');
  await page.selectOption('#sample-select', { label: 'HCM – Job Data' });
  await page.click('#btn-load-sample');
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-fail', null, { timeout: 30000 });
  await page.locator('#region-list > li').first().locator('.region-zone').click();
  await page.fill('#zone-label', 'Smoke zone'); await page.click('#zone-submit');
  await page.waitForFunction(() => document.getElementById('btn-result-primary').dataset.action === 'compare-again');
  check('zone from region sets Compare again', (await page.textContent('#zone-added-note')).includes('Smoke zone'));
  await page.click('#btn-result-primary');
  await page.waitForFunction(() => /^result-/.test(document.getElementById('main').dataset.state) && document.getElementById('stat-ignored').textContent.includes('1 zone'), null, { timeout: 30000 });
  check('zone persisted for the page', (await page.textContent('#stat-ignored')).includes('1 zone'), await page.textContent('#stat-ignored'));
  const n = await page.locator('#region-list > li').count();
  for (let i = 0; i < n; i++) await page.locator('#region-list > li').nth(i).locator('input[value="Expected"]').check();
  await page.click('#btn-result-primary');
  await page.fill('#ev-testcase', 'VR-HCM-01'); await page.fill('#ev-ticket', 'CHG-0043'); await page.fill('#ev-tools', 'PI 50'); await page.fill('#ev-tester', 'SA');
  await page.click('#save-submit');
  await page.waitForFunction(() => document.getElementById('btn-result-primary').dataset.action === 'signoff');
  check('Promote disabled until signed off', await page.getAttribute('#btn-promote', 'aria-disabled') === 'true');
  await page.click('#btn-result-primary'); await page.fill('#so-reviewer', 'SA'); await page.click('#signoff-submit');
  await page.waitForFunction(() => document.getElementById('btn-result-primary').dataset.action === 'promote');
  await page.click('#btn-result-primary'); await page.click('#confirm-ok');
  await page.waitForFunction(() => document.getElementById('btn-result-primary').dataset.action === 'library');
  check('signed off and promoted', true);
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download-png')]);
  check('evidence PNG downloads', /\.png$/.test(dl2.suggestedFilename()), dl2.suggestedFilename());

  // keyboard-form zone on the compare screen
  await page.goto(URL + '#/settings');
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready');
  // Reset app data
  await page.click('#btn-reset');
  check('reset dialog open', await page.$eval('#reset-dialog', d => d.open && d.dataset.state === 'reset-confirm'));
  await page.click('#reset-confirm');
  await page.waitForFunction(() => document.getElementById('reset-dialog').dataset.state === 'reset-done');
  check('reset-done state', true);
  await page.click('#reset-back');
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'ready-empty');
  const dbs = await page.evaluate(async () => { const d = await indexedDB.databases(); const names = d.map(x => x.name); let rows = 0;
    if (names.includes('erpinspector')) rows = await new Promise(res => { const r = indexedDB.open('erpinspector'); r.onsuccess = () => { const db = r.result; const t = db.transaction(['pages', 'runs']); let n = 0; t.objectStore('pages').count().onsuccess = e => { n += e.target.result; }; t.objectStore('runs').count().onsuccess = e => { n += e.target.result; }; t.oncomplete = () => { db.close(); res(n); }; }; });
    return rows; });
  check('library empty after reset', dbs === 0, dbs);
  await page.reload();
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'ready-empty', null, { timeout: 30000 });
  check('still empty after reload', true);

  const external = requests.filter(u => !u.startsWith('http://localhost:8106/') && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('no external requests', external.length === 0, external);
  check('zero console errors / CSP violations', problems.length === 0, problems);
  await browser.close();
  const failed = out.filter(x => !x).length;
  console.log(failed ? `${failed} FAILED` : `ALL ${out.length} CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

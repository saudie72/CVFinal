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
  // --- UX-2 landing: purpose sentence, one hero button, grouped example cards with plain titles
  check('landing visible on first run (owner sentence as h1)', /^Compare a page before and after a PeopleSoft update/.test(await page.textContent('#h-library')), await page.textContent('#h-library'));
  check('landing: hero button is "Try the demo (30 seconds)"', (await page.textContent('#btn-load-sample')).trim() === 'Try the demo (30 seconds)');
  check('landing: "Compare my own screenshots" present', (await page.textContent('#btn-new-page')).trim() === 'Compare my own screenshots');
  check('landing: nav shows only My pages, Settings, How it works, Resources', JSON.stringify(await page.locator('.app-nav li:not([hidden])').allInnerTexts()) === JSON.stringify(['My pages', 'Settings', 'How it works', 'Resources']));
  check('landing: no sample dropdown', await page.locator('#sample-select').count() === 0);
  const groupCounts = [await page.locator('#examples-more .sample-card').count(), await page.locator('#examples-tricky .sample-card').count()];
  check('example cards grouped 3 + 4', groupCounts.join() === '3,4', groupCounts);
  const cardText = await page.locator('#sample-hero, #examples-more, #examples-tricky').allInnerTexts();
  check('example cards: plain titles, no module codes or pixel numbers', !/FSCM –|HCM –|\bFSCM\)?\s*-|timestamp only|\d+ by \d+/i.test(cardText.join('\n')) && /What to expect:/.test(cardText.join('\n')));
  check('example titles are plain', (await page.locator('.sample-card .sample-title, #sample-hero .sample-title').allTextContents()).includes('Purchase order (with a changing clock)'));

  await page.click('#btn-load-sample');
  // --- guided tour: 5 steps, Next ... Finish
  await page.waitForSelector('#tour:not([hidden])');
  check('tour step 1: before page, docked panel', /^Step 1 of 5\. This is the page before the update\./.test(await page.textContent('#tour-title')) && await page.isVisible('#tour-before'));
  await page.click('#tour-next');
  check('tour step 2: after page', /^Step 2 of 5\. This is the same page after the update\./.test(await page.textContent('#tour-title')) && await page.isVisible('#tour-after'));
  await page.click('#tour-next');
  await page.waitForFunction(() => /^Step 3 of 5\. The inspector found \d+ changes?, highlighted in red\./.test(document.getElementById('tour-title').textContent), null, { timeout: 60000 });
  const nFound = Number((await page.textContent('#tour-title')).match(/found (\d+) change/)[1]);
  check('tour step 3: N matches the result and the boxes canvas is shown', nFound === await page.locator('#region-list > li').count() && await page.isVisible('#canvas-boxes'), nFound);
  await page.click('#tour-next');
  check('tour step 4: decide help + card 1 highlighted', (await page.textContent('#tour-help')).includes('Expected means') && await page.getAttribute('#region-list > li:nth-child(1)', 'data-selected') === 'true');
  await page.click('#tour-next');
  check('tour step 5: Finish button, primary outlined', (await page.textContent('#tour-next')) === 'Finish' && await page.$eval('#btn-result-primary', e => e.classList.contains('tour-focus')));
  await page.click('#tour-next');
  check('tour completes (panel closed, focus on first change card)', await page.isHidden('#tour') && await page.evaluate(() => document.activeElement.matches('li.region')));
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-fail', null, { timeout: 60000 });
  const regions = await page.locator('#region-list > li').count();
  check('Timesheet sample: FAIL with >= 2 regions', regions >= 2, { regions, text: await page.textContent('#result-text') });
  check('card cause line in words', (await page.textContent('#region-list > li .region-cause')).includes('What this probably is:'));
  const t1 = await page.textContent('#region-list > li .region-title');
  check('change card shows words not pixels', /^Change 1 of \d+ · [a-z ,]+ of the page|^Change 1 of \d+ · .*(across the full width|most of the page)/.test(t1) && !/\d+ by \d+|pixels/.test(t1), t1);
  check('pixels only under Details', (await page.locator('#region-list > li').first().locator('.region-details-line').textContent()).includes('pixels') && !(await page.locator('#region-list > li').first().locator('.region-details-line').isVisible()));
  check('zero radios checked on arrival', await page.locator('#region-list input[type=radio]:checked').count() === 0);
  check('decision help text under each option', (await page.locator('#region-list > li').first().locator('.choice-desc').allTextContents()).every(t => t.length > 20));
  check('summary + next-step sentence present', (await page.textContent('#result-summary')).includes('changes found') && (await page.textContent('#result-next')).startsWith('The tool found'));
  check('result text says changes', /^FAIL — \d+ changes? found/.test(await page.textContent('#result-text')), await page.textContent('#result-text'));
  check('Before/After crops drawn', await page.$eval('#region-list > li .crop-before', c => c.width > 10 && c.getAttribute('aria-label').startsWith('Before: change 1')));
  // card <-> box link: clicking a card highlights its box (canvas pixels change, data-selected set)
  const boxHash = () => page.$eval('#canvas-boxes', c => { const u = c.toDataURL(); let h = 0; for (let i = 0; i < u.length; i += 7) h = (h * 31 + u.charCodeAt(i)) | 0; return h; });
  const h0 = await boxHash();
  await page.locator('#region-list > li').nth(1).locator('.region-title').click();
  check('clicking a card selects it', await page.getAttribute('#region-list > li:nth-child(2)', 'data-selected') === 'true');
  check('clicking a card highlights its box on the canvas', (await boxHash()) !== h0);
  await page.locator('#region-list > li').nth(1).locator('.region-show').click();
  check('Show on screenshot reveals Back to change', (await page.textContent('#btn-back-to-card')) === 'Back to change 2');
  // click a numbered box -> its card is selected
  const box = await page.evaluate(() => { const c = document.getElementById('canvas-boxes'), r = c.getBoundingClientRect(); return { l: r.left, t: r.top, k: r.width / c.width }; });
  const reg = await page.evaluate(() => { const li = document.querySelector('#region-list > li'); return li._r; });
  await page.evaluate(() => document.getElementById('canvas-boxes').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(100);
  const b2 = await page.evaluate(() => { const c = document.getElementById('canvas-boxes'), r = c.getBoundingClientRect(); return { l: r.left, t: r.top, k: r.width / c.width }; });
  await page.mouse.click(b2.l + (reg.x + reg.width / 2) * b2.k, b2.t + (reg.y + reg.height / 2) * b2.k);
  check('clicking a box selects its card', await page.getAttribute('#region-list > li:nth-child(1)', 'data-selected') === 'true');
  check('Sign off disabled before decisions', await page.getAttribute('#btn-signoff', 'aria-disabled') === 'true');
  check('strip: looked-at counts and exactly one current step', await page.locator('#result-steps [aria-current=step]').count() === 1 && (await page.textContent('#result-steps > li[data-step=review] .strip-status')).includes('looked at'));
  check('stats show alignment in words', /None needed|Lined up/.test(await page.textContent('#stat-alignment')), await page.textContent('#stat-alignment'));
  for (const v of ['side', 'overlay', 'heatmap', 'boxes']) { await page.click(`#tab-${v}`); }
  await page.click('#tab-overlay'); await page.focus('#overlay-slider'); await page.keyboard.press('ArrowRight');
  check('overlay valuetext', /Showing \d+% after/.test(await page.getAttribute('#overlay-slider', 'aria-valuetext')));
  check('overlay --split set via CSSOM', (await page.$eval('#canvas-overlay-top', e => e.style.getPropertyValue('--split'))) !== '');

  // decisions: region 1 Regression, rest Expected; Sign off stays disabled
  const lis = page.locator('#region-list > li');
  for (let i = 0; i < regions; i++) await lis.nth(i).locator(`input[value="${i === 0 ? 'Regression' : 'Expected'}"]`).check();
  check('Sign off disabled with a Regression', await page.getAttribute('#btn-signoff', 'aria-disabled') === 'true');
  check('regression hint', (await page.textContent('#signoff-hint')).includes('Regression'));
  await page.click('#btn-result-primary');                    // Save result
  check('strip updated after decisions', (await page.textContent('#result-steps > li[data-step=decide] .strip-status')).startsWith('All '));
  await page.click('#save-submit');
  check('evidence required', (await page.textContent('#evidence-error')).includes('Test case ID is required'));
  await page.fill('#ev-testcase', 'VR-TL-01'); await page.fill('#ev-ticket', 'CHG-0042'); await page.fill('#ev-tools', 'PI 50 (fictional)'); await page.fill('#ev-tester', 'SA');
  await page.click('#save-submit');
  await page.waitForFunction(() => document.getElementById('save-state').textContent.startsWith('Saved as result'));
  check('run saved', true, await page.textContent('#save-state'));

  // reload: run + page persist
  await page.goto(URL + '#/history');
  await page.waitForSelector('#run-rows tr');
  check('run persists after reload', await page.locator('#run-rows tr').count() === 1, await page.textContent('#run-rows tr'));
  // export JSON and validate
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-details summary').then(() => page.click('#btn-export-json'))]);
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
  await page.evaluate(() => { document.getElementById('examples').open = true; });
  await page.click('#examples [data-sample-id="fscm-po"]');
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
  await page.evaluate(() => { document.getElementById('examples').open = true; });
  await page.click('#examples [data-sample-id="hcm-job-data"]');
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
  await page.locator('#region-list > li').first().locator('input[value="Regression"]').click({ force: true });
  check('promoted run: decision change is refused', await page.locator('#region-list > li').first().locator('input[value="Expected"]').isChecked());
  check('promoted run: radios aria-disabled', await page.getAttribute('#region-list input[type=radio]', 'aria-disabled') === 'true');
  check('promoted run keeps sign-off', (await page.textContent('#signoff-hint')).includes('Signed off by'));
  await page.click('#more-actions summary');
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
  // Skip + Esc, and onboardingSeen persists
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready');
  await page.click('#btn-load-sample'); await page.waitForSelector('#tour:not([hidden])');
  await page.focus('#tour-next'); await page.keyboard.press('Escape');
  check('Esc skips the tour', await page.isHidden('#tour'));
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-fail', null, { timeout: 60000 });
  check('after Skip the user lands on the Result screen', await page.isVisible('#screen-result'));
  await page.reload(); await page.waitForSelector('#page-list > li');
  check('onboardingSeen persists (no tour banner after reload)', await page.isHidden('#tour-again'));

  const external = requests.filter(u => !u.startsWith('http://localhost:8106/') && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('no external requests', external.length === 0, external);
  check('zero console errors / CSP violations', problems.length === 0, problems);
  await browser.close();
  const failed = out.filter(x => !x).length;
  console.log(failed ? `${failed} FAILED` : `ALL ${out.length} CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

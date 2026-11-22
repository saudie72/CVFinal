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
  // --- UX-9: first visit lands on Getting started (walkthrough + examples); My pages is the work area
  check('first visit lands on #/start (Getting started)', await page.evaluate(() => location.hash) === '#/start' && await page.isVisible('#screen-start') && (await page.textContent('#h-start')).trim() === 'Getting started');
  check('start: purpose line is the owner sentence', /^Compare a page before and after a PeopleSoft update/.test(await page.textContent('#start-purpose')));
  check('start: "Start the walkthrough" button is primary and present', (await page.textContent('#btn-start-tour')).trim() === 'Start the walkthrough');
  check('nav: Getting started first, then My pages, Settings, How it works, Resources', JSON.stringify(await page.locator('.app-nav li:not([hidden])').allInnerTexts()) === JSON.stringify(['Getting started', 'My pages', 'Settings', 'How it works', 'Resources']));
  check('start: primary button of the example row is "Open example"', (await page.textContent('#btn-load-sample')).trim() === 'Open example');
  const manifestS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'samples', 'manifest.json'), 'utf8'));
  check('UX-9: #example-select visible, Timesheet selected by default', await page.isVisible('#example-select') && await page.$eval('#example-select', e => e.selectedOptions[0].textContent) === 'Timesheet');
  check('UX-9: example options = manifest titles in 3 optgroups', JSON.stringify(await page.$$eval('#example-select option', o => o.map(x => x.textContent))) === JSON.stringify(manifestS.slice().sort((a, b) => a.order - b.order).map(m => m.title)) && await page.locator('#example-select optgroup').count() === 3);
  check('UX-9: no collapsed example cards or hero any more', await page.locator('.sample-card, #sample-hero, #examples, #examples-more, #examples-tricky').count() === 0);
  const descBefore = await page.textContent('#example-desc');
  await page.selectOption('#example-select', 'hcm-job-data');
  const descAfter = await page.textContent('#example-desc');
  check('UX-9: changing the select updates the live description (story + Expect:)', descBefore !== descAfter && descAfter.includes('Pay Grade') && /Expect:/.test(descAfter) && await page.getAttribute('#example-desc', 'aria-live') === 'polite', descAfter);
  await page.selectOption('#example-select', 'tl-timesheet');
  check('UX-9: no module codes in the Getting started examples', !/FSCM|HCM/.test(await page.locator('#home-example').innerText()));
  // --- My pages: library dropdown on top, one action button, filtered saved pages
  await page.click('.app-nav a[data-route="library"]');
  await page.waitForSelector('#screen-library:not([hidden])');
  check('empty library state on My pages', await page.getAttribute('#main', 'data-state') === 'ready-empty');
  check('UX-9: #ps-page visible on My pages without any click, first option "All modules", optgroups, Other last', await page.isVisible('#ps-page') && await page.$eval('#ps-page', e => e.options[0].textContent) === 'All modules' && await page.locator('#ps-page optgroup').count() > 5 && await page.$eval('#ps-page', e => e.options[e.options.length - 1].value) === '__other');
  check('UX-9: the library dropdown is the first thing under the h1/purpose (before any list)', await page.evaluate(() => { const a = document.getElementById('ps-page').getBoundingClientRect().top, b = document.getElementById('your-pages').getBoundingClientRect().top; return a < b; }));
  check('UX-9: no example picker on My pages; empty sentence + link to Getting started', await page.locator('#screen-library #example-select').count() === 0 && /^No pages yet\. Choose a PeopleSoft page above/.test((await page.textContent('#pages-empty')).trim()) && await page.isVisible('#link-try-example'));
  check('UX-9: action button hidden while "All modules"', await page.isHidden('#btn-new-page'));
  await page.selectOption('#ps-page', { index: 1 });
  const chosen = await page.$eval('#ps-page', e => e.value);
  check('UX-9: choosing a page shows "Add before & after screenshots"', await page.isVisible('#btn-new-page') && (await page.textContent('#btn-new-page')).trim() === 'Add before & after screenshots');
  await page.click('#btn-new-page');
  check('UX-9: the button pre-fills the page name and focuses the Before drop zone', await page.isVisible('#new-page-form') && await page.inputValue('#page-name') === chosen && await page.evaluate(() => document.activeElement.id) === 'baseline-file', await page.inputValue('#page-name'));
  await page.click('#btn-new-page-cancel');
  await page.selectOption('#ps-page', '__other'); await page.click('#btn-new-page');
  check('UX-9: Other opens the form with the name field focused', await page.evaluate(() => document.activeElement.id) === 'page-name');
  await page.click('#btn-new-page-cancel');
  await page.click('.app-nav a[data-route="start"]');
  await page.waitForSelector('#screen-start:not([hidden])');

  await page.click('#btn-start-tour');
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
  check('tour step 5: Finish button, primary outlined and on screen', (await page.textContent('#tour-next')) === 'Finish' && await page.$eval('#btn-result-primary', e => { const r = e.getBoundingClientRect(); return e.classList.contains('tour-focus') && r.top >= 0 && r.bottom <= innerHeight; }));
  await page.click('#tour-next');
  check('tour completes (panel closed, page at top, focus on the current step of the strip)', await page.isHidden('#tour') && await page.evaluate(() => scrollY < 5 && document.activeElement.matches('#result-steps li[aria-current="step"]')));
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
  await page.goto(URL + '#/start');
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready');
  await page.selectOption('#example-select', 'fscm-po'); await page.click('#btn-load-sample');
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
  await page.goto(URL + '#/start');
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready');
  await page.selectOption('#example-select', 'hcm-job-data'); await page.click('#btn-load-sample');
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
  await page.evaluate(() => { location.hash = '#/start'; }); await page.waitForSelector('#screen-start:not([hidden])');
  await page.click('#btn-start-tour'); await page.waitForSelector('#tour:not([hidden])');
  await page.focus('#tour-next'); await page.keyboard.press('Escape');
  check('Esc skips the tour', await page.isHidden('#tour'));
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'result-fail', null, { timeout: 60000 });
  check('after Skip the user lands on the Result screen', await page.isVisible('#screen-result'));
  await page.goto(URL); await page.waitForSelector('#page-list > li');
  check('onboardingSeen persists: after the tour the default landing is My pages, not Getting started', await page.evaluate(() => location.hash) === '#/library' && await page.isVisible('#screen-library'));


  // ===== UX-6: "Try an example" must open ANY example from My pages, every time =====
  const ready = () => page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready', null, { timeout: 60000 });
  const resultOf = async (to = 30000) => { try { await page.waitForFunction(() => /^result-|^error/.test(document.getElementById('main').dataset.state) && location.hash === '#/result', null, { timeout: to }); } catch { /* reported by the check */ } return page.getAttribute('#main', 'data-state'); };
  const openExampleFromPages = async (id, how = {}) => {      // examples now live on Getting started
    await page.evaluate(() => { location.hash = '#/start'; });
    await page.waitForFunction(() => location.hash === '#/start' && !document.getElementById('screen-start').hidden, null, { timeout: 15000 });
    await page.waitForTimeout(250);
    await page.selectOption('#example-select', id);
    const btn = page.locator('#btn-load-sample');
    if (how.key) { await btn.focus(); await page.keyboard.press(how.key); } else await btn.click({ clickCount: how.dbl ? 2 : 1, delay: how.dbl ? 20 : 0 });
    return resultOf();
  };
  const pageCount = () => page.evaluate(async () => (await (await import('/js/db.js')).pages.list()).length);
  await page.goto(URL + '#/library'); await ready();
  const before = await pageCount();
  check('UX-6a: example already in My pages opens and runs (no error)', await openExampleFromPages('tl-timesheet') === 'result-fail' && await pageCount() === before);
  await page.evaluate(() => { location.hash = '#/library'; }); await page.waitForSelector('#page-list > li');
  check('UX-9: opened examples are tagged "Example" in My pages', await page.locator('#page-list > li:has(.sample-tag:not([hidden]))').count() === await page.locator('#page-list > li').count() && await page.locator('#page-list > li').count() >= 1);
  await page.evaluate(async () => {            // one saved result on the first page, so the card can show it
    const { pages, runs } = await import('/js/db.js'); const p = (await pages.list())[0];
    const b = new Blob(['x'], { type: 'image/png' });
    await runs.add({ pageId: p.id, candidate: b, result: b, regions: [{ id: 1, decision: 'Expected' }, { id: 2, decision: null }], changedPct: 1.2, ssim: 0.9, status: 'FAIL', alignment: 'none', settings: {}, signOff: { signedOff: true, reviewer: 'SA' } });
  });
  await page.evaluate(() => { location.hash = '#/start'; }); await page.waitForTimeout(200); await page.evaluate(() => { location.hash = '#/library'; }); await page.waitForTimeout(500);
  check('UX-9: saved page cards show the latest result status (FAIL, regions, decided, signed off)', await page.locator('#page-list > li .card-status', { hasText: /^Latest result: FAIL, 2 changes · .* · 1 of 2 decided · Signed off$/ }).count() === 1, await page.locator('#page-list > li .card-status').allTextContents());
  check('UX-9: saved page cards show the latest result status', (await page.locator('#page-list > li .card-status').allTextContents()).some(t => /^Latest result: (PASS|FAIL)/.test(t)), await page.textContent('#page-list > li .card-status'));
  check('UX-6e: Enter on an example button', await openExampleFromPages('hcm-job-data', { key: 'Enter' }) === 'result-fail');
  check('UX-6e: Space on an example button', await openExampleFromPages('hcm-personal-data', { key: 'Space' }) === 'result-fail');
  const n0 = await pageCount();
  check('UX-6f: double click opens once, no duplicate page', await openExampleFromPages('fscm-voucher', { dbl: true }) === 'result-fail' && await pageCount() === n0 + 1, await pageCount());
  check('UX-6e: the example select changes by keyboard and updates the description', await (async () => { await page.evaluate(() => { location.hash = '#/start'; }); await page.waitForTimeout(400); await page.selectOption('#example-select', 'tl-timesheet'); const d0 = await page.textContent('#example-desc'); await page.focus('#example-select'); await page.keyboard.press('ArrowDown'); const d1 = await page.textContent('#example-desc'); return d0 !== d1; })());
  // (b) pages saved by the OLD app (old titles, records without the new fields)
  await page.evaluate(async () => {
    const { pages } = await import('/js/db.js');
    for (const x of await pages.list()) await pages.remove(x.id);
    const tl = await (await fetch('samples/tl-timesheet_before.png')).blob(), po = await (await fetch('samples/fscm-po_before.png')).blob();
    await pages.put({ name: 'Time & Labor – Timesheet', module: 'Time & Labor', notes: '', baseline: tl });
    await pages.put({ name: 'FSCM – Purchase Order (timestamp only)', module: 'FSCM', baseline: po, width: 1, height: 1 });
  });
  await page.reload(); await ready();
  check('UX-6b: old-titled saved Timesheet opens and runs, no duplicate', await openExampleFromPages('tl-timesheet') === 'result-fail' && await pageCount() === 2, await pageCount());
  check('UX-6b: old-titled PO opens and runs, no duplicate', await openExampleFromPages('fscm-po') === 'result-fail' && await pageCount() === 2, await pageCount());
  check('UX-6b: a different example still adds a new page', await openExampleFromPages('hcm-job-data') === 'result-fail' && await pageCount() === 3);
  check('UX-6b: old records get the PeopleSoft page subtitle', await page.evaluate(async () => (await (await import('/js/db.js')).pages.list()).find(p => p.name === 'Time & Labor – Timesheet').psPage) === 'Time & Labor – Timesheet');
  // race: start one example, open another while it is still working
  await page.evaluate(() => { location.hash = '#/start'; }); await page.waitForTimeout(400);
  await page.selectOption('#example-select', 'fscm-voucher'); await page.click('#btn-load-sample');
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'working', null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(async () => {            // go back to Getting started and open the 2nd example while the 1st is still comparing
    location.hash = '#/start';
    const sel = () => document.getElementById('example-select');
    for (let k = 0; k < 200 && !(sel().offsetParent && document.getElementById('main').dataset.state === 'working'); k++) await new Promise(r => setTimeout(r, 10));
    if (document.getElementById('main').dataset.state !== 'working') console.log('note: first compare finished before the second click');
    sel().value = 'hcm-personal-data'; sel().dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('btn-load-sample').click();
  });
  await page.waitForFunction(() => /Personal details/.test(document.getElementById('result-page-name').textContent) && /^result-/.test(document.getElementById('main').dataset.state), null, { timeout: 60000 }).catch(() => {});
  const raced = await resultOf(60000);
  await page.waitForTimeout(400);
  check('UX-6: opening an example while another is comparing shows the second one', raced === 'result-fail' && /Personal details/.test(await page.textContent('#result-page-name')), await page.textContent('#result-page-name'));
  // (d) tour open / after Skip
  await page.goto(URL + '#/start'); await ready();
  await page.click('#btn-start-tour');
  await page.waitForSelector('#tour:not([hidden])');
  await page.evaluate(() => { location.hash = '#/library'; }); await page.waitForTimeout(500);
  check('UX-6d: leaving the tour shows My pages', await page.isHidden('#tour') && await page.isVisible('#screen-library'));
  check('UX-6d: example opens after leaving the tour', await openExampleFromPages('hcm-job-data') === 'result-fail' && await page.isHidden('#tour'));
  await page.evaluate(() => { location.hash = '#/library'; }); await page.waitForTimeout(400);
  check('UX-6d: example opens after Skip', await openExampleFromPages('hcm-personal-data') === 'result-fail');
  // (c) after Reset app data
  await page.goto(URL + '#/settings'); await ready();
  await page.click('#btn-reset'); await page.click('#reset-confirm');
  await page.waitForFunction(() => document.getElementById('reset-dialog').dataset.state === 'reset-done'); await page.click('#reset-back');
  await page.waitForFunction(() => document.getElementById('main').dataset.state === 'ready-empty');
  await page.evaluate(() => { location.hash = '#/start'; }); await page.waitForSelector('#screen-start:not([hidden])');
  await page.selectOption('#example-select', 'hcm-job-data'); await page.click('#btn-load-sample');
  check('UX-6c: example opens right after Reset app data', await resultOf() === 'result-fail');

  // ===== UX-6: PeopleSoft page catalog select =====
  await page.goto(URL + '#/library'); await ready();
  check('PS select: labelled "Which PeopleSoft page are you testing?"', (await page.textContent('label[for="ps-page"]')).trim() === 'Which PeopleSoft page are you testing?' && await page.$eval('#ps-page', e => e.tagName === 'SELECT' && e.classList.contains('ps-select')));
  const ps = await page.evaluate(() => { const s = document.getElementById('ps-page'), o = [...s.options]; return { first: o[0].text, last: o[o.length - 1].text, groups: [...s.querySelectorAll('optgroup')].map(g => g.label), n: o.length }; });
  check('PS select: first "All modules", last "Other (type a name)"', ps.first === 'All modules' && ps.last === 'Other (type a name)', [ps.first, ps.last]);
  check('PS select: optgroups per product and module, with HCM and FSCM', ps.groups.includes('HCM · Time & Labor') && ps.groups.some(g => g.startsWith('FSCM · ')) && ps.n > 100, [ps.groups.length, ps.n]);
  check('PS select: Time & Labor – Timesheet and Position Management are listed', await page.evaluate(() => { const t = [...document.getElementById('ps-page').options].map(o => o.text); return t.includes('Time & Labor – Timesheet') && t.some(x => /Position Management/.test(x)); }));
  check('PS select: form and name field hidden until a choice is made and the button pressed', await page.isHidden('#page-name') && await page.isHidden('#new-page-form'));
  await page.selectOption('#ps-page', { label: 'Time & Labor – Rules' }).catch(async () => { await page.selectOption('#ps-page', { index: 1 }); });
  await page.click('#btn-new-page');
  const chosen2 = await page.$eval('#ps-page', s => s.value);
  check('PS select: choosing fills the editable page name', await page.inputValue('#page-name') === chosen2 && await page.isVisible('#page-name'), chosen2);
  await page.selectOption('#ps-page', '__other'); await page.fill('#page-name', 'My custom page');
  check('PS select: Other keeps the free-text name', await page.inputValue('#page-name') === 'My custom page');
  await page.selectOption('#ps-page', { label: 'Time & Labor – Timesheet' });
  await page.setInputFiles('#baseline-file', path.join(__dirname, '..', '..', 'samples', 'tl-timesheet_before.png'));
  await page.fill('#page-name', 'Timesheet (mine)');
  await page.click('#new-page-form button[type=submit]');
  await page.waitForFunction(() => location.hash === '#/compare', null, { timeout: 15000 });
  check('PS select: psPage stored on the record and shown on Compare', await page.evaluate(async () => (await (await import('/js/db.js')).pages.list()).find(p => p.name === 'Timesheet (mine)').psPage) === 'Time & Labor – Timesheet' && /Time & Labor – Timesheet/.test(await page.textContent('#compare-page-name')));
  await page.evaluate(() => { location.hash = '#/library'; }); await page.waitForTimeout(500);
  check('PS select: subtitle shown on the My pages card', (await page.textContent('#page-list > li:has-text("Timesheet (mine)") .card-sub')).includes('Time & Labor – Timesheet'));
  check('Demo sample gets psPage from sampleMap', await page.evaluate(async () => (await (await import('/js/db.js')).pages.list()).filter(p => p.sampleId).every(p => p.psPage)));
  await page.click('#page-list > li:has-text("Employee job record") .page-open');
  await page.waitForFunction(() => location.hash === '#/compare');
  check('PS subtitle on compare for a demo page', /Workforce Administration – Job Data/.test(await page.textContent('#compare-page-name')), await page.textContent('#compare-page-name'));

  const external = requests.filter(u => !u.startsWith('http://localhost:8106/') && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('no external requests', external.length === 0, external);
  check('zero console errors / CSP violations', problems.length === 0, problems);
  await browser.close();
  const failed = out.filter(x => !x).length;
  console.log(failed ? `${failed} FAILED` : `ALL ${out.length} CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

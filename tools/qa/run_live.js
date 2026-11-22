// tools/qa/run_live.js - Quinn's one-shot check of the DEPLOYED site (default https://cvfinal-erp-inspector.netlify.app/).
//   node tools/qa/run_live.js [url]
// 1) the live site serves the new landing (h1 starts "Compare a page before and after")
// 2) landing -> Try the demo -> (skip the tour) -> result with 2 change cards
// 3) 0 cross-origin requests; console errors recorded; CSP errors from Netlify's injected /.netlify/scripts/hud badge are listed
//    SEPARATELY (known hosting issue, not an app defect).
// Writes tools/qa/live-results.json. Needs playwright; outbound HTTPS goes through the agent proxy (HTTPS_PROXY, NSS trust set up).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SITE = (process.argv[2] || 'https://cvfinal-erp-inspector.netlify.app/').replace(/\/?$/, '/');
const ORIGIN = new URL(SITE).origin;
const out = { site: SITE, date: new Date().toISOString(), checks: [], requests: [], console: [], pageErrors: [], csp: [] };
const rec = (name, ok, ev) => { out.checks.push({ name, ok, evidence: ev }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}  ${JSON.stringify(ev)}`); };
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push({ directive: e.violatedDirective, blocked: e.blockedURI, source: e.sourceFile || '' })); });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) out.console.push({ type: m.type(), text: m.text(), loc: (m.location() || {}).url || '' }); });
  page.on('pageerror', (e) => out.pageErrors.push(String(e.message)));
  ctx.on('request', (r) => out.requests.push({ url: r.url(), method: r.method() }));
  const failedReq = []; ctx.on('requestfailed', (r) => failedReq.push({ url: r.url(), why: (r.failure() || {}).errorText }));

  const resp = await page.goto(SITE, { waitUntil: 'load', timeout: 60000 });
  rec('live: HTTP 200', resp.status() === 200, resp.status());
  // the h1 is filled in by the app once it has started (the raw HTML says "My pages"), so wait for the app to be ready first
  await page.waitForFunction(() => document.getElementById('status-pill').dataset.state === 'ready', null, { timeout: 90000 });
  const h1 = clean(await page.textContent('#h-library').catch(() => ''));
  rec('live: serves the NEW landing (h1 starts "Compare a page before and after")', /^Compare a page before and after/.test(h1), h1);
  if (!/^Compare a page before and after/.test(h1)) { fs.writeFileSync(path.join(__dirname, 'live-results.json'), JSON.stringify(out, null, 1)); await browser.close(); process.exit(1); }
  const landing = await page.evaluate(() => { const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight)); return { primaries: [...document.querySelectorAll('#screen-library .btn-primary')].filter(vis).map((b) => b.textContent.trim()), secondary: document.getElementById('btn-new-page').textContent.trim(), nav: [...document.querySelectorAll('.app-nav a')].filter(vis).map((a) => a.textContent.trim()), dropdown: !!document.getElementById('sample-select'), title: document.title }; });
  rec('live: landing has one primary button and the plain nav, no dropdown', landing.primaries.length === 1 && landing.primaries[0] === 'Try the demo (30 seconds)' && !landing.dropdown && landing.nav.join() === 'My pages,Settings,How it works,Resources', landing);
  const afterReady = out.requests.length;
  await page.click('#btn-load-sample');
  await page.waitForSelector('#tour:not([hidden])', { timeout: 30000 });
  const step1 = clean(await page.textContent('#tour-title'));
  await page.click('#tour-skip');
  await page.waitForFunction(() => /^result-/.test(document.getElementById('main').dataset.state), null, { timeout: 90000 });
  const res = await page.evaluate(() => ({ status: document.getElementById('result-status').innerText.replace(/\s+/g, ' ').trim(), cards: document.querySelectorAll('#region-list > li').length, titles: [...document.querySelectorAll('.region-title')].map((t) => t.textContent.trim()), primary: document.getElementById('btn-result-primary').textContent.trim(), saveRunText: /\bSave run\b/.test(document.getElementById('screen-result').innerText) }));
  rec('live: Try the demo -> tour step 1 -> Skip -> result "FAIL — 2 changes found" with 2 change cards and a "Review changes" primary', /^FAIL — 2 changes found/.test(res.status) && res.cards === 2 && res.primary === 'Review changes' && !res.saveRunText && /^Step 1 of 5/.test(step1), { step1, ...res });
  await page.waitForTimeout(2500);
  const post = out.requests.slice(afterReady).map((r) => r.url.replace(ORIGIN, ''));
  const cross = out.requests.filter((r) => !r.url.startsWith(ORIGIN) && !/^(data|blob):/.test(r.url)).map((r) => r.url);
  rec('live: 0 cross-origin requests during the whole visit', cross.length === 0, cross);
  const allowed = (u) => /^\/samples\/[a-z0-9-]+_(before|after)\.png$/.test(u) || /^(blob|data):/.test(u) || u === '/samples/manifest.json';
  rec('live: after ready, only the demo PNGs were requested (same origin)', post.filter((u) => !allowed(u)).length === 0, post);
  out.csp = await page.evaluate(() => window.__csp);
  // classify: the Netlify-injected HUD badge (known hosting issue) vs anything from the app itself
  const hud = (t) => /\.netlify\/scripts\/hud|netlify\/scripts\/hud/i.test(t);
  const consoleHud = out.console.filter((c) => hud(c.text) || hud(c.loc));
  const consoleApp = out.console.filter((c) => !(hud(c.text) || hud(c.loc)));
  const cspHud = out.csp.filter((c) => hud(c.blocked) || hud(c.source));
  const cspApp = out.csp.filter((c) => !(hud(c.blocked) || hud(c.source)));
  const hudReq = out.requests.filter((r) => /\/\.netlify\//.test(r.url)).map((r) => r.url.replace(ORIGIN, ''));
  console.log('\nNetlify-injected requests:', JSON.stringify(hudReq));
  console.log('console (Netlify HUD badge, known hosting issue):', JSON.stringify(consoleHud));
  console.log('console (app):', JSON.stringify(consoleApp), ' page errors:', JSON.stringify(out.pageErrors));
  console.log('CSP violations (HUD):', JSON.stringify(cspHud), ' (app):', JSON.stringify(cspApp));
  console.log('failed requests:', JSON.stringify(failedReq));
  rec('live: no console errors or page errors from the app itself (HUD badge listed separately)', consoleApp.length === 0 && out.pageErrors.length === 0 && cspApp.length === 0, { consoleApp, pageErrors: out.pageErrors, cspApp });
  Object.assign(out, { hudRequests: hudReq, consoleHud, consoleApp, cspHud, cspApp, failedRequests: failedReq });
  const hdr = resp.headers();
  out.headers = { csp: hdr['content-security-policy'] || null, xcto: hdr['x-content-type-options'] || null, referrer: hdr['referrer-policy'] || null, xfo: hdr['x-frame-options'] || null };
  rec('live: security headers present (CSP, nosniff, no-referrer, frame deny)', !!out.headers.csp && out.headers.xcto === 'nosniff' && out.headers.referrer === 'no-referrer' && /deny/i.test(out.headers.xfo || ''), out.headers);
  fs.writeFileSync(path.join(__dirname, 'live-results.json'), JSON.stringify(out, null, 1));
  await browser.close();
  const bad = out.checks.filter((c) => !c.ok).length;
  console.log(`\n${out.checks.length - bad} passed, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

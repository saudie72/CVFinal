#!/usr/bin/env node
// Worker tests in headless Chrome (Playwright). Run from the repo root:
//   node tools/worker-test/run.js            all suites
//   node tools/worker-test/run.js csp        only the CSP matrix
// Serves on port 8102 only (Volt's port), one server at a time, killed after each suite.
// Writes tools/worker-test/results.json.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8102;
const URL_ = `http://127.0.0.1:${PORT}/tools/worker-test/index.html`;
const CHROME = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const realCV = ['align', 'ssim', 'heatmap', 'pipeline'].every(n => fs.existsSync(path.join(ROOT, 'js/cv', n + '.js')));

function waitUp() {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    const tryOnce = () => http.get(`http://127.0.0.1:${PORT}/netlify.toml`, r => { r.resume(); res(); })
      .on('error', () => (Date.now() - t0 > 10000 ? rej(new Error('server did not start')) : setTimeout(tryOnce, 100)));
    tryOnce();
  });
}

async function withServer(args, fn) {
  const script = args.plain ? 'tools/serve_netlify.py' : 'tools/worker-test/serve_test.py';
  const argv = [script, '--port', String(PORT), ...(args.plain ? [] : ['--csp', args.csp || 'netlify', '--stub', args.stub || 'auto'])];
  const srv = spawn('python3', argv, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let banner = '';
  srv.stdout.on('data', d => (banner += d));
  srv.stderr.on('data', () => {});
  try { await waitUp(); return await fn(banner.trim()); }
  finally { srv.kill('SIGTERM'); await new Promise(r => srv.on('exit', r)); }
}

async function withPage(browser, fn) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const console_ = [], errors = [];
  page.on('console', m => console_.push(`${m.type()}: ${m.text()}`.slice(0, 300)));
  page.on('pageerror', e => errors.push(String(e)));
  const resp = await page.goto(URL_);
  const headers = await resp.allHeaders();
  await page.waitForFunction(() => window.__harnessReady === true, null, { timeout: 10000 });
  try { return await fn(page, { console: console_, errors, csp: headers['content-security-policy'] }); }
  finally { await ctx.close(); }
}

const call = (page, name, ...a) => page.evaluate(([n, args]) => window.__t[n](...args), [name, a]);

async function cspSuite(browser) {
  const out = {};
  for (const csp of ['netlify', 'no-unsafe-eval', 'no-wasm-unsafe-eval', 'no-eval']) {
    out[csp] = await withServer({ csp, stub: 'auto' }, () => withPage(browser, async (page, ctx) => {
      const ready = await call(page, 'ready', { loadTimeoutMs: 20000 });
      let compare = null;
      if (ready.ok) compare = await call(page, 'roundTrip', {});
      const workerCsp = await page.evaluate(async () => (await fetch('/inspector.worker.js', { method: 'HEAD' })).headers.get('content-security-policy'));
      return { pageCsp: ctx.csp, workerCsp, ready: { ok: ready.ok, error: ready.error, pageMs: ready.pageMs, readyStyle: ready.info?.readyStyle },
               compare: compare && { status: compare.status, regions: compare.regions },
               cspConsole: ctx.console.filter(l => /Content Security Policy|unsafe-eval|EvalError|wasm|fatal/i.test(l)).slice(0, 4), pageErrors: ctx.errors };
    }));
  }
  return out;
}

async function mainSuite(browser, stub) {
  return withServer({ csp: 'netlify', stub }, (banner) => withPage(browser, async (page, ctx) => {
    const r = { server: banner };
    const readyRuns = [];
    for (let i = 0; i < 3; i++) readyRuns.push(await call(page, 'ready', {}));
    r.ready = readyRuns.map(x => ({ ok: x.ok, pageMs: x.pageMs, workerMs: x.info?.workerMs, importMs: x.info?.importMs, initMs: x.info?.initMs }));
    r.readyInfo = readyRuns[2].info;
    r.readyStatuses = readyRuns[2].statuses.map(s => s.state + ':' + s.label);
    r.roundTrip = [];
    for (let i = 0; i < 3; i++) r.roundTrip.push(await call(page, 'roundTrip', {}));
    r.copyMode = await call(page, 'copyMode');
    r.sameBuffer = await call(page, 'sameBuffer');
    if (stub !== 'never') {
      r.responsive = await call(page, 'responsive', 3000);
      r.jobError = await call(page, 'jobError');
    } else {
      r.realResponsive = await call(page, 'realResponsive', 5);
    }
    r.heap = await call(page, 'heapRuns', 20, {});
    if (stub !== 'never') {
      await call(page, 'ready', {});
      r.heapLeakControl = await call(page, 'heapRuns', 20, { __stub: 'leak' });
      r.watchdogShort = await call(page, 'watchdog', 2000);
      r.watchdogDefault30s = await call(page, 'watchdog', 30000);
    }
    await call(page, 'ready', {});
    r.manualRestart = await call(page, 'restart');
    r.pageErrors = ctx.errors;
    r.consoleErrors = ctx.console.filter(l => l.startsWith('error'));
    return r;
  }));
}

async function fatalSuite(browser) {
  // Plain tools/serve_netlify.py: if js/cv/* does not exist yet, the worker must report a fatal error.
  return withServer({ plain: true }, () => withPage(browser, async (page) => {
    const x = await call(page, 'ready', { loadTimeoutMs: 20000 });
    return { ok: x.ok, error: x.error, statuses: x.statuses.map(s => s.state + ':' + s.label) };
  }));
}

(async () => {
  const which = process.argv[2] || 'all';
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const results = { date: new Date().toISOString(), chrome: browser.version(), realCVFilesPresent: realCV };
  try {
    if (which === 'all' || which === 'csp') results.csp = await cspSuite(browser);
    if (which === 'all' || which === 'stub') results.stub = await mainSuite(browser, 'always');
    if (which === 'all' || which === 'real') results.real = realCV ? await mainSuite(browser, 'never') : 'skipped: js/cv files not present yet';
    if (which === 'all' || which === 'fatal') results.plainServer = await fatalSuite(browser);
  } finally { await browser.close(); }
  const file = path.join(__dirname, which === 'all' ? 'results.json' : `results-${which}.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, (k, v) => (k === 'bytes' || k === 'regionList' ? undefined : v), 2));
})().catch(e => { console.error(e); process.exit(1); });

// tools/cv-test/run.js — runs ErpCV.compare in a real Chromium Web Worker with the vendored opencv.js.
// Usage (repo root):  python3 tools/cv-test/gen_synthetic.py && node tools/cv-test/run.js [--png]
// Serves the repo with `python3 -m http.server 8101` (Iris's port), kills it afterwards.
// Tests: every synthetic pair, every pair in samples/manifest.json (if present; fscm-style pairs with
// expectedWithIgnoreZones run twice: without zones -> expected, with zones -> expectedWithIgnoreZones),
// a 20-run leak check on a real sample, and a negative control that leaks on purpose.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');

const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8101;
const SAVE_PNG = process.argv.includes('--png');
const OUT = path.join(__dirname, 'out');

function waitUp(url, ms) {
  const t0 = Date.now();
  return new Promise((res, rej) => (function poll() {
    http.get(url, r => { r.resume(); res(); }).on('error', () => Date.now() - t0 > ms ? rej(new Error('server not up')) : setTimeout(poll, 150));
  })());
}
function readManifest(p) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (e) { return null; } }

function check(r, exp, alignExp) {
  const errs = [];
  if (r.status !== exp.status) errs.push(`status ${r.status} != ${exp.status}`);
  if (exp.minRegions != null && r.regions.length < exp.minRegions) errs.push(`regions ${r.regions.length} < ${exp.minRegions}`);
  if (exp.maxRegions != null && r.regions.length > exp.maxRegions) errs.push(`regions ${r.regions.length} > ${exp.maxRegions}`);
  if (alignExp && r.alignment.method !== alignExp) errs.push(`alignment ${r.alignment.method} != ${alignExp}`);
  for (const k of ['dx', 'dy', 'scale']) if (typeof r.alignment[k] !== 'number') errs.push(`alignment.${k} missing`);
  return errs;
}

// Dex's reflow heuristic (docs/erp/change-catalogue.md §4): area > 4x median AND touching another region's edge
function reflowCandidates(regions) {
  if (regions.length < 2) return [];
  const a = regions.map(r => r.area).sort((x, y) => x - y), med = a[Math.floor(a.length / 2)];
  const touch = (p, q) => {
    const gx = Math.max(p.x, q.x) - Math.min(p.x + p.width, q.x + q.width);
    const gy = Math.max(p.y, q.y) - Math.min(p.y + p.height, q.y + q.height);
    return gx <= 1 && gy <= 1;
  };
  return regions.filter(r => r.area > 4 * med && regions.some(q => q !== r && touch(r, q))).map(r => r.id);
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  let browser, exitCode = 0;
  try {
    await waitUp(`http://127.0.0.1:${PORT}/`, 10000);
    browser = await chromium.launch();
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/tools/cv-test/harness.html`);
    const call = msg => page.evaluate(m => window.call(m), msg);
    const t0 = Date.now();
    const info = await call({ type: 'info' });
    console.log('opencv.js', JSON.stringify(info.info), `(ready in ${Date.now() - t0} ms incl. compile)`);

    const jobs = [];
    const syn = readManifest('tools/cv-test/fixtures/manifest.json') || [];
    syn.forEach(p => jobs.push({ set: 'synthetic', name: p.page, pair: p, exp: p.expected, align: p.expectAlign }));
    const samples = readManifest('samples/manifest.json');
    if (!samples) console.log('samples/manifest.json: MISSING (Mason\'s samples not present yet)');
    (samples || []).forEach(p => {
      if (p.expectedWithIgnoreZones) {
        jobs.push({ set: 'samples', name: p.page + ' (no zones)', pair: Object.assign({}, p, { ignoreZones: [] }), exp: p.expected });
        jobs.push({ set: 'samples', name: p.page + ' (+zones)', pair: p, exp: p.expectedWithIgnoreZones });
      } else jobs.push({ set: 'samples', name: p.page, pair: p, exp: p.expected });
    });

    const rows = [];
    if (SAVE_PNG) fs.mkdirSync(OUT, { recursive: true });
    for (const j of jobs) {
      const r = await call({ type: 'run', pair: j.pair, savePng: SAVE_PNG });
      if (!r.ok) { rows.push({ set: j.set, pair: j.name, ok: false, error: r.error }); exitCode = 1; continue; }
      const x = r.result, errs = check(x, j.exp, j.align);
      if (r.tracked.created !== r.tracked.deleted) errs.push(`tracker ${r.tracked.created} created / ${r.tracked.deleted} deleted`);
      if (SAVE_PNG) for (const [k, b64] of Object.entries(r.png)) fs.writeFileSync(path.join(OUT, `${j.name.replace(/[^\w-]+/g, '_')}_${k}.png`), Buffer.from(b64, 'base64'));
      const al = x.alignment;
      rows.push({ set: j.set, pair: j.name, ok: errs.length === 0, expected: `${j.exp.status}${j.exp.minRegions != null ? ' ≥' + j.exp.minRegions : ''}${j.exp.maxRegions != null ? ' ≤' + j.exp.maxRegions : ''}`,
        status: x.status, regions: x.regions.length, changedPct: x.changedPct, rawPct: x.rawChangedPct, ssim: x.ssim,
        alignment: `${al.method} (${al.dx},${al.dy}) s=${al.scale}${al.score != null ? ' m=' + al.score : ''}${al.fallback ? ' fb:' + al.fallback : ''}`,
        ms: x.ms, heat: x.heatmapMethod, reflow: reflowCandidates(x.regions).join(','),
        boxes: x.regions.map(q => `#${q.id} ${q.width}x${q.height}@(${q.x},${q.y})`).join(' '), errors: errs.join('; ') });
      if (errs.length) exitCode = 1;
    }
    for (const row of rows) console.log(JSON.stringify(row));

    // timing at steady state on a real pair (first runs include JIT warm-up)
    const leakPair = (samples && samples.find(p => p.page === 'tl-timesheet')) || syn[1];
    // leak check: 20 runs, then a negative control that leaks one RGBA Mat per run
    const leak = await call({ type: 'leak', pair: leakPair, runs: 20 });
    const ctrl = await call({ type: 'leak', pair: leakPair, runs: 20, control: true });
    const summary = l => ({ heapFirst: l.heap[0], heapLast: l.heap[l.heap.length - 1], heapGrowth: l.heap[l.heap.length - 1] - l.heap[0],
      probeDistinct: [...new Set(l.probes)].length, probeFirst: l.probes[0], probeLast: l.probes[l.probes.length - 1], tracked: l.tracked });
    const L = summary(leak), C = summary(ctrl);
    console.log('LEAK 20 runs (' + leakPair.page + '):', JSON.stringify(L));
    console.log('CONTROL (leaks 1 RGBA Mat/run):', JSON.stringify(C));
    const leakOk = L.heapGrowth === 0 && L.probeDistinct === 1 && L.tracked.created === L.tracked.deleted;
    const ctrlDetected = C.heapGrowth > 0 || C.probeDistinct > 1;
    console.log(`LEAK CHECK: ${leakOk ? 'FLAT (no leak)' : 'GROWTH'}; negative control ${ctrlDetected ? 'detected' : 'NOT detected'}`);
    if (!leakOk || !ctrlDetected) exitCode = 1;
    if (consoleErrors.length) { console.log('console errors:', consoleErrors); exitCode = 1; }
    const passed = rows.filter(r => r.ok).length;
    console.log(`\nRESULT: ${passed}/${rows.length} pairs as expected; leak ${leakOk ? 'ok' : 'FAIL'}`);
    fs.writeFileSync(path.join(__dirname, 'last-results.json'), JSON.stringify({ date: new Date().toISOString(), info: info.info, rows, leak: L, control: C }, null, 1));
  } catch (e) { console.error(e); exitCode = 1; }
  finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
  process.exit(exitCode);
})();

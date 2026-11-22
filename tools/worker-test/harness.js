// Test harness page logic (external file: the CSP blocks inline scripts). run.js calls window.__t.*.
import { createInspector, TIMEOUT_MESSAGE } from '../../js/worker-client.js';

const W = 1366, H = 900;
const statuses = [];
const violations = [];
document.addEventListener('securitypolicyviolation', e => violations.push({ where: 'page', directive: e.violatedDirective, blocked: e.blockedURI }));

// Synthetic, fictional "ERP-like" page: header bar, a form grid, buttons. cand adds a moved button
// and a changed label block, so a real pipeline finds regions.
function synth(variant) {
  const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#f4f5f7'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1f3a5f'; g.fillRect(0, 0, W, 56);
  g.fillStyle = '#ffffff'; g.font = '20px sans-serif'; g.fillText('Demo ERP (fictional) - Timesheet', 24, 36);
  for (let r = 0; r < 12; r++) for (let k = 0; k < 4; k++) {
    g.fillStyle = '#ffffff'; g.fillRect(40 + k * 320, 100 + r * 56, 280, 36);
    g.strokeStyle = '#c3c8d0'; g.strokeRect(40 + k * 320, 100 + r * 56, 280, 36);
    g.fillStyle = '#333'; g.font = '14px sans-serif'; g.fillText(`Field ${r}-${k}`, 50 + k * 320, 123 + r * 56);
  }
  const bx = variant === 'cand' ? 1100 : 40;
  g.fillStyle = '#2b6cb0'; g.fillRect(bx, 800, 160, 44);
  g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText('Submit', bx + 50, 828);
  if (variant === 'cand') { g.fillStyle = '#b00020'; g.fillRect(360, 156, 280, 36); }
  return g.getImageData(0, 0, W, H);
}

let insp = null;
function make(opts = {}) {
  if (insp) insp.terminate();
  statuses.length = 0;
  insp = createInspector({ onStatus: s => statuses.push({ t: Math.round(performance.now()), state: s.state, label: s.label }), ...opts });
  return insp;
}

const api = {
  async ready(opts) {
    const t0 = performance.now();
    make(opts);
    try {
      const info = await insp.ready;
      return { ok: true, pageMs: Math.round(performance.now() - t0), info, statuses: statuses.slice() };
    } catch (e) {
      return { ok: false, pageMs: Math.round(performance.now() - t0), error: String(e.message || e), statuses: statuses.slice(), violations };
    }
  },
  async roundTrip(settings = {}) {
    const base = synth('base'), cand = synth('cand');
    const steps = [];
    const t0 = performance.now();
    const r = await insp.compare(base, cand, [{ x: 0, y: 0, w: 300, h: 56, label: 'title' }], settings, { onProgress: s => steps.push(s) });
    const ms = Math.round(performance.now() - t0);
    const imgs = {};
    for (const [k, v] of Object.entries(r.images || {})) imgs[k] = { width: v.width, height: v.height, bytes: v.data.byteLength, type: v.data.constructor.name };
    return {
      ms, workerMs: r.workerMs, pipelineMs: r.ms, steps,
      senderBaseBytesAfter: base.data.byteLength, senderCandBytesAfter: cand.data.byteLength,
      status: r.status, regions: r.regions?.length, regionList: r.regions, changedPct: r.changedPct, ssim: r.ssim,
      alignment: r.alignment, images: imgs, heapBytes: r.heapBytes, stub: !!r.stub,
    };
  },
  async copyMode() {
    const base = synth('base'), cand = synth('base');
    const r = await insp.compare(base, cand, [], {}, { copy: true });
    return { senderBaseBytesAfter: base.data.byteLength, status: r.status, changedPct: r.changedPct };
  },
  async sameBuffer() {
    const base = synth('base');
    const r = await insp.compare(base, base, [], {});
    return { status: r.status, changedPct: r.changedPct };
  },
  async responsive(busyMs) {
    const base = synth('base'), cand = synth('cand');
    const longTasks = [];
    const po = new PerformanceObserver(l => l.getEntries().forEach(e => longTasks.push(Math.round(e.duration))));
    try { po.observe({ type: 'longtask', buffered: false }); } catch {}
    let ticks = 0, maxGap = 0, last = performance.now(), running = true;
    const loop = (t) => { ticks++; maxGap = Math.max(maxGap, t - last); last = t; if (running) requestAnimationFrame(loop); };
    requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
    // Also prove the event loop answers: setTimeout(0) latency sampled every 50 ms.
    let maxLag = 0; const lagTimer = setInterval(() => { const s = performance.now(); setTimeout(() => { maxLag = Math.max(maxLag, performance.now() - s); }, 0); }, 50);
    const t0 = performance.now();
    const r = await insp.compare(base, cand, [], { __stub: `busy:${busyMs}` });
    const ms = performance.now() - t0;
    running = false; clearInterval(lagTimer); po.disconnect();
    return { compareMs: Math.round(ms), workerMs: r.workerMs, rafTicks: ticks, fps: +(ticks / (ms / 1000)).toFixed(1),
             maxFrameGapMs: Math.round(maxGap), maxTimeoutLagMs: Math.round(maxLag), longTasksMs: longTasks };
  },
  async realResponsive(runs = 3) {
    // The real pipeline (no stub hook): count rAF ticks across a few back-to-back compares.
    const longTasks = [];
    const po = new PerformanceObserver(l => l.getEntries().forEach(e => longTasks.push(Math.round(e.duration))));
    try { po.observe({ type: 'longtask', buffered: false }); } catch {}
    let ticks = 0, maxGap = 0, last = performance.now(), running = true;
    const loop = (t) => { ticks++; maxGap = Math.max(maxGap, t - last); last = t; if (running) requestAnimationFrame(loop); };
    requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
    const t0 = performance.now(); let workerMs = 0;
    for (let i = 0; i < runs; i++) { const r = await insp.compare(synth('base'), synth('cand'), [], {}); workerMs += r.workerMs; }
    const ms = performance.now() - t0; running = false; po.disconnect();
    return { runs, totalMs: Math.round(ms), workerMs, rafTicks: ticks, fps: +(ticks / (ms / 1000)).toFixed(1), maxFrameGapMs: Math.round(maxGap), longTasksMs: longTasks };
  },
  async watchdog(jobTimeoutMs) {
    make({ jobTimeoutMs });
    const first = await insp.ready;
    statuses.length = 0;
    const t0 = performance.now();
    let msg = null;
    // A normal job queued behind the hanging one must survive the restart.
    const p1 = insp.compare(synth('base'), synth('cand'), [], { __stub: 'hang' }).catch(e => (msg = e.message, 'rejected'));
    const p2 = insp.compare(synth('base'), synth('cand'), [], {});
    const r1 = await p1;
    const rejectMs = Math.round(performance.now() - t0);
    const second = await insp.ready;
    const respawnMs = Math.round(performance.now() - t0);
    const r2 = await p2;
    return { r1, message: msg, expected: TIMEOUT_MESSAGE, rejectMs, respawnMs, queuedJobAfterRestart: r2.status,
             readyAgain: !!second, firstWorkerMs: first.workerMs, statuses: statuses.slice() };
  },
  async jobError() {
    let msg = null;
    await insp.compare(synth('base'), synth('cand'), [], { __stub: 'throw' }).catch(e => (msg = e.message));
    let bad = null;
    await insp.compare({ width: 10, height: 10, data: new Uint8ClampedArray(7) }, synth('cand'), [], {}).catch(e => (bad = e.message));
    const after = await insp.compare(synth('base'), synth('cand'), [], {});
    return { thrownMessage: msg, badInput: bad, workerStillWorks: after.status };
  },
  async heapRuns(n = 20, settings = {}) {
    const bytes = [];
    for (let i = 0; i < n; i++) {
      await insp.compare(synth('base'), synth('cand'), [], settings);
      bytes.push((await insp.heap()).bytes);
    }
    return { n, first: bytes[0], last: bytes[n - 1], max: Math.max(...bytes), growthAfterRun1: bytes[n - 1] - bytes[0], bytes };
  },
  async sizeMismatch() {
    // The worker/pipeline decides: the page only checks that each buffer is w*h*4 bytes.
    const base = synth('base');
    const tall = new OffscreenCanvas(W, 1000).getContext('2d');
    tall.putImageData(synth('base'), 0, 0); tall.fillStyle = '#f4f5f7'; tall.fillRect(0, H, W, 100);
    const r1 = await insp.compare(base, tall.getImageData(0, 0, W, 1000), [], {}).then(r => ({ status: r.status, alignment: r.alignment }), e => ({ error: e.message }));
    const tiny = new OffscreenCanvas(300, 200).getContext('2d').getImageData(0, 0, 300, 200);
    const r2 = await insp.compare(synth('base'), tiny, [], {}).then(r => ({ status: r.status }), e => ({ error: e.message }));
    const after = await insp.compare(synth('base'), synth('cand'), [], {});
    return { slightlyTaller: r1, tooSmall: r2, workerStillWorks: after.status };
  },
  async restart() {
    const t0 = performance.now();
    await insp.restart();
    return { ms: Math.round(performance.now() - t0) };
  },
  violations: () => violations,
  statuses: () => statuses.slice(),
};
window.__t = api;
document.getElementById('out').textContent = 'harness ready';
window.__harnessReady = true;

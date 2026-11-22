#!/usr/bin/env python3
"""Capture samples/*.png from demo-erp/ and write samples/manifest.json, then self-check.

Run from anywhere:  python3 tools/capture-samples.py
Needs: Node with the `playwright` package (resolved with require('playwright')) and a Chromium/Chrome
       it can launch, plus Python OpenCV (cv2) and numpy for the self-check.
Dev machine only: never runs on Netlify. Serves the repo root on 127.0.0.1:8105 (and kills the server).

Capture standard (docs/erp/capture-standards.md): viewport 1366x900, deviceScaleFactor 1, 100% zoom,
full page, PNG, same browser for before and after.
"""
import json, os, subprocess, sys, time, urllib.request
import cv2 as cv
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "samples")
PORT = 8105
BASE = f"http://127.0.0.1:{PORT}/demo-erp/"

# page, module, change summary, expected (without ignore zones), minRegions
PAGES = [  # page, module, title, expected status (no zones), minRegions. tl-timesheet first (business-case example).
    ("tl-timesheet", "Time & Labor", "Time & Labor \u2013 Timesheet", "FAIL", 2),
    ("hcm-job-data", "HCM", "HCM \u2013 Job Data", "FAIL", 2),
    ("hcm-personal-data", "HCM", "HCM \u2013 Personal Data", "FAIL", 2),
    ("fscm-voucher", "FSCM", "FSCM \u2013 Voucher Entry", "FAIL", 1),
    ("fscm-po", "FSCM", "FSCM \u2013 Purchase Order (timestamp only)", "FAIL", 1),
    ("hcm-job-data-shifted", "HCM", "HCM \u2013 Job Data, shifted +3 px", "PASS", 0),
    ("hcm-job-data-zoom110", "HCM", "HCM Job Data (1.1\u00d7 device scale)", "FAIL", 1),
    ("fscm-po-identical", "FSCM", "FSCM \u2013 Purchase Order (identical)", "PASS", 0),
]

# (page, variant measured, css selector, probe name): every planted change must change pixels here.
PROBES = [
    ("hcm-job-data", "before", "#payGrade", "Pay Grade label (removed)"),
    ("hcm-job-data", "before", "#payGrade-v", "Pay Grade value (removed)"),
    ("hcm-job-data", "before", "#save", "Save, old position"),
    ("hcm-job-data", "after", "#save", "Save, new position"),
    ("hcm-personal-data", "after", "#deptLabel", "Dept ID label (renamed)"),
    ("hcm-personal-data", "after", "#lnk-name", "link colour: View Name History"),
    ("hcm-personal-data", "after", "#lnk-addr", "link colour: Edit Address"),
    ("hcm-personal-data", "after", "#lnk-dept", "link colour: View Department Details"),
    ("fscm-voucher", "after", "#th-c-acct", "column shifted 6 px: Account header"),
    ("fscm-voucher", "after", "#th-c-dept", "column shifted 6 px: Department header"),
    ("fscm-voucher", "after", "#amt-2", "Amount (line 2) truncated"),
    ("fscm-voucher", "before", "#amt-1", "Amount line 1 box (before; shift reference)"),
    ("fscm-voucher", "before", "#amt-2", "Amount line 2 box (before; shift reference)"),
    ("fscm-po", "before", "#last-updated", "Last updated timestamp (before box)"),
    ("fscm-po", "after", "#last-updated", "Last updated timestamp"),
    ("tl-timesheet", "before", "#submit", "Submit, old position"),
    ("tl-timesheet", "after", "#submit", "Submit, new position (below grid)"),
    ("tl-timesheet", "after", "#th-hours", "Reported Hours header truncated"),
]

NODE = r"""
const { chromium } = require('playwright');
const job = JSON.parse(process.argv[process.argv.length - 1]);
(async () => {
  const launch = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
  const browser = await chromium.launch(launch);
  const boxes = {};
  for (const s of job.shots) {
    // same layout always (1366x900 viewport, 100% zoom); only deviceScaleFactor differs for the scale variant
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: s.dsf || 1 });
    const page = await ctx.newPage();
    await page.goto(job.base + s.page + '/' + s.variant + '.html', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: job.out + '/' + s.page + '_' + s.variant + '.png', fullPage: true });
    for (const p of job.probes) {
      if (p.page === s.page && p.variant === s.variant) {
        boxes[p.page + '|' + p.variant + '|' + p.selector] = await page.evaluate((sel) => {
          const r = document.querySelector(sel).getBoundingClientRect();
          return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
        }, p.selector);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(boxes));
})().catch(e => { console.error(e); process.exit(1); });
"""


def capture():
    os.makedirs(SAMPLES, exist_ok=True)
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                           cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE + "index.html", timeout=1).read(); break
            except Exception:
                time.sleep(0.1)
        else:
            raise SystemExit("server did not start on port %d" % PORT)
        shots = [{"page": p[0], "variant": v, "dsf": (1.1 if (p[0] == "hcm-job-data-zoom110" and v == "after") else 1)} for p in PAGES for v in ("before", "after")]
        probes = [{"page": a, "variant": b, "selector": c} for a, b, c, _ in PROBES]
        job = {"base": BASE, "out": SAMPLES, "shots": shots, "probes": probes}
        env = dict(os.environ)
        try:  # make a global `npm i -g playwright` resolvable by require()
            env["NODE_PATH"] = subprocess.check_output(["npm", "root", "-g"], text=True).strip() + os.pathsep + env.get("NODE_PATH", "")
        except Exception:
            pass
        res = subprocess.run(["node", "-e", NODE, json.dumps(job)], capture_output=True, text=True, env=env)
        if res.returncode:
            raise SystemExit("capture failed:\n" + res.stderr)
        return json.loads(res.stdout.strip().splitlines()[-1])
    finally:
        srv.terminate()
        try:
            srv.wait(5)
        except Exception:
            srv.kill()


def rect(boxes, page, variant, sel, pad=0):
    b = boxes[f"{page}|{variant}|{sel}"]
    x0, y0 = int(np.floor(b["x"])) - pad, int(np.floor(b["y"])) - pad
    x1, y1 = int(np.ceil(b["x"] + b["w"])) + pad, int(np.ceil(b["y"] + b["h"])) + pad
    return max(0, x0), max(0, y0), x1 - max(0, x0), y1 - max(0, y0)


def build_manifest(boxes):
    # Ignore zone for the fscm-po timestamp: union of the before and after boxes, 3 px padding, baseline px.
    a = rect(boxes, "fscm-po", "before", "#last-updated", 3)
    b = rect(boxes, "fscm-po", "after", "#last-updated", 3)
    x0, y0 = min(a[0], b[0]), min(a[1], b[1])
    x1, y1 = max(a[0] + a[2], b[0] + b[2]), max(a[1] + a[3], b[1] + b[3])
    zone = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "label": "Last updated timestamp"}
    out = []
    for page, module, title, status, minr in PAGES:
        e = {"page": page, "title": title, "module": module,
             "before": f"samples/{page}_before.png", "after": f"samples/{page}_after.png",
             "expected": {"status": status, "minRegions": minr}, "ignoreZones": []}
        if status == "PASS":
            e["expected"]["maxRegions"] = 0
        if page == "fscm-po":
            e["ignoreZones"] = [zone]
            e["expectedWithIgnoreZones"] = {"status": "PASS", "maxRegions": 0}
            e["note"] = ("expected = result with NO zone applied (FAIL on the timestamp). ignoreZones = the zone to draw "
                         "or load, in baseline px; with it the same pair must PASS with 0 regions.")
        if page == "hcm-job-data-shifted":
            e["note"] = "After = before with the whole page offset 3 px down. Expect alignment (0,+3) then PASS."
        if page == "hcm-job-data-zoom110":
            e["note"] = ("Capture-standard violation demo: the after image was captured at 1.1\u00d7 device scale. The inspector detects the scale "
                         "(resize \u2248 0.91) but resampled text still differs; the app hints 'Likely capture artifact'. "
                         "Fix: recapture both at the same device scale (docs/erp/capture-standards.md).")
        out.append(e)
    with open(os.path.join(SAMPLES, "manifest.json"), "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False); f.write("\n")
    return out, zone


# ---- self-check: same steps as skill opencvjs-diff-pipeline (blur 3, abs diff, T=25, dilate 5x5 x2, area>=64) ----
def load(rel):
    im = cv.imread(os.path.join(ROOT, rel))
    assert im is not None, rel
    return im


def binmask(a, c):
    ga = cv.GaussianBlur(cv.cvtColor(a, cv.COLOR_BGR2GRAY), (3, 3), 0)
    gc = cv.GaussianBlur(cv.cvtColor(c, cv.COLOR_BGR2GRAY), (3, 3), 0)
    _, m = cv.threshold(cv.absdiff(ga, gc), 25, 255, cv.THRESH_BINARY)
    return m


def regions_of(m, zones=()):
    m = m.copy()
    for z in zones:
        m[z["y"]:z["y"] + z["h"], z["x"]:z["x"] + z["w"]] = 0
    m = cv.dilate(m, cv.getStructuringElement(cv.MORPH_RECT, (5, 5)), iterations=2)
    cs, _ = cv.findContours(m, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    return [cv.boundingRect(k) for k in cs if cv.contourArea(k) >= 64]


def self_check(manifest, boxes, zone):
    ok = True

    def check(cond, msg):
        nonlocal ok
        print(("  ok   " if cond else "  FAIL ") + msg)
        ok = ok and cond

    for e in manifest:
        a, c = load(e["before"]), load(e["after"])
        print(f'{e["page"]}  size before {a.shape[1]}x{a.shape[0]} after {c.shape[1]}x{c.shape[0]}')
        if e["page"] == "hcm-job-data-zoom110":
            check(abs(c.shape[1] / a.shape[1] - 1.1) < 0.002 and abs(c.shape[0] / a.shape[0] - 1.1) < 0.002, "after is 1.1x the size of before (device scale)")
            c = cv.resize(c, (a.shape[1], a.shape[0]), interpolation=cv.INTER_AREA)  # crude pre-resize, only for the self-check
        else:
            check(a.shape == c.shape, "before and after PNGs have the same size")
        m = binmask(a, c)
        print(f'{e["page"]}  regions ' + str([list(r) for r in regions_of(binmask(a, c))]))
        regs = regions_of(m)
        exp = e["expected"]
        status = "FAIL" if regs else "PASS"
        aligned = e["page"] == "hcm-job-data-shifted"  # PASS only after alignment
        zoom = e["page"] == "hcm-job-data-zoom110"
        check(zoom or status == ("FAIL" if aligned else exp["status"]), f"raw (unaligned) status {status} (expected {'FAIL' if aligned else exp['status']}), {len(regs)} region(s), {100*cv.countNonZero(m)/m.size:.2f}% changed")
        check(len(regs) >= exp["minRegions"], f"regions {len(regs)} >= minRegions {exp['minRegions']}")
        if "maxRegions" in exp and e["page"] != "hcm-job-data-shifted" and e["page"] != "hcm-job-data-zoom110":
            check(len(regs) <= exp["maxRegions"], f"regions {len(regs)} <= maxRegions {exp['maxRegions']}")
        for pg, var, sel, name in PROBES:
            if pg != e["page"]:
                continue
            x, y, w, h = rect(boxes, pg, var, sel, 2)
            check(cv.countNonZero(m[y:y + h, x:x + w]) > 0, f"planted change changes pixels: {name}")
        if e["page"] == "fscm-voucher":
            # Unit Price is 6 px wider, so Amount cells move +6 px. Line 1 must match once shifted back; line 2 must not (truncated).
            for ln, same in (("1", True), ("2", False)):
                x, y, w, h = rect(boxes, "fscm-voucher", "before", "#amt-" + ln, 0)
                x, y, w, h = x + 2, y + 2, w - 4, h - 4
                d = cv.countNonZero(binmask(a[y:y + h, x:x + w], c[y:y + h, x + 6:x + 6 + w]))
                check((d == 0) == same, f"Amount line {ln} {'unchanged apart from the 6 px shift' if same else 'content differs after the shift (truncated)'} ({d} px)")
        if e["page"] == "fscm-po":
            check(len(regions_of(m, e["ignoreZones"])) == 0, f"with ignore zone {e['ignoreZones'][0]} -> 0 regions (PASS)")
            outside = m.copy(); z = zone
            outside[z["y"]:z["y"] + z["h"], z["x"]:z["x"] + z["w"]] = 0
            check(cv.countNonZero(outside) == 0, "nothing changed outside the zone")
        if e["page"] == "fscm-po-identical":
            check(np.array_equal(a, c), "identical pair is byte-identical in pixels")
        if e["page"] == "hcm-job-data-shifted":
            check(len(regs) > 0, "raw (unaligned) compare shows a difference")
            h = a.shape[0]
            back = regions_of(binmask(a[0:h - 3], c[3:h]))
            check(len(back) == 0, "after = before shifted exactly +3 px down (0 regions after undoing the shift)")
        if e["page"] == "hcm-job-data-zoom110":
            print(f"  info after resized back to 1.0 differs in {len(regs)} region(s) (resampling noise; the pipeline's scale alignment decides PASS)")
    return ok


if __name__ == "__main__":
    boxes = capture()
    manifest, zone = build_manifest(boxes)
    print("fscm-po ignore zone (baseline px):", zone)
    good = self_check(manifest, boxes, zone)
    print("SELF-CHECK", "OK" if good else "FAILED")
    sys.exit(0 if good else 1)

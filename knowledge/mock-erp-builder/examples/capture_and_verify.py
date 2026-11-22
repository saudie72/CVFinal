"""Example 2 — capture the before/after mock pages as PNGs (fixed 1366×900 viewport, full page)
and prove the planted regressions are detectable with the project's diff pipeline.

Run from the repo root:  python3 knowledge/mock-erp-builder/examples/capture_and_verify.py
Writes: knowledge/mock-erp-builder/examples/out/tl-timesheet_{before,after,boxes}.png
"""
import functools, http.server, json, os, threading
import cv2 as cv
import numpy as np
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(
    type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=HERE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base_url = f"http://127.0.0.1:{srv.server_address[1]}/tl-timesheet/"

# ---- capture (capture standard: same browser, viewport 1366×900, 100% zoom, PNG) ----
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    page = b.new_page(viewport={"width": 1366, "height": 900}, device_scale_factor=1)
    boxes = {}
    for name in ("before", "after", "after-no-reflow"):
        page.goto(base_url + f"{name}.html")
        page.screenshot(path=os.path.join(OUT, f"tl-timesheet_{name}.png"), full_page=False)
        boxes[name] = page.locator("#submit").bounding_box()
    b.close()
srv.shutdown()

# ---- diff (same steps as skill opencvjs-diff-pipeline) ----
def diff(after_name):
    a = cv.imread(os.path.join(OUT, "tl-timesheet_before.png"))
    c = cv.imread(os.path.join(OUT, f"tl-timesheet_{after_name}.png"))
    ga = cv.GaussianBlur(cv.cvtColor(a, cv.COLOR_BGR2GRAY), (3, 3), 0)
    gc = cv.GaussianBlur(cv.cvtColor(c, cv.COLOR_BGR2GRAY), (3, 3), 0)
    _, binm = cv.threshold(cv.absdiff(ga, gc), 25, 255, cv.THRESH_BINARY)
    binm = cv.dilate(binm, cv.getStructuringElement(cv.MORPH_RECT, (5, 5)), iterations=2)
    contours, _ = cv.findContours(binm, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    regions = sorted([cv.boundingRect(k) for k in contours if cv.contourArea(k) >= 64], key=lambda r: (r[1], r[0]))
    pct = 100 * cv.countNonZero(binm) / binm.size
    out = c.copy()
    for i, (x, y, w, h) in enumerate(regions, 1):
        cv.rectangle(out, (x, y), (x + w, y + h), (45, 21, 233), 3)
        cv.putText(out, str(i), (x, max(14, y - 4)), cv.FONT_HERSHEY_SIMPLEX, 0.6, (45, 21, 233), 2)
    cv.imwrite(os.path.join(OUT, f"tl-timesheet_{after_name}_boxes.png"), out)
    def covers(r, bb):
        x, y, w, h = r
        cx, cy = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
        return x <= cx <= x + w and y <= cy <= y + h
    return {"variant": after_name, "regions": [list(r) for r in regions], "changedPct": round(pct, 2),
            "submitOldPosFlagged": any(covers(r, boxes["before"]) for r in regions),
            "submitNewPosFlagged": any(covers(r, boxes[after_name]) for r in regions),
            "status": "FAIL" if regions and pct > 0.1 else "PASS"}

reflow, separate = diff("after"), diff("after-no-reflow")
print(json.dumps(reflow)); print(json.dumps(separate))
ok = (reflow["status"] == "FAIL" and reflow["submitOldPosFlagged"] and reflow["submitNewPosFlagged"]
      and separate["status"] == "FAIL" and separate["submitOldPosFlagged"] and separate["submitNewPosFlagged"]
      and len(separate["regions"]) >= 3)
print("ok" if ok else "FAILED")
raise SystemExit(0 if ok else 1)

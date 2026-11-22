"""Example 1 — automated QA smoke test in a real (headless) Chrome.

Checks three rubric items on any page of the app:
  1. no console errors / page errors on load
  2. NO network requests after the page has loaded (privacy proof), while the page does work
  3. it still works with the browser OFFLINE
Run from the repo root:
  python3 knowledge/qa-tester/examples/ex1_qa_smoke.py [path-to-page]
Default target: the front-end example page (stands in for index.html until the app exists).
"""
import functools, http.server, json, sys, threading
from playwright.sync_api import sync_playwright

TARGET = sys.argv[1] if len(sys.argv) > 1 else "knowledge/frontend-engineer/examples/ex1-region-list-and-boxes.html"
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(
    type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory="."))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/{TARGET}"

r = {"target": TARGET}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    ctx = b.new_context()
    page = ctx.new_page()
    console_errors, page_errors, after_load = [], [], []
    page.on("console", lambda m: m.type == "error" and console_errors.append(m.text))
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    page.goto(url, wait_until="load")
    page.wait_for_function("window.__result !== undefined")
    r["loadRequests"] = page.evaluate("performance.getEntriesByType('resource').length + 1")

    # ---- privacy: record every request from now on, then make the page do work ----
    page.on("request", lambda req: after_load.append(req.url))
    page.evaluate("""() => { const c = document.querySelector('canvas'); const g = c.getContext('2d');
                     for (let i = 0; i < 50; i++) g.getImageData(0, 0, c.width, c.height); }""")
    page.wait_for_timeout(300)
    r["requestsAfterLoad"] = after_load

    # ---- offline: page keeps working with network cut ----
    ctx.set_offline(True)
    r["offlineStillWorks"] = page.evaluate("document.querySelectorAll('#regions li').length") == 3
    ctx.set_offline(False)

    r["consoleErrors"], r["pageErrors"] = console_errors, page_errors
    b.close()
srv.shutdown()
r["ok"] = not console_errors and not page_errors and r["requestsAfterLoad"] == [] and r["offlineStillWorks"]
print(json.dumps(r, indent=2))
raise SystemExit(0 if r["ok"] else 1)

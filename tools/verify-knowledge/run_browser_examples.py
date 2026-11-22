"""Runs the browser-based knowledge examples in headless Chrome and prints their results.

Usage (from the repo root):  python3 tools/verify-knowledge/run_browser_examples.py
Requires: Python Playwright + a local Chrome/Chromium (no network access needed).

Each example page sets `window.__result = {ok: bool, ...}`. A tiny local HTTP server
serves the repo; any path containing `/wrong-mime/` is served as application/octet-stream
so the WebAssembly MIME-type example can demonstrate the TypeError.
"""
import http.server, json, os, shutil, sys, threading, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PAGES = [
    "knowledge/wasm-expert/examples/ex1-streaming.html",
    "knowledge/wasm-expert/examples/ex2-memory.html",
    "knowledge/wasm-expert/examples/ex3-worker.html",
    "knowledge/indexeddb-expert/examples/ex1-open-upgrade-crud.html",
    "knowledge/indexeddb-expert/examples/ex2-blobs-quota.html",
    "knowledge/indexeddb-expert/examples/ex3-version-blocked-reset.html",
    "knowledge/frontend-engineer/examples/ex1-region-list-and-boxes.html",
    "knowledge/frontend-engineer/examples/ex2-overlay-slider.html",
    "knowledge/ui-designer-apple-liquid-glass/examples/ex2-status-pill.html",
]


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".wasm": "application/wasm", ".js": "text/javascript"}

    def translate_path(self, path):
        return super().translate_path(path.replace("/wrong-mime/", "/"))

    def guess_type(self, path):
        if "/wrong-mime/" in self.path:
            return "application/octet-stream"
        return super().guess_type(path)

    def log_message(self, *a):
        pass


def chrome_path():
    for p in ("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"):
        if os.path.exists(p):
            return p
    return shutil.which("google-chrome") or shutil.which("chromium")


def main(pages):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}/"
    results, failed = {}, 0
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome_path(), headless=True)
        for page_path in pages:
            ctx = browser.new_context()          # fresh origin storage per example
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(base + page_path)
            try:
                page.wait_for_function("window.__result !== undefined", timeout=20000)
                r = page.evaluate("window.__result")
            except Exception as e:
                r = {"ok": False, "error": f"timeout/no result: {e}", "pageErrors": errors}
            results[page_path] = r
            failed += 0 if r.get("ok") else 1
            print(("PASS " if r.get("ok") else "FAIL ") + page_path)
            print("     " + json.dumps(r)[:600])
            ctx.close()
        print("Chrome", browser.version)
        browser.close()
    srv.shutdown()
    print(f"\n{len(pages) - failed}/{len(pages)} browser examples passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or PAGES))

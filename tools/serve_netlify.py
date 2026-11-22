#!/usr/bin/env python3
"""Local static server that applies the [[headers]] rules from netlify.toml.

Lets QA check the cache and security headers (including the CSP) before
deploying. Standard library only (Python 3.11+ for tomllib).

    python3 tools/serve_netlify.py --port 8080

Serves the repo root (the directory above this file). Only the headers
rules are applied: redirects and build settings are ignored.

Path globs follow Netlify's rules (see docs/11-netlify-hosting.md):
  *      matches any characters, including "/"
  :name  matches one path segment (no "/")
Rules are applied in file order. If two rules set the same header for one
path, the later one wins, and a warning is printed at startup. Netlify does
not document its merge order, so netlify.toml should never produce that case.
"""
import argparse
import mimetypes
import os
import re
import sys
import tomllib
from http import HTTPStatus
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
CONFIG = os.path.join(ROOT, "netlify.toml")

# Types the stdlib may guess wrongly on some systems.
EXTRA_TYPES = {
    ".wasm": "application/wasm",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
}


def glob_to_regex(pattern):
    """Turn a Netlify path glob into a compiled regex matching the whole path."""
    out = []
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "*":
            out.append(".*")
        elif ch == ":" and (i == 0 or pattern[i - 1] == "/"):
            m = re.match(r":[A-Za-z_][A-Za-z0-9_]*", pattern[i:])
            if m:
                out.append("[^/]+")
                i += len(m.group(0))
                continue
            out.append(re.escape(ch))
        else:
            out.append(re.escape(ch))
        i += 1
    return re.compile("^" + "".join(out) + "$")


def load_rules(config_path):
    with open(config_path, "rb") as f:
        cfg = tomllib.load(f)
    rules = []
    for entry in cfg.get("headers", []):
        values = entry.get("values", {})
        rules.append((entry["for"], glob_to_regex(entry["for"]), dict(values)))
    return rules


def headers_for(rules, path):
    """Return the header dict for a request path, plus any conflicts found."""
    result = {}
    origin = {}
    conflicts = []
    for pattern, rx, values in rules:
        if not rx.match(path):
            continue
        for name, value in values.items():
            key = name.lower()
            if key in origin and origin[key] != pattern:
                conflicts.append((path, name, origin[key], pattern))
            result[key] = (name, value)
            origin[key] = pattern
    return {name: value for name, value in result.values()}, conflicts


def check_static_conflicts(rules):
    """Warn about rules that could match the same sample paths and set the same header."""
    probes = ["/", "/index.html", "/vendor/opencv/4.13.0/opencv.js", "/samples/x.png", "/demo-erp/index.html",
              "/js/app.js", "/css/app.css", "/inspector.worker.js", "/x.wasm"]
    seen = set()
    for p in probes:
        _, conflicts = headers_for(rules, p)
        for path, name, a, b in conflicts:
            key = (name.lower(), a, b)
            if key not in seen:
                seen.add(key)
                print(f"WARNING: header {name} is set by both '{a}' and '{b}' (e.g. {path}); "
                      f"the later rule wins locally, Netlify order is undocumented", flush=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "serve_netlify/1.0"
    rules = []

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _resolve(self, url_path):
        rel = unquote(url_path).lstrip("/")
        full = os.path.abspath(os.path.join(ROOT, rel))
        if full != ROOT and not full.startswith(ROOT + os.sep):
            return None
        if os.path.isdir(full):
            full = os.path.join(full, "index.html")
        return full if os.path.isfile(full) else None

    def _handle(self, head_only):
        path = urlsplit(self.path).path or "/"
        full = self._resolve(path)
        if full is None:
            body = b"404 Not Found\n"
            extra, _ = headers_for(self.rules, path)
            self.send_response(HTTPStatus.NOT_FOUND)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            for name, value in extra.items():
                if name.lower() != "content-type":
                    self.send_header(name, value)
            self.end_headers()
            if not head_only:
                self.wfile.write(body)
            return
        # Use the request path for rule matching, so "/" matches index.html.
        with open(full, "rb") as f:
            data = f.read()
        extra, _ = headers_for(self.rules, path)
        self.send_response(HTTPStatus.OK)
        ext = os.path.splitext(full)[1].lower()
        ctype = EXTRA_TYPES.get(ext) or mimetypes.guess_type(full)[0] or "application/octet-stream"
        if "content-type" in {k.lower() for k in extra}:
            ctype = None
        if ctype:
            self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        for name, value in extra.items():
            self.send_header(name, value)
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def do_GET(self):
        self._handle(head_only=False)

    def do_HEAD(self):
        self._handle(head_only=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()

    Handler.rules = load_rules(CONFIG)
    check_static_conflicts(Handler.rules)
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Serving {ROOT} with netlify.toml headers on http://{args.host}:{args.port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Test server for the worker tests: tools/serve_netlify.py plus two test-only switches.

    python3 tools/worker-test/serve_test.py --port 8102 [--csp netlify|no-unsafe-eval|no-eval] [--stub auto|always|never]

--csp V        netlify (default) | no-unsafe-eval | no-eval. Edits the Content-Security-Policy
               in memory only (netlify.toml is not changed), to answer "is 'unsafe-eval' needed?".
--stub auto    (default) /js/cv/<name>.js is served from tools/worker-test/stub-cv/<name>.js
               when the real file does not exist yet. 'always' forces the stub (hang/leak
               tests), 'never' serves only real files.
Every other header comes from netlify.toml through serve_netlify.load_rules/headers_for,
so the page and the worker get exactly the CSP Netlify would send.
"""
import argparse, os, sys
from http.server import ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import serve_netlify as sn  # noqa: E402

STUB_DIR = os.path.join(HERE, "stub-cv")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8102)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--csp", choices=["netlify", "no-unsafe-eval", "no-wasm-unsafe-eval", "no-eval"], default="netlify",
                    help="netlify: as in netlify.toml; no-unsafe-eval: drop 'unsafe-eval'; "
                         "no-eval: drop 'unsafe-eval' and 'wasm-unsafe-eval'")
    ap.add_argument("--stub", choices=["auto", "always", "never"], default="auto")
    args = ap.parse_args()

    rules = sn.load_rules(sn.CONFIG)
    drop = {"netlify": [], "no-unsafe-eval": ["'unsafe-eval'"], "no-wasm-unsafe-eval": ["'wasm-unsafe-eval'"],
            "no-eval": ["'unsafe-eval'", "'wasm-unsafe-eval'"]}[args.csp]
    if drop:
        new = []
        for pat, rx, values in rules:
            v = dict(values)
            for k in list(v):
                if k.lower() == "content-security-policy":
                    for tok in drop:
                        v[k] = v[k].replace(tok, "")
                    v[k] = " ".join(v[k].split())
            new.append((pat, rx, v))
        rules = new

    class H(sn.Handler):
        def _resolve(self, url_path):
            p = url_path.split("?")[0]
            if p.startswith("/js/cv/") and p.endswith(".js"):
                name = os.path.basename(p)
                real = super()._resolve(url_path)
                stub = os.path.join(STUB_DIR, name)
                if args.stub == "always" or (args.stub == "auto" and real is None):
                    return stub if os.path.isfile(stub) else None
                return real
            return super()._resolve(url_path)

        def end_headers(self):
            self.send_header("X-Test-Stub", args.stub)
            super().end_headers()

    H.rules = rules
    httpd = ThreadingHTTPServer((args.host, args.port), H)
    csp = sn.headers_for(rules, "/inspector.worker.js")[0].get("Content-Security-Policy")
    print(f"serve_test on http://{args.host}:{args.port} stub={args.stub} CSP={csp}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

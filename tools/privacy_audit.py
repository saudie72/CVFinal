#!/usr/bin/env python3
"""Privacy and security audit for the ERP Visual Regression Inspector (Vera).

Run from anywhere:   python3 tools/privacy_audit.py [--root DIR] [--strict]
Exit code 0 = clean (WARNs allowed), 1 = at least one FINDING (a blocker).
With --strict, WARNs also fail.  Standard library only (Python 3.11+).

Adapted from knowledge/erp-security-admin/examples/ex2_privacy_audit.py.

WHAT IS SCANNED (APP files = what ships and runs in the browser)
  index.html, how-it-works.html, resources.html, inspector.worker.js, js/, css/,
  demo-erp/, samples/ (text files and PNG metadata), netlify.toml
  (any other top-level *.html is scanned too).

WHAT IS EXCLUDED, AND WHY
  vendor/       Third-party OpenCV.js (a 10 MB minified file with many doc URLs in
                comments). Instead of grepping it, its sha256 is pinned (see
                OPENCV_SHA256 below) and the CSP (connect-src 'self') stops it
                from calling out. Re-pin the hash when the version changes.
  knowledge/    Research notes and worked examples. They name PeopleSoft, Oracle and
  docs/         the County as the SUBJECT, and quote bad patterns as examples. They do
  .claude/      not ship in the running app. They still get the repo-wide secret and
  README.md     SSN scan (rules 'secret' and 'ssn' below), so a leaked key is caught
                anywhere in the repo.
  tools/        Tooling holds the very patterns it searches for. Self-excluded from the
                scans (also from the repo-wide secret scan).
  .git, node_modules, out   Not project content.
Nothing is excluded from the secret scan except .git, vendor/ and this script.

ALLOWING A VISIBLE LINK
  The Resources page links out to public docs. A plain <a href="https://...">
  is a user-click navigation, not a fetch: reported as INFO, never a finding.
  Anywhere else a URL string in app code needs the marker `privacy-audit: allow-link`
  on the same line (e.g. a JS array that feeds the Resources page). The marker
  never excuses script/link/img/iframe sources, CSS url(), or fetch/XHR/WebSocket.

LIMITS (say so in the report)
  A text scan cannot see a logo inside a PNG. Logo checks are file names + PNG text
  chunks + a human look at every sample/screenshot. A clean run is not a proof of
  privacy; the DevTools Network tab (empty after load, app works Offline) is
  the runtime check. This audit says nothing about authorization (see
  docs/erp/security-scenarios.md): a screenshot never proves authorization.
"""
import argparse
import hashlib
import os
import re
import sys
from html.parser import HTMLParser

try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    tomllib = None

# --------------------------------------------------------------------------- config
OPENCV_PATH = "vendor/opencv/4.13.0/opencv.js"
OPENCV_SHA256 = "63366510248adf3a7eddf3e793dd825404efb7df3749f4d6f8557c7fa4ca8aa0"  # docs/build-plan.md

APP_TOP_FILES = {"index.html", "how-it-works.html", "resources.html", "inspector.worker.js", "netlify.toml"}
APP_DIRS = ("js", "css", "demo-erp", "samples")
DEMO_DIRS = ("demo-erp", "samples")          # strictest: no real-org words at all
TEXT_EXT = {".html", ".htm", ".js", ".mjs", ".css", ".json", ".toml", ".svg", ".txt", ".md", ".webmanifest"}
SKIP_DIRS = {".git", "node_modules", "out", "vendor"}
SELF = os.path.normpath("tools/privacy_audit.py")
ALLOW_MARK = "privacy-audit: allow-link"

# Hosts that are only XML namespaces / spec identifiers, never fetched.
NAMESPACE_OK = re.compile(r"^https?://(www\.w3\.org/|www\.w3\.org$|purl\.org/)", re.I)

REQUIRED_HEADERS = {
    "X-Content-Type-Options": lambda v: v.strip().lower() == "nosniff",
    "Referrer-Policy": lambda v: v.strip().lower() == "no-referrer",
    "X-Frame-Options": lambda v: v.strip().upper() == "DENY",
}

# --------------------------------------------------------------------------- results
findings, warns, infos = [], [], []


def finding(rule, path, line, text):
    findings.append((rule, path, line, text))


def warn(rule, path, line, text):
    warns.append((rule, path, line, text))


def info(rule, path, line, text):
    infos.append((rule, path, line, text))


def short(s, n=90):
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1] + "..."


def lineno(text, pos):
    return text.count("\n", 0, pos) + 1


def line_at(text, pos):
    a = text.rfind("\n", 0, pos) + 1
    b = text.find("\n", pos)
    return text[a: b if b != -1 else len(text)]


# --------------------------------------------------------------------------- rules (regex)
RX = {
    "secret": re.compile(
        r"(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}"
        r"|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY"
        r"|(?i:(api[_-]?key|secret|token|passwd|password)[\"']?\s*[:=]\s*[\"'][^\"'\s]{12,}[\"']))"
    ),
    "ssn": re.compile(r"(?<![\d-])(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?![\d-])"),
    "county-host-or-email": re.compile(r"[\w.-]*@?miamidade\.gov|[\w.-]+\.miamidade\b|informs\.[a-z.]*gov", re.I),
    "real-looking email": re.compile(
        r"\b[A-Za-z0-9._%+-]+@(?!(?:[\w-]+\.)*(?:example\.(?:com|org|net)|[\w-]+\.(?:invalid|test|example))\b)"
        r"[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b"
    ),
    "internal host / IP": re.compile(
        r"\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b"
        r"|\b[a-z0-9-]+\.(?:local|internal|corp|intranet|lan)\b|[\w.-]+\.gov\b",
        re.I,
    ),
    "analytics / tracking": re.compile(
        r"googletagmanager|google-analytics|\bgtag\(|\bga\(\s*['\"]|segment\.(?:com|io)|hotjar|mixpanel|fullstory|"
        r"clarity\.ms|plausible\.io|matomo|sentry\.io|datadoghq|newrelic|amplitude\.com|facebook\.net|doubleclick",
        re.I,
    ),
    "third-party CDN / font host": re.compile(
        r"(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|code\.jquery\.com|ajax\.googleapis\.com|"
        r"fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|use\.fontawesome\.com|kit\.fontawesome|"
        r"stackpath\.bootstrapcdn|maxcdn\.bootstrapcdn|cdn\.tailwindcss\.com|docs\.opencv\.org/[^\s\"']*\.js|"
        r"raw\.githubusercontent\.com|githubusercontent\.com)",
        re.I,
    ),
    # real-org words. 'oracle' is split out below because naming it as a link target can be legitimate.
    "real-org name": re.compile(r"miami-?dade|\binforms\b|\bcounty\b", re.I),
    "oracle name": re.compile(r"\boracle\b", re.I),
    "peoplesoft logo ref": re.compile(r"(?:logo|brand)[^\"'\n]{0,40}(?:oracle|peoplesoft|miami|county|informs)"
                                      r"|(?:oracle|peoplesoft|miami|county|informs)[^\"'\n]{0,40}logo", re.I),
}

# network APIs in JS (and in anything inline in html)
NET_ABS = r"""(?:["'`]\s*(?:https?:)?//|["'`]\s*(?:wss?|ftp):)"""
RX_NET = [
    ("XMLHttpRequest", re.compile(r"\bXMLHttpRequest\b")),
    ("WebSocket", re.compile(r"\bnew\s+WebSocket\b|\bWebSocket\s*\(")),
    ("EventSource", re.compile(r"\bnew\s+EventSource\b")),
    ("sendBeacon", re.compile(r"\bsendBeacon\s*\(")),
    ("fetch to absolute URL", re.compile(r"\bfetch\s*\(\s*" + NET_ABS)),
    ("importScripts/import()/Worker with absolute URL",
     re.compile(r"\b(?:importScripts|import|SharedWorker|Worker)\s*\(\s*" + NET_ABS)),
    ("importScripts with absolute URL (any argument)", re.compile(r"\bimportScripts\s*\([^)]*" + NET_ABS)),
]
RX_FETCH_ANY = re.compile(r"\bfetch\s*\(\s*([^)]{0,80})")
RX_EVAL = re.compile(r"\beval\s*\(|\bnew\s+Function\s*\(|\bsetTimeout\s*\(\s*[\"'`]|\bsetInterval\s*\(\s*[\"'`]")
RX_CSS_URL = re.compile(r"""url\(\s*["']?\s*((?:https?:)?//[^)"']+)|@import\s+["']?\s*((?:https?:)?//[^"';\s]+)""", re.I)
RX_URL = re.compile(r"""(?:https?:)?//[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}[^\s"'<>)`]*|https?://[^\s"'<>)`]+""")
RX_PROTO_REL = re.compile(r"""(?<![:\w/])//[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}""")


def is_comment_line(line):
    s = line.strip()
    return s.startswith(("//", "*", "/*", "#"))


# --------------------------------------------------------------------------- HTML structure checks
class HtmlAudit(HTMLParser):
    """Structural checks for html: inline scripts/styles/handlers, external sources, forms."""

    def __init__(self, path, text):
        super().__init__(convert_charrefs=True)
        self.path, self.text = path, text
        self._script = None  # (attrs, line) while inside <script>
        self._buf = ""
        self._style_line = None

    def _ln(self):
        return self.getpos()[0]

    @staticmethod
    def _ext(v):
        v = (v or "").strip()
        return bool(re.match(r"^(?:https?:)?//", v, re.I)) or bool(re.match(r"^(?:wss?|ftp):", v, re.I))

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        ln = self._ln()
        for k, v in a.items():
            if k.startswith("on") and len(k) > 2:
                finding("inline event handler", self.path, ln, f"<{tag} {k}=...> (inline script; blocked by CSP)")
            if k in ("href", "src", "action", "formaction", "data", "poster", "xlink:href") and \
                    v.strip().lower().startswith("javascript:"):
                finding("javascript: URL", self.path, ln, f"<{tag} {k}=\"javascript:...\">")
            if k == "style" and v.strip():
                warn("inline style attribute", self.path, ln,
                     f"<{tag} style=...> (blocked by CSP style-src 'self'; use a class)")
        if tag == "script":
            if "src" in a:
                if self._ext(a["src"]):
                    finding("third-party script", self.path, ln, f"<script src=\"{short(a['src'])}\">")
            else:
                t = a.get("type", "").lower()
                if t in ("application/json", "application/ld+json"):
                    pass  # data block, never executed
                else:
                    self._script = ln
                    self._buf = ""
        elif tag == "style":
            self._style_line = ln
            self._buf = ""
        elif tag == "link":
            if self._ext(a.get("href")):
                finding("external <link>", self.path, ln, f"<link rel=\"{a.get('rel', '')}\" href=\"{short(a['href'])}\">")
        elif tag in ("img", "source", "video", "audio", "track", "embed", "iframe", "frame", "input"):
            for k in ("src", "srcset"):
                v = a.get(k, "")
                if k == "srcset":
                    if any(self._ext(p.split()[0]) for p in v.split(",") if p.strip()):
                        finding("external media", self.path, ln, f"<{tag} srcset=\"{short(v)}\">")
                elif self._ext(v):
                    finding("external media/frame", self.path, ln, f"<{tag} src=\"{short(v)}\">")
        elif tag in ("object",):
            if self._ext(a.get("data")):
                finding("external <object>", self.path, ln, f"<object data=\"{short(a['data'])}\">")
        elif tag == "form":
            if self._ext(a.get("action")):
                finding("form posts off-origin", self.path, ln, f"<form action=\"{short(a['action'])}\">")
        elif tag == "base":
            if self._ext(a.get("href")):
                finding("external <base>", self.path, ln, f"<base href=\"{short(a['href'])}\">")
        elif tag == "meta":
            if a.get("http-equiv", "").lower() == "refresh" and re.search(r"url\s*=\s*(?:https?:)?//", a.get("content", ""), re.I):
                finding("meta refresh off-origin", self.path, ln, short(a.get("content", "")))
        elif tag == "a":
            h = a.get("href", "")
            if self._ext(h):
                info("outbound link", self.path, ln, short(h))
                if h.lower().startswith("http://"):
                    warn("non-https link", self.path, ln, short(h))
                rel = a.get("rel", "").lower()
                if a.get("target", "").lower() == "_blank" and "noopener" not in rel:
                    warn("target=_blank without rel=noopener", self.path, ln, short(h))

    def handle_data(self, data):
        if self._script is not None or self._style_line is not None:
            self._buf += data

    def handle_endtag(self, tag):
        if tag == "script" and self._script is not None:
            finding("inline script", self.path, self._script,
                    f"<script> without src ({len(self._buf.strip())} chars; blocked by CSP, move to js/)")
            self._script = None
        elif tag == "style" and self._style_line is not None:
            if self._buf.strip():
                warn("inline <style> block", self.path, self._style_line,
                     "blocked by CSP style-src 'self'; move to css/")
            self._style_line = None


# --------------------------------------------------------------------------- file collection
def rel(root, p):
    return os.path.relpath(p, root).replace(os.sep, "/")


def walk(root, base):
    for r, dirs, files in os.walk(base):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for f in sorted(files):
            yield os.path.join(r, f)


def collect(root):
    """Return (app_files, other_files) as repo-relative paths."""
    app, other = [], []
    for p in walk(root, root):
        r = rel(root, p)
        if os.path.normpath(r) == SELF:
            continue
        top = r.split("/")[0]
        is_app = (r in APP_TOP_FILES) or (top in APP_DIRS) or ("/" not in r and r.endswith((".html", ".htm")))
        (app if is_app else other).append(r)
    return app, other


def read(root, r):
    with open(os.path.join(root, r), encoding="utf-8", errors="ignore") as fh:
        return fh.read()


# --------------------------------------------------------------------------- per-file scans
def scan_secrets_everywhere(root, files):
    """Repo-wide: secrets and SSNs (every text file except vendor/.git/this script)."""
    for r in files:
        if os.path.splitext(r)[1].lower() not in TEXT_EXT:
            continue
        t = read(root, r)
        for name in ("secret", "ssn"):
            for m in RX[name].finditer(t):
                label = "secret-looking value" if name == "secret" else "SSN-shaped number"
                finding(label, r, lineno(t, m.start()), short(m.group(0), 40))


def scan_app_text(root, r):
    t = read(root, r)
    ext = os.path.splitext(r)[1].lower()
    top = r.split("/")[0]
    is_demo = top in DEMO_DIRS
    is_resources = r == "resources.html"
    is_js = ext in (".js", ".mjs")
    is_html = ext in (".html", ".htm")
    is_css = ext == ".css"

    if is_html:
        p = HtmlAudit(r, t)
        p.feed(t)
        p.close()

    # css url()/@import, in .css files and <style> blocks / style attributes of html
    if is_css or is_html:
        for m in RX_CSS_URL.finditer(t):
            u = m.group(1) or m.group(2)
            finding("external CSS url()/@import", r, lineno(t, m.start()), short(u))

    # JS network and eval rules (comment lines skipped)
    if is_js or is_html:
        for name, rx in RX_NET:
            for m in rx.finditer(t):
                ln_text = line_at(t, m.start())
                if is_comment_line(ln_text):
                    continue
                finding(f"network call: {name}", r, lineno(t, m.start()), short(ln_text.strip()))
        for m in RX_FETCH_ANY.finditer(t):
            ln_text = line_at(t, m.start())
            if is_comment_line(ln_text):
                continue
            arg = m.group(1).strip()
            if re.match(r"""["'`](?!\s*(?:https?:)?//)[^"'`]*["'`]""", arg):
                info("fetch (relative literal)", r, lineno(t, m.start()), short(ln_text.strip()))
            elif re.match(NET_ABS, arg):
                pass  # already a finding above
            else:
                warn("fetch with non-literal URL: confirm it is same-origin",
                     r, lineno(t, m.start()), short(ln_text.strip()))
        for m in RX_EVAL.finditer(t):
            ln_text = line_at(t, m.start())
            if not is_comment_line(ln_text):
                warn("eval / new Function / string timer", r, lineno(t, m.start()), short(ln_text.strip()))

    # generic third-party hosts, analytics, CDN, tracking
    for name in ("analytics / tracking", "third-party CDN / font host"):
        for m in RX[name].finditer(t):
            ln_text = line_at(t, m.start())
            if is_comment_line(ln_text) and not is_demo:
                continue
            finding(name, r, lineno(t, m.start()), short(m.group(0)))

    # any other absolute URL string in app files
    seen = set()
    for rx in (RX_URL, RX_PROTO_REL):
        for m in rx.finditer(t):
            u = m.group(0)
            ln = lineno(t, m.start())
            ln_text = line_at(t, m.start())
            if (ln, u) in seen or NAMESPACE_OK.match(u):
                continue
            seen.add((ln, u))
            if re.search(r"<a\s[^>]*href\s*=", ln_text, re.I) and not is_js:
                continue  # plain link: reported as INFO by the HTML parser
            if is_comment_line(ln_text):
                continue
            if ALLOW_MARK in ln_text:
                info("allowed link string", r, ln, short(u))
                continue
            # not a script/link/img src (those are findings above); a bare URL string in code or markup
            if is_demo:
                finding("external URL in demo/sample file", r, ln, short(u))
            else:
                finding("external URL string in app file (add 'privacy-audit: allow-link' only if it is a click-through link)",
                        r, ln, short(u))

    # real-data patterns
    for name in ("county-host-or-email", "real-looking email", "internal host / IP"):
        for m in RX[name].finditer(t):
            u = m.group(0)
            if name == "internal host / IP" and re.search(r"\.gov\b", u, re.I) is None and is_comment_line(line_at(t, m.start())):
                continue
            finding(name, r, lineno(t, m.start()), short(u, 60))

    # Oracle / County names and logos in app + demo files
    for m in RX["real-org name"].finditer(t):
        # "county" as a plain English word is rare in this app; still flagged, the owner rewords it.
        finding("real-org name (Miami-Dade/INFORMS/County) in app/demo file", r, lineno(t, m.start()), short(m.group(0)))
    for m in RX["oracle name"].finditer(t):
        ln_text = line_at(t, m.start())
        in_href = bool(re.search(r"href\s*=\s*[\"'][^\"']*oracle", ln_text, re.I)) and \
            not re.search(r">[^<]*\boracle\b", ln_text, re.I)
        if is_demo:
            finding("Oracle name in demo/sample file", r, lineno(t, m.start()), short(ln_text.strip()))
        elif in_href and (is_resources or ALLOW_MARK in ln_text):
            info("Oracle public-docs link target", r, lineno(t, m.start()), short(m.group(0)))
        else:
            warn("Oracle name in app file: allowed only as a plain-text subject, never branding",
                 r, lineno(t, m.start()), short(ln_text.strip()))
    for m in RX["peoplesoft logo ref"].finditer(t):
        finding("logo reference (Oracle/PeopleSoft/County)", r, lineno(t, m.start()), short(m.group(0), 60))


def scan_binary_and_names(root, app_files):
    """File names and PNG/SVG metadata: logos cannot be read by a text scan, so look at what we can."""
    name_rx = re.compile(r"oracle|miami|county|informs|peoplesoft", re.I)
    for r in app_files:
        base = os.path.basename(r)
        ext = os.path.splitext(r)[1].lower()
        if name_rx.search(base) and ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2"):
            finding("file name suggests a real-org logo/asset", r, 0, base)
        if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"):
            data = open(os.path.join(root, r), "rb").read()
            for word in (b"Oracle", b"ORACLE", b"Miami", b"MIAMI", b"miamidade", b"INFORMS", b"PeopleSoft"):
                if word in data:
                    finding("real-org text inside image metadata/pixels-as-text", r, 0, word.decode())
            info("image to review by eye (logos/real data)", r, 0, f"{len(data)} bytes")
        if ext in (".woff", ".woff2", ".ttf", ".otf", ".eot"):
            info("self-hosted font", r, 0, "check the licence in README (not a privacy issue)")


# --------------------------------------------------------------------------- config checks
def check_netlify(root):
    p = os.path.join(root, "netlify.toml")
    if not os.path.exists(p):
        finding("netlify.toml missing", "netlify.toml", 0, "no security headers/CSP will be sent")
        return
    raw = read(root, "netlify.toml")
    values = {}
    if tomllib:
        try:
            cfg = tomllib.loads(raw)
        except Exception as e:  # noqa: BLE001
            finding("netlify.toml does not parse", "netlify.toml", 0, str(e))
            return
        for h in cfg.get("headers", []):
            if h.get("for") == "/*":
                values.update(h.get("values", {}))
    else:  # crude fallback
        for k in list(REQUIRED_HEADERS) + ["Content-Security-Policy"]:
            m = re.search(rf'^\s*{k}\s*=\s*"(.*)"\s*$', raw, re.M)
            if m:
                values[k] = m.group(1)
    for hname, ok in REQUIRED_HEADERS.items():
        if hname not in values:
            finding("security header missing for /*", "netlify.toml", 0, hname)
        elif not ok(values[hname]):
            finding("security header has the wrong value", "netlify.toml", 0, f"{hname}: {values[hname]}")
    csp = values.get("Content-Security-Policy")
    if not csp:
        finding("CSP missing for /*", "netlify.toml", 0, "Content-Security-Policy not set")
        return
    d = {}
    for part in csp.split(";"):
        bits = part.strip().split()
        if bits:
            d[bits[0].lower()] = bits[1:]
    need = {"default-src": ["'self'"], "connect-src": ["'self'"], "script-src": None, "object-src": ["'none'"],
            "base-uri": ["'self'"], "frame-ancestors": ["'none'"], "worker-src": None, "style-src": None, "img-src": None}
    for k, exact in need.items():
        if k not in d:
            (finding if k in ("default-src", "connect-src", "script-src", "object-src", "frame-ancestors")
             else warn)("CSP directive missing", "netlify.toml", 0, k)
        elif exact is not None and d[k] != exact:
            finding("CSP directive too loose", "netlify.toml", 0, f"{k} {' '.join(d[k])} (expected {' '.join(exact)})")
    for k, srcs in d.items():
        for s in srcs:
            if s in ("*", "http:", "https:", "ws:", "wss:") or re.match(r"^(?:https?:)?//|^[\w-]+(\.[\w-]+)+(:\d+)?$", s):
                finding("CSP allows an external origin", "netlify.toml", 0, f"{k} {s}")
            if s == "'unsafe-inline'":
                finding("CSP allows 'unsafe-inline'", "netlify.toml", 0, k)
            if s == "data:" and k in ("script-src", "default-src", "worker-src", "connect-src", "style-src"):
                finding("CSP allows data: in an executable/fetch directive", "netlify.toml", 0, k)
            if s == "'unsafe-eval'":
                warn("CSP has 'unsafe-eval' (known: opencv.js may need it; remove if Volt confirms it does not)",
                     "netlify.toml", 0, k)
    info("CSP", "netlify.toml", 0, short(csp, 200))


def check_vendor(root):
    p = os.path.join(root, OPENCV_PATH)
    if not os.path.exists(p):
        warn("OpenCV.js not found at the pinned path", OPENCV_PATH, 0, "app cannot load it; self-hosting rule needs the file here")
        return
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    if h != OPENCV_SHA256:
        finding("vendor/opencv.js hash differs from the pinned build", OPENCV_PATH, 0,
                f"{h[:12]}... (expected {OPENCV_SHA256[:12]}...; update OPENCV_SHA256 only after reviewing the new build)")
    else:
        info("vendor/opencv.js sha256 matches the pin", OPENCV_PATH, 0, h[:16] + "...")
    # Anything else under vendor/ is unreviewed third-party code
    for q in walk(root, os.path.join(root, "vendor")):
        r = rel(root, q)
        if r != OPENCV_PATH:
            warn("extra file under vendor/ (not hash-pinned)", r, 0, "review and pin, or remove")


def check_scripts_are_local(root, app_files):
    """Every <script src> and importScripts() path should exist in the repo (self-hosted)."""
    for r in app_files:
        ext = os.path.splitext(r)[1].lower()
        t = read(root, r) if ext in (".html", ".htm", ".js") else ""
        if ext in (".html", ".htm"):
            for m in re.finditer(r"""<script[^>]+src\s*=\s*["']([^"'#?]+)""", t, re.I):
                u = m.group(1)
                if re.match(r"^(?:https?:)?//", u):
                    continue  # already a finding
                tgt = os.path.normpath(os.path.join(root, os.path.dirname(r), u.lstrip("/") if u.startswith("/") else u))
                if u.startswith("/"):
                    tgt = os.path.normpath(os.path.join(root, u.lstrip("/")))
                if not os.path.exists(tgt):
                    warn("script src does not exist yet (broken path or file not written)", r, lineno(t, m.start()), u)
        if r == "inspector.worker.js":
            for m in re.finditer(r"importScripts\s*\(([^)]*)\)", t):
                for u in re.findall(r"""["']([^"']+)["']""", m.group(1)):
                    if not re.match(r"^(?:https?:)?//", u) and not os.path.exists(os.path.join(root, u)):
                        warn("importScripts path does not exist yet", r, lineno(t, m.start()), u)


# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--root", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
                    help="repo root (default: the directory above tools/)")
    ap.add_argument("--strict", action="store_true", help="treat WARN as failure")
    ap.add_argument("--quiet", action="store_true", help="hide INFO lines")
    args = ap.parse_args()
    root = os.path.abspath(args.root)

    app, other = collect(root)
    text_app = [r for r in app if os.path.splitext(r)[1].lower() in TEXT_EXT]
    scanned_other = [r for r in other if os.path.splitext(r)[1].lower() in TEXT_EXT]

    print(f"Privacy audit, root: {root}")
    print(f"App files scanned fully: {len(app)} ({len(text_app)} text)  |  other repo text files, secret/SSN scan only: {len(scanned_other)}")
    print("Excluded: .git, node_modules, vendor/ (hash-pinned instead), tools/privacy_audit.py")
    if not any(r in app for r in ("index.html", "inspector.worker.js")):
        warn("app not written yet", "(root)", 0, "index.html / inspector.worker.js missing: only netlify.toml and vendor/ could be checked")

    scan_secrets_everywhere(root, app + other)
    for r in text_app:
        if r == "netlify.toml":
            continue
        scan_app_text(root, r)
    scan_binary_and_names(root, app)
    check_netlify(root)
    check_vendor(root)
    check_scripts_are_local(root, app)

    if not args.quiet:
        for rule, p, ln, txt in infos:
            print(f"INFO    {rule}: {p}{':' + str(ln) if ln else ''}: {txt}")
    for rule, p, ln, txt in warns:
        print(f"WARN    {rule}: {p}{':' + str(ln) if ln else ''}: {txt}")
    for rule, p, ln, txt in findings:
        print(f"FINDING {rule}: {p}{':' + str(ln) if ln else ''}: {txt}")
    print()
    print(f"{len(findings)} FINDING(S), {len(warns)} WARN(S), {len(infos)} INFO")
    print("Reminder: a clean audit is not proof of privacy (logos inside images need a human look; run the DevTools "
          "Network check) and says nothing about authorization: a screenshot never proves authorization.")
    failed = bool(findings) or (args.strict and bool(warns))
    print("PRIVACY AUDIT FAILED (blocker)" if failed else "PRIVACY AUDIT CLEAN")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

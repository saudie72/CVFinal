"""Example 2 — privacy audit of the repository (run from the repo root):
    python3 knowledge/erp-security-admin/examples/ex2_privacy_audit.py

Fails if it finds: real County hostnames/emails, third-party <script src="https://...">,
analytics snippets, or secret-looking keys. Documentation mentions of the words
'Miami-Dade', 'INFORMS', 'PeopleSoft' and 'Oracle' are allowed (they describe the subject),
but not inside demo pages or samples.
"""
import os, re, sys

SKIP_DIRS = {".git", "node_modules", "out"}
TEXT_EXT = {".html", ".js", ".css", ".md", ".json", ".toml", ".py"}
rules = [
    ("county hostname/email", re.compile(r"[\w.-]*@?miamidade\.gov|informs\.[a-z]+\.gov", re.I), None),
    ("third-party script", re.compile(r"<script[^>]+src=[\"']https?://", re.I), None),
    ("analytics", re.compile(r"googletagmanager|google-analytics|gtag\(|segment\.com|hotjar", re.I), None),
    ("secret-looking key", re.compile(r"(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY)"), None),
    ("real-org words inside demo pages", re.compile(r"miami-dade|informs|oracle", re.I),
     lambda p: p.startswith(("./demo-erp", "./samples")) or "/mock-erp-builder/examples/tl-timesheet/" in p),
]
findings = []
for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        p = os.path.join(root, f)
        if os.path.splitext(f)[1] not in TEXT_EXT or p.endswith("ex2_privacy_audit.py"):
            continue
        text = open(p, encoding="utf-8", errors="ignore").read()
        for name, rx, scope in rules:
            if scope and not scope(p):
                continue
            for m in rx.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                findings.append(f"{name}: {p}:{line}: {m.group(0)[:60]}")
for f in findings:
    print("FINDING", f)
print("PRIVACY AUDIT CLEAN" if not findings else f"{len(findings)} FINDINGS")
sys.exit(1 if findings else 0)

"""Validates the release examples. Run from the repo root:
    python3 knowledge/release-docs-engineer/examples/validate_examples.py

Example 1: ex1-netlify.toml parses as TOML and has the required settings.
Example 3: every relative Markdown link in the given docs points to a file that exists
           (the same check the Resources page and README must pass).
"""
import os, re, sys, tomllib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ok = True

# ---- Example 1: netlify.toml ----
with open(os.path.join(HERE, "ex1-netlify.toml"), "rb") as f:
    cfg = tomllib.load(f)
checks = {
    "publish is '.'": cfg["build"]["publish"] == ".",
    "no build command": cfg["build"]["command"] == "",
    "opencv immutable cache": any(h["for"] == "/vendor/opencv/*" and "immutable" in h["values"]["Cache-Control"] for h in cfg["headers"]),
    "js revalidates": any(h["for"] == "/*.js" and "must-revalidate" in h["values"]["Cache-Control"] for h in cfg["headers"]),
    "nosniff on all": any(h["for"] == "/*" and h["values"].get("X-Content-Type-Options") == "nosniff" for h in cfg["headers"]),
}
for k, v in checks.items():
    print(("PASS " if v else "FAIL ") + "netlify.toml: " + k)
    ok &= v

# ---- Example 3: link checker ----
LINK = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")
targets = sys.argv[1:] or ["docs/README.md", "CLAUDE.md", "knowledge/README.md"]
for doc in targets:
    path = os.path.join(ROOT, doc)
    if not os.path.exists(path):
        print(f"SKIP {doc} (not found)")
        continue
    broken = []
    for href in LINK.findall(open(path, encoding="utf-8").read()):
        if href.startswith(("http://", "https://", "mailto:")):
            continue
        if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(path), href))):
            broken.append(href)
    print(("PASS " if not broken else "FAIL ") + f"links in {doc}" + (f": broken {broken}" if broken else ""))
    ok &= not broken

print("ALL OK" if ok else "FAILURES")
sys.exit(0 if ok else 1)

# Release & docs worked examples

| File | What it shows |
|---|---|
| `ex1-netlify.toml` | Static deploy config: publish '.', empty build, immutable cache for vendor/opencv, revalidate JS, security headers |
| `validate_examples.py` | Parses ex1 with tomllib and checks 5 required settings; checks every relative Markdown link in docs/README.md, CLAUDE.md and knowledge/README.md |
| `ex2-readme-outline.md` | README outline that covers the course requirements |

**Verified:** `python3 knowledge/release-docs-engineer/examples/validate_examples.py` → 5/5 config checks PASS, all links PASS (2026-11-22).

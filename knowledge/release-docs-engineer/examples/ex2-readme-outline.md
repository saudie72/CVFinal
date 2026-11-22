# Example 2: README outline (what good looks like)

```markdown
# ERP Visual Regression Inspector
One-line pitch + live URL + screenshot of the results view (fictional demo data).

> Supplemental QA tool for the visual-comparison part of ERP testing — not a replacement
> for functional or security testing. All processing happens in your browser; nothing is uploaded.

## Features            (bullets: compare, regions, heatmap/overlay, ignore zones, alignment, history, evidence export, offline, reset)
## How it works        (OpenCV.js in a Web Worker on WebAssembly → IndexedDB; 5-step diagram)
## Try it              (Load a sample → Timesheet pair → FAIL with 2+ regions)
## Run locally         (python -m http.server 8080 → http://localhost:8080 — not file://)
## Deploy on Netlify   (Import from GitHub → build command empty → publish "." → Deploy; netlify.toml explained)
## Project structure   (tree of top-level folders)
## The agent team      (table: agent → what it built; link docs/handoff-log.md)
## Data & privacy      (fictional data only; no network after load; how to verify in DevTools)
## Resources           (link to resources.html and docs/README.md)
## Credits / course    (CAI 2840, final project)
```

Rules: every link checked by `validate_examples.py`; plain language; no real County data, URLs or logos.

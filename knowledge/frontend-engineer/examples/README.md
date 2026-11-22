# Front-end worked examples

| # | File | Shows | Verified (headless Chrome 153, 2026-11-22) |
|---|---|---|---|
| 1 | `ex1-region-list-and-boxes.html` | Takes the worker's result contract → numbered red boxes drawn crisply on a canvas → a matching focusable `<ol>` → an `aria-live` summary and a canvas `aria-label` | ✅ stroke pixel `233,21,45` (token `--region` #e9152d) · inside untouched · "Region 2 of 3 — 90×40 px at (220, 150)" · live "FAIL — 3 changed regions (0.8% of page)" |
| 2 | `ex2-overlay-slider.html` | Before/after wipe with `clip-path` driven by a labelled `<input type=range>` + `aria-valuetext`; simulated keyboard steps | ✅ value 60 · clip `inset(0px 0px 0px 60%)` · "Showing 40% after, 60% before" · focused, labelled |

Run: `python3 tools/verify-knowledge/run_browser_examples.py`

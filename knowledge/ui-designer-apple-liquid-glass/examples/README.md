# Sable's worked examples

| # | File | Shows | Verified (2026-11-22) |
|---|---|---|---|
| 1 | `ex1-tokens.css` + `contrast_check.py` | Light and dark tokens; glass only for chrome; opaque viewer for screenshots; reduced-transparency, increased-contrast and no-backdrop-filter fallbacks. The script checks **every text/background pair against WCAG** (glass evaluated worst case: composited over black or white) | ✅ 13/13 pairs pass. Three **rejected** values are kept as evidence: `#6e6e73` secondary (1.89:1), glass alpha .62 light / .66 dark (2.48:1) |
| 2 | `ex2-status-pill.html` | Glass status pill with `role="status"` and `aria-live="polite"`; PASS/FAIL badges with **icon + word**; the pulse is turned off under `prefers-reduced-motion` | ✅ headless Chrome 153: backdrop-filter applied, announced text "Working… Aligning", animation `pulse`, and `none` with reduced motion |

## Lesson from running the contrast check
The first token set followed a "typical" glass look (55–66% opacity). Over a dark backdrop, secondary text dropped to **2.5:1**, failing AA. HIG Materials says thicker, more opaque materials give better contrast for fine text, so the tokens now use **85% opacity**, and the shared skill was updated to match.

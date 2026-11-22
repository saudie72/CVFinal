# Example 1: state table for the Compare screen

What good looks like: **every** state is designed, with a clear primary action and specific copy (HIG Feedback + Progress indicators).

| State | Trigger | What's on screen | Primary action | Status pill / live text |
|---|---|---|---|---|
| Empty | No page selected | Illustration + "Compare a page before and after a change" + 2 buttons | **Load a sample** (secondary: New page) | "Ready" |
| Loading OpenCV | First visit | Same layout; Compare disabled with a tooltip "Getting the vision engine ready" | — | "Loading OpenCV (10 MB, first visit only)…" |
| Baseline only | Page has a baseline, no candidate | Baseline thumbnail + drop zone "Drop the after-change screenshot" | **Choose screenshot** | "Ready" |
| Ready to compare | Both images present | Side-by-side thumbnails + capture-standards tip (from the PSA) | **Compare** | "Ready" |
| Working | Compare pressed | Thin determinate bar under the pill; **Cancel** button | Cancel | "Comparing: Finding differences (2/4)" |
| Result PASS | 0 regions or ≤ threshold | Green ✓ PASS card, SSIM, "Save run" | **Save run** | "PASS — no unexpected changes" |
| Result FAIL | Regions > threshold | Red ✕ FAIL card, numbered regions list, views (Boxes / Heatmap / Side-by-side / Overlay) | **Review regions** | "FAIL — 3 changed regions (0.8% of page)" |
| Error | Worker error or timeout | Inline message saying why + **Try again** + "Reset app data" link | Try again | "Something went wrong — see message" |
| Offline | `navigator.onLine === false` | Small note "Offline — everything still works on this device" | (normal) | unchanged |

Disclaimer line on every result: *"Visual check only — not a replacement for functional or security testing."*

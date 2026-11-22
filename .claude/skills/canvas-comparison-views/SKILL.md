---
name: canvas-comparison-views
description: "Render comparison results on canvas: numbered region boxes, heatmap, side-by-side, overlay slider, and exportable reports. Use when building or styling the results screen."
user-invocable: false
---
# Canvas comparison views

Reference: `docs/05-visual-outputs.md`.

| View | How |
|---|---|
| Boxes | Candidate + numbered red rectangles (RGBA `220,38,38,255`, 3 px); the numbers match the region list |
| Heatmap | `applyColorMap` if `typeof cv.applyColorMap === 'function'`, else a 256-entry JS LUT (blue→green→yellow→red) after `normalize(NORM_MINMAX)`; optionally blended onto the candidate |
| Side-by-side | Two canvases with synced zoom and scroll |
| Overlay | Stacked canvases; the top one is clipped by `<input type=range>` (wipe), with an opacity mode |

- Draw ignore zones as grey hatching in every view.
- Region list as text: `#2 — 312×28 px at (40, 610)`, so information is never shown by colour alone.
- Export:
  - PNG evidence (header bar: page, module, date, status, % changed, SSIM, test case ID)
  - printable HTML report
  - CSV/JSON of runs
- Large images: draw scaled with `drawImage`, and keep the full resolution for export.

---
name: ignore-zones-masking
description: "Build and apply ignore-zone masks for dynamic page content (timestamps, user names, session IDs). Use when implementing, drawing, storing or applying ignore zones."
user-invocable: false
---
# Ignore zones

Reference: `docs/04-ignore-zones.md`.

- A zone is `{id, pageId, x, y, w, h, label}` in **baseline pixel coordinates**, stored in the IndexedDB store `ignoreZones`.
- Worker: `mask = Mat.zeros(rows, cols, CV_8UC1)`, then `cv.rectangle(..., Scalar(255), -1)` for each zone, then `diff.setTo(Scalar(0), mask)` **after absdiff, before threshold**.
- UI: drag on the baseline canvas to draw a zone, converting with `imgX = clientX * (img.width / canvas.clientWidth)`. Ask for a label. Add an "Ignore this region" action on every detected region.
- Keyboard alternative: a numeric x/y/w/h form.
- Show ignored areas as grey hatching in every view, and the "% of page ignored" figure in the report.
- An ignore zone is **not** a security control. Say so in the report for role-based tests.

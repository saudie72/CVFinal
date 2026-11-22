# Example 3: ignore-zone interaction (pointer + keyboard + screen reader)

The HIG says to give gestures an on-screen alternative. Drawing a zone is a drag, so there are **three equal ways** to create one.

1. **Drag** on the baseline: a dashed rectangle follows the pointer → on release, a small popover asks for a "Label (e.g., Timestamp)" with **Add zone** / Cancel.
2. **From a region:** each FAIL region in the list has **Ignore this region**. It pre-fills the popover with that box, expanded by 4 px.
3. **Form** (keyboard / screen reader): **Add zone manually** opens fields X, Y, Width, Height (baseline pixels) and Label, with live preview as you type.

## Behaviour
- Zones belong to the **page**, not to the run. Every future comparison uses them (stored in IndexedDB `ignoreZones`).
- Zones are shown as grey hatching in every view, and the result shows "2 zones ignored (1.4% of page)".
- Removing a zone: select it → Delete key or the 🗑 button, with **Undo** for 5 s (no dialog, since it's easily reversible).
- Announce changes: "Zone 'Timestamp' added, 220 by 18 pixels."
- Guardrail: if the zones cover more than 15% of the page, show a warning: "Large ignored areas can hide real regressions."

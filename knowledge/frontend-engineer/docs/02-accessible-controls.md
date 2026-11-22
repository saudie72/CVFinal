# Accessible status, sliders and lists

**Sources:** MDN ARIA live regions: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions · MDN `role="status"`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role · MDN `<input type="range">`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range · MDN `aria-valuetext`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-valuetext · Apple HIG Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility

## Facts
- `aria-live="polite"` regions are announced when their text changes, without interrupting. `role="status"` is a polite live region for advisory status (our status pill).
- A native `<input type="range">` is keyboard-operable out of the box: arrow keys move it by `step`, and Home/End go to min/max. Give it a `<label>`, and use `aria-valuetext` when a plain number isn't meaningful.
- `tabindex="0"` makes a non-interactive element (a region list item) focusable in DOM order.

## Implemented in the examples
- `ex1`: canvas boxes + `<ol>` region list + an `aria-live` summary. The test checks the exact stroke pixel colour, the list text and the live text.
- `ex2`: a wipe overlay with `clip-path: inset(0 0 0 var(--wipe))` driven by the range slider, plus `aria-valuetext` "Showing 40% after, 60% before". The test checks the keyboard steps, the computed clip-path and the label.

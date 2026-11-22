# Accessible interaction (Apple HIG + WCAG)

**Sources:** Apple HIG, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility · W3C WCAG 2.1 Non-text Contrast: https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast

## HIG rules that shape the flows
- **Describe the interface for screen readers:** label every element, so VoiceOver and Voice Control users understand it without seeing it.
- **Full keyboard access:** the app must be usable with a keyboard alone, without overriding system shortcuts.
- **Gestures:** use the simplest gesture and **offer on-screen alternatives** (e.g., a button next to a swipe action).
- **Don't rely on colour alone:** add shapes, icons or text.
- **Reduce Motion:** cut automatic and repetitive animation, and replace movement with fades.
- **Contrast:** AA minimums (4.5:1 text, 3:1 large or bold text). WCAG 1.4.11 adds 3:1 for focus and state indicators on controls.

## Applied
- **Ignore-zone drawing** is a drag gesture, so it needs an on-screen alternative: an "Add zone" form with X, Y, W, H and a label, plus "Ignore this region" on any detected region (see examples/ex3).
- **Overlay slider:** `<input type="range">` with arrow keys, PageUp/PageDown and Home/End, and `aria-valuetext="Showing 60% after, 40% before"`.
- **Regions:** each one is a list item ("Region 2 of 3, 312 by 28 pixels at 40, 610, decision: not reviewed") that's focusable and synced with the box highlight.
- **Result:** announced through `aria-live`: "Comparison finished. FAIL, 3 changed regions, 0.8 percent of page."

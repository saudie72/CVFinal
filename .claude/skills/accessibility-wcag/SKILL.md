---
name: accessibility-wcag
description: "Make the inspector meet WCAG 2.1 AA: contrast, keyboard access, focus, screen-reader announcements, no colour-only meaning. Use when designing, building or testing any UI."
user-invocable: false
---
# Accessibility (WCAG 2.1 AA)

- **Contrast:** text 4.5:1, large text and UI parts 3:1, including text on glass panels.
- **Keyboard:** every control can be reached and used. The overlay slider uses arrow keys. Ignore zones can be added with the numeric form. Use a visible `:focus-visible` ring.
- **Screen readers:** the status pill is an `aria-live="polite"` region. Results announce "FAIL, 3 changed regions". Canvases have `role="img"` and an `aria-label` summary, and the region list is real HTML.
- **No colour-only meaning:** PASS/FAIL have text and icons, and regions are numbered.
- **Motion:** honour `prefers-reduced-motion`.
- **Targets:** at least 44×44 px for touch (HIG) / 24×24 minimum (WCAG 2.2).
- **Test:** keyboard-only run-through, Lighthouse accessibility ≥ 90, and the axe DevTools extension if available.

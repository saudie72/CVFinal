# Accessibility testing

**Sources:** W3C Understanding SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum · SC 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast · Apple HIG Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility · Lighthouse: https://developer.chrome.com/docs/lighthouse/overview

## Criteria
- Text contrast **4.5:1** (large text 3:1). Non-text contrast for control boundaries, focus and state indicators and meaningful graphics: **3:1** against adjacent colours (WCAG 1.4.11). Inactive controls are exempt.
- HIG: full keyboard access; labels for every element; don't rely on colour alone; respect Reduce Motion.

## Manual pass (10 minutes)
1. Unplug the mouse and do the whole flow with the keyboard: Tab, Shift+Tab, Enter, Space and the arrow keys (slider).
2. The focus ring is visible everywhere (≥ 3:1).
3. Check announcements: status changes and results are read by the screen reader (`aria-live`).
4. Zoom to 200%: nothing is cut off.
5. Turn on reduced motion in the OS: no pulsing.

## Tools
- Lighthouse accessibility audit (target ≥ 90).
- Sable's `contrast_check.py` for the token pairs (re-run it if the tokens change).

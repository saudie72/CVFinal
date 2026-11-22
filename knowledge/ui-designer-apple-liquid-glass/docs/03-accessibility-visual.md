# Visual accessibility (Apple HIG + WCAG)

**Sources:** Apple HIG, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility · W3C Understanding SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum · W3C Understanding SC 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast

## Contrast
- HIG: meet WCAG AA, which means **4.5:1** for text up to 17 pt, and **3:1** for text 18 pt and larger or bold text. Provide a higher-contrast scheme when Increase Contrast is on, and check both light and dark.
- WCAG 1.4.11: UI component boundaries, states (selected or focused) and meaningful graphics need **3:1** against adjacent colours. That covers the region boxes, the slider handle and the focus ring.

## Text size
- HIG defaults: iOS 17 pt (minimum 11), macOS 13 pt (minimum 10). Support enlargement to **200%**. Avoid thin weights at small sizes.
- Web translation: base 16 px body, 13 px minimum for captions, `rem` units, and the layout must survive 200% browser zoom.

## Touch / click targets
- HIG: the iOS default control is **44×44 pt**, with a 28×28 minimum, about 12 pt spacing around bezelled elements and 24 pt around others.
- Web: buttons at least 44 px tall in touch layouts, 32 px minimum on desktop (and ≥ 24×24 for WCAG 2.2 target size).

## Motion
- HIG: with Reduce Motion on, cut down automatic and repetitive animation (zoom, scale), replace movement with fades, and **avoid animating into or out of blurs**.
- Web: `@media (prefers-reduced-motion: reduce)` → no pulse on the status pill, and cross-fade only.

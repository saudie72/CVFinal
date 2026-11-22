---
name: apple-liquid-glass-styling
description: "Apply an Apple-style Liquid Glass visual language (translucent materials, depth, tokens, light/dark) to the inspector UI. Use when designing or implementing styles, components or the status pill."
user-invocable: false
---
# Apple-style Liquid Glass styling

Goal: calm, premium, legible. The glass effect supports the content and never competes with the screenshots.

## Tokens (css/tokens.css)
```css
:root{
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, system-ui, sans-serif;
  --radius-lg: 22px; --radius-md: 14px; --radius-sm: 10px;
  --glass-bg: rgba(255,255,255,.85); --glass-border: rgba(255,255,255,.6);
  --glass-blur: saturate(180%) blur(20px);
  --shadow: 0 8px 30px rgba(0,0,0,.12);
  --text: #1d1d1f; --text-2: #5c5c62; --accent: #0066cc;
  --pass: #007a33; --fail: #c4142b; --warn: #c55300; /* AA on light; dark-mode values in knowledge/ui-designer-apple-liquid-glass/examples/ex1-tokens.css */
}
@media (prefers-color-scheme: dark){ :root{ --glass-bg: rgba(28,28,30,.85); --glass-border: rgba(255,255,255,.12); --text:#f5f5f7; --text-2:#aeaeb2; } }
```
- Glass panels: `background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); box-shadow: var(--shadow);`
- **Screenshots are never on glass.** Put them on an opaque neutral surface, so the diff colours stay accurate.
- Status pill: a glass capsule with a coloured dot (Loading = grey pulse, Ready = green, Working = blue spinner, Error = red).
- PASS/FAIL badges always use **text and icon**, not colour alone.
- Motion: 150–250 ms ease, and respect `prefers-reduced-motion`.
- Fallback: `@supports not (backdrop-filter: blur(1px))` → opaque `--glass-bg` at alpha .92.
- Contrast: text on glass meets WCAG AA (4.5:1) even in the worst case (glass over black or white). Verified by knowledge/ui-designer-apple-liquid-glass/examples/contrast_check.py: alpha .55–.66 FAILS for secondary text, and .85 passes.

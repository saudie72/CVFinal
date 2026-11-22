# Color (Apple HIG)

**Source:** Apple Human Interface Guidelines, Color: https://developer.apple.com/design/human-interface-guidelines/color

## Best practices (HIG)
- **Don't use the same colour to mean different things.** Keep the colour for status or interactivity consistent.
- **Make every colour work in light, dark and increased-contrast contexts.** Custom colours need light and dark variants, plus an increased-contrast option for each.
- **Don't rely on colour alone** to tell objects apart, show interactivity or convey essential information. Add text labels or glyph shapes.
- Watch for colours that make content hard to see. Low contrast and colour-blind pairs are the usual problems.
- **Apply colour sparingly to Liquid Glass**, and reserve it for status indicators or primary actions. To emphasise a primary action, tint the **background** of that one button, not several controls.
- Colours can mean different things in different cultures (red is danger in some places and positive in others).

## System colour reference values (HIG table, light / dark)
| Name | Light | Dark | Increased contrast (light) |
|---|---|---|---|
| Red | 255,56,60 | 255,66,69 | 233,21,45 |
| Green | 52,199,89 | 48,209,88 | 0,137,50 |
| Blue | 0,136,255 | 0,145,255 | 30,110,244 |
| Orange | 255,141,40 | 255,146,48 | 197,83,0 |

The HIG says these are reference values. Native apps should use system APIs rather than hard-coding them. On the web we must hard-code them, so we use them as **tokens** and check their contrast ourselves (examples/contrast_check.py).

## Inspector colour semantics (one meaning each)
- **Accent blue:** primary action ("Compare") and focus ring only.
- **Red:** FAIL and changed regions. **Green:** PASS. **Orange:** warnings (alignment fallback, high % ignored).
- Every status also has an icon and a word: ✓ PASS / ✕ FAIL / ⚠ Check.

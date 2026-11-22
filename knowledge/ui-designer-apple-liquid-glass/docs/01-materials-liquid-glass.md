# Materials and Liquid Glass (Apple HIG)

**Source:** Apple Human Interface Guidelines, Materials: https://developer.apple.com/design/human-interface-guidelines/materials · Adopting Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass

## What the HIG says
- A material is a visual effect that creates **depth, layering and hierarchy** between foreground and background elements.
- **Liquid Glass** is a distinct **functional layer for controls and navigation** (tab bars, sidebars) that floats *above* the content layer, letting content show through while the controls stay legible.
- **Don't use Liquid Glass in the content layer.** Use standard materials there. The exception is transient interactive controls like sliders and toggles, which take on the glass look *while they're being used*.
- **Use Liquid Glass effects sparingly.** Overusing it on custom controls distracts from the content, so limit it to the most important functional elements.
- Variants: **regular** blurs the background and adjusts its luminosity for legibility; use it for components with lots of text (alerts, sidebars, popovers). **clear** is highly translucent, for components over rich media. Over bright content, add a **dark dimming layer at about 35% opacity**.
- Standard materials: choose them by **semantic meaning**, not by the colour they seem to give. Use **vibrant** colours on top for legibility. Thicker (more opaque) materials give better contrast for fine text, and thinner ones keep more context visible.
- Appearance changes with system settings like **Reduce Transparency** and **Increase Contrast**.

## Translation to our web app (CSS)
| HIG rule | Inspector rule |
|---|---|
| Glass = controls and navigation layer | Glass only on the top bar, the side panel, the status pill and the floating toolbar over the viewer |
| Not in the content layer | **Screenshots and diff views sit on an opaque neutral surface**, never behind blur (it would also falsify the diff colours) |
| Regular variant for text-heavy UI | Panels: `backdrop-filter: saturate(180%) blur(20px)` with a fairly opaque tint, **alpha 0.85**. This is the HIG's 'thicker material for fine text' idea. The contrast check showed alpha 0.62/0.66 fails AA for secondary text in the worst case |
| Sparingly | At most 3 glass surfaces on screen at once |
| Reduce Transparency | `@media (prefers-reduced-transparency: reduce)` → opaque panels. Also `@supports not (backdrop-filter: blur(1px))` → opaque |
| Increase Contrast | `@media (prefers-contrast: more)` → stronger borders, opaque panels, darker text |

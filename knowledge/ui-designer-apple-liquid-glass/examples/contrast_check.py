"""WCAG 2.x contrast check for the token pairs in ex1-tokens.css.

Formula (WCAG 2.1 relative luminance): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
Glass backgrounds are evaluated *worst case*: the translucent tint composited over
a pure black or pure white backdrop, whichever gives the lower contrast.
Run: python3 contrast_check.py
"""


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(rgb):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def over(rgba, backdrop):
    *rgb, a = rgba
    return tuple(round(a * c + (1 - a) * d) for c, d in zip(rgb, backdrop))


LIGHT_GLASS = (255, 255, 255, 0.85)
OLD_LIGHT_GLASS = (255, 255, 255, 0.62)
DARK_GLASS = (28, 28, 30, 0.85)
OLD_DARK_GLASS = (28, 28, 30, 0.66)
BLACK, WHITE = (0, 0, 0), (255, 255, 255)

checks = [  # (label, fg, bg, minimum)
    ("light text on canvas", "#1d1d1f", "#f2f2f7", 4.5),
    ("light secondary on canvas", "#5c5c62", "#f2f2f7", 4.5),
    ("light secondary on glass (worst)", "#5c5c62", over(LIGHT_GLASS, BLACK), 4.5),
    ("light text on glass (worst)", "#1d1d1f", over(LIGHT_GLASS, BLACK), 4.5),
    ("white on accent button", "#ffffff", "#0066cc", 4.5),
    ("PASS text on white", "#007a33", "#ffffff", 4.5),
    ("FAIL text on white", "#c4142b", "#ffffff", 4.5),
    ("region stroke on white (non-text)", "#e9152d", "#ffffff", 3.0),
    ("dark text on canvas", "#f5f5f7", "#000000", 4.5),
    ("dark secondary on glass (worst)", "#aeaeb2", over(DARK_GLASS, WHITE), 4.5),
    ("dark PASS on viewer", "#4ad968", "#1c1c1e", 4.5),
    ("dark FAIL on viewer", "#ff6165", "#1c1c1e", 4.5),
    ("dark accent on viewer", "#4da3ff", "#1c1c1e", 4.5),
    ("rejected: old secondary #6e6e73 on light glass (worst)", "#6e6e73", over(OLD_LIGHT_GLASS, BLACK), 4.5),
    ("rejected: secondary on old .62 light glass (worst)", "#5c5c62", over(OLD_LIGHT_GLASS, BLACK), 4.5),
    ("rejected: dark secondary on old .66 dark glass (worst)", "#aeaeb2", over(OLD_DARK_GLASS, WHITE), 4.5),
]

fails = 0
for label, fg, bg, need in checks:
    fg = hex2rgb(fg) if isinstance(fg, str) else fg
    bg = hex2rgb(bg) if isinstance(bg, str) else bg
    r = ratio(fg, bg)
    ok = r >= need
    expected_fail = label.startswith("rejected")
    status = "PASS" if ok else ("FAIL (expected — why we changed it)" if expected_fail else "FAIL")
    if not ok and not expected_fail:
        fails += 1
    print(f"{status:36} {r:5.2f}:1  (need {need}:1)  {label}")
print("ALL TOKEN PAIRS PASS" if fails == 0 else f"{fails} FAILURES")
raise SystemExit(1 if fails else 0)

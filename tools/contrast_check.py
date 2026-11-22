"""WCAG 2.x contrast check for css/app.css.

Adapted from knowledge/ui-designer-apple-liquid-glass/examples/contrast_check.py.
It READS the token values from the "@tokens <name>" ... "@end" blocks in css/app.css, so the
check can't drift from the stylesheet. Formula (WCAG 2.1 relative luminance):
https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum

Glass is evaluated worst case: the translucent tint composited over pure black and pure
white; the lower contrast counts. The status pill is a second translucent layer on the header.
Run: python3 tools/contrast_check.py   (exit 1 if any required pair fails)
"""
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "css" / "app.css"
BLACK, WHITE = (0, 0, 0), (255, 255, 255)


def parse_color(v):
    v = v.strip()
    if v.startswith("#"):
        v = v[1:]
        return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) + (1.0,)
    m = re.match(r"rgba?\(([^)]*)\)", v)
    p = [float(x) for x in m.group(1).split(",")]
    return (p[0], p[1], p[2], p[3] if len(p) > 3 else 1.0)


def load_tokens():
    text = CSS.read_text()
    blocks = {}
    for m in re.finditer(r"/\* @tokens ([\w-]+) \*/(.*?)/\* @end \*/", text, re.S):
        blocks[m.group(1)] = dict(
            (k, parse_color(v)) for k, v in re.findall(r"(--[\w-]+):\s*([^;]+);", m.group(2)))
    light = blocks["light"]
    dark = {**light, **blocks["dark"]}
    return {
        "light": light,
        "dark": dark,
        "light+contrast-more": {**light, **blocks["light-more"]},
        "dark+contrast-more": {**dark, **blocks["dark-more"]},
    }


def lum(rgb):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def over(rgba, backdrop):
    r, g, b, a = rgba
    return tuple(a * c + (1 - a) * d for c, d in zip((r, g, b), backdrop))


def main():
    themes = load_tokens()
    results, fails = [], 0
    for name, t in themes.items():
        def tok(k):
            return t[k][:3]
        # backgrounds: opaque surfaces + worst-case glass + pill-on-glass
        surfaces = {
            "canvas": [tok("--canvas")],
            "panel": [tok("--panel")],
            "panel-2": [tok("--panel-2")],
            "control": [tok("--control-bg")],
            "field": [tok("--field-bg")],
            "viewer": [tok("--viewer")],
            "glass": [over(t["--glass-bg"], BLACK), over(t["--glass-bg"], WHITE)],
            "pill": [over(t["--pill-bg"], over(t["--glass-bg"], bd)) for bd in (BLACK, WHITE)],
            "pass-bg": [tok("--pass-bg")], "fail-bg": [tok("--fail-bg")], "warn-bg": [tok("--warn-bg")],
            "accent-soft": [tok("--accent-soft")],  # selected card, current step, next-step callout, checked choice
        }
        pairs = []  # (label, fg-key, [bg surface names], min ratio)
        for s in ("canvas", "panel", "panel-2", "control", "field", "glass", "pill", "fail-bg"):
            pairs.append((f"text on {s}", "--text", s, 4.5))
        for s in ("canvas", "panel", "panel-2", "control", "field", "glass", "fail-bg"):
            pairs.append((f"secondary text on {s}", "--text-2", s, 4.5))
        for s in ("canvas", "panel", "panel-2", "glass"):
            pairs.append((f"link/accent text on {s}", "--accent", s, 4.5))
        for s in ("panel", "panel-2", "canvas"):
            pairs.append((f"PASS text on {s}", "--pass", s, 4.5))
            pairs.append((f"FAIL text on {s}", "--fail", s, 4.5))
        pairs += [
            ("FAIL text on fail tint (decision Regression)", "--fail", "fail-bg", 4.5),
            ("PASS text on pass tint", "--pass", "pass-bg", 4.5),
            ("warning text on warn tint", "--warn", "warn-bg", 4.5),
            ("warning text on panel", "--warn", "panel", 4.5),
            ("placeholder (secondary) on field", "--text-2", "field", 4.5),
            ("btn-danger text on control", "--fail", "control", 4.5),
            # non-text (1.4.11): icons, borders, focus ring, region stroke
            ("pill icon PASS on pill (non-text)", "--pass", "pill", 3.0),
            ("pill icon FAIL on pill (non-text)", "--fail", "pill", 3.0),
            ("pill icon accent/working on pill (non-text)", "--accent", "pill", 3.0),
            ("notice icon warn on glass (non-text)", "--warn", "glass", 3.0),
            ("notice icon accent on glass (non-text)", "--accent", "glass", 3.0),
            ("field border on field", "--border-strong", "field", 3.0),
            ("field border on glass (dialog)", "--border-strong", "glass", 3.0),
            ("control border on control", "--border-strong", "control", 3.0),
            ("control border on panel", "--border-strong", "panel", 3.0),
            ("drop-zone dashed border on panel-2", "--border-strong", "panel-2", 3.0),
            ("region stroke on viewer (non-text)", "--region", "viewer", 3.0),
            ("region left border FAIL on panel (non-text)", "--fail", "panel", 3.0),
            ("region left border PASS on panel (non-text)", "--pass", "panel", 3.0),
            ("focus ring on canvas", "--focus", "canvas", 3.0),
            ("focus ring on panel", "--focus", "panel", 3.0),
            ("focus ring on glass", "--focus", "glass", 3.0),
            ("focus ring on field", "--focus", "field", 3.0),
            # UX-2 first-use clarity (css/app.css section 13b)
            ("text on accent-soft (selected card, next step, current step)", "--text", "accent-soft", 4.5),
            ("secondary text on accent-soft (choice help, strip status)", "--text-2", "accent-soft", 4.5),
            ("link-btn / accent text on accent-soft (tour-again banner)", "--accent", "accent-soft", 4.5),
            ("link-btn / accent text on control", "--accent", "control", 4.5),
            ("strip step DONE icon on panel (non-text)", "--pass", "panel", 3.0),
            ("strip step DONE icon on panel-2 (non-text)", "--pass", "panel-2", 3.0),
            ("strip step CURRENT border/icon accent on accent-soft (non-text)", "--accent", "accent-soft", 3.0),
            ("strip step TODO/BLOCKED border on panel-2 (non-text)", "--border-strong", "panel-2", 3.0),
            ("selected card outline accent on panel (non-text)", "--accent", "panel", 3.0),
            ("selected card outline accent on canvas (non-text)", "--accent", "canvas", 3.0),
            ("selected Regression card outline accent on fail tint (non-text)", "--accent", "fail-bg", 3.0),
            ("checked choice border accent on accent-soft (non-text)", "--accent", "accent-soft", 3.0),
            ("tour focus ring accent on panel gap (non-text)", "--accent", "panel", 3.0),
            ("tour bubble border on panel (non-text)", "--border-strong", "panel", 3.0),
            ("Not-sure info icon accent on fail tint (non-text)", "--accent", "fail-bg", 3.0),
            # UX-7 (section 13d): phone tour bar and zoomed demo image
            ("tour bar top border on panel (non-text)", "--border-strong", "panel", 3.0),
            ("tour bar text on panel", "--text", "panel", 4.5),
            ("tour bar secondary text on panel", "--text-2", "panel", 4.5),
            ("zoomed tour caption on viewer", "--text-2", "viewer", 4.5),
            ("tour zoom focus ring on viewer (non-text)", "--focus", "viewer", 3.0),
            # UX-POLISH (css/app.css section 13c): outcome-tinted result header, hero gradient, select arrow
            ("text on pass tint (PASS result header gradient)", "--text", "pass-bg", 4.5),
            ("secondary text on pass tint (PASS result header)", "--text-2", "pass-bg", 4.5),
            ("text on fail tint (FAIL result header gradient)", "--text", "fail-bg", 4.5),
            ("secondary text on fail tint (FAIL result header)", "--text-2", "fail-bg", 4.5),
            ("accent link on fail tint (FAIL result header)", "--accent", "fail-bg", 4.5),
            ("accent link on pass tint (PASS result header)", "--accent", "pass-bg", 4.5),
            ("FAIL status bar on panel (non-text)", "--fail", "panel", 3.0),
            ("select arrow = --text-2 on field (non-text)", "--text-2", "field", 3.0),
            ("nav active ring accent on accent-soft (non-text)", "--accent", "accent-soft", 3.0),
            ("hero gradient: accent link on accent-soft", "--accent", "accent-soft", 4.5),
            ("sample-area pill: secondary text on accent-soft", "--text-2", "accent-soft", 4.5),
            ("sample-hero expectation tray: secondary text on panel", "--text-2", "panel", 4.5),
        ]
        # brand mark: check glyph (--on-accent) on both ends of the logo gradient
        for end in ("--accent-bg", "--accent"):
            results.append((name, f"brand mark glyph on {end} (non-text)", ratio(tok("--on-accent"), tok(end)), 3.0))
        # fg on accent surface
        for label, fg, bg in (("primary button / selected tab text on accent", "--on-accent", "--accent-bg"),):
            r = ratio(tok(fg), tok(bg))
            results.append((name, label, r, 4.5))
        # region number badge: white on region colour
        results.append((name, "region number badge (--on-region on --region)", ratio(tok("--on-region"), tok("--region")), 4.5))
        # accent button fill vs the surface it sits on (non-text, button also has a label)
        for s in ("panel", "glass"):
            worst = min(ratio(tok("--accent-bg"), bg) for bg in surfaces[s])
            results.append((name, f"selected-tab / primary fill on {s} (non-text)", worst, 3.0))
        for label, fgk, sname, need in pairs:
            worst = min(ratio(tok(fgk), bg) for bg in surfaces[sname])
            results.append((name, label, worst, need))

    cur = None
    for name, label, r, need in results:
        if name != cur:
            print(f"\n== {name} ==")
            cur = name
        ok = r >= need
        if not ok:
            fails += 1
        print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f}:1  (need {need}:1)  {label}")
    total = len(results)
    print(f"\n{total - fails}/{total} pairs pass" + ("  ->  ALL TOKEN PAIRS PASS" if not fails else f"  ->  {fails} FAILURES"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

"""Generate synthetic, fictional "Demo ERP" screenshot pairs for the CV pipeline tests.
Usage (repo root): python3 tools/cv-test/gen_synthetic.py
Writes tools/cv-test/fixtures/*.png and tools/cv-test/fixtures/manifest.json (same format as
samples/manifest.json, plus optional "settings" and "expectAlign"). All data is invented.
"""
import json, os
import cv2 as cv
import numpy as np

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
W, H = 1366, 900
F = cv.FONT_HERSHEY_SIMPLEX
INK = (40, 40, 40)


def page(label_dept="Dept ID", pay_grade=True, stamp="Last updated 2026-11-02 09:14", link=(204, 102, 0)):
    """BGR image of a fictional job-data style page."""
    im = np.full((H, W, 3), 255, np.uint8)
    cv.rectangle(im, (0, 0), (W, 48), (90, 90, 90), -1)
    cv.putText(im, "Demo ERP (fictional)", (16, 32), F, 0.8, (255, 255, 255), 2, cv.LINE_AA)
    cv.putText(im, "Home > Workforce > Job Data", (16, 76), F, 0.5, link, 1, cv.LINE_AA)
    for i, t in enumerate(["Work Location", "Job Information", "Payroll", "Salary Plan"]):
        x = 16 + i * 170
        cv.rectangle(im, (x, 92), (x + 160, 120), (225, 225, 225) if i else (250, 250, 250), -1)
        cv.rectangle(im, (x, 92), (x + 160, 120), (150, 150, 150), 1)
        cv.putText(im, t, (x + 10, 112), F, 0.45, INK, 1, cv.LINE_AA)
    rows = [("Empl ID", "000123"), (label_dept, "4410"), ("Position", "00078"), ("Job Code", "TST-01")]
    if pay_grade:
        rows.append(("Pay Grade", "14"))
    rows.append(("Location", "Sample City"))
    y = 160
    for k, v in rows:
        cv.putText(im, k + ":", (40, y + 18), F, 0.5, INK, 1, cv.LINE_AA)
        cv.rectangle(im, (200, y), (420, y + 26), (120, 120, 120), 1)
        cv.putText(im, v, (208, y + 18), F, 0.5, INK, 1, cv.LINE_AA)
        y += 40
    # grid
    gx, gy = 40, 470
    cols = [0, 140, 340, 520, 700, 860]
    for r in range(7):
        cv.line(im, (gx, gy + r * 30), (gx + 860, gy + r * 30), (170, 170, 170), 1)
    for c in cols:
        cv.line(im, (gx + c, gy), (gx + c, gy + 180), (170, 170, 170), 1)
    heads = ["Date", "Earn Code", "Hours", "Rate", "Amount"]
    for i, t in enumerate(heads):
        cv.putText(im, t, (gx + cols[i] + 8, gy + 20), F, 0.45, INK, 1, cv.LINE_AA)
    for r in range(1, 6):
        vals = ["11/%02d/2026" % (r + 2), "REG", "8.00", "25.00", "200.00"]
        for i, t in enumerate(vals):
            cv.putText(im, t, (gx + cols[i] + 8, gy + r * 30 + 20), F, 0.45, INK, 1, cv.LINE_AA)
    # buttons + stamp
    for i, t in enumerate(["Save", "Return to Search", "Notify"]):
        x = 40 + i * 190
        cv.rectangle(im, (x, 700), (x + 170, 732), (235, 235, 235), -1)
        cv.rectangle(im, (x, 700), (x + 170, 732), (110, 110, 110), 1)
        cv.putText(im, t, (x + 14, 722), F, 0.5, INK, 1, cv.LINE_AA)
    cv.putText(im, stamp, (980, 860), F, 0.45, (110, 110, 110), 1, cv.LINE_AA)
    cv.putText(im, "Fictional data for testing only", (40, 860), F, 0.45, (110, 110, 110), 1, cv.LINE_AA)
    return im


def shift(im, dx, dy):
    M = np.float64([[1, 0, dx], [0, 1, dy]])
    return cv.warpAffine(im, M, (im.shape[1], im.shape[0]), flags=cv.INTER_NEAREST,
                         borderMode=cv.BORDER_CONSTANT, borderValue=(255, 255, 255))


def main():
    os.makedirs(OUT, exist_ok=True)
    base = page()
    pairs = []

    def add(name, before, after, status, minRegions, maxRegions=None, zones=None, settings=None, align=None, note=""):
        b, a = f"tools/cv-test/fixtures/{name}_before.png", f"tools/cv-test/fixtures/{name}_after.png"
        cv.imwrite(os.path.join(OUT, f"{name}_before.png"), before)
        cv.imwrite(os.path.join(OUT, f"{name}_after.png"), after)
        e = {"status": status, "minRegions": minRegions}
        if maxRegions is not None:
            e["maxRegions"] = maxRegions
        p = {"page": name, "module": "Synthetic", "before": b, "after": a, "expected": e,
             "ignoreZones": zones or [], "note": note}
        if settings:
            p["settings"] = settings
        if align:
            p["expectAlign"] = align
        pairs.append(p)

    add("syn-identical", base, base.copy(), "PASS", 0, 0, align="none", note="no change")
    add("syn-two-changes", base, page(label_dept="Department", pay_grade=False), "FAIL", 2,
        note="label text change + Pay Grade row removed (reflow below)")
    add("syn-shift-3", base, shift(base, 0, 3), "PASS", 0, 0, align="translate", note="whole page +3 px down")
    add("syn-shift-xy", base, shift(base, -5, 7), "PASS", 0, 0, align="translate", note="dx -5, dy +7")
    ts = page(stamp="Last updated 2026-11-21 16:52")
    add("syn-timestamp", base, ts, "FAIL", 1, note="only the timestamp changes")
    add("syn-timestamp-zone", base, ts, "PASS", 0, 0,
        zones=[{"x": 970, "y": 840, "w": 380, "h": 30, "label": "Last updated"}], note="same with an ignore zone")
    green = page(link=(40, 130, 40))   # BGR green vs BGR (204,102,0) blue-ish: different hue
    red_b = page(link=(40, 40, 200))   # red link
    add("syn-link-colour", red_b, green, "FAIL", 1, note="red -> green link, near-equal luminance")
    add("syn-link-colour-gray", red_b, green, "PASS", 0, 0, settings={"diffMode": "gray"},
        note="control: the gray diff (skill default) misses an equal-luminance colour change")
    big = cv.resize(base, (round(W * 1.1), round(H * 1.1)), interpolation=cv.INTER_LINEAR)
    add("syn-scale-110", base, big, "PASS", 0, align="resize", note="capture at 1.1x device scale")
    zoom = cv.warpAffine(base, np.float64([[1.05, 0, 0], [0, 1.05, 0]]), (W, H), flags=cv.INTER_LINEAR,
                         borderMode=cv.BORDER_CONSTANT, borderValue=(255, 255, 255))
    add("syn-zoom-105-same-size", base, zoom, "PASS", 0, align="homography",
        note="content scaled 1.05 inside the same viewport (bitmap zoom)")
    taller = np.vstack([np.full((3, W, 3), 255, np.uint8), base])
    add("syn-taller-3", base, taller, "PASS", 0, 0, align="translate", note="candidate 3 px taller (extra top margin)")
    rng = np.random.default_rng(7)
    noise = rng.integers(0, 256, (H, W, 3), dtype=np.uint8)
    noise = cv.GaussianBlur(noise, (0, 0), 3)
    add("syn-unrelated", base, noise, "FAIL", 1, note="unrelated image: homography must be rejected, no crash")

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(pairs, f, indent=1)
    print(f"wrote {len(pairs)} pairs to {OUT}")


if __name__ == "__main__":
    main()

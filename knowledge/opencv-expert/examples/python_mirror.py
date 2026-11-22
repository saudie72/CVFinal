"""Python mirror of opencvjs-examples.js.

OpenCV.js and Python OpenCV wrap the same C++ functions, so this script checks
the algorithm and parameter choices of the three JS examples with identical
inputs and assertions. Run:  python3 python_mirror.py
"""
import math
import cv2 as cv
import numpy as np


def example1_diff_regions():
    W, H = 200, 120
    base = np.full((H, W, 4), 255, np.uint8)
    cand = base.copy()
    cv.rectangle(cand, (40, 30), (90, 50), (30, 30, 30, 255), -1)
    cv.rectangle(cand, (130, 80), (170, 95), (30, 30, 30, 255), -1)
    ga = cv.GaussianBlur(cv.cvtColor(base, cv.COLOR_RGBA2GRAY), (3, 3), 0)
    gb = cv.GaussianBlur(cv.cvtColor(cand, cv.COLOR_RGBA2GRAY), (3, 3), 0)
    diff = cv.absdiff(ga, gb)
    _, binm = cv.threshold(diff, 25, 255, cv.THRESH_BINARY)
    binm = cv.dilate(binm, cv.getStructuringElement(cv.MORPH_RECT, (5, 5)), iterations=1)
    contours, _ = cv.findContours(binm, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    regions = sorted([cv.boundingRect(c) for c in contours if cv.boundingRect(c)[2] * cv.boundingRect(c)[3] >= 64])
    pct = 100 * cv.countNonZero(binm) / (W * H)
    ok = len(regions) == 2 and abs(regions[0][0] - 40) <= 4 and abs(regions[1][0] - 130) <= 4 and pct > 0
    return dict(example="diffRegions", ok=ok, regions=regions, changedPct=round(pct, 2))


def example2_shapes():
    W, H = 220, 140
    gray = np.full((H, W), 235, np.uint8)
    cv.rectangle(gray, (20, 30), (79, 69), 40, -1)
    cv.circle(gray, (160, 70), 25, 40, -1)
    binm = cv.adaptiveThreshold(gray, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 10)
    edges = cv.Canny(gray, 50, 150, apertureSize=3, L2gradient=False)
    _, solid = cv.threshold(gray, 128, 255, cv.THRESH_BINARY_INV)
    contours, _ = cv.findContours(solid, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    shapes = []
    for c in contours:
        m = cv.moments(c)
        shapes.append(dict(area=round(cv.contourArea(c)), perimeter=round(cv.arcLength(c, True)),
                           cx=round(m["m10"] / m["m00"]), cy=round(m["m01"] / m["m00"])))
    shapes.sort(key=lambda s: s["cx"])
    ok = (len(contours) == 2 and cv.countNonZero(edges) > 200 and cv.countNonZero(binm) > 3000
          and abs(shapes[0]["area"] - 59 * 39) < 60 and abs(shapes[1]["area"] - math.pi * 25 * 25) < 120)
    return dict(example="shapes", ok=ok, contours=len(contours), edgePixels=int(cv.countNonZero(edges)), shapes=shapes)


def example3_alignment():
    W, H = 200, 150
    base = np.full((H, W), 255, np.uint8)
    cv.rectangle(base, (30, 20), (170, 40), 60, -1)
    cv.rectangle(base, (30, 60), (100, 120), 120, -1)
    cv.circle(base, (140, 95), 18, 0, -1)
    cand = cv.warpAffine(base, np.float64([[1, 0, 0], [0, 1, 3]]), (W, H), flags=cv.INTER_LINEAR,
                         borderMode=cv.BORDER_CONSTANT, borderValue=255)
    x0, y0, tw, th = 20, 15, 160, 115
    res = cv.matchTemplate(cand, base[y0:y0 + th, x0:x0 + tw], cv.TM_CCOEFF_NORMED)
    _, maxv, _, maxloc = cv.minMaxLoc(res)
    dx, dy = maxloc[0] - x0, maxloc[1] - y0
    aligned = cv.warpAffine(cand, np.float64([[1, 0, -dx], [0, 1, -dy]]), (W, H), flags=cv.INTER_LINEAR,
                            borderMode=cv.BORDER_CONSTANT, borderValue=255)
    residual = cv.countNonZero(cv.absdiff(base, aligned)[: H - 4, :])
    P = cv.getPerspectiveTransform(np.float32([[0, 0], [100, 0], [100, 100], [0, 100]]),
                                   np.float32([[10, 10], [110, 10], [110, 110], [10, 110]]))
    ok = dx == 0 and dy == 3 and maxv > 0.99 and residual == 0 and abs(P[0, 2] - 10) < 1e-6 and abs(P[1, 2] - 10) < 1e-6
    return dict(example="alignment", ok=ok, dx=dx, dy=dy, score=round(maxv, 4), residual=int(residual))


if __name__ == "__main__":
    results = [example1_diff_regions(), example2_shapes(), example3_alignment()]
    for r in results:
        print(r)
    assert all(r["ok"] for r in results), "an example failed"
    print("ALL OK  (cv2", cv.__version__ + ")")

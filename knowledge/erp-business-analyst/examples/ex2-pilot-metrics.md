# Example 2: pilot measurement sheet (estimate vs. measured)

| Metric | How measured | Estimate (business case) | Pilot result |
|---|---|---|---|
| Comparisons per cycle | Count of in-scope pages | 200 | _measure_ |
| Minutes per comparison, manual | Stopwatch sample of 20 pages | 3.0 | _measure_ |
| Minutes per comparison, inspector | App records compare `ms` + review time | 1.0 | _measure_ |
| Analyst hours saved per cycle | (manual − inspector) × pages ÷ 60 | ≈ 6.7 | _calculate_ |
| True regressions caught | Regions marked "Regression" and confirmed by a defect | — | _count_ |
| Missed regressions | Found later in UAT/prod but the page was PASS | 0 target | _count_ |
| False positives | Regions marked "Noise" | — | _count_ |
| One-time setup | Minutes spent on ignore zones/thresholds per page | — | _measure_ |

**Decision rule:** adopt if hours saved − setup time > 0 over two cycles, and missed regressions are no worse than manual review.

Worked arithmetic (estimate): 200 × 3 = 600 min = 10.0 h; 200 × 1 = 200 min ≈ 3.3 h; saving ≈ 6.7 h per cycle.

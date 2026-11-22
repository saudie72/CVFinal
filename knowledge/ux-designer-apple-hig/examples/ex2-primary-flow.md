# Example 2: primary flow and copy

```
Library ──► Page (HCM – Job Data) ──► Baseline ──► Candidate ──► Compare ──► Review ──► Save run ──► History
   ▲            │ new page: name + module                                   │ regions: Expected / Regression / Noise
   └────────────┴──────────── "Promote to new baseline" after sign-off ◄─────┘
```

## Copy: good vs. bad (HIG: be specific, avoid vague words)
| Bad | Good |
|---|---|
| "Loading…" | "Loading OpenCV (10 MB, first visit only)…" |
| "Error" | "These screenshots are very different sizes (1366×900 vs 800×600). Capture both at 100% zoom." |
| "contours: 3" | "3 changed regions" |
| "Are you sure?" | "Delete all baselines, ignore zones and runs on this device? This can't be undone." |
| "Success!" toast after every save | Nothing; the run simply appears in History (expected result) |

## Progressive disclosure
The defaults work for 90% of pages. **Advanced** (collapsed) holds the sensitivity (threshold T), the minimum region size, the morphology kernel and the alignment method override.

# Business-case reference notes

**Sources:** project business case: [docs/business-case.md](../../../docs/business-case.md) · Oracle PeopleSoft Test Framework (benefit statement): https://docs.oracle.com/cd/F44947_01/pt858pbr3/eng/pt/tptf/task_UnderstandingPeopleSoftTestFramework-ea7fd7.html · PUM image cadence (cumulative, periodic): https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tswu/PeopleSoftUpdateManager.html · Prior art (Playwright visual comparisons): https://playwright.dev/docs/test-snapshots

## Facts to anchor the case
- PeopleSoft Update Images are **cumulative and released periodically, one per product family** (e.g., HCM, FSCM). Update and testing cycles recur, which is the basis of the recurring-saving argument.
- Oracle positions PTF as automating **functional** testing so testers "execute more tests with greater accuracy during a shorter time". The inspector targets the **visual** part, which PTF doesn't address. That's the gap.
- Visual-regression testing is an established practice in web development (Playwright `toHaveScreenshot`, BackstopJS). The new parts here are **analyst-friendly, screenshot-only input** and **in-browser privacy**.

## Positioning (word for word)
"A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing."

## Numbers are estimates
The 200 × 3 min → 1 min figure (≈ 6.7 h saved per cycle) is a **pilot estimate**. Label it so wherever it appears.

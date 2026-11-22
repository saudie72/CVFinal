---
name: erp-business-case-metrics
description: "Tie features to the business case: user stories, acceptance criteria, pilot metrics and supplemental-tool positioning. Use when defining requirements, prioritising features or writing showcase material."
user-invocable: false
---
# Business case and metrics

Source of truth: `docs/business-case.md`.

## Outputs (docs/erp/user-stories.md)
- User stories: *"As a functional analyst testing a PUM update, I want to compare a page against its stored baseline so that I spot unintended UI changes in seconds."*
- Given/When/Then acceptance criteria for each story.
- MoSCoW priority. **Must**: compare, regions, PASS/FAIL, ignore zones, baselines per page, history, evidence fields, reset, offline.

## Pilot metrics to support in the app
- Time per comparison: the app records `ms` and the review duration.
- True regressions caught and false positives: the reviewer marks each region "Expected change", "Regression" or "Noise".
- Setup cost: the number of ignore zones and the time spent per page.

## Positioning (use the same wording everywhere)
"A supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing." The 3 min → 1 min figure is an **estimate** until a pilot measures it.

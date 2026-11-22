# Business Case — ERP Visual Regression Inspector

> CAI 2840 Computer Vision final project. A 100% in-browser tool (OpenCV.js + WebAssembly + IndexedDB, static site on Netlify) that compares "before" and "after" screenshots of ERP pages and highlights visual differences.

## Business need

ERP upgrades, customizations and configuration changes need a lot of testing to make sure existing functionality still works. At Miami-Dade County, the INFORMS environment runs PeopleSoft HCM and FSCM. Changes there include PUM updates, PeopleTools upgrades, customizations and configuration changes, and they can affect many departments, Constitutional Offices and business processes.

Part of that testing is checking pages by eye, to confirm that fields, buttons and layouts did not change unexpectedly. Today this is mostly manual, which causes several problems:

- Comparing screenshots by hand is slow.
- Small visual changes get missed.
- A change that affects one Business Unit may not be noticed while testing another.
- Test evidence varies from one analyst to the next.
- An unintended change found late in testing can delay the go-live.

## Proposed solution

An **ERP Visual Regression Inspector** that uses computer vision to compare application screenshots automatically. It highlights the differences and produces supporting documentation for testing. Automating the visual-comparison part of testing leaves analysts free to focus on whether the application **functions** correctly.

## Positioning

This is a **supplemental quality assurance tool**. It does not replace functional testing or security testing. For a tested role, it can flag fields or buttons that appear or disappear, but it **does not prove that authorization is correct**.

## Use cases

| Scenario | How the inspector helps | Business benefit |
|---|---|---|
| PUM updates | Compares pages before and after the updates are applied | Finds unexpected interface changes earlier |
| PeopleTools upgrades | Highlights missing buttons, moved fields and changed layouts | Less manual visual checking |
| Customizations | Compares customized pages before and after a code deployment | Finds unintended UI changes |
| Constitutional Office / Business Unit configurations | Compares screenshots from controlled test scenarios for different Business Units | Finds visible configuration differences |
| Security testing support | Flags fields or buttons that appear or disappear for a tested role | Supports security validation, but does not prove authorization |
| UAT testing | Provides before-and-after images as supporting evidence | Better documentation and traceability |
| Production incident analysis | Compares current screens with stored baselines | Helps pin down when a visible change happened |

## Worked example — Time & Labor Timesheet

A PeopleTools upgrade is applied to the INFORMS **test** environment. Before the upgrade, an analyst captures the Timesheet page. After the upgrade, the analyst captures the same page with the same test employee and the same display settings.

After the upgrade, **the Submit button has moved below the time-reporting grid, and the Reported Hours column is cut off.** Without the tool, the analyst has to spot both of these by eye. With the tool, both changed areas are highlighted right away. That makes the biggest difference when dozens or hundreds of pages need testing.

The mock demo pages in this repo reproduce this exact scenario (see `docs/10-mock-erp-demo-plan.md`).

## How the County benefits

- **Less testing effort:** analysts spend less time comparing screenshots and more time investigating the differences that matter.
- **Better quality control:** unintended visual changes are caught before they reach production.
- **Standardized evidence:** every tester documents visual differences the same way, which supports QA and audit reviews.
- **Better use of staff:** junior analysts do the first-pass comparisons, so senior analysts and technical staff can focus on complex testing and fixing defects.

## Measuring value

> **These numbers are assumptions for a pilot, not measured data.**

Example: an upgrade that needs 200 screenshot comparisons.

| Measurement | Manual process | With inspector (estimate) |
|---|---|---|
| Screenshots compared | 200 | 200 |
| Average comparison time | 3 minutes | 1 minute |
| Total analyst effort | 10 hours | ≈ 3.3 hours |
| Time saved | — | ≈ 6.7 hours per upgrade cycle |

### How a pilot would measure the real numbers

1. **Baseline:** time a sample of manual comparisons (minutes per page) during the next PUM or PeopleTools cycle.
2. **Pilot:** compare the same set of pages with the inspector, and record the time per comparison, including time spent reviewing flagged regions.
3. **Effectiveness:** count true regressions caught, regressions missed (found later in testing or production), and false positives (flags that turned out to be harmless noise).
4. **Tuning cost:** track the time spent setting up ignore zones and thresholds for each page. This is a one-time cost per page that pays off in later cycles.
5. **Analyst feedback:** a short survey on usability, trust in the results, and the quality of the evidence.
6. **Decision:** adopt the tool if the time saved minus the setup time is positive, and the miss rate is no worse than manual review.

## Data rules

- The public repo and the live demo use **only a fictional mock ERP with fake data**. There are no real County screenshots, no employee data, and no Oracle or County logos.
- Real use would happen in a **test environment, with department approval**. Because every comparison runs inside the browser, screenshots that contain PII never leave the analyst's machine.

## Summary

- **Business need:** visual verification of ERP pages after changes is manual, slow and error-prone.
- **Proposed solution:** an in-browser computer vision inspector that compares screenshots, highlights differences and records evidence.
- **Expected benefits:** less manual comparison effort, earlier detection of unintended interface changes, standardized test evidence, and more analyst time for functional validation.

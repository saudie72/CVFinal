# QA worked examples

| # | File | Shows | Verified (2026-11-22) |
|---|---|---|---|
| 1 | `ex1_qa_smoke.py` | Automated smoke test in headless Chrome: no console or page errors; **zero page requests after load** while the page does work; still works **offline** | ✅ after the fix: `requestsAfterLoad: []`, offline works, 0 errors. ❌ on the first run, it caught a real `/favicon.ico` 404 |
| 2 | `ex2-defect-report.md` | A complete defect report for that real finding: repro, expected vs actual, owner, fix, retest | — |
| 3 | `ex3-test-plan-checklist.md` | The release checklist mapped to the definition of done and the rubric | — |

Run: `python3 knowledge/qa-tester/examples/ex1_qa_smoke.py [page]`. Point it at `index.html` once the app exists.

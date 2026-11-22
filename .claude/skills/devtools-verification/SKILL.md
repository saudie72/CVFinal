---
name: devtools-verification
description: "Verify the rubric in Chrome DevTools: IndexedDB contents and reset, no network after load, worker-thread work, and cv.Mat leak checks. Use when testing, demoing or debugging the deployed app."
user-invocable: false
---
# DevTools verification

Reference: `docs/09-chrome-devtools-testing.md`.

| Check | Where | Pass when |
|---|---|---|
| Data persists | Application → IndexedDB → erpinspector (click Refresh) | New page and run rows exist after a page reload |
| Reset works | Click Reset app data → Application | DB is gone or empty, and the app reloads cleanly |
| No data leaves | Network, cleared after load, run 3 comparisons | Zero requests; also works with Offline throttling |
| UI stays responsive | Performance recording | Heavy work on the worker thread; no main-thread long tasks > 50 ms during compare |
| No leaks | Performance monitor / worker `heap` messages, 20 runs | Memory plateaus |
| No errors | Console | No red errors on load, compare or reset |

Record the results in the QA report with screenshots of each panel (from the fictional demo only).

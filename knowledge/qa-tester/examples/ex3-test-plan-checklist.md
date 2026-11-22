# Example 3: release test plan (what "done" is checked against)

| # | Check | How | Pass when | Rubric |
|---|---|---|---|---|
| 1 | Loads cleanly | Open the Netlify URL; Console | Status pill shows "Ready"; 0 errors | Live app |
| 2 | Every sample pair | Load each pair in `samples/manifest.json` | Status == `expected.status`; regions ≥ `minRegions` | OpenCV.js |
| 3 | Ignore zone | PO pair → add zone over "Last updated" → rerun | FAIL → PASS | OpenCV.js |
| 4 | Alignment | Shifted pair | PASS; report shows "translate (0, 3)" | OpenCV.js |
| 5 | Persistence | Create page + run → reload | Both present; DevTools → IndexedDB → `erpinspector` shows rows (click Refresh) | IndexedDB |
| 6 | Reset app data | Click Reset → reload | DB gone or empty; samples still load | IndexedDB |
| 7 | No data leaves | `ex1_qa_smoke.py` against the app, or Network panel filtered to the origin | 0 requests after load; works with Offline | WebAssembly / privacy |
| 8 | Responsive UI | Performance recording during compare | Heavy work on the worker thread; no main-thread long task > 50 ms | WebAssembly |
| 9 | No Mat leak | 20 compares; watch the worker's `heap` messages | Heap plateaus | OpenCV.js / WebAssembly |
| 10 | Accessibility | Keyboard-only run; Lighthouse | Every action reachable; score ≥ 90 | Live app |
| 11 | Privacy audit | Greps from skill `privacy-no-real-data` | No real County data, logos or third-party scripts | Agent team |

**Sources for the methods:** Chrome DevTools IndexedDB: https://developer.chrome.com/docs/devtools/storage/indexeddb · Network panel: https://developer.chrome.com/docs/devtools/network · Performance panel: https://developer.chrome.com/docs/devtools/performance · Memory: https://developer.chrome.com/docs/devtools/memory-problems · Lighthouse: https://developer.chrome.com/docs/lighthouse/overview

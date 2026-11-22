# Example 2: a good defect report (a real one, from running example 1)

| Field | Value |
|---|---|
| ID | QA-001 |
| Severity | minor (it fails the "no console errors" check, but the user sees no impact) |
| Area / owner | frontend-engineer |
| Environment | Headless Chrome 153, local `http.server`, 2026-11-22 |
| Steps | 1. Run `python3 knowledge/qa-tester/examples/ex1_qa_smoke.py` against `ex1-region-list-and-boxes.html` |
| Expected | No console errors on load |
| Actual | `Failed to load resource: the server responded with a status of 404 (File not found)`, from the browser's automatic `GET /favicon.ico` |
| Evidence | The smoke test's JSON output (`consoleErrors` contains 1 entry) |
| Suggested fix | Add `<link rel="icon" href="data:,">` (no request), or ship a real `favicon.ico` |
| Status | **Fixed and retested**: after the change, the smoke test reports `ok: true`, `loadRequests: 1`, `consoleErrors: []` |

**What makes it good:** you can reproduce it with one command; it states expected vs actual; it names an owner; the evidence is attached; the fix is specific; it was retested before closing.

**Note for the privacy check:** while the browser ran, the environment's proxy log showed Chrome itself trying to reach `accounts.google.com`. That is **browser background traffic, not the page**. The test listens to `page.on('request')`, which only sees the page's own requests (0 after load). In a manual DevTools check, filter the Network panel to the app's origin.

# IndexedDB worked examples

Shared helper: `idb.js` (promise wrappers with the same shape as the planned `js/db.js`). Run with `python3 tools/verify-knowledge/run_browser_examples.py` (headless Chrome, a fresh profile per example).

| # | File | Shows | Verified result (Chrome 153, 2026-11-22) |
|---|---|---|---|
| 1 | `ex1-open-upgrade-crud.html` | v1 schema in `onupgradeneeded` (pages + runs, unique and non-unique indexes) → atomic readwrite → duplicate name → index reads → **v1 → v2 migration** that keeps the data | ✅ ids 1,2 · `ConstraintError` · 2 timesheet runs · 2 FAILs · stores pages,runs,settings · 2 pages kept · version 2 |
| 2 | `ex2-blobs-quota.html` | A canvas PNG **Blob** stored in a page record, read back and decoded; `navigator.storage.estimate()` | ✅ image/png Blob in and out · pixel [10,132,255,255] · quota 2048 MB |
| 3 | `ex3-version-blocked-reset.html` | An "old tab" blocks the upgrade → `onblocked` → close → upgrade → **Reset app data** with `deleteDatabase` | ✅ `blocked → old connection closed → upgradeneeded → v2 open`, and the DB no longer exists |

## Bugs the runs caught (fixed, and documented in docs/)
1. The transaction `onerror` rejected with `t.error`, which was **`null`**. The request's error is on `event.target.error` (docs/03).
2. Migration blocks guarded only by `oldVersion < N` ran the v2 block while opening v1. The fix is the `newVersion >= N` guard (docs/01).

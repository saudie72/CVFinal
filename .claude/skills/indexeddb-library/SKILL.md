---
name: indexeddb-library
description: "Implement and use the erpinspector IndexedDB database (pages, ignoreZones, runs, settings) with versioned upgrades, Blobs and promise transactions. Use when reading or writing any persisted data."
user-invocable: false
---
# IndexedDB library

Reference: `docs/08-indexeddb.md`.

## Schema (`erpinspector`, version 1)
| Store | key | indexes | value |
|---|---|---|---|
| pages | id (auto) | name (unique), module | {name, module, notes, baseline: Blob, width, height, thresholdPct, createdAt, updatedAt} |
| ignoreZones | id (auto) | pageId | {pageId, x, y, w, h, label} |
| runs | id (auto) | pageId, createdAt, status | {pageId, candidate: Blob, result: Blob, regions, changedPct, ssim, status, alignment, settings, evidence:{testCaseId, ticketId, toolsVersion, businessUnit, role, tester}, note, createdAt} |
| settings | key | — | {key, value} |

## API (js/db.js), all Promise-based
`openDB()`, `pages.{list,get,put,remove}`, `zones.{forPage,put,remove}`, `runs.{forPage,add,get,remove}`, `settings.{get,set}`, `storageEstimate()`, `resetAppData()`.

## Rules
- Migrations: `if (e.oldVersion < N)` blocks. Never edit an old block.
- `onblocked` → status "Close other tabs of this app, then reload". `db.onversionchange` → `db.close(); location.reload()`.
- Store images as Blobs (`canvas.toBlob('image/png')`), never base64.
- Don't await unrelated work inside a transaction.
- Catch `ConstraintError` on duplicate page names and show a friendly message.
- Call `navigator.storage.persist()` once after the first baseline is saved.

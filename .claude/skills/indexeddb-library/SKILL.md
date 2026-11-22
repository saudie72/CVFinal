---
name: indexeddb-library
description: "Implement and use the erpinspector IndexedDB database (pages, ignoreZones, runs, settings) with versioned upgrades, Blobs and promise transactions. Use when reading or writing any persisted data."
user-invocable: false
---
# IndexedDB library

References: `docs/db-notes.md` (as built, Ledger), `docs/08-indexeddb.md`, `docs/erp/evidence-standard.md`.

## Schema (`erpinspector`, version 1)
| Store | key | indexes | value |
|---|---|---|---|
| pages | id (auto) | name (unique), module | {name, module, notes, baseline: Blob, width, height, thresholdPct, createdAt, updatedAt} |
| ignoreZones | id (auto) | pageId | {pageId, x, y, w, h, label} |
| runs | id (auto) | pageId, createdAt, status | {pageId, candidate: Blob, result: Blob, regions[], changedPct, ssim, status, alignment, settings, evidence, signOff, ms, reviewMs, note, createdAt} |
| settings | key | — | {key, value} |

## API (js/db.js), all Promise-based
`openDB({onBlocked,onVersionChange})`, `setHandlers()`, `pages.{list,get,put,remove}`, `zones.{forPage,put,remove}`, `runs.{forPage,add,get,update,remove}`, `settings.{get,set}`, `storageEstimate()`, `resetAppData()`.

## Run record fields (all inside v1; stores are schemaless, no version bump)
- `evidence`: always the six fields `testCaseId, ticketId, toolsVersion, businessUnit, role, tester` (missing become `''`), plus optional extras `environment`, `note`, `expectedDifference` stored only when given. Which are required is a UI rule, not a DB rule.
- `regions[].decision`: `'Expected' | 'Regression' | 'Noise' | null` (anything else becomes `null`); `regions[].note`: free text, default `''`. (Not "Ignore": Atlas resolved this in favour of `Noise`.)
- `signOff`: `{signedOff, reviewer, signedOffAt, baselinePromoted}`, default `{false, '', null, false}`. `ms` (compare time) and `reviewMs` (review duration): number or `null`.
- `runs.update(id, patch)`: one read-modify-write transaction; `evidence` and `signOff` merge field by field, `regions` is replaced, `id/pageId/createdAt` can't change; a missing run rejects with `NotFoundError`; returns the updated record.
- Settings keys in use: `persistRequested`, `engineSeen`, `lastEvidence`.

## Rules
- Migrations: `if (e.oldVersion < N && e.newVersion >= N)` blocks. Never edit an old block.
- `onblocked` → message "Close other tabs of this app, then reload.". `db.onversionchange` → close the connection and let the app reload.
- Store images as Blobs (`canvas.toBlob('image/png')`), never base64.
- Don't await unrelated work inside a transaction.
- In the transaction `onerror`, reject with `event.target.error`, because `tx.error` can still be `null` then (verified; see knowledge/indexeddb-expert/docs/03-transactions.md).
- Catch `ConstraintError` on duplicate page names and show a friendly message.
- Call `navigator.storage.persist()` once after the first baseline is saved (`pages.put` does it and stores the answer under `persistRequested`).
- **`resetAppData()` resolves `{blocked}` and has no UI inside.** No `confirm()`, no reload: it closes our connection, calls `deleteDatabase`, removes only localStorage keys starting `erpinspector:`, and leaves no connection open (the next call lazily recreates an empty v1). If another tab holds the DB it calls `onBlocked('Close other tabs of this app to finish the reset.')` and waits. The app asks for confirmation first and reloads afterwards (`reset-app-data` skill).
- `db.js` never reloads: on `versionchange` it closes and calls `onVersionChange({oldVersion,newVersion,deleting,message})`; the app decides. Migration blocks need `oldVersion < N && newVersion >= N`.

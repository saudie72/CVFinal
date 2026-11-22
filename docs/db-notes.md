# db-notes: the on-device library (`js/db.js`)

Owner: Ledger. Task A-IDB. Module: `js/db.js` (the only file that touches `indexedDB`). Tests: `tools/db-test/`. Fictional data only.

## Schema: database `erpinspector`, version 1 (`DB_NAME`, `DB_VERSION`)
| Store | key | indexes | value |
|---|---|---|---|
| pages | id (auto) | `name` (unique), `module` | name, module, notes, baseline Blob, width, height, thresholdPct, createdAt, updatedAt |
| ignoreZones | id (auto) | `pageId` | pageId, x, y, w, h, label (baseline pixels) |
| runs | id (auto) | `pageId`, `createdAt`, `status` | pageId, candidate Blob, result Blob, regions[], changedPct, ssim, status, alignment, settings, evidence, signOff, ms, reviewMs, note, createdAt |
| settings | key | none | {key, value} |

Run record details (from `uat-evidence-traceability` and Tess's `docs/erp/evidence-standard.md`, relayed by Atlas):
- `evidence`: always the six fields `testCaseId, ticketId, toolsVersion, businessUnit, role, tester` (missing ones become `''`). Optional extras `environment`, `note`, `expectedDifference` are stored only when given. Which fields are required is a UI rule, not a DB rule.
- `regions[].decision`: `'Expected' | 'Regression' | 'Noise' | null` (anything else becomes `null`).
- `signOff`: `{signedOff, reviewer, signedOffAt, baselinePromoted}`, default `{false, '', null, false}`.
- `ms` (compare time) and `reviewMs` (review duration): number or `null`.
- All of this is inside v1. Stores are schemaless, so no version bump.

## API (all Promise-based)
`openDB({onBlocked, onVersionChange})`, `setHandlers(...)`, `pages.{list,get,put,remove}`, `zones.{forPage,put,remove}`, `runs.{forPage,add,get,update,remove}`, `settings.{get,set}`, `storageEstimate()`, `resetAppData()`, plus `DB_NAME`, `DB_VERSION`, `LS_PREFIX`.
- `pages.put` returns the id, sets `createdAt`/`updatedAt`. A duplicate name rejects with an `Error` named `ConstraintError` ("A page with this name already exists."; the original is in `.cause`). After the first saved baseline it calls `navigator.storage.persist()` once (the answer is stored in settings key `persistRequested`).
- `pages.remove` deletes the page, its zones and its runs in one transaction.
- `runs.forPage` is newest first. `runs.update(id, patch)` is one read-modify-write transaction: `evidence` and `signOff` merge field by field, `regions` is replaced, `id/pageId/createdAt` cannot change; a missing run rejects with `NotFoundError`. Returns the updated record.
- `settings.get(key, fallback)` returns the fallback when the key is missing.
- `storageEstimate()` returns `{usage, quota, percent, persisted}` (nulls if unsupported).
- Transaction errors reject with `event.target.error` (`tx.error` can be `null` there; knowledge docs/03).

## Migration rule
Each version gets its own block in `upgrade()`: `if (oldVersion < N && newVersion >= N) { ... }`. Never edit an old block, and bump `DB_VERSION` with the new block. The `newVersion >= N` guard is the verified lesson (knowledge example 1: without it the v2 block ran while opening v1).

## Blocked and versionchange behaviour
- A tab that holds a connection gets `versionchange` when another tab upgrades or deletes the DB. `db.js` closes the connection, forgets it and calls `onVersionChange({oldVersion, newVersion, deleting, message})`. The app decides whether to reload (the module never reloads).
- The tab that asks for the upgrade gets `blocked` if a connection stays open. `db.js` calls `onBlocked('Close other tabs of this app, then reload.')`. The upgrade waits and completes when the other tab closes.
- A page that is older than the stored version gets a friendly `VersionError` ("The library on this device is newer than this page. Reload ...").
- `resetAppData()` closes our connection, calls `deleteDatabase`, then removes only localStorage keys starting `erpinspector:`. If another tab refuses to close, `onBlocked('Close other tabs of this app to finish the reset.')` fires and the promise waits. The module has no `confirm()` and no reload: the app asks for confirmation first and reloads afterwards (a small change from the skill's sample, which mixed UI into the data module).

## DevTools check (rubric)
Application → IndexedDB → `erpinspector` (version 1) → click a store → Refresh (the view is not live). Create a page and a run in the app, reload, Refresh: rows are still there. Click **Reset app data**, then Refresh database: `erpinspector` is gone or comes back empty after the reload. Keys and values can't be edited in the panel (knowledge docs/06).

## Test results (`node tools/db-test/run.js`, Chromium via Playwright, server `python3 -m http.server 8103`)
30/30 checks passed, 2026-11-22 run. Covered: Blob round trips with decoded pixel checks for pages, runs (candidate and result); CRUD on all four stores; evidence shape, extras, decisions, signOff, `ms`/`reviewMs`, `runs.update` and `NotFoundError`; cascade delete; persist record; `storageEstimate`; persistence across reload; duplicate-name error; blocked upgrade between tabs (test-only raw v2 open, shipped `DB_VERSION` stays 1) both with a cooperative tab and with a tab that ignores `versionchange`; friendly `VersionError`; `resetAppData` with another tab open (that tab closes itself, `localStorage` cleaned selectively, empty v1 recreated) and blocked by a stubborn tab (message, waits, then completes).
Not tested: the `onBlocked` callback on the *open* path (needs a shipped v2; the same wiring is tested via reset), quota-exceeded behaviour, Safari/Firefox. In headless Chromium `persist()` returned `false`, so the granted case is unverified.

## Sources
knowledge/indexeddb-expert docs 01-06 and examples 1-3 (verified); docs/08-indexeddb.md; skills `indexeddb-library`, `reset-app-data`, `uat-evidence-traceability`.
MDN Using IndexedDB https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB · MDN `blocked` event https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/blocked_event · W3C IndexedDB https://www.w3.org/TR/IndexedDB/ · MDN Storage API https://developer.mozilla.org/en-US/docs/Web/API/Storage_API · Chrome DevTools IndexedDB https://developer.chrome.com/docs/devtools/storage/indexeddb

# Opening a database, versions, onupgradeneeded

**Source:** MDN Using IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

## From MDN
- `indexedDB.open(name, version)` returns an `IDBOpenDBRequest`. Nothing opens until its events fire, so handle `onsuccess` (`event.target.result` is the `IDBDatabase`) and `onerror`.
- The **version is an integer** that defines the schema. Non-integers are rounded (2.1 and 2.4 both become 2).
- A common error is **`VersionError`**, when the stored version is higher than the one requested (e.g., an old cached page). Always handle `onerror`.
- **`onupgradeneeded`** fires when the database is created or a higher version is requested. It is the **only** place where you can create or delete object stores and indexes. `onsuccess` fires after it finishes.
- Creating a store that already exists, or deleting one that doesn't, **throws** and aborts the upgrade.
- To change a store's `keyPath`, delete and recreate the store, which loses its data. Copy the data first.
- In private modes, data may live only in memory until the session ends.

## Migration pattern (verified by example 1)
```js
function upgrade(db, oldVersion, newVersion) {
  if (oldVersion < 1 && newVersion >= 1) { /* v1 stores + indexes */ }
  if (oldVersion < 2 && newVersion >= 2) { /* v2 additions only */ }
}
```
- Never edit an old block. Add a new block for every version bump.
- When the app always opens the **latest** version, `oldVersion < N` alone is enough. The `newVersion >= N` guard matters when the same function is used to open an older version (as in tests). Example 1 failed without it: the v2 block ran at v1, and the real v2 upgrade then threw "object store already exists".
- The data in existing stores survives the upgrade. Example 1 kept both pages after v1 → v2.

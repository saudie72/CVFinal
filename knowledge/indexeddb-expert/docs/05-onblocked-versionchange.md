# onblocked, onversionchange, deleteDatabase

**Sources:** MDN Using IndexedDB (version changes while another tab is open): https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB · MDN IDBOpenDBRequest `blocked` event: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/blocked_event · W3C IndexedDB 3.0: https://www.w3.org/TR/IndexedDB/

## From the docs
- The `blocked` event fires when an open connection is blocking a `versionchange` transaction on the same database. It can't be cancelled and doesn't bubble.
- Opening a higher version while other tabs keep connections open fires `onblocked` on the **new** request, and the upgrade **waits**.
- Existing connections should listen for **`onversionchange`**, close the database, and tell the user to reload (W3C). Otherwise the upgrade waits until those tabs close.

```js
req.onblocked = () => showStatus('Close other tabs of this app, then reload');
req.onsuccess = () => { const db = req.result;
  db.onversionchange = () => { db.close(); location.reload(); }; };
```

## Verified sequence (example 3, two connections in one page standing in for two tabs)
`blocked → old connection closed → upgradeneeded → v2 open`, then **Reset app data** (`db.close()` + `indexedDB.deleteDatabase(name)`) removed the database, and `indexedDB.databases()` no longer listed it.

## Reset app data rules
- Close **your own** connection before `deleteDatabase`, or it blocks itself.
- `deleteDatabase` can also fire `blocked` if other tabs are open. Tell the user to close them.
- Reload afterwards, so the app recreates an empty v1 database.

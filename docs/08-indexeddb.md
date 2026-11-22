# 08 — IndexedDB: Baselines, Runs and Settings on the Device

## Summary

IndexedDB is the browser's built-in transactional key-value database. It is asynchronous, versioned, supports indexes, and stores structured values **including `Blob`s** (images). It is the course's "memory" piece. The inspector uses it so that baselines, ignore zones and the full run history **survive a refresh and work offline**, without a server.

## Proposed schema — database `erpinspector`, version 1

| Object store | keyPath | Indexes | Holds |
|---|---|---|---|
| `pages` | `id` (auto) | `module` (HCM/FSCM/T&L), `name` (unique) | Page definition: name, module, notes, **baseline `Blob`**, width/height, threshold %, created/updated |
| `ignoreZones` | `id` (auto) | `pageId` | `{pageId, x, y, w, h, label}` in baseline pixels |
| `runs` | `id` (auto) | `pageId`, `createdAt`, `status` | Candidate `Blob`, result PNG `Blob`, regions[], changedPct, ssim, status PASS/FAIL, alignment info, tester note, ticket/patch ID |
| `settings` | `key` | — | Defaults: threshold T, kernel size, min area, blur, theme |

Large images go in as `Blob`s (from `canvas.toBlob('image/png')`), not base64 strings.

## Opening and upgrading

```js
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('erpinspector', 1);
    req.onupgradeneeded = e => {                       // only runs on create or version bump
      const db = req.result;
      if (e.oldVersion < 1) {
        const pages = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
        pages.createIndex('name', 'name', { unique: true });
        pages.createIndex('module', 'module');
        db.createObjectStore('ignoreZones', { keyPath: 'id', autoIncrement: true })
          .createIndex('pageId', 'pageId');
        const runs = db.createObjectStore('runs', { keyPath: 'id', autoIncrement: true });
        runs.createIndex('pageId', 'pageId'); runs.createIndex('createdAt', 'createdAt');
        runs.createIndex('status', 'status');
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      // if (e.oldVersion < 2) { ...future migrations... }
    };
    req.onblocked = () => showStatus('Close other tabs of this app, then reload');
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); location.reload(); };   // let other tabs upgrade
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}
```

- **Versioning:** to change the schema, bump the version number and add an `if (oldVersion < N)` block. Never edit the v1 block.
- **Blocked upgrades:** `blocked` fires when another open tab's connection is blocking the version change. Handling `versionchange` by closing the connection (or reloading) lets the new tab continue. This matches the course table row: *Stuck on "Opening library…" → close other tabs.*

## Transactions (promise wrapper)

```js
const tx = (db, stores, mode, fn) => new Promise((res, rej) => {
  const t = db.transaction(stores, mode);
  const out = fn(t);
  t.oncomplete = () => res(out?.result ?? out);
  t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
});
// usage
await tx(db, 'runs', 'readwrite', t => t.objectStore('runs').add(run));
const req = await tx(db, 'runs', 'readonly', t => t.objectStore('runs').index('pageId').getAll(pageId));
```

Don't `await` unrelated promises in the middle of a transaction, because the transaction auto-commits when it has no pending requests.

## Storage quota

`navigator.storage.estimate()` returns `{usage, quota}` for the origin. Show it on the Settings page ("Using 42 MB of 2 GB"). `navigator.storage.persist()` asks the browser not to evict data under storage pressure, which is worth requesting because baselines are valuable.

## "Reset app data"

```js
async function resetAppData() {
  db?.close();
  await new Promise((res, rej) => {
    const r = indexedDB.deleteDatabase('erpinspector');
    r.onsuccess = res; r.onerror = () => rej(r.error);
    r.onblocked = () => alert('Close other tabs of this app to finish the reset');
  });
  location.reload();
}
```

The button is required by the rubric, and the result is visible in DevTools → Application → IndexedDB (see 09).

## Gotchas

- Everything is async, so the UI must handle "Opening library…".
- Data is per **origin**: the Netlify URL and `localhost` have separate databases.
- A unique index (`name`) throws `ConstraintError` on duplicates. Catch it and show "A page with this name already exists."
- Private/incognito windows may limit storage or clear it when they close.

## Sources

- MDN Using IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- MDN IDBOpenDBRequest blocked event: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/blocked_event
- W3C Indexed Database API 3.0 (versionchange handling example): https://www.w3.org/TR/IndexedDB/
- MDN Storage API (estimate, persist): https://developer.mozilla.org/en-US/docs/Web/API/Storage_API
- MDN Storage quotas and eviction criteria: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

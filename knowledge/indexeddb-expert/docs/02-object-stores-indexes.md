# Object stores, keys and indexes

**Source:** MDN Using IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

## Key options (MDN table)
| keyPath | autoIncrement | Behaviour |
|---|---|---|
| no | no | any value; you supply a key on each add |
| yes | no | objects only; the key is the property named by keyPath |
| no | yes | any value; the key is generated |
| yes | yes | objects only; the generated key is written into the keyPath property |

- The key generator **starts at 1 and never goes down**, even after deletes or a `clear()`. Example 1 got ids 1 and 2.

## Indexes
```js
const store = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
store.createIndex('name', 'name', { unique: true });   // duplicate name → ConstraintError
store.createIndex('module', 'module');                 // non-unique
store.createIndex('name_module', ['name', 'module']);  // compound
```
- Indexes need stores that hold **objects**. Records missing the indexed property simply aren't in the index.
- `index.get(value)` returns the match with the lowest key. `index.getAll(value)` and `index.count(value)` work too (example 1: `runs.index('pageId').getAll(2)` returned 2 runs, and `status.count('FAIL')` returned 2).

## CRUD
- `add()` **fails if the key exists**. `put()` inserts or overwrites. `get(key)`, `delete(key)`, `getAll()`, `getAllKeys()`, `count()`.
- Cursors: `openCursor(range, direction)`, with `IDBKeyRange.only / lowerBound / upperBound / bound` and directions `next`, `prev`, `nextunique` and `prevunique`. Call `cursor.continue()` to advance. `getAll()` is cheaper when you need every record.

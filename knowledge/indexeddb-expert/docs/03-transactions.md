# Transactions

**Source:** MDN Using IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

## From MDN
- The modes are `readonly` (the default), `readwrite`, and `versionchange` (internal, used by `open()` with a new version).
- Use `readwrite` only for writes. Several `readonly` transactions can overlap, but only **one `readwrite` per store** runs at a time. Scope transactions to the stores you need. An empty store list throws `InvalidAccessError`.
- **Auto-commit:** a transaction stays active only while it has pending requests. If control returns to the event loop with none pending, it becomes inactive, and new requests throw `TransactionInactiveError`. **Don't `await` unrelated promises** (fetch, timers, worker messages) inside a transaction.
- When all requests finish, the transaction fires `complete`. An **unhandled request error aborts the whole transaction** (`abort` event) and rolls it back. `stopPropagation()` on the error event lets you handle it without rolling back, and `abort()` rolls back by hand.
- **Durability caveat:** transactions can be cut off by shutdown or a lost permission (`AbortError`). Keep each logical change inside **one** transaction. Don't start transactions in `unload`.

## Promise wrapper (examples/idb.js)
```js
t.oncomplete = () => res(out);
t.onerror = e => rej((e.target && e.target.error) || t.error);   // ← verified fix
```
**Lesson from example 1:** when a request fails (e.g., a duplicate unique key), the `error` event that reaches the transaction has the **request** as its `target`, and `t.error` can still be `null` at that moment. The first version rejected with `null` and crashed. Read the error from `e.target.error`.

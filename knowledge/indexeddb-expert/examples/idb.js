// Minimal promise helpers used by the examples (same shape as the planned js/db.js).
export const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export function openDB(name, version, upgrade, { onblocked } = {}) {
  return new Promise((res, rej) => {
    const r = indexedDB.open(name, version);
    r.onupgradeneeded = e => upgrade(r.result, e.oldVersion, e.newVersion, r.transaction);
    r.onblocked = e => onblocked && onblocked(e);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

// Run fn(tx) in a transaction; resolve with fn's value when the transaction COMPLETES.
export function tx(db, stores, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(stores, mode);
    let out;
    Promise.resolve(fn(t)).then(v => (out = v));
    t.oncomplete = () => res(out);
    // A failed request bubbles an 'error' event to the transaction; its target is the
    // REQUEST, and t.error can still be null at that moment (verified in Chrome 153).
    t.onerror = e => rej((e.target && e.target.error) || t.error);
    t.onabort = e => rej((e.target && e.target.error) || t.error || new DOMException('aborted', 'AbortError'));
  });
}

export function deleteDB(name, { onblocked } = {}) {
  return new Promise((res, rej) => {
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = () => res(true);
    r.onerror = () => rej(r.error);
    r.onblocked = e => onblocked && onblocked(e);
  });
}

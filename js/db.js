// js/db.js - the ONLY module that touches indexedDB. ES module, no dependencies.
// Database `erpinspector`, version 1. Contract: skill indexeddb-library (+ evidence fields from
// uat-evidence-traceability). Notes: docs/db-notes.md. Fictional data only.

export const DB_NAME = 'erpinspector';
export const DB_VERSION = 1;
export const LS_PREFIX = 'erpinspector:';

const EVIDENCE_FIELDS = ['testCaseId', 'ticketId', 'toolsVersion', 'businessUnit', 'role', 'tester'];

let dbPromise = null;                 // cached open connection (promise)
let handlers = { onBlocked: null, onVersionChange: null };
let persistChecked = false;           // in-memory guard; the durable guard is settings 'persistRequested'

/** Register UI callbacks. onBlocked(message), onVersionChange({oldVersion,newVersion,deleting,message}). */
export function setHandlers(h = {}) { handlers = { ...handlers, ...h }; }

// ---- migrations: add a new block per version, NEVER edit an old one -------------------------------
function upgrade(db, oldVersion, newVersion) {
  if (oldVersion < 1 && newVersion >= 1) {
    const pages = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });
    pages.createIndex('name', 'name', { unique: true });
    pages.createIndex('module', 'module');
    db.createObjectStore('ignoreZones', { keyPath: 'id', autoIncrement: true }).createIndex('pageId', 'pageId');
    const runs = db.createObjectStore('runs', { keyPath: 'id', autoIncrement: true });
    runs.createIndex('pageId', 'pageId');
    runs.createIndex('createdAt', 'createdAt');
    runs.createIndex('status', 'status');
    db.createObjectStore('settings', { keyPath: 'key' });
  }
  // if (oldVersion < 2 && newVersion >= 2) { ...v2 additions only... }
}

// ---- open ----------------------------------------------------------------------------------------
export function openDB(opts = {}) {
  if (opts.onBlocked || opts.onVersionChange) setHandlers(opts);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('This browser does not support IndexedDB, so the library cannot be used.'));
    }
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = e => upgrade(r.result, e.oldVersion, e.newVersion);
    r.onblocked = () => handlers.onBlocked && handlers.onBlocked('Close other tabs of this app, then reload.');
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = e => {
        db.close();
        dbPromise = null;                                   // next call reopens (or fails visibly)
        const deleting = e.newVersion === null;
        handlers.onVersionChange && handlers.onVersionChange({
          oldVersion: e.oldVersion, newVersion: e.newVersion, deleting,
          message: deleting ? 'The library was reset in another tab. Reload this page.'
                            : 'The app was updated in another tab. Reload this page.' });
      };
      resolve(db);
    };
    r.onerror = e => {
      const err = (e.target && e.target.error) || r.error;
      reject(err && err.name === 'VersionError'
        ? friendly('The library on this device is newer than this page. Reload to get the latest version.', err)
        : err);
    };
  }).catch(err => { dbPromise = null; throw err; });
  return dbPromise;
}

function friendly(message, cause) {
  const e = new Error(message);
  e.name = (cause && cause.name) || 'Error';   // keep the original name (ConstraintError, VersionError...)
  e.cause = cause;
  return e;
}

// ---- transaction helper --------------------------------------------------------------------------
// fn(tx) must only await IDB requests (no fetch/timers) or the transaction auto-commits early.
async function run(stores, mode, fn) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(stores, mode);
    let out;
    Promise.resolve(fn(t)).then(v => { out = v; }, e => { try { t.abort(); } catch {} rej(e); });
    t.oncomplete = () => res(out);
    t.onerror = e => rej((e.target && e.target.error) || t.error);          // verified: t.error can be null
    t.onabort = e => rej((e.target && e.target.error) || t.error || new DOMException('Transaction aborted', 'AbortError'));
  });
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// ---- pages ---------------------------------------------------------------------------------------
export const pages = {
  list: () => run('pages', 'readonly', t => req(t.objectStore('pages').getAll())),
  get: id => run('pages', 'readonly', t => req(t.objectStore('pages').get(id))),
  /** Insert or update. Returns the id. Duplicate name -> Error (name 'ConstraintError'). */
  async put(page) {
    const now = Date.now();
    const rec = { ...page, updatedAt: now };
    if (!rec.createdAt) rec.createdAt = now;
    let id;
    try {
      id = await run('pages', 'readwrite', t => req(t.objectStore('pages').put(rec)));
    } catch (e) {
      if (e && e.name === 'ConstraintError') throw friendly('A page with this name already exists.', e);
      throw e;
    }
    if (rec.baseline) await requestPersistOnce();
    return id;
  },
  /** Removes the page plus its zones and runs in ONE transaction. */
  remove: id => run(['pages', 'ignoreZones', 'runs'], 'readwrite', async t => {
    const deleteByPage = async name => {
      const keys = await req(t.objectStore(name).index('pageId').getAllKeys(id));
      keys.forEach(k => t.objectStore(name).delete(k));
    };
    t.objectStore('pages').delete(id);
    await deleteByPage('ignoreZones');
    await deleteByPage('runs');
  }),
};

// ---- ignore zones --------------------------------------------------------------------------------
export const zones = {
  forPage: pageId => run('ignoreZones', 'readonly', t => req(t.objectStore('ignoreZones').index('pageId').getAll(pageId))),
  put: zone => run('ignoreZones', 'readwrite', t => req(t.objectStore('ignoreZones').put(zone))),
  remove: id => run('ignoreZones', 'readwrite', t => { t.objectStore('ignoreZones').delete(id); }),
};

// ---- runs ----------------------------------------------------------------------------------------
const EVIDENCE_EXTRAS = ['environment', 'note', 'expectedDifference'];   // optional, stored only when given
const DECISIONS = ['Expected', 'Regression', 'Noise'];
function normalizeEvidence(ev = {}) {
  // Required-ness (testCaseId, ticketId, toolsVersion, tester) is enforced by the UI; here we only
  // guarantee the six-field shape so reports never hit undefined. Extras are kept when present.
  const out = {};
  for (const k of EVIDENCE_FIELDS) out[k] = ev[k] == null ? '' : String(ev[k]);
  for (const k of EVIDENCE_EXTRAS) if (ev[k] != null) out[k] = String(ev[k]);
  return out;
}
const normalizeRegions = rs => (rs || []).map(r => ({ ...r, decision: DECISIONS.includes(r.decision) ? r.decision : null, note: r.note == null ? '' : String(r.note) }));
const normalizeSignOff = (so = {}) => ({
  signedOff: !!so.signedOff, reviewer: so.reviewer == null ? '' : String(so.reviewer),
  signedOffAt: so.signedOffAt == null ? null : so.signedOffAt, baselinePromoted: !!so.baselinePromoted });
const numOrNull = v => (typeof v === 'number' && isFinite(v) ? v : null);

export const runs = {
  /** Newest first. */
  async forPage(pageId) {
    const all = await run('runs', 'readonly', t => req(t.objectStore('runs').index('pageId').getAll(pageId)));
    return all.sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  },
  /** Stores evidence (six fields + optional extras), regions[].decision, signOff, ms (compare time), reviewMs. */
  add: r => run('runs', 'readwrite', t => req(t.objectStore('runs').add({
    ...r,
    regions: normalizeRegions(r.regions),
    evidence: normalizeEvidence(r.evidence),
    signOff: normalizeSignOff(r.signOff),
    ms: numOrNull(r.ms), reviewMs: numOrNull(r.reviewMs),
    createdAt: r.createdAt || Date.now() }))),
  get: id => run('runs', 'readonly', t => req(t.objectStore('runs').get(id))),
  /** Patch an existing run in one read-modify-write transaction; returns the updated record.
   *  evidence and signOff are merged field by field; regions (with decisions) is replaced;
   *  id, pageId and createdAt cannot change. Rejects with name 'NotFoundError' if the run is gone. */
  update: (id, patch = {}) => run('runs', 'readwrite', async t => {
    const store = t.objectStore('runs');
    const cur = await req(store.get(id));
    if (!cur) { const e = new Error('That run no longer exists.'); e.name = 'NotFoundError'; throw e; }
    const next = { ...cur, ...patch, id: cur.id, pageId: cur.pageId, createdAt: cur.createdAt };
    next.evidence = normalizeEvidence({ ...cur.evidence, ...(patch.evidence || {}) });
    next.signOff = normalizeSignOff({ ...cur.signOff, ...(patch.signOff || {}) });
    next.regions = normalizeRegions(patch.regions || cur.regions);
    next.ms = numOrNull(next.ms); next.reviewMs = numOrNull(next.reviewMs);
    await req(store.put(next));
    return next;
  }),
  remove: id => run('runs', 'readwrite', t => { t.objectStore('runs').delete(id); }),
};

// ---- settings ------------------------------------------------------------------------------------
export const settings = {
  async get(key, fallback) {
    const rec = await run('settings', 'readonly', t => req(t.objectStore('settings').get(key)));
    return rec ? rec.value : fallback;
  },
  set: (key, value) => run('settings', 'readwrite', t => req(t.objectStore('settings').put({ key, value }))),
};

// ---- storage -------------------------------------------------------------------------------------
export async function storageEstimate() {
  const s = typeof navigator !== 'undefined' && navigator.storage;
  if (!s || !s.estimate) return { usage: null, quota: null, percent: null, persisted: null };
  const { usage = 0, quota = 0 } = await s.estimate();
  const persisted = s.persisted ? await s.persisted() : null;
  return { usage, quota, percent: quota ? (usage / quota) * 100 : null, persisted };
}

// navigator.storage.persist() once, after the first baseline is saved (page context only).
async function requestPersistOnce() {
  if (persistChecked) return;
  persistChecked = true;
  try {
    if (await settings.get('persistRequested')) return;
    const s = navigator.storage;
    if (!s || !s.persist) return;
    const granted = await s.persist();
    await settings.set('persistRequested', { granted, at: Date.now() });
  } catch { /* best effort, never blocks a save */ }
}

// ---- reset ---------------------------------------------------------------------------------------
/** Closes our connection, deletes the DB, clears 'erpinspector:*' localStorage keys, resolves {blocked}.
 *  The DB is NOT reopened eagerly: the next API call (or openDB()) lazily recreates an empty v1. The app owns the
 *  confirm() dialog and the reload afterwards. If another tab blocks the delete, onBlocked fires and
 *  the promise stays pending until that tab closes (or reacts to versionchange). */
export async function resetAppData() {
  let blocked = false;
  if (dbPromise) { try { (await dbPromise).close(); } catch {} }
  dbPromise = null;
  persistChecked = false;
  await new Promise((res, rej) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = () => res();
    r.onerror = e => rej((e.target && e.target.error) || r.error);
    r.onblocked = () => { blocked = true; handlers.onBlocked && handlers.onBlocked('Close other tabs of this app to finish the reset.'); };
  });
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k);
  } catch { /* storage blocked: nothing to clear */ }
  return { blocked };   // true if the delete was blocked at some point; no connection is open afterwards
}

# Chrome DevTools: view and change IndexedDB data

**Source:** https://developer.chrome.com/docs/devtools/storage/indexeddb

## View
1. **Application** tab → expand **IndexedDB** to see the databases.
2. Click a database to see its origin and **version**.
3. Click an object store to see its key-value pairs, the **Total entries** count and the **Key generator value**.
4. Click a Value cell to expand it.
5. Click an **index** (e.g., `name`) to view the store sorted by that index.
6. Data does **not** update in real time. Click **Refresh** on the store, or **Refresh database**.

## Edit
Keys and values **can't be edited** in the Application panel. Run JavaScript from the **Console** or a **Snippet** (DevTools has access to the page context).

## Delete
- One pair: select it (it highlights blue), then press Delete or click **Delete Selected**.
- A whole store: **Clear object store**.
- A database: view the database, then **Delete database**.
- Everything: the **Clear storage** pane with the IndexedDB box ticked → **Clear site data**.

## Demo script for the rubric
Run a comparison → reload → Application → `erpinspector` → `runs` → Refresh, and the new row is there → click the app's **Reset app data** → Refresh database, and it's gone or empty.

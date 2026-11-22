---
name: reset-app-data
description: "Implement and verify the Reset app data button that deletes the erpinspector IndexedDB database. Use when building settings, troubleshooting bad data, or testing the rubric's reset requirement."
user-invocable: false
---
# Reset app data

```js
export async function resetAppData() {
  if (!confirm('Delete all baselines, ignore zones and runs on this device?')) return;
  db?.close();
  await new Promise((res, rej) => {
    const r = indexedDB.deleteDatabase('erpinspector');
    r.onsuccess = res; r.onerror = () => rej(r.error);
    r.onblocked = () => alert('Close other tabs of this app to finish the reset.');
  });
  location.reload();
}
```
- The button is visible in Settings **and** in the error state ("Something looks wrong? Reset app data").
- Verify it in DevTools: Application → IndexedDB → `erpinspector` disappears after the reload, or is recreated empty.
- The QA test is to create a page and a run, reset, then reload: the library is empty, the samples still load, and there are no console errors.

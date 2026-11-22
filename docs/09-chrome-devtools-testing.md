# 09 — Testing with Chrome DevTools

## Summary

DevTools is how we **prove** the rubric items in front of the class: IndexedDB really stores data, nothing leaves the device, the worker keeps the page responsive, and `cv.Mat`s don't leak. Open it with right-click → **Inspect**, `Ctrl+Shift+I` (Windows) or `⌘+Option+I` (Mac).

## Application panel → IndexedDB

1. **Application** tab → expand **IndexedDB** → `erpinspector` → `pages` / `ignoreZones` / `runs` / `settings`.
2. Click a store to see its key-value pairs. Blobs show as `Blob {size, type}`.
3. Values **don't update in real time**. Click **Refresh** on the store, or **Refresh database**.
4. Values can't be edited in this panel. Use the Console or a Snippet to run IndexedDB code.
5. **Delete database** removes `erpinspector`. **Storage → Clear site data** wipes everything for the origin (IndexedDB, cache, service workers).

**Demo check:** run a comparison → refresh the page → run history is still there → Application shows the new row in `runs` → click **Reset app data** → refresh the database view → stores are gone/empty.

## Network panel → "no data leaves the device"

1. Open Network, tick **Disable cache**, and reload. You should see `index.html`, the JS and CSS, `vendor/opencv/opencv.js` (about 10 MB, once) and the sample PNGs.
2. Clear the list, then upload two screenshots and run three comparisons. **The list stays empty.** No XHR/fetch, no uploads.
3. Optional: switch the throttling dropdown to **Offline** and run another comparison. It still works.

This is the strongest privacy argument for the County use case.

## Performance panel → UI stays responsive

Record while running a comparison. The heavy work should appear on the **worker thread** track, not the Main track, and Main should show no long tasks over 50 ms during the comparison.

## Memory panel → `cv.Mat` leak check

1. Take a heap snapshot, or watch the memory number in **Performance monitor** (⋮ → More tools → Performance monitor).
2. Run the same comparison 20 times.
3. Memory should go up and down, not climb steadily. A steady climb means a missing `.delete()`. As a debug aid, the worker can report the Wasm heap size (`cv.HEAPU8.length`) after each run.

## Console

- Errors from the worker show with the worker's file name.
- Useful one-liner: `await navigator.storage.estimate()`.

## Course troubleshooting table, adapted

| Symptom | Likely cause | Fix |
|---|---|---|
| Stuck on "Loading OpenCV…" | Slow ~10 MB download or failed load | Wait, or reload and check the Console |
| Stuck on "Working…" | Busy or stuck worker | Auto-restart after 30 s, or reload |
| Stuck on "Opening library…" | Blocked upgrade from another tab | Close other tabs, reload |
| Errors or odd old data | Bad IndexedDB records | Reset app data, or Clear site data |
| Slowdown after many comparisons | Undeleted `cv.Mat` | Reload, then find the leak |

## Sources

- Chrome DevTools — View and change IndexedDB data: https://developer.chrome.com/docs/devtools/storage/indexeddb
- Chrome DevTools — Network panel: https://developer.chrome.com/docs/devtools/network
- Chrome DevTools — Performance panel: https://developer.chrome.com/docs/devtools/performance
- Chrome DevTools — Memory panel: https://developer.chrome.com/docs/devtools/memory-problems
- Course final guide (troubleshooting table): https://cvfinal-doc-scanner.netlify.app/guide/

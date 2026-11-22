# DevTools checks for the rubric

**Sources:** Chrome DevTools, View and change IndexedDB data: https://developer.chrome.com/docs/devtools/storage/indexeddb · Network panel: https://developer.chrome.com/docs/devtools/network · Performance panel: https://developer.chrome.com/docs/devtools/performance · Fix memory problems: https://developer.chrome.com/docs/devtools/memory-problems

## IndexedDB (from the DevTools doc)
- Application → IndexedDB → database (shows its **version**) → object store (shows **Total entries** and the **Key generator value**).
- **Data doesn't update in real time**: click Refresh. You can't edit values in the panel; use the Console or a Snippet.
- Delete a pair (Delete Selected), clear a store, **Delete database**, or Clear storage → **Clear site data** for everything.

## Network
- Tick "Disable cache", reload, then **clear** the log. Run comparisons: the log should stay empty for the app's origin.
- The throttling dropdown → **Offline**. The app must keep working.

## Performance and memory
- Record a comparison. Long tasks show as red-cornered blocks on the Main track. The OpenCV work belongs on the worker's thread track.
- Memory: take heap snapshots, or use the Performance monitor. The worker's `cv.HEAPU8.length` reports the Wasm heap. Steady growth over repeated runs is a leak.

## Automation equivalent (example 1)
Playwright's `page.on('request')` after load (must be empty), `context.set_offline(True)`, and `page.on('console')` for errors. Verified on 2026-11-22. It also caught a real `/favicon.ico` 404 (example 2).

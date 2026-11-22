# Blobs and storage quotas

**Sources:** MDN Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API · MDN Storage quotas and eviction criteria: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria · MDN StorageManager.estimate(): https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate · MDN HTMLCanvasElement.toBlob: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob

## Blobs
- IndexedDB stores structured-cloneable values, **including `Blob` and `File`**. Store screenshots as PNG Blobs from `canvas.toBlob(cb, 'image/png')`. Base64 strings are about 33% bigger and slower.
- Example 2 verified it: a Blob saved inside a record comes back as a `Blob`, and decoding it with `createImageBitmap` gives the exact pixel colour that was drawn ([10,132,255,255] for #0a84ff).

## Quotas (MDN)
- `navigator.storage.estimate()` → `{usage, quota}` in bytes for the **origin**. Quotas are conservative estimates. Example 2 in headless Chrome showed about 72 KB used, with a 2048 MB quota.
- Quotas and eviction apply to the whole origin.
- `navigator.storage.persist()` asks the browser **not to evict** the data under storage pressure. `persisted()` checks it. `persist()` isn't available in workers, so call it from the page after the first baseline is saved.

## UI rule
Show "Using X MB of Y" in Settings. Warn at 80% of the quota, and offer to delete old runs.

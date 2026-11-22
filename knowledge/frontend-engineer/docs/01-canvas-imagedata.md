# Canvas, ImageData and Blobs

**Sources:** MDN Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API · MDN `CanvasRenderingContext2D.getImageData()`: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData · MDN `HTMLCanvasElement.toBlob()`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob · MDN `createImageBitmap()`: https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap

## Facts we rely on
- `ctx.getImageData(x, y, w, h)` returns an `ImageData` whose `.data` is a `Uint8ClampedArray` of **RGBA** bytes (4 per pixel, row-major). OpenCV.js turns it into a `CV_8UC4` Mat with `cv.matFromImageData`.
- `canvas.toBlob(callback, 'image/png')` produces a PNG `Blob` asynchronously. This is what we store in IndexedDB.
- `createImageBitmap(blob)` decodes an image Blob off the main thread. Draw the bitmap with `ctx.drawImage(bitmap, 0, 0)` to get pixels back.
- File input / drag-drop: `File` is a `Blob`, so the same `createImageBitmap(file)` path works for uploaded screenshots.

## Rules for the inspector
- Decode the uploads → draw to an **offscreen** canvas at full resolution → `getImageData` → transfer `imageData.data.buffer` to the worker.
- Display canvases can be scaled with CSS, but keep **full-resolution** data for the diff and the PNG export.
- Draw strokes at half-pixel offsets (`x + 1.5` for a 3 px line) so the edges are crisp. Example 1 checks the exact stroke pixel.
- Canvas content is invisible to screen readers. Give it `role="img"` with an `aria-label` summary, and **always** render the region list as real HTML.

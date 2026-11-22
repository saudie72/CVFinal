# cv.Mat and delete()

**Source:** OpenCV.js "Basic Operations on Images": https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html · Usage: https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html

## Creating Mats (from the docs)
| Form | Code |
|---|---|
| Empty | `new cv.Mat()` |
| Size + type | `new cv.Mat(size, type)` / `new cv.Mat(rows, cols, type)` |
| With a value | `new cv.Mat(rows, cols, type, new cv.Scalar())` |
| Helpers | `cv.Mat.zeros(rows, cols, type)`, `cv.Mat.ones(...)`, `cv.Mat.eye(...)` |
| From a JS array | `cv.matFromArray(rows, cols, type, array)` |
| From canvas pixels | `cv.matFromImageData(ctx.getImageData(0, 0, w, h))` |

## Accessing data
- `mat.data` (`Uint8Array` for 8-bit) uses the index `row * cols * channels + col * channels + c`. The docs say data manipulation is only valid for a **continuous** Mat, so check `isContinuous()`.
- `mat.ucharAt(r, c)` reads one value. `mat.ucharPtr(r, c)` returns a typed view of a pixel.
- `mat.type()` is the first thing to check when debugging, because many OpenCV.js errors come from wrong data types.

## Copying
- The docs recommend `mat_clone()` for a deep copy. `clone()` may be shallow because of embind limitations. `src.copyTo(dst, mask)` copies only the masked entries.

## Memory (the rule that matters most)
> "You have to call delete method of cv.Mat to free memory allocated in Emscripten's heap."

- Delete every `cv.Mat` **and** `cv.MatVector`, and every Mat you got out of a MatVector with `.get(i)`. The docs' example: `mat.delete(); matVec.delete(); cnt.delete();`
- Mats created by `split` also need `delete()`.
- JavaScript's garbage collector never frees the Emscripten heap. A forgotten Mat leaks until the worker is terminated.

## Pattern we use
```js
const bag = []; const T = o => (bag.push(o), o);
try {
  const gray = T(new cv.Mat());
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  // ... more work ...
} finally { for (const o of bag) { try { o.delete(); } catch {} } }
```

# Verification log: knowledge examples

**Date:** 2026-11-22 · **Command:** `bash tools/verify-knowledge/run_all.sh` · **Environment:** headless Google Chrome 153, Python OpenCV 5.0.0, Node 22, plus **real OpenCV.js 4.13.0** (from docs.opencv.org) in the desktop app's built-in browser.

| Suite | Result | Highlights |
|---|---|---|
| OpenCV.js examples (real opencv.js 4.13, browser) | ✅ 3/3 | diff → 2 regions; shapes → 2 contours, areas 2301 / 1890; alignment dy = 3, residual 0; Wasm heap flat over 70 runs |
| OpenCV Python mirror | ✅ 3/3 | identical numbers to the JS run |
| Browser examples (Wasm, IndexedDB, front end, status pill) | ✅ 9/9 | MIME TypeError; memory detach; worker transfer + watchdog; v1→v2 migration; Blob round trip; blocked → reset |
| Mock ERP capture → diff | ✅ | Timesheet FAIL; Submit flagged at its old **and** new positions |
| QA smoke (no network after load, offline) | ✅ | 0 page requests after load; works offline |
| Token contrast (WCAG) | ✅ 13/13 | 3 rejected values kept as evidence |
| netlify.toml + link check | ✅ | 5/5 config checks; all relative links resolve |
| Privacy audit | ✅ clean | negative test caught 2 planted violations |
| Evidence validator | ✅ | the broken record was rejected with 3 errors |
| Team linter | ✅ TEAM OK | 17 agents, 26 skills, every knowledge folder present, Before-you-answer everywhere |

## Bugs and wrong assumptions the runs caught (all fixed, and written into the docs and skills)
1. **`cv.Mat.clone()` is shallow in opencv.js 4.13.** The diff found 0 changes until the code switched to `mat_clone()` / `copyTo()`. The skill `cv-mat-memory-hygiene` and `docs/01-opencvjs-basics.md` were updated.
2. **`applyColorMap` *is* available** in the 4.13 docs build. The research docs had assumed it wasn't; `docs/05-visual-outputs.md` was updated, and the LUT fallback stays.
3. **IndexedDB transaction errors:** `tx.error` was `null` in `onerror`, and the error is on `event.target.error`. The skill `indexeddb-library` was updated.
4. **Migration guards:** `oldVersion < N` alone ran the v2 upgrade while opening v1 in tests. The fix is to add `newVersion >= N`.
5. **Glass contrast:** 55–66% opacity failed AA for secondary text (2.5:1). The tokens now use 85% opacity, and the skill `apple-liquid-glass-styling` was updated.
6. **favicon 404** made the "no console errors" check fail. The fix is `<link rel="icon" href="data:,">`.
7. **Reflow regions:** moving a toolbar or narrowing a grid column reflows the content below it, producing one large region. This is now documented for fixture design and region explanations.

Non-runnable examples (plans, specs, user stories, scenarios) are reviewed for consistency with the verified runs. For example, the evidence JSON uses the real Timesheet run numbers.

## Step 9 correction (2026-11-22, Forge): the `clone()` finding is build-dependent
Item 1 above says `Mat.clone()` is shallow in opencv.js 4.13. The Step 9 work refined that without invalidating the original run. Iris (`docs/cv-pipeline-notes.md`) and Volt (`docs/worker-notes.md`, `ready.info.cloneIsDeep: true`) found that the vendored 4.13.0 docs build ends by setting `Mat.prototype.clone = mat_clone` in its `onRuntimeInitialized` wrapper, so `clone()` is deep when the runtime is started that way and may be shallow when that wrapper is bypassed (as in the original example). The rule is unchanged and safe in both cases: always use `mat_clone()` or `copyTo()`. Skill `cv-mat-memory-hygiene` was updated to say so.

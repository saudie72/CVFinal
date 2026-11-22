# Step 9 build plan: ERP Visual Regression Inspector

Written by **Atlas (orchestrator)**. The contracts live in the skills; this page pins file names and the order of work. If a contract has to change, say so in HANDOFF REQUESTS and Atlas updates this page. Don't diverge silently.

## Fixed facts
- **OpenCV.js 4.13.0** (official docs build, wasm embedded) is vendored at **`vendor/opencv/4.13.0/opencv.js`** (sha256 `63366510…ca8aa0`, from https://docs.opencv.org/4.x/opencv.js). The path is versioned so Netlify can cache it as immutable. It's the same version the knowledge examples were verified on: `clone()` is shallow, so use `mat_clone()`/`copyTo()`, and `applyColorMap` is present.
- Classic worker at the site root: **`inspector.worker.js`**, which calls `importScripts('vendor/opencv/4.13.0/opencv.js', 'js/cv/align.js', 'js/cv/ssim.js', 'js/cv/heatmap.js', 'js/cv/pipeline.js')` once.
- `netlify.toml` and `tools/serve_netlify.py` (a local server that applies the netlify.toml headers, including the CSP: **no inline scripts or styles**) are already in place (Piper).

## Contracts
| Contract | Where it's defined | Owner |
|---|---|---|
| `self.ErpCV.compare(cv, base, cand, zones, settings)` → the result contract (regions, changedPct, ssim, status, alignment, settings, ms) **plus** `images: { boxes, diff, heatmap }`, each `{width, height, data: Uint8ClampedArray RGBA}` drawn on the aligned candidate. `base`/`cand` = `{width, height, data}`; zones = `[{x,y,w,h,label}]` in baseline px | skill `opencvjs-diff-pipeline`, `screenshot-alignment`, `ignore-zones-masking` | Iris |
| Worker protocol and `js/worker-client.js` (`createInspector({onStatus})` → `{ready, compare(base, cand, zones, settings, {onProgress}), heap(), restart()}`, 30 s watchdog) | skill `wasm-worker-runtime` | Volt |
| `js/db.js`: the `erpinspector` v1 schema and API | skill `indexeddb-library` (+ the evidence fields from `uat-evidence-traceability`) | Ledger |
| UI flows, states, copy, the HTML skeleton (class names / ids / `data-state`) | `docs/design/ux-flows.md` | Wren |
| Design tokens + `css/app.css` | skill `apple-liquid-glass-styling` (glass only on chrome; screenshots on an opaque surface) | Sable |
| `index.html`, `how-it-works.html`, `resources.html`, `js/app.js`, `js/views.js`, `js/report.js`, `js/zones-ui.js` | skill `canvas-comparison-views` | Juno (Piper checks every Resources link) |
| `demo-erp/`, `samples/*.png`, `samples/manifest.json` (the array format in skill `mock-erp-fixtures`) | skill `mock-erp-fixtures` | Mason |
| `docs/erp/*.md` | the ERP skills | Morgan, Riley, Dex, Hal, Vera, Tess |

## Waves
| Wave | In parallel | Waits for |
|---|---|---|
| A | Morgan, Riley, Dex, Hal, Vera, Tess (docs/erp) · Wren (flows) · Iris (pipeline) · Volt (worker) · Ledger (db) · Mason (demo ERP + samples) | nothing: the contracts are already fixed in the skills |
| B | Sable (css) · Juno (app + How it works + Resources pages) | Wren; Juno also needs Iris + Volt + Ledger |
| C | Peer reviews in parallel: Iris↔Volt · Ledger↔Juno · Sable↔Wren · Dex reviews Iris's regions vs the planted changes · Riley reviews Mason · Quinn reviews Mason's samples · Vera privacy audit · Tess reviews the evidence fields · Atlas reviews Piper | B |
| D | Quinn: real-browser QA (every manifest pair, persistence, Reset, quiet network, no Mat leak over 20 runs, run_all.sh) | C approvals |
| E | Fixes → Piper (README with deploy steps + who-did-what) · Forge (CLAUDE.md/roster drift, team lint) · Atlas (handoff log, commit, push to main) | D |

Local server ports, so parallel experts don't collide: Iris 8101 · Volt 8102 · Ledger 8103 · Mason 8105 · Juno 8106 · Quinn 8107 · shared demo 8080.

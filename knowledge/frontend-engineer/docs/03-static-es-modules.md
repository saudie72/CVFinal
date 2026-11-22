# No-build static app with ES modules

**Sources:** MDN JavaScript modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules · MDN `Worker()` constructor: https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker · Netlify file-based configuration: https://docs.netlify.com/build/configure-builds/file-based-configuration/

## Facts
- `<script type="module" src="js/app.js">` enables `import`/`export` in the browser with no bundler. Module scripts are deferred by default and run in strict mode.
- Modules must be loaded over HTTP(S) (CORS rules apply), so `file://` won't work. Test with `python -m http.server`.
- `new Worker(url)` creates a **classic** worker by default, and `{type: 'module'}` creates a module worker. OpenCV.js needs `importScripts`, which throws in module workers, so **`inspector.worker.js` stays classic** while the page uses modules.

## Layout (proposed)
```
index.html  how-it-works.html  resources.html
css/tokens.css (Sable)  css/app.css
js/app.js (routing + state)  js/views.js (canvas views)  js/zones-ui.js  js/report.js
js/db.js (indexeddb-expert)  js/worker-client.js (wasm-expert)
inspector.worker.js  vendor/opencv/4.13.0/opencv.js
```
Only `db.js` touches IndexedDB, and only `worker-client.js` talks to the worker. Everything else imports from them.

# 11 — Static Hosting on Netlify

## Summary

The inspector is a **static site**: HTML, JS, CSS, the opencv.js file, and sample PNGs. It has no build step, no server functions, no environment variables and no API keys. Netlify serves the repo as-is, and every push to `main` redeploys.

## Deploy settings (from the course guide)

- app.netlify.com → **Add new project → Import an existing project → GitHub** → pick `CVFinal`
- Project name, which sets the URL (e.g., `erp-visual-inspector.netlify.app`)
- **Build command:** *(empty)*
- **Publish directory:** `.`
- **Environment variables:** none
- Deploy. Pushes to `main` redeploy automatically.

## `netlify.toml` (proposal)

```toml
[build]
  publish = "."
  command = ""

# Long cache for the big, versioned OpenCV file
[[headers]]
  for = "/vendor/opencv/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Worker and app code: always revalidate so fixes show up immediately
[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    X-Frame-Options = "DENY"
```

Notes:

- `netlify.toml` lives at the repo root, and **its settings override the Netlify UI** when the two conflict.
- Headers defined in `netlify.toml` or `_headers` are **global**. They can't be scoped to a branch or deploy context.
- Netlify serves `.wasm` with the correct `application/wasm` MIME type. The prebuilt opencv.js embeds its Wasm, so no extra headers are needed.
- If `vendor/opencv/opencv.js` is ever replaced with a new version, rename it (e.g., `opencv-4.10.0.js`), because the `immutable` cache would otherwise keep the old file.
- A Content-Security-Policy with `script-src 'self' 'wasm-unsafe-eval'` is possible, but test it carefully, because opencv.js may need `'unsafe-eval'`. It is optional for the final.

## Testing locally before pushing

```bash
python -m http.server 8080     # then open http://localhost:8080
```

Workers and fetch don't work reliably from `file://`.

## Sources

- Netlify file-based configuration: https://docs.netlify.com/build/configure-builds/file-based-configuration/
- Netlify custom headers: https://docs.netlify.com/manage/routing/headers/
- Netlify knowledge base — netlify.toml redirects, headers and env vars: https://www.netlify.com/knowledge-base/how-to-configure-netlifytoml-redirects-headers-and-env-vars/
- Course final guide (deploy steps): https://cvfinal-doc-scanner.netlify.app/guide/

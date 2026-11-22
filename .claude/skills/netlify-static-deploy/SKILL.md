---
name: netlify-static-deploy
description: "Deploy the inspector as a static site on Netlify (publish '.', no build) with netlify.toml headers, and test locally. Use when writing netlify.toml, README deploy steps or diagnosing hosting issues."
user-invocable: false
---
# Netlify static deploy

Reference: `docs/11-netlify-hosting.md`.

## netlify.toml
```toml
[build]
  publish = "."
  command = ""
[[headers]]
  for = "/vendor/opencv/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
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
- UI steps: Add new project → Import existing → GitHub → CVFinal. Build command empty, publish `.`, no environment variables. Every push to `main` redeploys.
- `netlify.toml` overrides the UI, and its headers are global.
- If opencv.js changes, rename the file (versioned name), because of the immutable cache.
- Local test: `python -m http.server 8080`. Never test from `file://`.

---
name: privacy-no-real-data
description: "Enforce the project's privacy rules: no real County data or branding, no network calls after load, no third-party scripts. Use when creating content, adding dependencies, reviewing code or auditing the app."
user-invocable: false
---
# Privacy: no real data

## Rules
1. No real INFORMS or Miami-Dade screenshots, employee data, configurations, role names or URLs in the repo, the samples, the docs or the knowledge folders.
2. No Oracle, PeopleSoft or County **logos**. Naming "PeopleSoft" in documentation as the subject is fine. The demo UI says "Demo ERP (fictional)".
3. No third-party scripts, fonts, analytics or CDNs. Everything is self-hosted.
4. No `fetch`/XHR after the initial load, except same-origin samples requested by the user.
5. No secrets or API keys anywhere.

## Audit (security admin / qa-tester)
- `grep -RniE "miamidade|informs\.|@miamidade|oracle\.com/.*logo" --exclude-dir=.git .` → no hits beyond documentation context.
- `grep -RnE "https?://" js/ inspector.worker.js index.html` → only links on the Resources page.
- DevTools Network after load is empty while comparing, and the app still works with throttling set to **Offline**.
- `netlify.toml` sends `X-Content-Type-Options`, `Referrer-Policy: no-referrer` and `X-Frame-Options: DENY`. Add a CSP if it's been tested with opencv.js.

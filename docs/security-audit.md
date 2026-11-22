# Security and privacy audit (wave C)

Owner: Vera (erp-security-admin). Date: 2026-11-22. Scope: the whole tree as of this run (index.html, how-it-works.html, resources.html, inspector.worker.js, css/app.css, js/*, demo-erp/, samples/, netlify.toml, vendor/opencv/4.13.0/opencv.js).

**VERDICT: APPROVE.** 0 findings. No blockers. Four minor notes (section 7) for owners to consider.

> **Authorization limit.** This audit checks privacy and hosting hygiene only: no real data, no third-party code, no network traffic after load, sound headers. It says **nothing about authorization**. A visual comparison shows what was rendered for the tested role. It does not prove that authorization is correct: hidden controls may still be reachable, and data access is enforced by permission lists, roles and row-level security, which must be tested functionally. A screenshot never proves authorization. Role scenarios are in `docs/erp/security-scenarios.md`.

## 1. Static audit: `python3 tools/privacy_audit.py`

Result on the full tree: **0 FINDING, 4 WARN, 61 INFO, exit 0, "PRIVACY AUDIT CLEAN".** 61 app files scanned in full (45 text); 196 other text files got the repo-wide secret and SSN scan. Excluded: `.git`, `node_modules`, `vendor/` (sha256-pinned instead), `tools/privacy_audit.py` (see the script docstring for the reasons).

| Check | Result |
|---|---|
| Real-data patterns (County hostnames/emails, real-looking emails, SSN shapes, internal IPs/hosts, secrets/keys) | none |
| Third-party script, link, img, iframe, form, CSS `url()`/`@import` | none |
| Inline scripts, inline `on*` handlers, `javascript:` URLs | none |
| `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`; fetch/importScripts/Worker with an absolute URL | none |
| Analytics, CDN or font hosts | none |
| Miami-Dade / INFORMS / County names, Oracle names in demo-erp and samples; logo-like file names; text inside PNGs | none |
| `netlify.toml`: X-Content-Type-Options nosniff, Referrer-Policy no-referrer, X-Frame-Options DENY, CSP with `default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, no `'unsafe-inline'`, no external origin | all present |
| `vendor/opencv/4.13.0/opencv.js` sha256 = pin `63366510...ca8aa0` | match; nothing else under vendor/ |

INFO items: 40 outbound `<a href>` links on `resources.html` (user-click navigation, not fetches; all https; all with `rel="noopener noreferrer"`), 2 relative `fetch` calls (`samples/manifest.json`, `js/region-hints.json`), 16 sample images listed for the manual look (section 5).

WARN items (none are failures):
1. `resources.html:30` and `:78`: the word "Oracle" as plain text (the section title "ERP background (Oracle PeopleBooks)" and a table-of-contents entry). It names the source of public docs as a subject; there is no logo and no branding. Acceptable under the privacy rule.
2. `js/app.js:264`: `fetch(url)` with a variable URL. I checked it: it is `fetchBlob()`, called with paths from `samples/manifest.json` (all relative, same-origin; the manifest has no `http`). Confirmed same-origin at runtime in section 2.
3. CSP `'unsafe-eval'` in `script-src` (netlify.toml). Known and tracked: kept because opencv.js may need it. The app ran with no CSP violation or console error under this CSP (section 2). Volt may test removing it; `'wasm-unsafe-eval'` stays.

## 2. Runtime checks (Playwright, Chromium, `tools/serve_netlify.py` on port 8110, which applies the netlify.toml headers; server stopped afterwards)

**(a) No cross-origin requests.**
- Initial load (20 requests): `/index.html`, `css/app.css`, 9 files in `js/`, `inspector.worker.js` (page + worker), `vendor/opencv/4.13.0/opencv.js`, `samples/manifest.json`, `js/region-hints.json`, and the four `js/cv/*.js` files, all same-origin.
- Load sample + Compare (the sample button also runs the compare): added only `samples/tl-timesheet_before.png`, `samples/tl-timesheet_after.png` and a `blob:` URL. Result FAIL, 2 changed regions, as expected.
- All 8 manifest samples loaded and compared in one session (71 requests in total): **0 non-same-origin requests.** Results: 3 sample pairs with 2 to 4 regions, one pair with 1 region (tiny change), a 25-region case, and PASS for the two expected-PASS pairs (the identical PO and the shifted page). The statuses are the QA owner's to judge; here I only note that every comparison completed.
- 20 pages visited (demo index, 16 demo before/after pages, the three app pages): 0 external requests, 0 console errors.
- Console errors during load and compare: none, with the CSP enforced.
- Outbound requests happen only if the user clicks a link on the Resources page.

**(b) Offline.**
- With the page already loaded and the browser set offline: the offline note appeared, and Load sample + Compare for an already-fetched sample worked (FAIL, 2 regions, no failed requests).
- A sample not yet fetched fails with "Failed to fetch" and the app shows an error, without crashing. This is expected: samples are same-origin files that need the network the first time (HTTP-cached after).
- **Reload while offline fails** (`net::ERR_INTERNET_DISCONNECTED`). There is no service worker (0 registered), so there is no offline start. Recorded as asked: not required, and not a privacy problem.
- Compare with a user-chosen candidate file while offline: my automated flow was inconclusive (the Compare button was not visible in my script's path), so I did not count it as verified. Quinn's QA should run it by hand. The audit shows no code path that sends a user file anywhere (no network APIs; section 1).

**(c) Response headers.** Every path checked returns all of these: `/`, `/resources.html`, `/how-it-works.html`, `/inspector.worker.js`, `/js/app.js`, `/css/app.css`, `/samples/manifest.json`, a sample PNG, `/vendor/opencv/4.13.0/opencv.js`, `/demo-erp/index.html`.
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; worker-src 'self'; img-src 'self' blob: data:; connect-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()`.
- **Caveat:** these are the headers of the local server that applies netlify.toml, not of the live site. Whether Netlify applies them to the deployed site is **unverified** until someone runs `curl -I` (or DevTools, Network, Response Headers) on the live URL. Piper/Quinn should do that after deploy.

## 3. Look at the images (every sample and demo page)

Viewed with the Read tool: all 16 `samples/*.png`. They contain only 9 distinct images. Identical byte-for-byte (md5): the three `hcm-job-data*_before.png`, and the three `fscm-po*_before/after` files for the identical case. All 9 distinct images were viewed, and so were the unique "after" variants (PO after, shifted after, 110% zoom after). The demo-erp index page was rendered and viewed. The other demo pages are the sources of the viewed samples; they were loaded with no external requests and no console errors, and the text grep found no Oracle, Miami-Dade, INFORMS or County words.
- Every screen carries the header "Demo ERP (fictional)" with a TEST badge, and the footer on Timesheet says "Fictional demo data for a computer vision class project".
- No logos (Oracle, PeopleSoft, County, or any other). No real names: only "Jordan Rivera, EmplID 000123", "Pat Morgan (fictional)", "Harbor Office Supply (fictional)", `BU-NORTH`, `jordan.rivera@example.test`, phone `555-0100`, address "100 Example Plaza, Suite 4, Sampleville, ZZ 00000", DOB 03/14/1980 (fictional).
- Generic ERP module names (Time and Labor, Workforce Administration, Accounts Payable) are used as subjects, not branding.
Limit: a human look is not exhaustive for tiny details; the script also checked PNG file names and embedded text.

## 4. What this audit does not cover
- Authorization (see the statement at the top).
- The live Netlify deployment (headers, caching), until someone checks it.
- Browsers other than Chromium; the production CSP in Safari or Firefox.
- Contents of vendor/opencv.js beyond the hash pin: it is third-party code, trusted because the hash matches the official docs build named in `docs/build-plan.md`, and the CSP limits it to same-origin connections.

## 5. Re-run
```
python3 tools/privacy_audit.py            # exit 1 on any FINDING; --strict also fails on WARN
python3 tools/serve_netlify.py --port 8110   # then check DevTools, Network (empty after load) and Offline
```

## 6. Decision
No finding blocks release. APPROVE for privacy and hosting hygiene.

## 7. Minor notes (not blockers)
1. `resources.html` "This project" links to personal GitHub repositories (`fenago/CVFinal`, `saudie72/CVFinal`) and a Netlify guide site. These are public project links, not data; the owner should confirm they are meant to be public in the final submission.
2. A stray file named `pid` (contents `7045`) sits in the repo root, apparently left by a local server run. Not secret, but it should not be committed; delete it or add it to `.gitignore`.
3. `'unsafe-eval'` in the CSP: remove it if Volt shows opencv.js runs without it (a tighter CSP).
4. Offline reload does not work (no service worker). Fine for the project rules; if the README says "works offline", make it say "works with no network after load", not "starts offline".

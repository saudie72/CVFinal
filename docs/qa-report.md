# QA report: ERP Visual Regression Inspector

Tester: **Quinn** (qa-tester). Round 1 (wave D) 2026-11-22; **Round 2 (first-use UI)** 2026-11-22, after Juno's commit "Make the inspector understandable for humans". Round 2 is first; Round 1 follows unchanged except that its automated checks were updated to the new wording.

**Environment (both rounds):** Chromium 157.0.8103.78 (Playwright 1.63, headless, bundled build; not branded Google Chrome), Node v22.23.5, Linux. App served by `python3 tools/serve_netlify.py --port 8107`, which applies the `netlify.toml` headers including the CSP. Fresh browser context per section, so each starts with an empty IndexedDB. Viewport 1366x900 unless stated.

**Re-run everything:** `node tools/qa/run_qa.js` (about 150 s, starts and stops its own server on 8107; `QA_ONLY=11,12` runs selected sections), `node tools/qa/run_live.js` (the deployed site), `bash tools/qa/run_suites.sh` (the other suites). Results: `tools/qa/qa-results.json`, `tools/qa/live-results.json`.

---

# Round 2 (first-use UI)

## VERDICT (Round 2): NOT READY, two fixes away

The redesign works: a first-time user can read why the tool exists, press one button, and reach a correct result on a desktop, in light and dark, with the keyboard, and on the live site. **But the guided tour loses the user at two places**, and the tour is the thing that was built so a newcomer knows what to do next:

1. **QA2-001 (major):** at 375 px the tour panel is `position: static`, so when steps 3 and 4 scroll the page to the red boxes and to change card 1, the step heading, **Next** and **Skip tour** are roughly 1,500 to 2,700 px above the screen. The user sees a screenshot or a card and no instruction (screenshots `ux2-qa-tour-step3-375-light.png`, `ux2-qa-tour-step4-375-dark.png`).
2. **QA2-002 (major):** at every width, step 5 says "Save it as evidence" and outlines the Save result button, but that button is at the bottom of the page and is never scrolled into view (visible height 0 px at 375 and 1366). The user is told to look at something that is not on screen.

Nothing touches privacy, correctness, persistence, the pipeline, the network or the live deployment. Retest is one command (`node tools/qa/run_qa.js`; expect `12.5.*` and `12.7.*` to turn PASS). After QA2-001 and QA2-002 are fixed I would call it READY; QA2-003 to QA2-007 are minor and can follow.

## R2.1 Summary

| Result | Count |
|---|---|
| Automated checks run (`tools/qa/run_qa.js`, sections 1 to 14) | 202 (+ 19 info records) |
| PASS | **192** |
| FAIL | **10**, all real app defects (7 defect ids below, none is a test artefact) |
| Juno's smoke test (`node tools/app-smoke/run.js`) | **61 of 61** pass (re-run by me) |
| Live site (`node tools/qa/run_live.js`) | **8 of 8** pass (2 Netlify HUD console errors listed separately, see R2.5) |
| `tools/privacy_audit.py` | CLEAN (0 findings, 25 warns of the known kind); `tools/contrast_check.py` 268 of 268 pairs |

The 10 failures: `10.1`, `11.43a`, `12.4b.1366-dark`, `12.5.375-light`, `12.5.375-dark`, `12.5.1366-dark`, `12.7.375-light`, `12.7.375-dark`, `12.9.375-dark`, `14.7`.

## R2.2 What I changed in the runner (nothing weakened)

Every Round 1 check still exists and still asserts the same behaviour; only the text and selectors that Juno renamed were updated. Where a check could no longer read a number from the screen, I read it from where it is stored instead.

| Was | Now (check) |
|---|---|
| `#sample-select` + "Load sample" | example cards: hero `#btn-load-sample` ("Try the demo (30 seconds)") or `.sample-open[data-sample-id]` in the collapsed groups; the helper skips the tour (1.x to 10.x) |
| "Aligned: shift (0, 3)" | Alignment "Lined up automatically" **and** the note "3 pixels lower" (1.s, 2.11) |
| zone list "120 by 30 pixels at 400, 500" | the list now says "Keyboard zone, middle of the page"; the exact x 400, y 500, 120 x 30 is read back from IndexedDB `ignoreZones` (2.5) |
| "extends past the baseline" | "extends past the Before screenshot (1366 by 900 pixels). Reduce X or Width." (2.6) |
| "Save run" / "Saved as run N" | "Save result" / "Saved as result N" (3, 9, 11.4) |
| Sign off button after Save | the primary button becomes Sign off (the separate button is hidden by design), so the keyboard path presses the primary (9.11, 11.4c to e) |
| pill "OpenCV / vision engine" | "Getting ready: loading the comparison engine…" (9.0) |
| hint "Capture or rendering artifact" | change cards: "often a capture difference, not a real change" (1.z) |
| print heading "Changed regions" | "Changes" + "Boxes view" (5.8) |
| Regression hint text | "Sign off isn't available while a change is marked Regression. Log a defect, attach the report, and compare again after the fix." (11.4a) |
| 10.x screenshots | moved to section 12 as `ux2-qa-*.png`; 10.1 now also covers the expanded landing and open `<details>` |

New sections: **11** (new UI), **12** (375 px, dark, screenshots), **13** (keyboard-only tour and review), **14** (screen reader basics). New helpers: `goRoute` (retrying route change), `skipTour` (waits for the panel), `zonesInDb`, `settingGet`.

## R2.3 New-UI checks (all brief items)

| Brief item | Check | Result |
|---|---|---|
| Landing on first run, purpose h1, one primary button | 11.1 to 11.5 | **PASS**: h1 is the owner's sentence; exactly one visible primary ("Try the demo (30 seconds)"), secondary "Compare my own screenshots", nav = My pages, Settings, How it works, Resources, no dropdown, tour/banner/intro/groups all closed, demo button above the fold at 1366x900 and 375x812 |
| Tour completes; Skip works | 11.30 to 11.44, 13.x | **PASS**: 5 steps with the exact sentences, Before image painted, Flip works, step 3 "found N changes" with N = 2 = the cards and announced once, step 4 outlines card 1 and decides nothing, step 5 shows Finish, Finish focuses card 1 and announces "Tour finished…", `onboardingSeen` persists across reload; **Skip on each of the 5 steps** (fresh profile each), Esc skips, reload mid-tour gives the "Take the 30-second tour" banner (restart works, Dismiss sets the flag); Reset app data clears the flag (4.6a); step 3 really waits (engine delayed 4 s: Next `aria-disabled`, "Still comparing, a moment.", click does not advance, steps 1 and 2 work without the engine) |
| Cards grouped, plain titles, no FSCM/HCM/T&L | 11.6 to 11.9 | **PASS**: hero "Timesheet", "More examples (3)", "How the inspector handles tricky cases (4)", each in manifest `order`; titles contain no module code and no digits; the module shows only as "People and HR (HCM)", "Money and purchasing (FSCM)" or "Time and labor"; every card has story, "What to expect:" and its button |
| Every change card title has words, no pixel numbers | 11.12 | **PASS** for all 7 FAIL pairs (25 cards on the zoom pair): "Change i of n · where on the page · shape", no digit except i and n |
| Zero radios checked on arrival | 11.11 | **PASS** for all 7 FAIL pairs; progress "0 of N changes decided" |
| Card click highlights its box; box click selects its card | 11.15 to 11.17a | **PASS**: card 1 vs card 2 draw different canvases, back to card 1 repeats the first; hovering a box links its card; clicking box 2 then box 1 selects and focuses the right card; "Show on screenshot" gives "Back to change 2", which returns focus to the card |
| Before/After crops non-blank | 11.13 | **PASS** for every card of all 7 FAIL pairs (painted, real page pixels, Before differs from After, locator drawn). Narrowest crop at 1366: 234 px on most pairs, 142 px on the voucher pair, 71 px on the 25-card zoom pair |
| `#team`, `#try-real`, `#pipeline` | 11.50 to 11.57 | **PASS**: 17-row team table labelled as AI assistants; `#try-real` has **0 `<img>`**, no Oracle image or logo anywhere on the page; the `#pipeline` rule reads "FAIL when any change is found or the changed share of the page is above the page's limit (0.1% by default)… similarity does not decide PASS or FAIL"; footer line and link on all 3 pages; `#team` link lands in view; every `how-it-works.html#anchor` linked from the result exists |
| Wording | 11.18 to 11.24a | **PASS**: no "region(s)", "Save run", "candidate", "OpenCV", "IndexedDB" on any screen or dialog (SSIM only inside the stats help); Past results columns Date, Status, Changes, Test case, Sign-off, Actions; Save dialog titled "Save result" with the "why" line and optional fields collapsed |
| Round 1 items through the new UI | sections 1 to 9 | **PASS** except the layout defect below: all 8 manifest pairs give the expected status, fscm-po FAIL then PASS after the suggested zone, shifted pair lined up (3 pixels lower), zoom pair FAIL with the capture-difference cause, persistence, reset (with a second tab, and truly blocked), network quiet, offline compare, print, 0 long tasks, 20-run heap flat at 134,217,728 bytes, 20 pages console-clean |

Timesheet expectation (ux-flows 12.17.1 item 4): the card says "2 changes found", the real result is 2 (11.32). Consistent.

## R2.4 Tests Juno did not run: 375 px, dark, keyboard, screen reader

| Area | Check | Result |
|---|---|---|
| **375 px landing** (light and dark) | 12.1 | **PASS**: no horizontal scroll, "Try the demo" above the fold (bottom at 652 of 812 px) and 44 px or taller |
| **375 px tour** | 12.2, 12.3, 12.4, 12.6 | step 1 **PASS** (panel fits, Next 44 px tall); step 3 red boxes not covered; step 4 card and title not covered; result cards stay inside the screen, choices 44 px tall, crops 120 px or wider |
| **Tour panel stays reachable** | 12.7 | **FAIL at 375 px** (QA2-001). At 1366 px it is a sticky bubble and passes |
| **Panel does not cover what it points at** | 12.3, 12.4, 12.4b | step 3 **PASS**; step 4: card and title **PASS**, but at 1366 px the bubble covers **94%** of the card's Before/After crops (QA2-003) |
| **Step 5 target on screen** | 12.5 | **FAIL at 375 and 1366** (QA2-002) |
| **Dark mode** | 12.1 to 12.12 | **PASS** at 375 and 1366: no overflow, no console errors, text contrast at least 4.5:1 on every sampled text (lowest ratio sampled on the result screen: 5.4 light, 6.3 dark, against a 4.5 or 3 need; computed colours, glass approximated) |
| **Keyboard only, tour and review** | 13.1 to 13.15 | **PASS**: Tab reaches the demo button, Enter starts the tour with focus on the step heading, one Tab reaches Next, Flip and Back work, the tour completes, focus lands on change card 1, Tab + Space decides every card, Save result (Enter, 4 fields, Enter) gives "Saved as result N" and is announced, focus returns to the primary button, Sign off by keyboard works; every tour stop has a focus ring. **82 key presses** for the whole journey |
| **Screen reader basics** | 14.1 to 14.12 | landmarks (banner, navigation "Main", main, contentinfo) **PASS**; heading outline h1 > h2 > h3 > h4 with no skipped level on the landing and the result **PASS**; tour is a labelled region, heading focusable, **not** an `aria-live` region, Skip is a real button **PASS**; every visible canvas is `role=img` with a label ("Before: change 1 of 2, …") **PASS**; each card has a spoken summary and a fieldset legend over three radios **PASS**; announcements once each: "Comparison finished. 2 changes found.", "Tour finished…", "Change 2 of 2 selected…", "Change 1 marked Expected. 1 of 2 decided." **PASS**; Save dialog labelled, modal, focus inside, 4 required fields, `role=alert` error, Esc returns focus to the opener **PASS**; distinct document title and one h1 per screen **PASS**; reduced motion: no running animation **PASS**. **FAIL:** 14.7 (QA2-006) and the "disabled Next has no reason" check 11.43a (QA2-005) |

Not run, unverified: **Lighthouse accessibility score** (not installed, no CDN allowed), **real NVDA, JAWS or VoiceOver** (I read the accessibility tree through Playwright `ariaSnapshot` and the live-region text, which is not the same as listening), 200% zoom, quota exceeded.

## R2.5 Live site (`https://cvfinal-erp-inspector.netlify.app/`, `node tools/qa/run_live.js`)

First verified it serves the new build: after the app starts, `#h-library` reads "Compare a page before and after a PeopleSoft update, and see exactly what changed on screen." (the raw HTML says "My pages" until the app fills it in, which is by design).

| Check | Result |
|---|---|
| HTTP 200; new landing; one primary button; plain nav; no dropdown | **PASS** |
| Try the demo, tour step 1, Skip, result "FAIL — 2 changes found (8.3% of the page)", 2 cards ("Change 1 of 2 · middle left of the page · large block", "Change 2 of 2 · middle left of the page · thin strip"), primary "Review changes" | **PASS** |
| **0 cross-origin requests** during the whole visit | **PASS** (the only extra same-origin request is Netlify's `/.netlify/scripts/hud?variant=public`) |
| After "ready" only `/samples/tl-timesheet_before.png`, `_after.png` and one `blob:` | **PASS** |
| Security headers: CSP (`default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; … style-src 'self'`), `nosniff`, `no-referrer`, `X-Frame-Options: DENY` | **PASS** |
| Console errors from the app, page errors, CSP violations in the app document | **0** |
| **Known hosting issue, not an app defect (listed separately):** 2 console errors, both with location `about:srcdoc`, from the iframe that Netlify's injected `/.netlify/scripts/hud` badge builds: "Applying inline style violates … style-src 'self'" and "Executing inline script violates … script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'" | listed, expected |

## R2.6 Defects

Format: ID | severity | steps | expected | actual | owner.

### QA2-001 | major | the tour panel scrolls out of sight at 375 px, so steps 3 and 4 show no instruction | owner: **Juno** (behaviour), with **Sable** (visual)
| Field | Value |
|---|---|
| Steps | `python3 tools/serve_netlify.py --port 8107`; `QA_ONLY=12 node tools/qa/run_qa.js` (check 12.7), or open the app at 375x812, press Try the demo, press Next three times |
| Expected | The step heading, Next and Skip tour stay on screen while the page scrolls to the thing the step points at (as the sticky bubble does at 1366 px) |
| Actual | `.tour-panel { position: static }` below the phone breakpoint (`css/app.css` line 753). After step 3, `scrollY` is about 1,850 to 1,970 and Next is about 1,500 to 1,650 px above the top; after step 4, `scrollY` about 3,000 to 3,100 and Next about 2,600 to 2,700 px above (two runs). The screen shows a screenshot (step 3) or the middle of a card (step 4) with no words about what to do. The only way back is to scroll up a long way |
| Evidence | `ux2-qa-tour-step3-375-light.png`, `ux2-qa-tour-step4-375-dark.png`, `qa-results.json` 12.7.375-light and 12.7.375-dark |
| Suggested fix | Keep the panel visible on phones: a compact sticky bar at the bottom (heading, Next, Skip) or `position: sticky; top: <header height>` with a smaller body. Retest: `QA_ONLY=12`, expect 12.7 PASS |

### QA2-002 | major | tour step 5 points at the Save result button, which is never on screen | owner: **Juno**
| Field | Value |
|---|---|
| Steps | Try the demo, Next four times to step 5 (any width); or `QA_ONLY=12` (check 12.5) |
| Expected | "Step 5 of 5. Save it as evidence." with the Save result button outlined **and visible** next to the panel |
| Actual | The outline (`.tour-focus`) is put on `#btn-result-primary`, which sits at the bottom of the page after every change card. Nothing scrolls it into view: its visible height is 0 px at 375x812 and at 1366x900 (the screen still shows step 4's card). The user is asked to look at something they cannot see |
| Evidence | `qa-results.json` 12.5.375-light, 12.5.375-dark, 12.5.1366-dark; my ad-hoc 1366 capture of step 5 (card 1 and the decision radios, no Save button) |
| Suggested fix | On step 5, scroll `#btn-result-primary` into view (and on a phone keep the panel on screen, see QA2-001), or show a copy of the primary action inside the panel |

### QA2-003 | minor | at 1366 px the sticky tour bubble hides the Before/After crops of the card it introduces | owner: **Sable** (layout), **Juno** (scroll offset)
| Field | Value |
|---|---|
| Steps | Try the demo, Next three times to step 4 at 1366x900 |
| Expected | The highlighted card's title and its Before/After crops are visible below the bubble |
| Actual | `scrollIntoView({block:'center'})` puts the card's top edge under the sticky bubble. Card title: visible. **Crops: 94% covered** (174 of 184 px), so the pictures that show what changed are hidden while the text explains them. The same happens on step 5 |
| Evidence | `qa-results.json` 12.4b.1366-dark; Juno's own `ux2-tour-step4-1366-light.png` shows the same |
| Suggested fix | Scroll so the card's top sits below the bubble (use `scroll-margin-top` equal to the bubble height plus the header) |

### QA2-004 | minor | `how-it-works.html` scrolls sideways by 4 px at 375 px | owner: **Juno**
| Field | Value |
|---|---|
| Steps | `QA_ONLY=10 node tools/qa/run_qa.js` (check 10.1), or open `how-it-works.html` at 375 px and read `scrollWidth` |
| Expected | No horizontal page scroll (same rule as QA-001 in Round 1) |
| Actual | `scrollWidth` 379 vs 375, light and dark. The only element past the edge is the `<code>` file-name pattern `<module>_<page>_before_<YYYYMMDD>.png` in the "Try it with real PeopleSoft screenshots" step 3 (`#try-real`), 340 px wide and unbreakable |
| Suggested fix | `overflow-wrap: anywhere` on `code`, or `<wbr>` in the pattern (the fix used for QA-001) |

### QA2-005 | minor (accessibility) | the disabled tour Next gives no reason to a screen reader | owner: **Juno**
Steps: slow the engine (or use check 11.43a). Expected: while step 3 waits, `#tour-next` is `aria-disabled` and `aria-describedby="tour-wait"` (Wren D5: every `aria-disabled` button points to its reason). Actual: `aria-describedby` is absent; the reason "Still comparing, a moment." is only visible text.

### QA2-006 | minor (accessibility) | "Add ignore zone" has the same accessible name on every change card | owner: **Juno**
Steps: result screen, list the buttons (check 14.7). Expected: unique names, as "Show on screenshot, change 1" already is. Actual: "Add ignore zone" is repeated once per card (25 times on the zoom pair), so a screen reader's button list cannot say which change it belongs to. Fix: `aria-label="Add ignore zone for change N"`.

### QA2-007 | minor | "Show on screenshot" is 40 px tall | owner: **Sable**
Below the 44 px HIG target (it passes WCAG 2.5.8's 24 px). Info records 9.16 and 12.6a. Everything else on the result screen is 44 px or taller (the radio choices measure 44 px).

## R2.7 First-time-user read of the screens (confusing spots)

I opened every screenshot and asked "what do I do next?". Each of these is a judgement, not a failing check.

| # | Screen | Confusing spot | Owner |
|---|---|---|---|
| U1 | Landing, 375 and 1366 (`ux2-qa-landing-375-light.png`, `…-1366-dark.png`) | **Obvious.** One sentence, one big button, "What to expect" says what the demo will show, the privacy line is under the button. Nothing to fix | none |
| U2 | Landing at 1366 | The headline is left-aligned and wide, the hero card is centred and narrower, and "Compare my own screenshots" is left-aligned under it. The three edges do not line up | Sable (cosmetic) |
| U3 | Tour step 1 at 375 (`ux2-qa-tour-step1-375-dark.png`) | Two progress messages compete: the tour says "Step 1 of 5" while the pill above says "Comparing: Lining up the pages (1/4)" with a progress bar, and the nav highlights **Compare**, a screen the user never chose. A newcomer may wonder if they must wait. Consider a calmer pill while the tour is up | Wren (wording and flow) |
| U4 | Tour steps 1 and 2 at 375 | The page thumbnail is 272 px wide for a 1366 px page, so its text cannot be read. It shows "this is a page", not "this is the Timesheet". Consider tap-to-enlarge, or a taller crop of the top half | Sable / Wren |
| U5 | Tour steps 3 and 4 at 375 | **Lost.** There is no instruction on screen (QA2-001) | Juno |
| U6 | Tour step 5 | "Save it as evidence" but no Save button on screen (QA2-002) | Juno |
| U7 | After Finish (`ux2-qa-result-cards-1366-dark.png`) | The user lands in the middle of card 1. "What's happening", the 4-step strip and "Next: …" are scrolled away, and Save result is at the bottom. Where do I go next? A line next to the card, or scrolling so the strip is visible, would help. The Regression and Expected choices themselves are clear | Wren (flow) / Juno |
| U8 | Result cards | The card text is good: "What this probably is / What to check", "This is a guess from the shape. You decide.", one-line explanation under each of Expected, Regression and Noise, and "Not sure? Choose Regression and add a note." No change needed | none |

## R2.8 Files and screenshots (Round 2)

- `tools/qa/run_qa.js` (updated; sections 11 to 14 new), `tools/qa/run_live.js` (new), `tools/qa/qa-results.json`, `tools/qa/live-results.json`.
- `docs/qa/screenshots/ux2-qa-*.png`, **8 files**, regenerated by section 12: `landing-375-light` (full page), `landing-375-dark`, `landing-1366-dark`, `tour-step1-375-dark`, `tour-step3-375-light`, `tour-step4-375-dark`, `result-cards-375-dark`, `result-cards-1366-dark`. The older files in that folder (`library-empty-1366-light.png`, `result-*.png`, `compare-1366-dark.png`, `how-it-works-1366-light.png`, `resources-375-dark.png`) show the **pre-redesign** UI (Round 1) and are stale; Juno's `ux2-*.png` files without `qa` are his.
- Flakiness note: one full run failed once in section 7 with "OpenCV worker failed to start: Worker script error" (the 20-run leak harness); the same section passed twice on immediate re-run and in the final run. I could not reproduce it. Unverified cause (possibly the single local server under load); worth a look if it recurs.

Sources: `knowledge/qa-tester/` (devtools checks, accessibility testing, ex1 to ex3), `docs/design/ux-flows.md` sections 12.16 and 12.17, `docs/erp/plain-language-results.md`, `CLAUDE.md`, `samples/manifest.json`, Playwright `ariaSnapshot`.

---

# Round 1 (wave D, before the first-use redesign)

## Round 1 verdict: READY for release (superseded by the Round 2 verdict above)

Every definition-of-done item in `CLAUDE.md` passed in a real browser. The one failing automated check is a cosmetic layout defect (QA-001, a table that overflows on `how-it-works.html` at 375 px). I do not consider it a release blocker; Juno should fix it, and I will retest in one command. No defect touches privacy, correctness, persistence or the pipeline.

Two things I could not do here are listed as unverified in section 6 (Lighthouse score, the 200% zoom and reduced-motion passes).

## 1. Summary

| Result | Count |
|---|---|
| Automated checks run (`run_qa.js`) | 95 |
| PASS | 94 |
| FAIL | 1 (QA-001) |
| Info records (evidence only) | 6 |
| Existing suites | 8 of 9 green; `run_all.sh` 5 sub-failures, all explained in section 4 (none is an app defect) |

## 2. Check table (pass or fail, with evidence)

Ids match `tools/qa/run_qa.js` and `tools/qa/qa-results.json`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Every manifest pair, through the real UI (Load sample) | **PASS** (8/8) | tl-timesheet FAIL 2 regions (min 2); hcm-job-data FAIL 3 (min 2); hcm-personal-data FAIL 4 (min 2); fscm-voucher FAIL 4 (min 1); fscm-po FAIL 1 region, "under 0.1% of page" (min 1); shifted PASS 0 regions (max 0); zoom110 FAIL 25 regions, "Aligned: shift (0, 0), scale 0.91"; identical PASS 0 (max 0). Fresh profile starts in `ready-empty`; the select lists all 8 entries |
| 1a | fscm-po: Add suggested ignore zone, Compare again | **PASS** | FAIL then PASS, 0 regions, "Ignored: 1 zone (0.238% of page)" |
| 1b | Shifted pair shows "Aligned: shift (0, 3)" | **PASS** | exact text; PASS with 0 regions |
| 1c | zoom110 FAIL with the capture-artifact hint | **PASS** | the hint reads "Likely: Capture or rendering artifact. Many small regions wi...". The brief says "Likely capture artifact"; the app's wording is "Capture or rendering artifact" (same meaning, not a defect) |
| 2 | Zones drawn by mouse drag | **PASS** | drag from 10%,10% to 30%,15% of the thumbnail opened the dialog pre-filled x 137, y 90, w 274, h 46 (expected about 137, 90, 273, 45); focus lands in Label; empty label rejected inline; zone listed |
| 2a | Zones through the keyboard and numeric form | **PASS** | Enter on "Add zone manually", typed label, Tab through X/Y/W/H, Enter: "Keyboard zone, 120 by 30 pixels at 400, 500". Out-of-bounds gives "That zone extends past the baseline (1366 by 900 pixels). Reduce X or Width."; Esc returns focus to the opener; summary "2 zones ignored (1.3% of page)" |
| 2b | Zones are applied by Compare and stored | **PASS** | Result stat "Ignored: 2 zones (1.318% of page)"; `ignoreZones` has 2 rows after a reload |
| 2c | Alignment works | **PASS** | see 1b (a +3 px shift is aligned and is not reported as a change) |
| 3 | IndexedDB `erpinspector` structure | **PASS** | `indexedDB.databases()` gives `erpinspector@v1`; an open shows stores `ignoreZones, pages, runs, settings` |
| 3a | Pages, zones and runs survive a reload | **PASS** | counts before and after reload identical (pages 1, runs 1; zones 2 in section 2); Library lists the page; History shows the run (Not signed off, evidence ids visible) |
| 3b | Exported run passes the validator | **PASS** | `tools/validate_evidence.py` reports VALID for the exported JSON (`tools/qa/qa-export-run.json`) |
| 4 | Reset app data: dialog | **PASS** | title "Reset app data?", default focus on Cancel, Cancel keeps the data |
| 4a | Reset: confirm, done, empty after reload | **PASS** | "App data deleted", `pages, runs, ignoreZones` all 0 immediately and after reload; Library shows the empty state; samples still load. `settings` keeps one row (the `engineSeen` flag, not user data) |
| 4b | Reset with a second app tab open | **PASS** (note below) | The second app tab closes its connection on `versionchange`, so the reset finishes at once and that tab shows "The library was reset in another tab. Reload this page." |
| 4c | Truly blocked path (a tab holds the DB open and ignores `versionchange`) | **PASS** | dialog shows "Close other tabs of this app to finish the reset.", no done state, the button stays enabled; when the other tab closes its connection the reset completes by itself ("App data deleted") |
| 5 | Network quiet after ready (Load sample plus Compare x3) | **PASS** | After "ready" the only requests were `/samples/tl-timesheet_before.png`, `/samples/tl-timesheet_after.png` and one `blob:` URL (in-memory thumbnail, not network). 3 s idle afterwards: 0 requests |
| 5a | 0 cross-origin requests ever | **PASS** | 0 across the whole session, and across all 20 pages in check 8 |
| 5b | Initial load requests (listed for the record) | info | 19 same-origin: index.html, css/app.css, 9 files in js/, inspector.worker.js, vendor/opencv/4.13.0/opencv.js, samples/manifest.json, js/region-hints.json, js/cv/{align,ssim,heatmap,pipeline}.js |
| 6 | Heavy work off the main thread | **PASS** | 5 compares (about 410 to 515 ms each, click to result): max requestAnimationFrame gap 33 ms (16.7 ms is one frame at 60 Hz), **0 long tasks** (PerformanceObserver `longtask`), also 0 during Load sample |
| 7 | No Mat leak over 20 runs | **PASS** | On a dedicated `createInspector` (the app does not expose its own), `heap()` after each of 20 compares (alternating with and without zones): bytes 134,217,728 constant from before the first run to run 20; `_malloc` probe address constant at 7,098,176 from run 1 to run 20 (7,098,160 before the first run). Iris's harness also shows 1,920 of 1,920 Mats freed and a leak control that is detected |
| 8 | Console and CSP on every page | **PASS** | 20 pages (index, how-it-works, resources, demo index, 16 demo before/after pages): 0 console errors or warnings, 0 page errors, 0 `securitypolicyviolation` events, all HTTP 200; `favicon.svg` 200 (no QA-001-style favicon 404) |
| 9 | Keyboard-only: Load sample, result, decisions, Save, Sign off | **PASS** | Tab reaches Load sample (9 stops); Enter gives the result; focus goes to `#result-status`; Tab + Space marks each region; Enter on Save run, typed the 4 evidence fields, "Saved as run 1"; Sign off by keyboard works |
| 9a | Visible focus | **PASS** | all 9 Tab stops on the Library have a 2 px or larger outline or shadow |
| 9b | Tabs, slider, radios | **PASS** | ArrowRight, End, Home move and activate tabs (Side-by-side, Heatmap, Boxes); slider Home 0, End 100, `aria-valuetext` "Showing 100% after, 0% before"; arrows switch radios |
| 9c | aria-live announcements | **PASS** | the pill is `role=status aria-live=polite`, `#announcer` is polite. Captured: "Comparison finished. FAIL, 2 changed regions, 8.3 percent of page." (exactly once), "Region 2 marked Expected. 2 of 2 reviewed.", the saved announcement. Pill sequence: "Loading OpenCV (10 MB, first visit only)…" then "Ready" |
| 9d | axe-like basics (my own DOM checks; axe-core is not vendored and a CDN is out of bounds) | **PASS** | `lang=en`, 1 main, 1 nav, 1 header, skip link; exactly one visible h1 on each of the 5 screens; every visible button and link named; no `<img>` without alt; every visible canvas labelled; every control labelled; no duplicate ids; every dialog labelled; no `tabindex>0`; every `aria-disabled` button has `aria-describedby`; 0 targets under 44x44 px on the result screen |
| 9e | Wren section 11.1 to 11.4 | **PASS** | Regression keeps Sign off `aria-disabled` with the exact hint "Sign off isn't available while a region is marked Regression. Log a defect, attach the report, and retest after the fix."; all Expected but unsaved: "Save the run first."; after Save, Sign off enabled, Promote disabled ("Sign off first."); after sign-off, Promote enabled |
| 9f | Wren 11.6: duplicate name, storage blocked | **PASS** | duplicate: "A page named “Time & Labor – Timesheet” already exists…", `aria-invalid=true`, Open existing page shown. Storage blocked (`indexedDB` getter throws): `#notice` = `storage-blocked`, sample still compares in memory, 0 page errors |
| 9g | Wren 11.6: quota | not tested | cannot be simulated reliably in headless; unverified (the Ledger and Juno reviews cover the code path) |
| 10 | Layout at 1366 and 375 px, light and dark | **FAIL** (QA-001) | No horizontal scroll on Library, Compare, Result, History, Settings or Resources at 1366 or 375 px, light or dark. **`how-it-works.html` scrolls sideways at 375 px (scrollWidth 432 vs 375)** because its "Capture rules" table is not in `.table-wrap` |
| 10a | Screenshots | **PASS** | 8 PNGs in `docs/qa/screenshots/` (see section 5); viewed result-375-dark and result-1366-dark: readable, nothing clipped, screenshots on opaque panels, hatched and numbered boxes visible |
| 10b | Header links How it works and Resources | **PASS** | at 1366 px (x 642 and 770) and 375 px (the nav wraps to a second row, x 16 and 139, both inside the viewport): one click each, both pages show their h1, link to each other, and the brand link returns to `index.html#/library`. All 16 local links on Resources return 200; all 38 external links have `rel` with `noopener` |
| 11 | Compare with a user-chosen file while the context is offline | **PASS** | after load, `context.setOffline(true)`, `setInputFiles('#candidate-file', samples/tl-timesheet_after.png)`, Compare: FAIL, 2 regions, "Offline — everything still works on this device." shown; 0 network requests. A text file renamed as input gives the friendly "That file isn't a PNG image…" error |
| 11a | Print report | **PASS** | with `window.print` stubbed (counted: 1 call), `#print-report` is filled: h1 "Time & Labor – Timesheet (Time & Labor)", 3 table rows or more, 3 canvases. With `emulateMedia('print')` it is `display:block`, 1366 px wide, and the header and main are `display:none`. `page.pdf()` gives a 140 KB, 2-page PDF whose text contains the evidence fields, "Changed regions" and the disclaimer |
| 13 | Peer review of Mason's samples | **APPROVE** (section 5) | |

## 3. Defects

Format: ID | severity | steps | expected | actual | owner.

### QA-001 | minor | `how-it-works.html` scrolls sideways at 375 px | owner: **frontend-engineer (Juno)**

| Field | Value |
|---|---|
| Steps | 1. `python3 tools/serve_netlify.py --port 8107`. 2. `QA_ONLY=10 node tools/qa/run_qa.js` (check 10.1), or open `http://localhost:8107/how-it-works.html` at 375x812 and look at `document.documentElement.scrollWidth` |
| Expected | No horizontal page scroll at 375 px (Wren's layout rule: 16 px gutter, no horizontal scroll) |
| Actual | `scrollWidth` 432 vs `clientWidth` 375, in light and dark. The `<table class="table">` with caption "Capture rules" (`how-it-works.html` line 75) is 745 px wide and sits directly in the page, not inside `.table-wrap` |
| Evidence | `tools/qa/qa-results.json`, entry 10.1: `{"vw":375,"route":"how-it-works.html","sw":432,"cw":375}`. Every other page and screen passes |
| Suggested fix | Wrap the table: `<div class="table-wrap">…</div>` (the class already exists in `css/app.css` line 446 and is used for the History table) |
| Status | open. Retest: `QA_ONLY=10 node tools/qa/run_qa.js`, expect `PASS [10.1]` |

### Observations (not defects, no action required for release)

| ID | Note | Owner if anyone picks it up |
|---|---|---|
| OBS-1 | After "Add suggested ignore zone" on fscm-po, `#zone-added-note` is empty. The flow still works (the primary button becomes Compare again and the zone is announced), but Wren's section 4 wording ("Zone '…' added. Compare again to apply it.") is only shown for the from-region path. I did not check that note on the from-region path | Juno |
| OBS-2 | The brief wording "Likely capture artifact" differs from the app's "Likely: Capture or rendering artifact" | none (the app copy is fine) |
| OBS-3 | The reset with a second app tab: the other tab shows the notice under the `storage-blocked` state ("The library was reset in another tab. Reload this page."). Works as designed | none |

## 4. Existing suites (run one at a time with `bash tools/qa/run_suites.sh`)

| Suite | Result |
|---|---|
| `node tools/app-smoke/run.js` (own server, port 8106) | **PASS**: ALL 32 CHECKS PASSED |
| `node tools/app-smoke/hints.test.mjs` | **PASS** (exit 0; 8/8 per Juno's log) |
| `node tools/cv-test/run.js` | **PASS**: 22/22 pairs as expected; leak check FLAT; negative control detected |
| `node tools/worker-test/run.js` | **PASS**: exit 0 (all checks green in `tools/qa/suites.log`) |
| `node tools/db-test/run.js` | **PASS**: 32/32 checks (including "blocked upgrade" and "reset resolves {blocked:true}, then completes once the other tab closes") |
| `python3 tools/privacy_audit.py` | **PASS**: PRIVACY AUDIT CLEAN, 0 findings, 4 warns, 61 info (the known warns in `docs/security-audit.md`) |
| `python3 tools/contrast_check.py` | **PASS**: 208/208 token pairs, all four themes (light, dark, and both with contrast-more) |
| `python3 tools/validate_evidence.py` on an exported run | **PASS**: `tools/qa/qa-export-run.json: VALID` |
| `bash tools/verify-knowledge/run_all.sh` | **5 sub-failures, none an app defect** (below). Passed: python mirror, liquid-glass contrast example, evidence example, team lint (17 agents, 26 skills, TEAM OK) |

`run_all.sh` sub-failures:
1. `run_browser_examples.py`, `capture_and_verify.py` and `ex1_qa_smoke.py` (3 failures): **skipped, environment**. They `import playwright` for **Python**, which is not installed here (only the Node package). The same behaviour is covered by the Node equivalents above (cv-test, worker-test, db-test, run_qa.js sections 5 and 8). Run them where `pip install playwright` is available.
2. `validate_examples.py`: "links in docs/README.md: broken ['qa-report.md']". This was missing only because this report did not exist yet. It now resolves (retest: `python3 -I knowledge/release-docs-engineer/examples/validate_examples.py`; I did not re-run it after writing this file).
3. `ex2_privacy_audit.py` (the older, naive knowledge example) reports 7 "findings": the keyword list inside `tools/privacy_audit.py` itself, and random 20-letter strings in the minified, sha256-pinned `vendor/opencv/4.13.0/opencv.js` that look like AWS key ids. These are false positives. The project's own `tools/privacy_audit.py` excludes `vendor/` (pinned by hash) and its own pattern list, and is clean. Suggest Forge or Vera either point this example at `tools/privacy_audit.py` or give it the same exclusions.

## 5. Peer review of Mason's samples (mock-erp-builder, qa-tester pair): **APPROVE**

Method: read each PNG's size and mode with PIL, diffed every before/after pair with OpenCV (max-channel difference above 30, dilated, connected components), and looked at `tl-timesheet`, `hcm-job-data_after` and `fscm-voucher_after` by eye (plus the Result screenshots). I did not view all 16 images by eye; Vera's audit did (`docs/security-audit.md` section 5).

| Standard | Finding |
|---|---|
| 1366 wide, 1366x900, PNG, RGB, no metadata | All 16 files are 1366x900 RGB PNG, 69 to 110 KB, no embedded metadata. The only exception is `hcm-job-data-zoom110_after.png` at **1503x990**, on purpose (1.1x device scale; the manifest note says so) |
| Fictional | Every page header says "Demo ERP (fictional)" with a TEST badge; "Jordan Rivera", EmplID 000123, "Harbor Office Supply (fictional)", footer "Fictional demo data for a computer vision class project." No logos, no real names, no County or Oracle branding on the three images I viewed. Text scan clean (privacy audit) |
| Planted changes visible | Measured difference boxes: tl-timesheet 2 regions (12,233 774x170 and 13,409 275x23, the same two regions the app reports); hcm-job-data 6 boxes (Save button area, field values, bottom row); hcm-personal-data 4 boxes; fscm-voucher 3 column boxes (the clipped "500.0" amount is visible by eye); fscm-po one 68x18 px box at (1276,75) (242 changed pixels); identical 0; shifted: whole page offset (aligned out by the app) |
| Match the manifest | The app's results equal the manifest expectations for all 8 pairs (check 1) |
| Realism | Pages look like a PeopleSoft-style classic layout (breadcrumb, tabs, grid, action buttons) without copying Oracle assets |

Notes, none blocking: the fscm-po change is deliberately tiny (under 0.1% of the page); the zoom110 pair is a capture-standard violation demo and correctly FAILs with the artifact hint (Atlas decision, handoff-log rows 77 and 84).

## 6. Not covered and unverified

- **Lighthouse accessibility score (target 90 or more):** not run. Lighthouse is not installed here and I did not fetch it. My DOM checks, the keyboard pass and Sable's 208/208 contrast run stand in for it. Unverified.
- **200% zoom and reduced-motion passes** (`knowledge/qa-tester/docs/02-accessibility-testing.md` steps 4 and 5): not run in this pass. The 375 px layout (equivalent to about 365% zoom on a 1366 screen) passes except QA-001.
- **Quota exceeded and Chrome incognito with site data blocked:** quota not simulated; "blocked" was simulated by making `indexedDB` throw, not with a real incognito window.
- **Google Chrome:** tested on Playwright's Chromium 157, not branded Chrome. Playwright's `window.print` was stubbed; the system print dialog was not exercised (the print layout was checked through print media emulation and `page.pdf()`).
- **Live Netlify deployment:** tested only locally with `tools/serve_netlify.py` (same headers). The live site is Piper and Atlas's step.
- **Mat leak control for my own run:** I did not plant a leak in the app (no app edits allowed); the negative control is Iris's `tools/cv-test/run.js`, which caught a deliberate one-Mat-per-run leak (heap growth 134 MB, 128 MiB per step) in this run.

## 7. Files

- `docs/qa-report.md` (this file)
- `tools/qa/run_qa.js`, `tools/qa/run_suites.sh`, `tools/qa/qa-results.json`, `tools/qa/suites.log`, `tools/qa/qa-export-run.json` (the exported run used for the validator)
- `docs/qa/screenshots/` (8 PNGs, 1366 and 375 px, light and dark): `library-empty-1366-light.png`, `result-1366-light.png`, `result-1366-dark.png`, `compare-1366-dark.png`, `how-it-works-1366-light.png`, `result-375-light.png`, `result-375-dark.png`, `resources-375-dark.png`

Sources: `knowledge/qa-tester/` (devtools checks, accessibility testing, ex1 to ex3), `CLAUDE.md` definition of done, `knowledge/VERIFICATION.md`, `docs/build-plan.md`, `docs/design/ux-flows.md` sections 4, 6, 7 and 11, `docs/handoff-log.md`, `docs/security-audit.md`, `docs/worker-notes.md`, `samples/manifest.json`.

## Retest after release fixes (Atlas, 2026-11-22)
- **QA-001 — FIXED.** Juno wrapped the "Capture rules" table in `.table-wrap` and added `<wbr>` break points in the long file-name pattern. `QA_ONLY=10 node tools/qa/run_qa.js` → `[10.1] PASS`.
- **Full re-run:** `node tools/qa/run_qa.js` → **95 passed, 0 failed, 6 info** (72 s).
- **OBS-1:** not a defect. The note fills in after the zone is saved asynchronously (Juno).
- **run_all.sh:** the knowledge privacy example now passes (Vera aligned its exclusions). The 3 remaining sub-failures are the Python-playwright examples, skipped because the Python `playwright` module isn't installed here. The Node suites cover the same behaviour.
- **Verdict:** READY.

---

# Round 3 (UX-QA-3, final round), Quinn, 2026-11-22

Targets: local build via `tools/serve_netlify.py` (real `netlify.toml` headers) **and** the live site https://cvfinal-erp-inspector.netlify.app/ (commit "Guided demo works on phones and shows Save result at step 5"). Chromium 157 (Playwright), not branded Chrome.

## Verdict: **READY**
No blockers or majors. Three minor defects (QA-R3-1 to QA-R3-3 below) are cosmetic or semantic and do not stop a first-time user from finishing the demo, saving and signing off. Fix them if there is time; none gates the release.

## Results
| Run | Result |
|---|---|
| `node tools/qa/run_qa.js` (local, full) | **226 pass, 4 fail, 19 info** (195 s). Before my edits: 196 pass, 6 fail. The 4 failures are the 3 new defects below (14.3b + 15.1g.375 + 15.1g.1366 are one defect; 15.5c is another) |
| `node tools/qa/run_live.js` (live Netlify) | **8 pass, 0 fail**: HTTP 200, new landing, one primary button and plain nav, Try the demo then Skip gives "FAIL — 2 changes found" with 2 cards, 0 cross-origin requests, only the demo PNGs requested after ready, no app console or CSP errors, headers present (CSP, nosniff, no-referrer, frame DENY) |

Live-site note (not an app defect, unchanged from Round 2): Netlify injects `/.netlify/scripts/hud?variant=public`, whose inline style and script are blocked by our CSP, logging 2 console errors with location `about:srcdoc`. The runner lists them separately. It is a hosting badge; the app itself logs nothing.

## Existing checks I changed (all Atlas-approved, behaviour deliberately changed; nothing else weakened)
| Check | Old rule | New rule |
|---|---|---|
| 13.3 | one Tab from heading reaches Next | Tab from heading reaches Next after **only** the stage canvas stop(s) (`tour-before` / `tour-after`); anything else in between fails. Observed `["tour-before","tour-next"]` |
| 14.3 | canvases `role=img` | canvases `role=button`, `aria-label="Enlarge image"` (the rest of the rule is unchanged: labelled region, heading `tabindex=-1`, not aria-live, Skip a real button). The `aria-expanded` state is a separate check, 14.3b |
| 13.7 | focus lands on card 1 after Finish | page at top (scrollY <= 1) and focus on the strip step with `aria-current="step"` inside `#result-steps` |
| 11.35 | same Finish assertion as 13.7 (not on Atlas's list of 5, but the same change: it also failed) | same as 13.7 |
| 12.4.375-* | card 1 covered <= 25% | if the card is taller than the free area (above the phone bar, or below the desktop top bar), assert its **top is visible**: title fully uncovered and inside the viewport, crops uncovered, starting on the free side and >= 80 px visible. A card that fits keeps the old coverage rule. Real values at 375: card 1,483 px, free area 634 px, title 44 px visible, crops 243 px visible, 0 px covered |

My first version of the 12.4 rule failed at 1366-dark because I assumed the tour panel is always a bottom bar. At desktop it is a top bar (panelTop 94, card starts at 308, 0 px covered). That was my test bug, not the app; the rule now picks the side from the panel position. 12.4b (crops <= 25% covered) is unchanged and still passes.

## New checks (section 15 in `tools/qa/run_qa.js`; 27 checks, 24 pass)
| Check | Result |
|---|---|
| 15.1a-f tap-to-enlarge at 375 and 1366: click opens a full-screen view (position fixed, 0,0 and full viewport size, `aria-expanded=true`, label "Shrink image"); **Esc closes it, focus returns to the image, the tour stays open**; Enter opens and Space closes; clicking the enlarged image shrinks it; on step 2 both the Before and After image (after Flip) behave the same | **PASS** (both widths) |
| 15.1g `aria-expanded="false"` present before the first toggle | **FAIL** (QA-R3-1) |
| 15.2 Next/Finish and Skip fully inside the viewport, no scrolling, Next >= 44 px tall, on **all 5 steps** at 375 light, 375 dark, 1366 light, 1366 dark | **PASS** (20 of 20). Tightest case: Next bottom at 803 of 812 px on the phone |
| 15.3a clean profile: Try the demo, then "Try an example" from My pages opens a result with the manifest's status for **all 8 examples** (FAIL counts 2, 3, 4, 4, 1, 0 PASS, 25 FAIL zoom, 0 PASS) | **PASS** |
| 15.3b second round with every example already saved: all 8 open again; still 8 pages in IndexedDB (no duplicates) | **PASS** |
| 15.4a/b 4 old-titled pages pre-seeded in IndexedDB without `sampleId` ("Time & Labor – Timesheet", "FSCM – Purchase Order (timestamp only)", "FSCM – Purchase Order (identical)", "HCM – hcm-job-data"): "Try an example" opens a result for all 8; the old pages are reused, 8 pages in total, no error notice | **PASS** (Juno's fix holds) |
| 15.5a "Which PeopleSoft page is this?" lists "Time & Labor – Timesheet" (316 options, with Other) and picking it fills the name | **PASS** |
| 15.5c picking it also sets Module to "Time and labor" | **FAIL** (QA-R3-2) |
| 15.1f, 15.3c, 15.4c, 15.5b no console or CSP errors in these passes | **PASS** |

My first seed for 15.4 used an invented legacy name ("HCM – Job Data"), which the app does not treat as an old name, and gave 9 pages. That was my test data, not an app defect; I replaced it with a name the app does list as an alias.

## Defects
ID | severity | steps | expected | actual | owner
---|---|---|---|---|---
QA-R3-1 | minor (a11y) | Try the demo, tour step 1. Inspect `#tour-before` / `#tour-after` (check 14.3b, 15.1g) | A toggle button exposes its state from the start: `aria-expanded="false"` | `role="button"` and `aria-label="Enlarge image"` are set, but `aria-expanded` does not exist until the first click (`js/app.js` ~1149-1152 sets it only inside `flip`). A screen reader announces a plain button, not a collapsed one, until it has been used | Juno: add `c.setAttribute('aria-expanded','false')` where the role is set
QA-R3-2 | minor | My pages, "Compare my own screenshots", choose "Time & Labor – Timesheet" in "Which PeopleSoft page is this?" (check 15.5c) | Name "Time & Labor – Timesheet" and Module "Time and labor" (the Timesheet example is a Time & Labor page) | Name is filled, **Module stays HCM**. Cause: `onPsChange` (`js/app.js` ~347) tests `mod === 'Time & Labor'`, but `js/ps-catalog.json` spells the module "Time and Labor" (only the built-in fallback catalog uses "&"), so it never matches and falls back to the product, HCM | Juno: compare against the catalog's spelling, or normalise "and" and "&"
QA-R3-3 | minor (UX, first-time user; unverified on a real phone) | At 375 px, tour step 1, tap the Before image (screenshot `docs/qa/screenshots/r3-qa-enlarged-375.png`) | The enlarged view is easier to read than the thumbnail; the way to close it is visible | It is a full-screen view, but the 1,366 px page is fitted to the 375 px width, so it is only about 1.1x the 328 px thumbnail and the text is still unreadable (the CSS caps the canvas at `max-width: 100%`, so there is nothing to pan or zoom). There is no close button or "Tap to close" hint, so a phone user (no Esc key) has to guess that tapping closes it | Sable and Wren: either show it at a legible scale with scrolling, or add a visible Close button and drop the "enlarge" promise

Observations, no action needed: (a) at 375 px the sticky four-row app header takes about 200 px and the tour bar another 178 px, leaving roughly 430 px of page (visible in the step 3 screenshot); both stay usable. (b) On step 1 at 375 px the caption under the image is partly under the bar; it scrolls into view.

## Screenshots reviewed (as a first-time user)
Regenerated by `run_qa.js` (8 files, `docs/qa/screenshots/`): `ux2-qa-landing-1366-dark.png`, `ux2-qa-landing-375-light.png`, `ux2-qa-tour-step1-375-dark.png`, `ux2-qa-tour-step3-375-light.png`, `ux2-qa-tour-step4-375-dark.png`, `ux2-qa-result-cards-375-dark.png`, `ux2-qa-result-cards-1366-dark.png`, `r3-qa-enlarged-375.png`. I looked at five of them.
- Landing 1366 dark: one big "Try the demo (30 seconds)" button, the story in plain words, "What to expect" tells me the answer before I click. Clear.
- Tour step 1 and step 4 at 375: the bar always shows the step sentence, Back, Next and Skip. At step 4 I can see the change card's title, the Before/After crops and the red badge above the bar, which is what the new 12.4 rule asserts. I could follow the story.
- Tour step 3 at 375: red boxes, view tabs and the "Changes to review" heading are visible; fine.
- Result cards 1366 dark: numbered box on the page matches the card; the plain "What this probably is" text and the three decision choices read well.
- Enlarged view at 375: the surprising one (QA-R3-3).

## Still unverified (carried over)
Lighthouse accessibility >= 90 (not installed here; DOM checks, keyboard pass and Sable's contrast run stand in), real-phone touch behaviour, branded Chrome, quota-exceeded storage.

Sources: `knowledge/qa-tester/docs/` and `examples/`, `CLAUDE.md` definition of done, `tools/qa/qa-results.json`, `tools/qa/live-results.json`, `js/app.js`, `js/ps-catalog.json`, `css/app.css`.

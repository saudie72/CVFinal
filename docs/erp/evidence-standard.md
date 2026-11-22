# Evidence standard (run fields, report layout, sign-off)

Owner: Tess (erp-test-lead). Contract for Ledger (`js/db.js`, `runs.evidence`) and Juno (save-run form, `js/report.js`). All examples are fictional ("Demo ERP (fictional)", BU-NORTH, TL_EMPLOYEE).
Sources: `.claude/skills/uat-evidence-traceability/SKILL.md`, `.claude/skills/indexeddb-library/SKILL.md`, `knowledge/erp-test-lead/docs/01-ptf-and-test-evidence.md`, `knowledge/erp-test-lead/examples/` (ex1 to ex3), `docs/business-case.md`.

**Positioning (use verbatim):** "A supplemental quality-assurance tool for the visual-comparison part of testing, not a replacement for functional or security testing." The inspector checks appearance; PTF checks behaviour; the run evidence sits next to the PTF test case ID.

## 1. Run evidence fields

### 1a. `runs.evidence` object (matches the indexeddb-library skill)
| Field | Type | Required | Example |
|---|---|---|---|
| `testCaseId` | string | **yes** | `VR-TL-01` |
| `ticketId` | string (change / ticket ID) | **yes** | `CHG-0042` (fictional) |
| `toolsVersion` | string, free text (PeopleTools release or PUM image) | **yes** | `PI 50 (fictional)` or `PT 8.62.xx` |
| `tester` | string, initials | **yes** | `SA` |
| `businessUnit` | string | no | `BU-NORTH` |
| `role` | string (fictional role name) | no | `TL_EMPLOYEE` |

Optional extras inside `evidence` (additive, no schema bump; IndexedDB values are schemaless): `environment` (e.g. `TEST`), `note` (free text), `expectedDifference` (security scenarios: the intended role difference, e.g. "Approve button only for TL_MANAGER").

### 1b. Other run fields the evidence relies on
| Field | Type | Required | Example |
|---|---|---|---|
| `createdAt` | ISO-8601 string or epoch ms (the **run date**) | **yes** | `2026-11-22T14:21:00Z` |
| `status` | `PASS` or `FAIL` | **yes** | `FAIL` |
| `changedPct`, `ssim` | number | yes / no | `5.51`, `0.962` |
| `settings` | `{T, kernel, minArea, thresholdPct}` | **yes** (`thresholdPct` is checked) | `{25,5,64,0.1}` |
| `alignment` | `{method, dx, dy, scale}` | no | `{"method":"none",...}` |
| `regions[]` | `{n, x, y, w, h, decision, note}` (`width`/`height` also accepted) | yes (may be empty on PASS) | see below |
| `regions[].decision` | `Expected` \| `Regression` \| `Noise` | **yes for every region of a FAIL run** | `Regression` |
| `regions[].note` | string | no | `Submit moved below grid` |
| `ignoreZones` | array of `{x,y,w,h,label}` used | no | `[]` |
| `signOff` | `{signedOff, reviewer, signedOffAt, baselinePromoted}` | no until sign-off | see section 3 |
| `disclaimer` | string containing "not a replacement" | **yes** in exports | "Visual check only, not a replacement for functional or security testing." |

Decision meanings: **Expected** = intended by the change; **Regression** = unintended defect; **Noise** = harmless difference (rendering, timestamp), handled by an ignore zone or a per-page threshold.

## 2. Report layout (PNG header and printable HTML)
In this order:
1. Title (page, module), status badge (PASS/FAIL), date and time.
2. Evidence block: testCaseId, ticketId, toolsVersion, businessUnit, role, environment, tester, reviewer, sign-off state.
3. Thumbnails: baseline, candidate. Boxes view (and diff / heatmap when exported).
4. Region table: `#`, size (w x h), position (x, y), decision, note. Open regions are visibly flagged.
5. Ignore zones used and % of the page ignored.
6. Settings: T, kernel, min area, threshold %. Alignment method (dx, dy, scale).
7. Sign-off line: reviewer, date, "baseline promoted: yes/no".
8. Disclaimer line. For role-based runs add: "A visual comparison shows what was rendered for the tested role. It does not prove authorization is correct: hidden controls may still be reachable, and data access is enforced by permission lists, roles and row-level security, which must be tested functionally."

## 3. Sign-off rules
| Condition | Outcome |
|---|---|
| PASS | Passes visual UAT; tester initials. No promotion needed if nothing changed. |
| FAIL, all regions Expected | Passes. Reviewer signs off, **then** promotes the candidate to the new baseline. |
| FAIL, Noise regions only | Add an ignore zone or adjust the per-page threshold, rerun, record the reason. Sign-off allowed (every region decided Expected/Noise). |
| **Any Regression** | **No sign-off, no promotion.** Raise a defect with the PNG/HTML report attached; retest after the fix. |
| FAIL region with no decision | No sign-off until decided. |
| Role-based scenario | Visual sign-off covers display only; functional security testing is still required. |

Hard rules (enforced by `tools/validate_evidence.py`): `signedOff:true` needs a reviewer, a sign-off date, no Regression region, and a decision on every region of a FAIL run; `baselinePromoted:true` needs `signedOff:true`. The UI should enforce the same (disable Sign off while a Regression is open; disable Promote until signed off).

## 4. Validation
`python3 tools/validate_evidence.py <export.json>...` (accepts one run, an array, or `{"runs":[...]}`). Examples: `tools/evidence-examples/valid-signed-off.json`, `valid-open-regression.json` (open Regression, correctly unsigned), `invalid-regression-signed-off.json` (8 errors).

## 5. Open points for the orchestrator
- **Naming conflict:** the task brief said Expected/Regression/**Ignore**; the skills and knowledge say **Noise**. This standard uses `Noise`; the validator accepts `Ignore` as an alias with a warning. Please confirm and keep the UI and db on one word.
- `signOff` (and optional `evidence.environment/note/expectedDifference`) are not in the indexeddb-library skill. Ledger should store `signOff` at the run level; no version bump needed.

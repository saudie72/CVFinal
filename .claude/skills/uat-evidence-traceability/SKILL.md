---
name: uat-evidence-traceability
description: "Define the evidence fields stored with each run and the report layout for UAT, QA and audit traceability. Use when designing the save-run form, the IndexedDB run record or the exported report."
user-invocable: false
---
# UAT evidence and traceability

## Run evidence fields (stored in runs.evidence)
| Field | Example | Required |
|---|---|---|
| testCaseId | VR-TL-01 | yes |
| ticketId / change ID | CHG-0042 (fictional) | yes |
| toolsVersion / PUM image | "PT 8.62.xx" / "PI 50" (free text) | yes |
| businessUnit | BU-NORTH (fictional) | no |
| role | TL_EMPLOYEE (fictional) | no |
| tester | initials | yes |
| reviewer decision per region | Expected / Regression / Noise | yes for FAIL |
| note | free text | no |

## Report layout (PNG header + printable HTML)
Title (page, module) · status badge · date/time · evidence fields · thumbnails (baseline, candidate) · boxes view · region table (#, size, position, decision) · ignore zones used and % ignored · settings (T, kernel, min area, threshold %) · alignment method · disclaimer line.

## Sign-off
A page passes UAT when the status is PASS, or every region is marked Expected/Noise by a reviewer. Promote the candidate to the new baseline only after sign-off.

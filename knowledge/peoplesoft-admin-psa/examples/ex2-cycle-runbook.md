# Example 2: upgrade-cycle runbook entry (fictional PI number)

**Cycle:** apply HCM change package from "PI 50" (fictional) to the TEST environment.

| Step | Who | Action | Inspector |
|---|---|---|---|
| 1 | Analyst | Capture **before** PNGs for 25 in-scope pages (capture standard) | Library → page → *Set baseline* |
| 2 | PSA | Apply the change package with Change Assistant | — |
| 3 | Analyst | Capture **after** PNGs with the same users and data | Drop the *after* PNG on each page |
| 4 | Analyst | Compare; triage each region: Expected / Regression / Noise | Evidence fields: PI 50, CHG-0042 |
| 5 | Test lead | Review FAILs; sign off or raise defects | Export the report (PNG/HTML) |
| 6 | Analyst | After sign-off, **promote after → baseline** | Page → *Promote to baseline* |

Rollback note: if the package is backed out, the old baselines still match, so don't promote until sign-off.

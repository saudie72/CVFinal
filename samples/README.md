# Samples (all fictional: "Demo ERP (fictional)")

Eight before/after screenshot pairs, 1366x900 PNG, built by Mason from `demo-erp/` (see `tools/capture-samples.md`).

`manifest.json` is the list the app reads. Each entry has human-facing fields (`title`, `story`, `whatToExpect`, `group`, `order`) and machine fields (`page`, `before`, `after`, `expected`, `ignoreZones`, `expectedWithIgnoreZones`, `note`). Tests use the machine fields; do not rename them.

| order | Group | Title | What happened | Expect |
|---|---|---|---|---|
| 1 | Start here | Timesheet | Submit button moved below the hours table; Reported Hours column cut off | FAIL, changes found |
| 2 | More examples | Employee job record | Pay Grade field gone; Save button moved | FAIL |
| 3 | More examples | Personal details | 'Dept ID' label became 'Department'; a link changed colour | FAIL |
| 4 | More examples | Supplier invoice (voucher) | A column shifted and Amount got cut off | FAIL |
| 5 | Tricky cases | Purchase order (with a changing clock) | Only the 'Last updated' clock differs | FAIL, then PASS once the clock is ignored |
| 6 | Tricky cases | Employee job record (page scrolled slightly) | Same page scrolled 3 px; inspector lines it up | PASS |
| 7 | Tricky cases | Purchase order (same page twice) | Identical | PASS |
| 8 | Tricky cases | Employee job record (different screen scale) | After taken at 1.1x scale (breaks capture rules) | FAIL (bad capture, not a real problem) |

The "Tricky cases" group is shown to users as "How the inspector handles tricky cases". The `page` ids (for example `fscm-po`) stay as file names only; users never need to see them.

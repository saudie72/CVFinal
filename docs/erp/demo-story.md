# Demo story: 3-minute showcase (Timesheet walkthrough)

Owner: Morgan. Fictional data only ("Demo ERP (fictional)"). Practice once with DevTools already docked, so nothing needs setting up on stage.

**Opening line (word for word):** "This is a supplemental quality-assurance tool for the visual-comparison part of testing — not a replacement for functional or security testing."

## Setup before you start (not counted in the 3 minutes)
- Open the live Netlify URL in Chrome. Open DevTools docked on the right with the **Application** tab ready (IndexedDB > `erpinspector`). Keep **Network** one click away.
- Start from a clean state: click **Reset app data** once so the library is empty.

## Timeline

| Time | Say | Do | Rubric part |
|---|---|---|---|
| 0:00 - 0:20 | "Upgrades like PUM updates and PeopleTools upgrades need hundreds of pages checked by eye. It is slow, small changes get missed, and evidence varies. [Opening line]." | Show the live app on its Netlify URL. | **Live app** |
| 0:20 - 0:50 | "Here is the Timesheet example from our business case. After the upgrade, the toolbar with Submit has moved below the grid and the Reported Hours column is cut off. Finding that by eye is easy once, hard 200 times." | Load sample > "Time & Labor - Timesheet". Press Compare (about 0.3 s). Show FAIL with 2 regions. Region 1 is a large reflow block (the grid moved up into the old toolbar row, and it includes the truncated Reported Hours column). Region 2 is the moved footer line. Point at the "Likely reflow" hint. Switch to heatmap, then the overlay slider. | **OpenCV.js** (align, diff, contours, heatmap) |
| 0:50 - 1:10 | "Note what the tool says: one moved toolbar can reflow everything below it, so it reports one big block rather than two tidy boxes. The cause is at the block's top edge, the old toolbar row. That is a known behaviour, not a bug. The vision work is OpenCV.js compiled to WebAssembly, loaded once in a Web Worker (ready in about 0.5 s), so the page never froze." | Point at the status line ("ready", compare time in ms). Optional: Performance panel shows the main thread is not blocked. | **WebAssembly**, documented reflow lesson (VERIFICATION lesson 7) |
| 1:10 - 1:40 | "Noise is the next problem. The Purchase Order only changed its Last updated stamp, so it fails with one small region (0.087 %). One click on Add suggested ignore zone and it passes; the zone is remembered for next cycle." Then: "A capture shifted 3 px is aligned automatically: Aligned: shift (0, 3), PASS." | Load Purchase Order pair: FAIL, 1 region. Click "Add suggested ignore zone", rerun: PASS. Load the shifted pair: PASS with "Aligned: shift (0, 3)". | OpenCV.js (ignore zones, alignment) |
| 1:40 - 2:05 | "Each saved run carries evidence: test case VR-TL-01, ticket CHG-0042 (fictional), tools version, tester. The reviewer marks each region Expected, Regression or Noise before sign-off." | Fill the evidence fields on the Timesheet run, mark Submit and Reported Hours as Regression, save. | Business case, traceability |
| 2:05 - 2:30 | "Everything is stored on this device in IndexedDB. Refresh and it is still here. Reset app data wipes it." | Refresh the page: history still lists the run. In DevTools > Application > IndexedDB > `erpinspector`, refresh the `runs` store and show the row. Click **Reset app data**, refresh the database view, show it empty. | **IndexedDB in DevTools** |
| 2:30 - 2:45 | "And nothing leaves the device." | DevTools > Network: clear the list, load a sample and run a comparison. The list stays empty. | **Network quiet** |
| 2:45 - 3:00 | "The app was built by a 17-agent team: an orchestrator, three required experts (OpenCV, WebAssembly, IndexedDB), design, build and ERP specialists. Their research and worked examples are in the knowledge folders and on the Resources page. How it works explains the pipeline. [Closing]" | Open How it works, then Resources (one glance each). Show the README who-did-what table. | **Agent team**, **Knowledge & research** |

**Closing line:** "It is a supplemental QA tool, not a replacement for functional or security testing. It can show that a field or button appeared or disappeared for a role; it does not prove authorization is correct. Real use would be in a test environment with department approval."

## Value statement (say it as an estimate)
"Our business case assumes an upgrade with 200 screenshot comparisons: about 3 minutes by hand versus about 1 minute with the tool. That is an **estimate**, roughly 6.7 hours saved per cycle, not a measured result. A pilot would time real comparisons to confirm or correct it." If time is short, say this during the 0:00 - 0:20 slot.

## Rubric checklist
- [ ] **Live app**: opened from the Netlify URL, not localhost
- [ ] **OpenCV.js**: boxes, heatmap, reflow hint, alignment and ignore zones shown
- [ ] **Agent team**: roster, parallel waves and who-did-what named (README, `docs/expert-roster.md`)
- [ ] **WebAssembly**: loaded once in a worker, UI stays responsive
- [ ] **IndexedDB in DevTools**: `erpinspector` stores visible, data survives refresh, Reset empties them
- [ ] **Network quiet**: no requests after load while comparing
- [ ] **Knowledge & research**: knowledge folders, How it works, Resources, `docs/` research notes

## If something goes wrong
- Timesheet shows 2 regions, not separate boxes for Submit and Reported Hours: this is expected (reflow, see above and `docs/cv-pipeline-notes.md`, `docs/erp/change-catalogue.md` section 3). Decision: the fixture stays as the reflow demo.
- A pair does not give the expected result: say so, then load the next pair. Quinn's run of `samples/manifest.json` is the reference for what each pair should show.
- Network shows requests: they should only be the initial load. Clear the list after load and repeat.
- Heavy page: the worker watchdog restarts after 30 s; mention it as a feature.

## Sources
`docs/business-case.md`, `docs/10-mock-erp-demo-plan.md` (demo script and planted changes), `docs/09-chrome-devtools-testing.md`, `docs/build-plan.md`, `docs/expert-roster.md`, `docs/cv-pipeline-notes.md`, `docs/erp/change-catalogue.md` section 3 (pipeline results: Timesheet 2 regions 8.34 %, PO 1 region 0.087 %, shifted PASS, compare about 0.3 s, ready about 0.5 s).

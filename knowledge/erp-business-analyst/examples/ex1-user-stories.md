# Example 1: user stories with acceptance criteria (MoSCoW)

**US-01 (Must):** As a **functional analyst** testing a PUM update, I want to compare a page against its stored baseline so that I spot unintended UI changes in seconds.
- *Given* a page "T&L – Timesheet" with a baseline, *when* I drop the after-change screenshot and press Compare, *then* I see PASS or FAIL, the number of changed regions and numbered boxes within 5 seconds.
- *Given* an identical screenshot, *then* the result is PASS with 0 regions.

**US-02 (Must):** As an analyst, I want to mark parts of a page as ignored (timestamps) so that dynamic content doesn't fail every run.
- *Given* the PO page fails only on "Last updated", *when* I add an ignore zone there and rerun, *then* the result is PASS, and the zone is reused next time.

**US-03 (Must):** As a **test lead**, I want each run saved with test case, ticket and PI version so that evidence is consistent for audit.
- *Given* I save a FAIL run, *then* every region must have a decision (Expected / Regression / Noise) before sign-off.

**US-04 (Should):** As an analyst, I want screenshots captured with slightly different scroll positions to still compare correctly.
- *Given* the after-capture is shifted 3 px, *then* the result says "Aligned: shift (0, 3)" and is PASS when nothing else changed.

**US-05 (Could):** As a manager, I want an exportable report per page so that I can attach it to the change ticket.

**Won't (this release):** automatic capture inside PeopleSoft, OCR of field values, server-side storage.

# Try it with real PeopleSoft screenshots (section text for `how-it-works.html`, id `try-real`)

Owner: Riley (erp-functional-analyst). Status: draft for Juno to paste into `how-it-works.html`.
Nothing from Oracle is stored in this repo or on the site. Everything below is plain text and links.

Button and menu labels in the steps ("New page", "Compare") follow Atlas's hand-off. Juno must match them to the real UI before publishing.

---

## Section text (copy from here)

<!-- <section id="try-real"> -->

### Try it with real PeopleSoft screenshots

Oracle publishes PeopleSoft's user guides (PeopleBooks) on the public web. Many topics include screenshots of real pages. You can load those images into the inspector in your own browser, so you see how it behaves on a genuine PeopleSoft page, not only on our fictional demo.

1. Open one of the PeopleBooks links in the list below, in a new tab.
2. Scroll to the screenshot of the page (for example "Timesheet page" or "Work Location page").
3. Right-click the screenshot and choose **Save image as...**. Save it as a PNG, and keep the name `<module>_<page>_before_<YYYYMMDD>.png` so you can find it later.
4. In the inspector choose **New page** and pick that image as the **baseline**.
5. Choose **Compare** and pick a second image as the **candidate**. Good candidates:
   - your own capture of the same page from a test system you are allowed to use (see the capture tip below);
   - the same screenshot after you change it in an image editor (move a button, delete a field, change a label). This is the easiest way to see the inspector flag a change;
   - the same topic from a different PeopleBooks release, if the screenshot really differs (see the note below).
6. Read the highlighted regions. Treat the result as a supplemental QA aid, not as functional or security testing.

**Capture tip.** The baseline and the candidate must be the same size and zoom: same browser, 1366 x 900 viewport, 100% zoom, PNG, never JPEG (the project's capture standard, `docs/erp/capture-standards.md`). PeopleBooks screenshots come in many different sizes, so two PeopleBooks images of different sizes are not a fair pair. The alignment step only forgives small scroll and zoom differences.

**Why this site does not ship these images.** The screenshots are Oracle's copyrighted material, so we do not copy, host or bundle them. This project uses fictional data only and carries no Oracle branding. When you save an image yourself, it goes to your own disk, and the inspector keeps it only in your browser (IndexedDB) on your device. Nothing is uploaded. "Reset app data" removes it. Check Oracle's terms of use before you share or publish any image you saved.

**Links (all on docs.oracle.com, opened in a new tab, verified on 2026-11-22):**

| What you want | Link | Screenshot on the page |
|---|---|---|
| Time and Labor: Timesheet page (current 9.2 PeopleBooks) | https://docs.oracle.com/en/applications/peoplesoft/human-capital-management/9.2.055/peoplesoft-time-and-labor/timesheet-page-3.html | Yes, one ("Timesheet page") |
| Time and Labor: Reporting Time, with the Timesheet page (9.2 set, Image 33 era) | https://docs.oracle.com/cd/F13810_02/hcm92pbr29/eng/hcm/htlr/task_ReportingTime-e31c63.html | Yes, one ("Timesheet page") |
| HCM Job Data: Work Location and Job Information pages (9.2 set, Image 33 era) | https://docs.oracle.com/cd/F13810_02/hcm92pbr29/eng/hcm/hhaw/task_AddingOrganizationalInstancesforEmployeesContingentWorkersandPOIs-647cb9.html | Yes: Work Location (2 images), Job Information (4 images) |
| HCM Personal Data: Biographical Details and Contact Information pages (9.2 set, Image 33 era) | https://docs.oracle.com/cd/F13810_02/hcm92pbr29/eng/hcm/hhaw/task_AddingaPerson-647cea.html | Yes: Biographical Details (1), Contact Information (1), Regional (12) |
| FSCM Payables: Voucher, Invoice Information page | https://docs.oracle.com/cd/G17334_01/fscm92pbr52/eng/fscm/fapy/EnteringInvoiceInformationforOnlineVouchers-9f71ca.html | Yes, one ("Regular Vouchers Invoice Information") |
| FSCM Purchasing: Maintain Purchase Order, Purchase Order page | https://docs.oracle.com/en/applications/peoplesoft/financials-and-supply-chain-management/9.2.056/peoplesoft-purchasing/creating-purchase-order-headers.html | Yes ("Maintain Purchase Order - Purchase Order page (1 of 2)") |

Every link points to an Oracle page. Oracle may move or retire pages, so a link can stop working without notice.

<!-- </section> -->

---

## Analyst notes for the team (not for the page)

### 1. Does Oracle publish PeopleBooks per PUM image?

Partly. Findings:

- Oracle keeps archived hosted help sets under paths like `docs.oracle.com/cd/<id>/hcm92pbr<NN>/...` (for example `hcm92pbr29`, `pbr48` to `pbr54` for HCM, `fscm92pbr50` to `pbr55` for FSCM). The current set is under `docs.oracle.com/en/applications/peoplesoft/human-capital-management/9.2.055/` (HCM, Update Image 55) and `.../financials-and-supply-chain-management/9.2.056/` (FSCM). The 9.2.055 and 9.2.056 pages were fetched and loaded.
- The Oracle portal lists "Online Help ... through Update Image N" (the live HCM page says 55, FSCM says 57). Oracle's hosted help policy says only the newest release is updated and older sets stay online but frozen. These are from search-result summaries of Oracle pages, not read on the pages themselves.
- **Image 33 (9.2.33): I could not find a PeopleBooks URL that Oracle labels "Update Image 33".** A search snippet of an older version of Oracle's portal listed "HCM 9.2 (through Update Image 33), January 2020", and a search described the `hcm92pbr29` set as labeled "through Update Image 33". I could not confirm that label on the fetched `hcm92pbr29` pages: they carry no release statement. So: **`hcm92pbr29` is the probable Image 33 era set, unverified.** The `pbr33` guess returned nothing.
- Because of that, the table above uses `hcm92pbr29` (probable Image 33 era) plus the current 9.2.055 / 9.2.056 pages, and calls them "9.2 PeopleBooks" and "Image 33 era". It does not claim exact Image 33.
- Not verified: the Oracle's mapping from `pbrNN` number to Update Image number. The page text for the `pbr29` pages has no statement. Ask Hal if he can confirm from his own knowledge.

### 2. Page by page results

| Page | URL checked | Result |
|---|---|---|
| Timesheet (T&L) | 9.2.055 `timesheet-page-3.html` | Loads. Title "Timesheet Page". One image `img/timesheet-page-1-phtlr92000.png`. Navigation: Self Service > Time Reporting > Report Time > Timesheet. Page ID TL_MSS_TIMESHEET (from search summary). |
| Timesheet (T&L) | `hcm92pbr29 .../htlr/task_ReportingTime-e31c63.html`, also `hcm92pbr53 .../ReportingTime-e31c63.html` | Both load. Title "Reporting Time". One Timesheet screenshot, `img/i-cd7d26dn-708d.png` (same file name in both sets). Not labeled elapsed or punch. The pbr53 page has a banner saying the feature "has been replaced by the Report Time functionality in Fluid". |
| Job Data: Work Location | `hcm92pbr29 .../hhaw/task_AddingOrganizationalInstancesforEmployeesContingentWorkersandPOIs-647cb9.html` | Loads. Work Location (1 of 2, 2 of 2): `i-cd7d26dn-73ff.png`, `-745b.png`. Job Information (1 to 4 of 4). Also Job Labor, Payroll, Salary Plan, Compensation. Page title not captured from the fetch. |
| Job Data: Work Location | `hcm92pbr54 .../hhaw/ClassicAddingOrganizationalInstances.html` | Loads. Title "(Classic) Adding Organizational Instances". Same image file names as pbr29. Only the first 100,000 of 131,105 characters were read. |
| Job Data (other) | `hcm92pbr29 .../task_UpdatingJobData-647add.html` and 9.2.055 `changing-job-data.html` | Both load but have **no** screenshot of the page (text and decorative icons only). Don't use for the demo. |
| Personal Data | `hcm92pbr29 .../task_AddingaPerson-647cea.html` | Loads. Title "Adding a Person". Biographical Details `i-cd7d26dn-735f.png`, Contact Information `i-cd7d26dn-74ca.png`, Regional 12 images. The same file names appear in `hcm92pbr51 .../_Classic_AddingaPerson.html`. |
| Personal Data (Modify a Person) | `hcm92pbr29 .../task_UpdatingPersonalData-647ae7.html` | Loads, **no screenshots**. The `hcm92pbr54` version has two Fluid images only (Modify Person tile and a flow diagram). |
| Payables voucher | `fscm92pbr52 .../fapy/EnteringInvoiceInformationforOnlineVouchers-9f71ca.html` | Loads. Screenshot `img/i16152615n-72dd.png` "Regular Vouchers Invoice Information". |
| Payables voucher | 9.2.056 `.../peoplesoft-payables/invoice-information-page.html` | Loads, title "Invoice Information Page", page ID VCHR_EXPRESS1 (from search summary), **no images**. |
| Purchase Order | 9.2.056 `.../peoplesoft-purchasing/creating-purchase-order-headers.html` | Loads, title "Creating Purchase Order Headers", 16 image references. Image 1 is `maintain-purchase-order-purchase-order-page-1of2-pspog92036.png`. The others are button icons and small sections. |

Could not verify (returned 404 or were not fetched): `9.2.055 .../work-location-page.html`, `9.2.055 .../biographical-details-page.html`, `hcm92pbr54 .../ClassicUpdatingPersonalData.html`, `hcm92pbr54 .../ClassicReviewingandUpdatingPersonalInformation.html`. I guessed or took these from search lists. They are not used in the section above. Also not verified: that the screenshots show what their captions say. I read file names and captions only and did not view the images. I had no way to view an image in this session (no shell), and nothing was downloaded.

Content caution for the section text: PeopleBooks examples can show sample names or IDs from Oracle's demo data. The inspector keeps them locally only, but the site must not display them. Juno should not embed any of these images.

### 3. Is there a realistic before/after pair between two PeopleBooks versions?

**None confirmed.**

- Oracle reuses the same image files across the 9.2 sets. The Timesheet image `i-cd7d26dn-708d.png` is the same file name in `pbr29` and `pbr53`. The Work Location, Job Information, Biographical Details and Contact Information images are the same file names in `pbr29`, `pbr51` and `pbr54`. Same file name means the same picture, so there is nothing to compare for those pages between 9.2 sets. (Inference from file names, not a pixel check.)
- Candidates that might differ, **not confirmed because I could not view or diff the images**:
  - Timesheet: old-style file `i-cd7d26dn-708d.png` (pbr29, pbr53) vs the new file `timesheet-page-1-phtlr92000.png` (9.2.055). Different file names suggest a re-captured screenshot.
  - Purchase Order: `fscm92pbr52 .../spog/CreatingPurchaseOrderHeaders-9f3c77.html` (and pbr53) vs 9.2.056 `maintain-purchase-order-purchase-order-page-1of2-pspog92036.png`. I did not read the image name in pbr52, so it may be the same or not.
  - Voucher: pbr52 has an Invoice Information screenshot, 9.2.056 has none, so no pair.
  - 9.1 vs 9.2 versions of the same topic (for example `fscm91pbr0 .../spog/htm/spog34.htm` against the 9.2 page) would very likely look different, but they are different releases and different themes, and I have not looked.
- Recommendation: do not promise an Oracle-to-Oracle pair on the page. Offer the safe option that always works: one PeopleBooks image, saved twice, with a small edit in an image editor on the copy. If the owner wants a real Oracle pair, someone must open both Timesheet images side by side first. Also, two Oracle images with different pixel sizes will need the same size and zoom to be a fair test (Hal's capture standard).

### 4. Open items

- Juno must confirm the button labels (New page, baseline, Compare, candidate) and put the section text in `how-it-works.html`, with all links opening in a new tab using `rel="noopener noreferrer"`. The site must make no network call to these links beyond the user clicking them, and must not embed or hot-link Oracle images.
- Piper/Quinn: the privacy audit (`python3 tools/privacy_audit.py`) may flag `docs.oracle.com` as a third-party host. These are outbound links only. Confirm the audit allows plain `<a href>` links, or that the intended exception is recorded.
- Hal: confirm that `hcm92pbr29` corresponds to Update Image 33, or give the right Image 33 set.

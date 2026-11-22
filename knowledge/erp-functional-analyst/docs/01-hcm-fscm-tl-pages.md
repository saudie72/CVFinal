# HCM, FSCM and Time & Labor pages: what users see (public PeopleBooks)

**Sources:** PeopleSoft Fluid UI (HCM): https://docs.oracle.com/en/applications/peoplesoft/human-capital-management/9.2.055/application-fundamentals/peoplesoft-fluid-user-interface.html · Understanding Fluid UI Home Pages: https://docs.oracle.com/cd/F13810_02/hcm92pbr29/eng/hcm/hhaf/concept_UnderstandingPeopleSoftFluidUserInterfaceHomePages.html · FSCM Fluid UI: https://docs.oracle.com/cd/G17334_01/fscm92pbr52/eng/fscm/fspf/UnderstandingPeopleSoftFluidUserInterface.html · Classic Plus: https://docs.oracle.com/cd/G40826_01/cs92pbr36/eng/cs/lsfn/UnderstandingPeoplesoftClassicPlus.html · Page design (grids, scroll areas, prompts): https://docs.oracle.com/cd/E24150_01/pt851h2/eng/psbooks/tapd/htm/tapd14.htm

## Facts
- PeopleSoft has two user interfaces: **Classic** (designed for laptop/desktop, formerly called PIA) and **Fluid** (responsive, designed for mobile but usable on desktop). Fluid mode is enabled in **web profiles**.
- Since PeopleTools 8.55, **Fluid navigation is the default**. Classic pages are still reached through the Navigator. **Conditional navigation** can send users to a Fluid page instead of its Classic equivalent.
- **Fluid home pages are collections of tiles**, and tapping a tile opens a transaction. The Fluid banner on every Fluid page has standard controls (Home, Search, …).
- Classic Plus gives classic pages Fluid-like styling.
- Pages use grids, scroll areas, and prompts for lookups.

## Implications for test scenarios
- Record **which UI** (Classic, Classic Plus or Fluid) each capture used. Comparing across UIs is meaningless.
- If a user's role allows Fluid, conditional navigation can change *which page* opens. The capture standard must fix the navigation path.
- Use fictional data only. The page catalogue lists the fields and controls each mock page needs (see examples).

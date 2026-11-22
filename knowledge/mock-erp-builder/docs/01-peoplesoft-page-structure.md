# What PeopleSoft pages are made of (public PeopleBooks)

**Sources:** PeopleTools Application Designer, Understanding Page Design and Development: https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tapd/UnderstandingPageDesignandDevelopment-677eac.html · Page Development (8.51): https://docs.oracle.com/cd/E24150_01/pt851h2/eng/psbooks/tapd/htm/tapd14.htm · Producing Pages (page types and sizes): https://docs.oracle.com/cd/E92519_02/pt856pbr3/eng/pt/tapd/task_ProducingPages-0774e3.html · Fluid UI overview: https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tflu/FluidUserInterfaceOverview.html · Classic Plus: https://docs.oracle.com/cd/G40826_01/cs92pbr36/eng/cs/lsfn/UnderstandingPeoplesoftClassicPlus.html

## Facts
- PeopleBooks describes pages as the graphical interface between users and the application database. They're built and changed as **page definitions in Application Designer**.
- Multi-row data uses **level-based controls: grids, scroll areas and scroll bars**, each with an "occurs count". **Prompts (lookup buttons)** let users look up valid values.
- Classic page types have default design sizes, e.g., **760×330** for the standard 800×600-with-navigation option and **984×498** for the high-resolution option. That's why classic pages are "pixel-perfect" layouts.
- **Fluid** pages move away from pixel-perfect layout toward CSS, with responsive formatting for phone, tablet and desktop. **Classic Plus** restyles classic pages so their controls look like Fluid controls, while the pages stay classic definitions.

## Implications for mock pages
- Build classic-style mocks: a banner, breadcrumbs, a title, labelled key fields, a **grid** with header row, number cells right-aligned, and toolbar buttons.
- Keep it **generic**: "Demo ERP (fictional)", our own CSS, no Oracle images, logos or stylesheets.
- Use fictional data only (Jordan Rivera, EmplID 000123, BU-NORTH).

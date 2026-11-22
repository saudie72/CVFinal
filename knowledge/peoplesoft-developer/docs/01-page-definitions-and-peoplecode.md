# Page definitions, page field properties and PeopleCode (public PeopleBooks)

**Sources:** Understanding Page Design and Development: https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tapd/UnderstandingPageDesignandDevelopment-677eac.html · Setting Page Field Properties for Controls: https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tapd/SettingPageFieldPropertiesforControls-077512.html · Producing Pages: https://docs.oracle.com/cd/E92519_02/pt856pbr3/eng/pt/tapd/task_ProducingPages-0774e3.html · Field Class Properties (PeopleCode API Reference): https://docs.oracle.com/cd/G23954_01/pt862pbr1/eng/pt/tpcr/FieldClassProperties-071490.html · Fluid UI overview: https://docs.oracle.com/cd/E92519_02/pt856pbr3/eng/pt/tgst/concept_FluidUserInterface.html · Classic Plus: https://docs.oracle.com/cd/G40826_01/cs92pbr36/eng/cs/lsfn/UnderstandingPeoplesoftClassicPlus.html

## Facts
- Pages are created, modified and deleted as **page definitions in Application Designer**. Each control's look and behaviour come from its **page field properties** (record/field binding, type, display options).
- Multi-row data uses **grids, scroll areas and scroll bars**. Lookups use **prompts**.
- PeopleCode **Field class properties** change things at runtime. For example, the Display Only property corresponds to the "Display Only" page-field setting, and others override decimal positions or a group box's collapsed state. Runtime PeopleCode can therefore change what a page shows **without** a page-definition change.
- **Fluid** pages are also maintained in Application Designer, but use CSS and conditional formatting for each device class. Classic pages are pixel-positioned.
- **Classic Plus** restyles classic pages to look like Fluid. Oracle notes that staying on Classic may mean reviewing and customising delivered pages for future images.

## Visual-effect mapping (feeds docs/erp/change-catalogue.md)
| Change | Typical visual effect | Expected inspector output |
|---|---|---|
| Field added/removed in the page definition | Field appears/vanishes; neighbours may shift | Region(s) at the field; larger if the layout reflows |
| Page field label / message catalog text | Different label text | Small region over the label |
| PeopleCode display-only / visible toggles | A control greys out or disappears | Region over the control |
| Grid column width / property | Truncation; **whole grid reflows** (verified in the mock-erp example) | Grid-sized region + header slivers |
| Style sheet / branding (PeopleTools upgrade) | Colours, fonts, spacing everywhere | Many regions, high % changed |
| Classic → Classic Plus / Fluid | Whole layout | Very high %; treat as a **new baseline** |

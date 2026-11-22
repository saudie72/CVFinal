# PeopleSoft Test Framework (PTF) and how visual evidence complements it

**Sources:** Understanding PeopleSoft Test Framework (PT 8.62): https://docs.oracle.com/cd/G23954_01/pt862pbr1/eng/pt/tptf/UnderstandingPeopleSoftTestFramework-ea7fd7.html · PT 8.58: https://docs.oracle.com/cd/F44947_01/pt858pbr3/eng/pt/tptf/task_UnderstandingPeopleSoftTestFramework-ea7fd7.html · PTF terminology (8.52): https://docs.oracle.com/cd/E25688_01/pt852pbr0/eng/psbooks/tptf/htm/tptf02.htm · PTF info portal: https://docs.oracle.com/cd/E52319_01/infoportal/ptf.html

## Facts
- **PTF automates tasks in PeopleSoft applications, primarily functional testing**, so testers can run more tests, more accurately, in less time.
- PTF replicates a single user's actions against the browser-based application. Users **record** manual test procedures and save them in the framework.
- Test assets are **PeopleTools-managed objects**, managed with other objects through lifecycle management. PTF can validate recorded objects against metadata.
- PTF **maintenance** updates tests to reflect object changes in upgrades, through a direct connection to the metadata.
- Reports include test coverage, test details, test compare and test matrix reports.

## Positioning (use the same wording as the business case)
PTF checks **behaviour** (steps, values, results). The inspector checks **appearance** (layout, labels, visibility) from screenshots. They complement each other. **The inspector doesn't replace PTF or manual functional testing.** Its run evidence can sit next to the PTF test case ID.

## Evidence principles
- Every run is traceable: test case, change/ticket, PI or PeopleTools version, environment, role, tester, date.
- Every FAIL region gets a human decision: Expected / Regression / Noise.
- Promote a new baseline only after sign-off.

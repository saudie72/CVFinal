# PeopleSoft security model (public PeopleBooks)

**Sources:** PeopleTools Security Basics: https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tsec/SecurityBasics-c07658.html · Understanding PeopleSoft Security (HCM): https://docs.oracle.com/cd/G20540_01/hcm92pbr51/eng/hcm/hhaf/UnderstandingPeopleSoftSecurity-e32979.html · User Profiles, Roles, and Permission Lists: https://docs.oracle.com/en/applications/peoplesoft/peoplesoft-common/data-transformer/user-profiles-roles-permission-lists.html · Permission Lists (FSCM): https://docs.oracle.com/en/applications/peoplesoft/financials-and-supply-chain-management/9.2.056/peoplesoft-project-costing/permission-lists.html

## Facts
- The three main security definitions are **user profiles, roles and permission lists**.
- **Permission lists** group authorizations: sign-in times, **page access**, PeopleTools access and so on. They're "the building blocks" of user security.
- **Roles** link user profiles to permission lists. A user can have many roles, and a role can have many permission lists. Roles can be assigned manually or dynamically (PeopleCode, LDAP, Query rules).
- Some permission lists go directly on the user, e.g., **Primary** (global security) and **Row Security** (data permissions).
- **Modifying a permission list changes access for every user** whose roles include it.

## Why a screenshot can't prove authorization
A visual comparison shows only what was **rendered** for one test user. Access is enforced by permission lists (page access), row security (data rows) and PeopleCode, none of which a picture can verify. A hidden button may still be reachable, and a visible page may show different rows for other users.

**Statement to include in every security-related report:**
> "This visual comparison shows what was displayed for the tested role. It does not prove that authorization is correct; access must be verified with functional security testing."

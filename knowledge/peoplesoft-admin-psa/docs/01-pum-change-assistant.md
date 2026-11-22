# PeopleSoft Update Manager (PUM) and Change Assistant (public PeopleBooks)

**Sources:** PeopleSoft Update Manager (PT 8.59): https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tswu/PeopleSoftUpdateManager.html · Update Manager Action Overview: https://docs.oracle.com/cd/E92519_02/pt856pbr3/eng/pt/tswu/concept_UpdateManagerActionOverview.html · Change Assistant Overview (PT 8.62): https://docs.oracle.com/cd/G23954_01/pt862pbr1/eng/pt/tswu/PeopleSoftChangeAssistantOverview-071194.html · Quick Start (PT 8.62): https://docs.oracle.com/cd/G23954_01/pt862pbr1/eng/pt/tswu/QuickStart-2e7d0a.html · Change Assistant and Update Manager (getting started): https://docs.oracle.com/cd/F86650_01/pt859pbr5/eng/pt/tgst/ChangeAssistantAndUpdateManager.html

## Facts
- **PUM** is a tool that runs on the **PeopleSoft Update Image (PI)** database. PIs are fully functioning PeopleSoft environments, **one per product family** (e.g., HCM, FSCM). They're released periodically and are **cumulative**, so you download the newest one.
- The PI is the **source** environment. You use the PUM PIA application on the PI to search for updates and define a **custom change package**, then apply it to your **target** environment.
- **Change Assistant** is a standalone Java program that **orchestrates updating or upgrading** a PeopleSoft system. It automates many steps and supports Update Manager tasks and traditional updates for non-PUM-enabled systems.
- The Quick Start steps include: find and download the PI from My Oracle Support, install it, install Change Assistant at the same release level, select the Update Manager action, define a change package, then apply it to target environments.
- Update Manager is used for PUM-enabled applications (all 9.2 applications).

## Where visual regression checking fits
```
Capture baselines (target TEST env, before) → Apply change package (Change Assistant)
→ Capture "after" with the same capture standard → Inspector compare → triage regions
→ defects / sign-off → promote "after" to new baselines
```
Repeat for each target environment the package is deployed to (e.g., TEST → UAT), because configuration can differ.

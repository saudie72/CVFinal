# Example 1: wave plan for "Build the app and make it Netlify-ready"

| Wave | Task ID | Owner | Inputs | Outputs | Depends on |
|---|---|---|---|---|---|
| 0 | T01 | erp-business-analyst | docs/business-case.md | docs/erp/user-stories.md | — |
| 0 | T02 | erp-functional-analyst | business case | docs/erp/test-scenarios.md, page-catalogue.md | — |
| 0 | T03 | peoplesoft-developer | — | docs/erp/change-catalogue.md | — |
| 0 | T04 | peoplesoft-admin-psa | — | docs/erp/capture-standards.md | — |
| 0 | T05 | erp-security-admin | — | docs/erp/security-scenarios.md | — |
| 0 | T06 | erp-test-lead | — | docs/erp/evidence-standard.md | — |
| 0 | T07 | ux-designer-apple-hig (Wren) | business case | docs/design/ux-flows.md | — |
| 0 | T08 | wasm-expert | skills | docs/worker-protocol.md | — |
| 1 | T10 | opencv-expert | T08, T03 | js/cv/*.js + docs/cv-pipeline-notes.md | T08 |
| 1 | T11 | indexeddb-expert | T06 | js/db.js, docs/db-schema.md | T06 |
| 1 | T12 | mock-erp-builder | T02, T03, T04 | demo-erp/, samples/, manifest.json | T02–T04 |
| 1 | T13 | ui-designer (Sable) | T07 | css/tokens.css, docs/design/ui-spec.md | T07 |
| 2 | T20 | wasm-expert | T10 | inspector.worker.js, js/worker-client.js | T10 |
| 2 | T21 | frontend-engineer | T07, T11, T13, T08 | index.html, how-it-works.html, resources.html, js/app.js… | T11, T13 |
| 3 | R1–R10 | review pairs | outputs | review notes → handoff log | wave 2 |
| 3 | T30 | qa-tester | all | docs/qa-report.md | reviews approved |
| 3 | T31 | erp-security-admin | all | docs/security-audit.md | wave 2 |
| 4 | T40 | release-docs-engineer | all | netlify.toml, README.md | T30 |

**Parallel launch rule:** wave 0 = 8 agents in one turn; wave 1 = 4 in one turn; and so on.

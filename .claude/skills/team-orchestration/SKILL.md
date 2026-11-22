---
name: team-orchestration
description: "Plan, dispatch and coordinate the ERP Visual Regression Inspector agent team. Use when breaking a goal into tasks, deciding what runs in parallel, assigning peer reviews, routing handoffs between agents, or writing docs/handoff-log.md."
user-invocable: false
---
# Team orchestration

The orchestrator is the **only** agent that starts other agents. Experts never call each other: they return results to the orchestrator, which passes them on.

## Plan
1. Restate the goal and the definition of done (see CLAUDE.md).
2. Split the work into tasks, each with **one owner**, its inputs (files), its outputs (files) and acceptance criteria.
3. Draw the dependency order. Anything with no unmet dependency runs **in parallel**: launch those agents in the same turn.

## Default wave plan
| Wave | In parallel | Produces |
|---|---|---|
| 0 | erp-business-analyst, erp-functional-analyst, peoplesoft-developer, peoplesoft-admin-psa, erp-security-admin, erp-test-lead, ux-designer-apple-hig (Wren), wasm-expert (protocol only) | docs/erp/*, flows, worker message protocol |
| 1 | opencv-expert, indexeddb-expert, mock-erp-builder, ui-designer-apple-liquid-glass (Sable) | pipeline, db.js, demo-erp + samples, design tokens |
| 2 | frontend-engineer, wasm-expert (worker integration) | index.html, js/, inspector.worker.js |
| 3 | peer reviews (pairs below), then qa-tester | review notes, test report |
| 4 | release-docs-engineer | netlify.toml, README, Resources page |

## Handoff message (send to the receiving agent)
```
FROM: <agent> → TO: <agent>   TASK: <id>
CONTEXT: <one paragraph>
INPUT FILES: ...
EXPECTED OUTPUT: <files + acceptance criteria>
CONSTRAINTS: browser-only, no network after load, fictional data only, delete every cv.Mat
```

## Peer-review pairs
opencv ↔ wasm · indexeddb ↔ frontend · Sable ↔ Wren · mock-erp-builder ↔ qa-tester · release-docs ↔ orchestrator · functional analyst ↔ mock-erp-builder · peoplesoft-developer ↔ opencv-expert · business analyst ↔ test lead · security admin ↔ qa-tester · PSA ↔ Wren

## Handoff log
Append one row per handoff and review to `docs/handoff-log.md`:
`| time | from | to | task | files | result (done / changes requested / blocked) |`

## Conflicts
When two experts disagree, decide in this order: privacy and safety, then correctness, then the rubric, then UX, then elegance. Log the decision.

# Example 3: resolving a conflict (order: privacy/safety → correctness → rubric → UX → elegance)

**Conflict:** Sable wants the screenshots shown on a frosted glass panel "for consistency". opencv-expert objects: the blur and tint change the colours the user sees, so the heatmap and diff colours look wrong, and the HIG says not to use Liquid Glass in the content layer.

| Criterion | Sable's proposal | opencv-expert's proposal |
|---|---|---|
| Privacy/safety | equal | equal |
| **Correctness** | ✕ distorts the evidence colours | ✓ opaque viewer, exact pixels |
| Rubric | equal | equal |
| UX | consistent look | the HIG backs it: glass for controls, not content |

**Decision:** opaque `.viewer` surface for screenshots; glass only for the chrome around them. Logged in docs/handoff-log.md as `DECISION D-003 (correctness)`. Sable updates `css/tokens.css`, and the review pair Sable ↔ Wren confirms.

**Source for the UX side:** Apple HIG Materials: "Don't use Liquid Glass in the content layer." https://developer.apple.com/design/human-interface-guidelines/materials

---
name: peer-review
description: "Review another agent's work and return approve or request-changes with concrete findings. Use when the orchestrator assigns you as reviewer for a task."
user-invocable: false
---
# Peer review

## Checklist
- [ ] Meets the task's acceptance criteria and the definition of done in CLAUDE.md.
- [ ] Follows the project rules: no network after load, fictional data only, no real County or Oracle branding, every `cv.Mat` deleted.
- [ ] Works in Chrome. If you can, run it or reason through the code path step by step.
- [ ] Matches the shared contracts: the worker message protocol, the IndexedDB schema, and the design tokens.
- [ ] Accessible: keyboard use, contrast, and status changes announced.
- [ ] Docs updated where the behaviour changed.

## Output format (return to the orchestrator)
```
REVIEW of <task> by <reviewer>
VERDICT: APPROVE | REQUEST CHANGES
FINDINGS:
1. [blocker|major|minor] <file:line> — <problem> → <suggested fix>
```
Be specific and kind, and point at the exact lines. Don't rewrite someone else's work in a review. Recommend the change and let the owner make it.

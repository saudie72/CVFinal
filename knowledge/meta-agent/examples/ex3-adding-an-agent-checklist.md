# Example 3: adding a new agent end to end (worked through for a hypothetical `performance-auditor`)

1. **Roster first:** add a row to `docs/expert-roster.md` (job line, skills, peer-review pair).
2. **Skills:** reuse existing ones (`devtools-verification`, `cv-mat-memory-hygiene`). Create a new skill only for genuinely new know-how, in `.claude/skills/<name>/SKILL.md` with `user-invocable: false`.
3. **Agent file:** `.claude/agents/performance-auditor.md` with `disallowedTools: Agent`, the `skills:` list, and the sections Before you answer / You own / Deliver / Report back.
4. **Knowledge:** `knowledge/performance-auditor/docs/` (notes with source links) and `examples/` (2–3 runnable examples, plus a README with verified results).
5. **CLAUDE.md:** add it to the team table.
6. **Brains:** add a row to `docs/agent-brains.md` (model, persona).
7. **Validate:** `python3 knowledge/meta-agent/examples/ex1_lint_team.py` must print `TEAM OK`.
8. **Reload:** restart the Claude Code session so the new agent and skills load.

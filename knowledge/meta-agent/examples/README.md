# Meta agent worked examples

| File | What it shows |
|---|---|
| `ex1_lint_team.py` | Lints every agent and skill against the Claude Code docs and the team rules (YAML, names, skills exist, preloadable, only the orchestrator spawns, knowledge folders, Before-you-answer) |
| `ex2-good-agent-file.md` | An annotated anatomy of a good agent file |
| `ex3-adding-an-agent-checklist.md` | End-to-end checklist for adding an agent |

**Verified:** `python3 knowledge/meta-agent/examples/ex1_lint_team.py` → `17 agents, 26 skills checked … TEAM OK` (2026-11-22). Before the knowledge folders existed it reported 32 errors, which shows it catches problems.

---
name: agent-authoring
description: "Write and maintain Claude Code project subagents and skills for this repo. Use when creating or editing .claude/agents/*.md, .claude/skills/*/SKILL.md, CLAUDE.md or knowledge/<agent>/ folders."
user-invocable: false
---
# Agent and skill authoring

## Subagent file: `.claude/agents/<name>.md`
- It must start with `---` on line 1, followed by YAML frontmatter and a closing `---`. The body becomes the agent's system prompt.
- Required fields: `name` (lowercase, hyphens, no `:`) and `description` (when to delegate; keep it short).
- Useful fields: `tools` (allowlist; inherits all if omitted), `disallowedTools`, `model` (`sonnet`, `opus`, `haiku`, `fable`, full ID or `inherit`), `skills` (YAML list; **preloads the full skill content**, up to 32), `color`, `maxTurns`, `effort`.
- Team rule: every agent except `orchestrator` has `disallowedTools: Agent`, so handoffs go through the orchestrator.
- A file is silently skipped if it has bad YAML, no name or no description. Validate with `claude plugin validate .claude/agents`.

## Skill: `.claude/skills/<skill-name>/SKILL.md`
- Frontmatter: `name` (matches the folder), `description` (the trigger goes first; ≤ 1,536 characters together with `when_to_use`).
- Knowledge skills use `user-invocable: false`. Never use `disable-model-invocation: true` on a skill that agents preload, because preloading would then skip it.
- Keep the body under 500 lines, and move long references into supporting files that `SKILL.md` links to.

## Wiring checklist
1. Every name in an agent's `skills:` list exists as `.claude/skills/<name>/SKILL.md`.
2. The roster in `docs/expert-roster.md`, the agent files and CLAUDE.md all agree.
3. Each agent has `knowledge/<agent>/docs/` and `knowledge/<agent>/examples/` (Step 7).
4. After any change, restart the Claude Code session so the agents reload.

Sources: https://code.claude.com/docs/en/sub-agents · https://code.claude.com/docs/en/skills

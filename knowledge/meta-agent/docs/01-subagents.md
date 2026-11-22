# Claude Code subagents: file format and rules

**Source:** https://code.claude.com/docs/en/sub-agents

## Location and format
- Project subagents live in **`.claude/agents/`** at the project root (subfolders are scanned too). Check them into version control.
- Each file is Markdown with **YAML frontmatter between `---` markers**, and the body becomes the agent's **system prompt**. Subagents get that prompt plus basic environment details, not the full Claude Code system prompt.
- Only **`name`** and **`description`** are required. Unknown fields are silently ignored.

## Fields we use
| Field | Rule |
|---|---|
| `name` | Unique; can't start with `-` or contain `:` |
| `description` | Tells Claude when to delegate. Keep it short (descriptions count toward a startup token warning) |
| `tools` | Allowlist (comma string or YAML list). Inherits all tools if omitted |
| `disallowedTools` | Denylist, applied before `tools` |
| `model` | `sonnet`, `opus`, `haiku`, `fable`, a full ID, or `inherit` |
| `skills` | YAML list. **Preloads the full content** of each skill at startup (first 32 names) |
| `color` | red, blue, green, yellow, purple, orange, pink, cyan |
| `maxTurns`, `effort`, `memory`, `isolation`, `permissionMode` | Optional |

## Skills field details
- Preloading doesn't stop the agent from invoking other skills, unless `Skill` is removed from its tools.
- Skills with `disable-model-invocation: true` **can't be preloaded**. A missing skill is skipped with a debug warning.

## Nesting and team control
- Subagents can spawn subagents up to **three layers** below the main conversation (configurable with `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`).
- To stop a subagent from spawning others, **omit `Agent` from its tools or add it to `disallowedTools`**. Our rule: every agent except `orchestrator` has `disallowedTools: Agent`.

## Silent skip causes (validate!)
No `name`, no opening `---` on line 1, an invalid `name`, no `description`, or YAML that doesn't parse. Check with `claude --debug` or `claude plugin validate .claude/agents`, or with our `examples/ex1_lint_team.py`.

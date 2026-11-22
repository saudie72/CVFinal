# Claude Code skills: SKILL.md format and rules

**Source:** https://code.claude.com/docs/en/skills

## Location
`<repo>/.claude/skills/<skill-name>/SKILL.md`. Commit the folder. Project skills also load from parent directories up to the repo root.

## Frontmatter
| Field | Notes |
|---|---|
| `name` | Defaults to the folder name. Lowercase, numbers and hyphens, matching the folder |
| `description` | **Recommended.** What it does and when to use it, with the key use case first. `description` + `when_to_use` are truncated at **1,536 chars** |
| `user-invocable: false` | Hides it from the `/` menu (background knowledge). We use this for all team skills |
| `disable-model-invocation: true` | Only the user can invoke it. **Don't use it on preloaded skills** |
| `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `paths`, `hooks` | Optional |

## Rules
- The file must start with `---` on line 1. **Invalid YAML still loads the skill, but with no fields set.**
- Unknown fields are ignored silently, so check spelling (hyphens matter: `user-invocable`).
- Keep `SKILL.md` **under 500 lines**, and move long references to supporting files linked from it.
- Best practices: be specific in the description, keep the body concise (once loaded, it stays in context), and test in a fresh session.

## Supporting files
```
my-skill/
├── SKILL.md
├── reference.md   (loaded when needed — link it from SKILL.md)
└── scripts/helper.py  (executed, not loaded; refer via ${CLAUDE_SKILL_DIR})
```

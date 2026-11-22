# Running an agent team in Claude Code

**Sources:** Claude Code subagents: https://code.claude.com/docs/en/sub-agents · Course final guide: https://cvfinal-doc-scanner.netlify.app/guide/

## Facts that shape how the orchestrator works
- A subagent's **file body is its system prompt**. Agents start fresh, so a handoff must include the context and the file paths they need.
- **Spawning depth:** subagents can spawn subagents up to three layers below the main conversation. The user's `@agent-orchestrator` call is layer 1, and the experts it starts are layer 2.
- Only agents with the `Agent` tool can spawn. Our experts have `disallowedTools: Agent`, so **all handoffs route through the orchestrator**.
- **Parallelism:** launching several agents in the same turn runs them concurrently. Group tasks with no unmet dependency into a wave.
- `skills:` preloads each expert's skills, so the orchestrator doesn't need to repeat them in every handoff. It points to the files instead.
- The course guide expects Step 9 to take **30–45 minutes**. To have the experts loaded as separate agents, **start a new Claude Code session** after changing `.claude/agents`.

## Course requirements the orchestrator owns
Experts review each other's work; the vision pipeline, Web Worker, versioned IndexedDB and Reset app data; Wren's flow and Sable's styling; How it works and Resources pages; QA in a real browser with sample photos; `netlify.toml`, a README with deploy steps, and `docs/handoff-log.md`; a who-did-what summary; everything on `main`.

---
name: knowledge-first
description: "Before answering or building, read your knowledge folder and the project docs, cite sources, and flag uncertainty. Use at the start of every task by every agent on this team."
user-invocable: false
---
# Knowledge first

Before you answer, design or write code:
1. Read `knowledge/<your-agent-name>/docs/` and `knowledge/<your-agent-name>/examples/` if they exist.
2. Read the relevant files in `docs/`: `README.md` (index), `business-case.md`, `expert-roster.md`, and any `docs/erp/*` that apply.
3. Prefer official sources: docs.opencv.org, MDN, developer.chrome.com, docs.netlify.com, Apple HIG, Oracle PeopleSoft PeopleBooks (public).
4. Cite the file or URL behind every non-obvious claim in your report.
5. If the sources don't answer the question, say **"unverified"** and state your assumption. Never invent APIs, function signatures or PeopleSoft behaviour.
6. If you learn something reusable, add a short note with its source to your knowledge folder, and tell the orchestrator.

Hard project rules that override everything else: browser-only static site, no network calls after load, fictional data only, delete every `cv.Mat`.

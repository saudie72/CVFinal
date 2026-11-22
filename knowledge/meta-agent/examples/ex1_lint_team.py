"""Example 1 — lint the whole agent team (run from the repo root):
    python3 knowledge/meta-agent/examples/ex1_lint_team.py

Checks the rules from the Claude Code docs (https://code.claude.com/docs/en/sub-agents,
https://code.claude.com/docs/en/skills) plus this project's team rules:
  • file starts with '---' on line 1, YAML parses, has name + description (else silently skipped)
  • name has no ':' and doesn't start with '-'
  • every `skills:` entry exists as .claude/skills/<name>/SKILL.md, and ≤ 32 per agent
  • preloaded skills must NOT set disable-model-invocation: true
  • only the orchestrator may spawn agents (others: disallowedTools contains Agent)
  • every agent has knowledge/<name>/docs and knowledge/<name>/examples, and a 'Before you answer' section
  • skill name matches its folder; description ≤ 1536 chars
"""
import glob, os, sys
import yaml

errors, warns = [], []
skills = {}
for p in glob.glob(".claude/skills/*/SKILL.md"):
    txt = open(p, encoding="utf-8").read()
    folder = os.path.basename(os.path.dirname(p))
    if not txt.startswith("---\n"):
        errors.append(f"{p}: must start with ---"); continue
    fm = yaml.safe_load(txt.split("---")[1]) or {}
    skills[folder] = fm
    if fm.get("name", folder) != folder: errors.append(f"{p}: name '{fm.get('name')}' != folder '{folder}'")
    if len(fm.get("description", "")) > 1536: errors.append(f"{p}: description > 1536 chars")
    if not fm.get("description"): warns.append(f"{p}: no description")

agents = {}
for p in sorted(glob.glob(".claude/agents/*.md")):
    txt = open(p, encoding="utf-8").read()
    if not txt.startswith("---\n"):
        errors.append(f"{p}: must start with --- (agent would be silently skipped)"); continue
    try:
        fm = yaml.safe_load(txt.split("---")[1])
    except yaml.YAMLError as e:
        errors.append(f"{p}: YAML error {e}"); continue
    name = fm.get("name")
    agents[name] = fm
    if not name or not fm.get("description"): errors.append(f"{p}: missing name/description")
    if name and (":" in name or name.startswith("-")): errors.append(f"{p}: invalid name")
    sk = fm.get("skills") or []
    if len(sk) > 32: errors.append(f"{p}: more than 32 skills (extra are not loaded)")
    for s in sk:
        if s not in skills: errors.append(f"{p}: skill '{s}' not found")
        elif skills[s].get("disable-model-invocation") is True: errors.append(f"{p}: skill '{s}' can't be preloaded")
    disallowed = str(fm.get("disallowedTools", ""))
    if name == "orchestrator":
        if "Agent" not in str(fm.get("tools", "")): errors.append("orchestrator must have the Agent tool")
    elif "Agent" not in disallowed:
        errors.append(f"{p}: non-orchestrator must disallow Agent (handoffs go through orchestrator)")
    for sub in ("docs", "examples"):
        d = f"knowledge/{name}/{sub}"
        if not os.path.isdir(d) or not os.listdir(d): errors.append(f"{p}: {d} missing or empty")
    if "## Before you answer" not in txt: errors.append(f"{p}: no 'Before you answer' section")

unused = set(skills) - {s for a in agents.values() for s in (a.get("skills") or [])}
if unused: warns.append(f"unused skills: {sorted(unused)}")
print(f"{len(agents)} agents, {len(skills)} skills checked")
for w in warns: print("WARN ", w)
for e in errors: print("ERROR", e)
print("TEAM OK" if not errors else f"{len(errors)} ERRORS")
sys.exit(1 if errors else 0)

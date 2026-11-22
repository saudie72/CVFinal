#!/usr/bin/env bash
# Runs the team's existing suites one at a time and writes tools/qa/suites.log (summary at the end).
# From the repo root:  bash tools/qa/run_suites.sh
cd "$(dirname "$0")/../.."
LOG=tools/qa/suites.log; : > "$LOG"; SUM=()
srv() { python3 -m http.server "$1" >/dev/null 2>&1 & echo $!; }
step() { # name, cmd...
  local name="$1"; shift; echo "=== $name: $*" >> "$LOG"
  "$@" >"$LOG.tmp" 2>&1; local rc=$?; cat "$LOG.tmp" >> "$LOG"; tail -4 "$LOG.tmp"; rm -f "$LOG.tmp"
  SUM+=("$name rc=$rc")
}
python3 tools/serve_netlify.py --port 8106 >/dev/null 2>&1 & P=$!; sleep 1; step app-smoke node tools/app-smoke/run.js; kill $P
step hints-unit node tools/app-smoke/hints.test.mjs
step cv-test node tools/cv-test/run.js
step worker-test node tools/worker-test/run.js
P=$(srv 8103); sleep 1; step db-test node tools/db-test/run.js; kill $P
step privacy-audit python3 tools/privacy_audit.py
step contrast-check python3 tools/contrast_check.py
step validate-evidence python3 tools/validate_evidence.py tools/qa/qa-export-run.json
step verify-knowledge bash tools/verify-knowledge/run_all.sh
echo; echo "SUMMARY"; printf '%s\n' "${SUM[@]}" | tee -a "$LOG"

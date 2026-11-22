#!/usr/bin/env bash
# Runs every runnable knowledge example. From the repo root:  bash tools/verify-knowledge/run_all.sh
# Needs: Python 3.11+, opencv-python, numpy, PyYAML, Playwright for Python, and a local Chrome.
# OpenCV.js examples need a page with opencv.js loaded (see knowledge/opencv-expert/examples/README.md).
set -u
cd "$(dirname "$0")/../.."
fail=0
run() { echo "== $*"; "$@" || fail=$((fail+1)); echo; }
run python3 -I knowledge/opencv-expert/examples/python_mirror.py
run python3 tools/verify-knowledge/run_browser_examples.py
run python3 knowledge/mock-erp-builder/examples/capture_and_verify.py
run python3 knowledge/qa-tester/examples/ex1_qa_smoke.py
run python3 -I knowledge/ui-designer-apple-liquid-glass/examples/contrast_check.py
run python3 -I knowledge/release-docs-engineer/examples/validate_examples.py
run python3 -I knowledge/erp-security-admin/examples/ex2_privacy_audit.py
run python3 -I knowledge/erp-test-lead/examples/ex2_validate_evidence.py
run python3 knowledge/meta-agent/examples/ex1_lint_team.py
echo "suites failed: $fail"
exit $fail

"""Example 2 — validate a run-evidence record against the evidence standard.
Run from the repo root:  python3 knowledge/erp-test-lead/examples/ex2_validate_evidence.py [file.json]

Rules (skill uat-evidence-traceability):
  • required evidence fields present and non-empty
  • status is PASS or FAIL and consistent with regions/changedPct/threshold
  • every region of a FAIL run has a decision in {Expected, Regression, Noise}
  • signedOff may be true only if no region is 'Regression'
  • the disclaimer is present
"""
import json, os, sys

path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "ex1-run-evidence.json")
def validate(run):
    errors = []
    for f in ("testCaseId", "ticketId", "toolsVersion", "environment", "tester"):
        if not str(run.get("evidence", {}).get(f, "")).strip():
            errors.append(f"missing evidence.{f}")
    if run.get("status") not in ("PASS", "FAIL"):
        errors.append("status must be PASS or FAIL")
    expected = "FAIL" if run["regions"] and run["changedPct"] > run["settings"]["thresholdPct"] else "PASS"
    if run["status"] != expected:
        errors.append(f"status {run['status']} inconsistent with data (expected {expected})")
    if run["status"] == "FAIL":
        for r in run["regions"]:
            if r.get("decision") not in ("Expected", "Regression", "Noise"):
                errors.append(f"region {r.get('n')} has no valid decision")
    if run["evidence"].get("signedOff") and any(r.get("decision") == "Regression" for r in run["regions"]):
        errors.append("cannot sign off a run with Regression regions")
    if "not a replacement" not in run.get("disclaimer", ""):
        errors.append("disclaimer missing")
    return errors


run = json.load(open(path, encoding="utf-8"))
errors = validate(run)
# negative test: a copy with a missing decision, an illegal sign-off and no tester MUST be rejected
bad = json.loads(json.dumps(run))
bad["regions"][1]["decision"] = ""; bad["evidence"]["signedOff"] = True; bad["evidence"]["tester"] = ""
bad_errors = validate(bad)
print(json.dumps({"file": os.path.basename(path), "errors": errors, "negativeTestErrors": bad_errors}, indent=2))
ok = not errors and len(bad_errors) == 3
print("EVIDENCE VALID (and bad record rejected)" if ok else "INVALID")
sys.exit(0 if ok else 1)

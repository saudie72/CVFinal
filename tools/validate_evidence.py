#!/usr/bin/env python3
"""Validate an exported run / report JSON against docs/erp/evidence-standard.md.

Usage:  python3 tools/validate_evidence.py FILE.json [FILE2.json ...]
Accepts one run object, an array of runs, or {"runs": [...]}.
Exit code 0 = every run valid, 1 = at least one error, 2 = unreadable input.
Adapted from knowledge/erp-test-lead/examples/ex2_validate_evidence.py.
"""
import json
import sys

REQUIRED_EVIDENCE = ("testCaseId", "ticketId", "toolsVersion", "tester")
OPTIONAL_EVIDENCE = ("businessUnit", "role", "environment", "note", "expectedDifference")
DECISIONS = ("Expected", "Regression", "Noise")
DECISION_ALIASES = {"Ignore": "Noise"}  # accepted with a warning, see the standard
MARKER = "not a replacement"


def _s(v):
    return isinstance(v, str) and v.strip() != ""


def _num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def validate_run(run):
    """Return (errors, warnings) for one run record."""
    errors, warnings = [], []
    if not isinstance(run, dict):
        return ["run is not an object"], warnings

    ev = run.get("evidence")
    if not isinstance(ev, dict):
        errors.append("missing evidence object")
        ev = {}
    for f in REQUIRED_EVIDENCE:
        if not _s(ev.get(f)):
            errors.append(f"missing evidence.{f}")
    for f in ("businessUnit", "role"):
        if f in ev and ev[f] is not None and not _s(ev[f]):
            errors.append(f"evidence.{f} must be a non-empty string or omitted")

    created = run.get("createdAt")
    if not (_s(created) or _num(created)):
        errors.append("missing createdAt (run date: ISO-8601 string or epoch ms)")

    status = run.get("status")
    if status not in ("PASS", "FAIL"):
        errors.append("status must be PASS or FAIL")

    regions = run.get("regions")
    if not isinstance(regions, list):
        errors.append("regions must be an array")
        regions = []
    settings = run.get("settings")
    thr = settings.get("thresholdPct") if isinstance(settings, dict) else None
    if not _num(thr):
        errors.append("settings.thresholdPct missing or not a number")
    if not _num(run.get("changedPct")):
        errors.append("changedPct missing or not a number")
    if _num(thr) and _num(run.get("changedPct")) and status in ("PASS", "FAIL"):
        expected = "FAIL" if regions and run["changedPct"] > thr else "PASS"
        if status != expected:
            errors.append(f"status {status} inconsistent with data (expected {expected})")

    decisions = []
    for i, r in enumerate(regions, 1):
        label = f"region {r.get('n', i) if isinstance(r, dict) else i}"
        if not isinstance(r, dict):
            errors.append(f"{label} is not an object")
            continue
        for k in ("x", "y"):
            if not _num(r.get(k)):
                errors.append(f"{label} missing {k}")
        if not (_num(r.get("w")) or _num(r.get("width"))):
            errors.append(f"{label} missing w/width")
        if not (_num(r.get("h")) or _num(r.get("height"))):
            errors.append(f"{label} missing h/height")
        d = r.get("decision")
        if d in DECISION_ALIASES:
            warnings.append(f"{label}: decision '{d}' is a deprecated alias, store '{DECISION_ALIASES[d]}'")
            d = DECISION_ALIASES[d]
        if d not in DECISIONS:
            if status == "FAIL":
                errors.append(f"{label} has no valid decision (Expected/Regression/Noise)")
        decisions.append(d)

    so = run.get("signOff") or {}
    if not isinstance(so, dict):
        errors.append("signOff must be an object")
        so = {}
    signed = so.get("signedOff") is True
    if signed:
        if not _s(so.get("reviewer")):
            errors.append("signedOff requires signOff.reviewer")
        if not (_s(so.get("signedOffAt")) or _num(so.get("signedOffAt"))):
            errors.append("signedOff requires signOff.signedOffAt")
        if "Regression" in decisions:
            errors.append("cannot sign off a run with an open Regression region")
        if status == "FAIL" and any(d not in DECISIONS for d in decisions):
            errors.append("cannot sign off a FAIL run while a region has no decision")
        if status != "PASS" and status != "FAIL":
            errors.append("cannot sign off a run without a valid status")
    if so.get("baselinePromoted") is True and not signed:
        errors.append("baseline promoted without sign-off")

    if not (isinstance(run.get("disclaimer"), str) and MARKER in run["disclaimer"].lower()):
        errors.append("disclaimer missing (must say the check is 'not a replacement' for functional/security testing)")
    return errors, warnings


def runs_of(doc):
    if isinstance(doc, list):
        return doc
    if isinstance(doc, dict) and isinstance(doc.get("runs"), list):
        return doc["runs"]
    return [doc]


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    bad = 0
    for path in argv:
        try:
            with open(path, encoding="utf-8") as fh:
                doc = json.load(fh)
        except (OSError, ValueError) as e:
            print(f"{path}: UNREADABLE ({e})")
            return 2
        for idx, run in enumerate(runs_of(doc)):
            errs, warns = validate_run(run)
            tag = path if len(runs_of(doc)) == 1 else f"{path}[{idx}]"
            print(f"{tag}: {'VALID' if not errs else 'INVALID (%d error%s)' % (len(errs), '' if len(errs) == 1 else 's')}")
            for w in warns:
                print(f"  warning: {w}")
            for e in errs:
                print(f"  error: {e}")
            bad += bool(errs)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

# Example 2: a routed handoff and its log rows

**opencv-expert's report ends with:**
```
HANDOFF REQUESTS: wasm-expert — worker must pass `zones` array through to compare(); add {step:'Aligning'} progress before align()
```

**The orchestrator's message to wasm-expert:**
```
FROM: opencv-expert (via orchestrator) → TO: wasm-expert   TASK: T20-a
CONTEXT: compare(base, cand, zones, settings) in js/cv/pipeline.js now applies ignore zones and reports alignment.
INPUT FILES: js/cv/pipeline.js, docs/worker-protocol.md
EXPECTED OUTPUT: inspector.worker.js forwards data.zones; posts progress steps Aligning→Diffing→Regions→Done;
                 docs/worker-protocol.md updated. Acceptance: samples/fscm-po pair PASS with zone, FAIL without.
CONSTRAINTS: classic worker, transfer buffers, delete every Mat, no network.
```

**docs/handoff-log.md rows:**
| Time | From | To | Task | Files | Result |
|---|---|---|---|---|---|
| 10:42 | opencv-expert | orchestrator | T10 | js/cv/pipeline.js | done, 1 handoff request |
| 10:43 | orchestrator | wasm-expert | T20-a | inspector.worker.js | assigned |
| 10:55 | wasm-expert | orchestrator | T20-a | inspector.worker.js, docs/worker-protocol.md | done |
| 10:56 | orchestrator | opencv-expert | R1 review of T20-a | inspector.worker.js | assigned |
| 11:02 | opencv-expert | orchestrator | R1 | — | APPROVE |

# WebAssembly worked examples

Run all of them with `python3 tools/verify-knowledge/run_browser_examples.py` from the repo root (headless Chrome plus a local server). `add.wasm` is a hand-assembled 41-byte module exporting `add(i32, i32) -> i32`:

```
00 61 73 6d 01 00 00 00            magic + version 1
01 07 01 60 02 7f 7f 01 7f         type section: (i32, i32) -> i32
03 02 01 00                        function section: one function of type 0
07 07 01 03 61 64 64 00 00         export "add" = function 0
0a 09 01 07 00 20 00 20 01 6a 0b   code: local.get 0, local.get 1, i32.add, end
```

| # | File | Shows | Verified result (Chrome 153, 2026-11-22) |
|---|---|---|---|
| 1 | `ex1-streaming.html` | `instantiateStreaming` with `application/wasm` works; the wrong MIME type rejects with **TypeError**; the robust fallback loader | ✅ add(2,3)=5 · wrong MIME → `TypeError` · fallback add(40,2)=42 |
| 2 | `ex2-memory.html` | 64 KiB pages; `grow()` returns the previous size; **old views detach**; growing past max → RangeError | ✅ 1 → 2 pages · old view length 0 · data kept (42) · `RangeError` |
| 3 | `ex3-worker.html` + `ex3-worker.js` | The worker loads Wasm once; a 4.9 MB transferable round trip; progress messages; watchdog terminate and respawn | ✅ sender bytes 0 after transfer · sum correct · watchdog fired · respawn ready |

Also verified in Node 22: `WebAssembly.instantiate(add.wasm)` gives `add(2,3) = 5`.

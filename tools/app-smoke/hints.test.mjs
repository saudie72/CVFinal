// Unit test for js/hints.js over tools/cv-test/last-results.json.  Run: node tools/app-smoke/hints.test.mjs
import fs from 'node:fs';
import { classify } from '../../js/hints.js';
const rows = JSON.parse(fs.readFileSync(new URL('../cv-test/last-results.json', import.meta.url))).rows.filter((r) => r.set === 'samples');
const parse = (s) => [...s.matchAll(/#(\d+) (\d+)x(\d+)@\((\d+),(\d+)\)/g)].map((m) => ({ x: +m[4], y: +m[5], width: +m[2], height: +m[3] }));
const expected = {
  'tl-timesheet': ['reflow', 'label-text'],
  'hcm-job-data': ['unclassified', 'unclassified', 'unclassified'],
  'hcm-personal-data': ['label-text', 'label-text', 'label-text', 'label-text'],
  'fscm-voucher': ['grid-layout', 'grid-layout', 'grid-layout', 'label-text'],
  'fscm-po (no zones)': ['label-text'],
  'hcm-job-data-zoom110': Array(25).fill('capture-artifact'),
};
let bad = 0;
for (const [pair, want] of Object.entries(expected)) {
  const row = rows.find((r) => r.pair === pair);
  const got = row ? classify(parse(row.boxes), row.changedPct) : ['(missing row)'];
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log((ok ? 'PASS ' : 'FAIL ') + pair, ok ? '' : JSON.stringify({ got, want }));
}
const big = classify([{ x: 0, y: 0, width: 50, height: 50 }], 31)[0] === 'whole-page';
const moved = classify([{ x: 0, y: 0, width: 80, height: 30 }, { x: 200, y: 0, width: 81, height: 31 }, { x: 400, y: 0, width: 90, height: 20 }, { x: 600, y: 0, width: 92, height: 22 }], 1).slice(0, 2).join() === 'control-moved,control-moved' && classify([{ x: 0, y: 0, width: 75, height: 19 }, { x: 200, y: 0, width: 77, height: 21 }], 1).join() === 'label-text,label-text';
console.log((big ? 'PASS ' : 'FAIL ') + 'whole-page above 30%'); console.log((moved ? 'PASS ' : 'FAIL ') + 'control-moved pair');
process.exit(bad || !big || !moved ? 1 : 0);

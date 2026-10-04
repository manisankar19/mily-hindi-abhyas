#!/usr/bin/env node
/*
 * Coordinator check (Tasks 20/23/30): the same printed question in two
 * worksheets must have the same answer key. Gate 0 decision #1 (ws01/ws05)
 * and the Set A / Set B / Set 2 overlap make this a real risk.
 *
 * Items are matched by normalised (instruction + q) — and by q alone when
 * q is long enough to be distinctive (>= 12 chars). For each match we compare
 * `a`, the sorted `acceptable` list, `answerKind` and `answerConfidence`, and
 * the rubric bands between items worth the same marks. Exit 1 on any mismatch.
 *
 * Usage: node scripts/consistency.js [--data app/data]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { normalise } = require('./fidelity.js');

const args = process.argv.slice(2);
const di = args.indexOf('--data');
const DATA = path.resolve(di >= 0 ? args[di + 1] : path.join(__dirname, '..', 'app', 'data'));

const files = fs.readdirSync(DATA).filter(f => /^hindi-ws\d{2}\.json$/.test(f)).sort();
const byKey = new Map();
const add = (key, rec) => { if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(rec); };
const norm = s => normalise(String(s || '')).replace(/[?।.!|]+$/, '').trim();

for (const f of files) {
  const p = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  p.sections.forEach((s, si) => s.blocks.forEach((b, bi) => b.items.forEach((it, ii) => {
    const q = norm(it.q);
    if (!q) return;
    const rec = { ws: p.ws, where: `${p.ws} s${si}-b${bi}-i${ii} ${b.num} ${it.label || ''}`.trim(), it };
    add('iq:' + norm(b.instruction) + ' ¦ ' + q, rec);
    if (q.length >= 12) add('q:' + q, rec);
  })));
}

// The answer key must match everywhere. The rubric is compared only between
// items worth the same marks: a 2-mark and a 1-mark version of one question
// legitimately have different bands.
const sig = it => JSON.stringify({
  a: norm(it.a),
  acc: [...(it.acceptable || [])].map(norm).sort(),
  kind: it.answerKind,
  conf: it.answerConfidence,
});
const rubricSig = it => JSON.stringify((Array.isArray(it.rubric) ? it.rubric : []).map(b => [b.marks, norm(b.desc)]));

const seen = new Set();
const problems = [];
let pairs = 0;
for (const [key, recs] of byKey) {
  const wsSet = new Set(recs.map(r => r.ws));
  if (wsSet.size < 2) continue;
  const id = recs.map(r => r.where).sort().join(' = ');
  if (seen.has(id)) continue;
  seen.add(id);
  pairs++;
  const sigs = new Set(recs.map(r => sig(r.it)));
  const byMarks = new Map();
  recs.forEach(r => { const k = String(r.it.marks); if (!byMarks.has(k)) byMarks.set(k, new Set()); byMarks.get(k).add(rubricSig(r.it)); });
  const rubricClash = [...byMarks.values()].some(set => set.size > 1);
  if (sigs.size > 1 || rubricClash) {
    problems.push(`DIFFERENT: ${key.slice(0, 90)}\n` + recs.map(r =>
      `    ${r.where}: a=${JSON.stringify(r.it.a)} acceptable=${JSON.stringify(r.it.acceptable || [])} kind=${r.it.answerKind} conf=${r.it.answerConfidence}`).join('\n'));
  }
}
problems.forEach(p => console.log(p));
console.log(`${problems.length ? 'FAIL' : 'OK'} ${pairs} shared question groups across ${files.length} papers, ${problems.length} inconsistent`);
process.exit(problems.length ? 1 : 0);

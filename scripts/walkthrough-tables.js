#!/usr/bin/env node
/*
 * Task 43: generate the data tables of sprints/v3/WALKTHROUGH.md from the
 * repo (papers, intake, hashes, pictures, adaptations, paper-only items,
 * second-read counts, every teacherNote). Replaces the text between the
 * generated:start / generated:end markers. Deterministic, no dates.
 * Usage: node scripts/walkthrough-tables.js [--check]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const WT = path.join(ROOT, 'sprints/v3/WALKTHROUGH.md');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const pre = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprints/v3/preflight-hashes.json'), 'utf8'));
const ids = pre.worksheets.map(w => w.ws);
const papers = Object.fromEntries(ids.map(ws => [ws, JSON.parse(fs.readFileSync(path.join(ROOT, `app/data/hindi-${ws}.json`), 'utf8'))]));
const intake = Object.fromEntries(ids.map(ws => [ws, JSON.parse(fs.readFileSync(path.join(ROOT, `source/intake/${ws}.json`), 'utf8'))]));
const blocks = p => p.sections.flatMap(s => s.blocks.map(b => ({ s, b })));
const items = p => blocks(p).flatMap(({ s, b }) => b.items.map(i => ({ s, b, i })));
const where = ({ b, i }) => esc([b.num, i.label || i.slot].filter(Boolean).join(' ').trim() || '—');

const L = [];
L.push('### Worksheets', '');
L.push('| ws | Source file | Total | Items | ⚑ actual / intake estimate | teacherNotes | Pictures | Paper-only | 2nd-read fixes |');
L.push('|---|---|---|---|---|---|---|---|---|');
let T = { total: 0, items: 0, flag: 0, est: 0, notes: 0, pics: 0, po: 0, sr: 0 };
for (const ws of ids) {
  const p = papers[ws], it = items(p);
  const r = {
    total: p.totalMarks, items: it.length, flag: it.filter(x => x.i.answerConfidence === 'check').length, est: intake[ws].flagEstimate,
    notes: it.filter(x => x.i.teacherNote).length, pics: blocks(p).filter(x => x.b.picture).length,
    po: it.filter(x => x.i.answerKind === 'paperOnly').length, sr: intake[ws].secondReadDisagreements,
  };
  Object.keys(T).forEach(k => { T[k] += r[k]; });
  L.push(`| ${ws} | \`${p.sourceFile}\` | ${r.total} | ${r.items} | ${r.flag} / ${r.est} | ${r.notes} | ${r.pics} | ${r.po} | ${r.sr} |`);
}
L.push(`| **Total** | 7 worksheets | ${T.total} | ${T.items} | ${T.flag} / ${T.est} | ${T.notes} | ${T.pics} | ${T.po} | ${T.sr} |`, '');

L.push('### Source PDFs: SHA-256 re-checked against preflight', '');
L.push('| ws | File | SHA-256 now | Matches preflight |', '|---|---|---|---|');
for (const w of pre.worksheets) {
  const now = sha(path.join(ROOT, 'source/samples', w.file));
  L.push(`| ${w.ws} | \`${w.file}\` | \`${now}\` | ${now === w.sha256 ? 'yes' : '**NO**'} |`);
}
L.push('');

L.push('### Chapter papers: byte-identical to preflight', '');
L.push('| File | SHA-256 (preflight = now) | Identical |', '|---|---|---|');
for (let n = 1; n <= 7; n++) {
  const f = `app/data/chapter${n}.json`, now = sha(path.join(ROOT, f));
  L.push(`| \`${f}\` | \`${now}\` | ${now === pre.existing[f] ? 'yes' : '**NO**'} |`);
}
L.push('');

L.push('### Pictures (original SVGs, each viewed at 2× by the coordinator)', '');
L.push('| File | Used by | Alt text (Hindi, does not give the answer) |', '|---|---|---|');
const pics = {};
for (const ws of ids) blocks(papers[ws]).forEach(({ b }) => { if (b.picture) (pics[b.picture] = pics[b.picture] || []).push({ ws, num: b.num, alt: b.pictureAlt }); });
Object.keys(pics).sort().forEach(f => L.push(`| \`${f}\` | ${pics[f].map(u => `${u.ws} ${esc(u.num)}`).join('; ')} | ${esc(pics[f][0].alt)} |`));
L.push('');

L.push('### Adapted layouts (shown under the printed instruction; screen only)', '');
for (const ws of ids) {
  const ad = blocks(papers[ws]).filter(x => x.b.adaptation);
  if (!ad.length) continue;
  L.push(`**${ws}**`, '');
  ad.forEach(({ b }) => L.push(`- ${esc(b.num) || '—'}: ${esc(b.adaptation)}`));
  L.push('');
}

L.push('### Paper-only items (done on the printed sheet, parent marks with the rubric)', '');
for (const ws of ids) items(papers[ws]).filter(x => x.i.answerKind === 'paperOnly').forEach(x => L.push(`- ${ws} ${where(x)} (${x.i.marks} marks)`));
L.push('');

L.push('### Every teacherNote', '');
for (const ws of ids) {
  const n = items(papers[ws]).filter(x => x.i.teacherNote);
  L.push(`**${ws}** (${n.length})`, '', '| Question | ⚑ | Note |', '|---|---|---|');
  n.forEach(x => L.push(`| ${where(x)} | ${x.i.answerConfidence === 'check' ? '⚑' : ''} | ${esc(x.i.teacherNote)} |`));
  L.push('');
}

const block = '<!-- generated:start (node scripts/walkthrough-tables.js) -->\n\n' + L.join('\n') + '\n<!-- generated:end -->';
const doc = fs.readFileSync(WT, 'utf8');
const re = /<!-- generated:start[\s\S]*?<!-- generated:end -->/;
if (!re.test(doc)) { console.error('markers not found in WALKTHROUGH.md'); process.exit(1); }
const next = doc.replace(re, () => block);
if (process.argv.includes('--check')) {
  if (next !== doc) { console.error('WALKTHROUGH.md generated section is stale'); process.exit(1); }
  console.log('WALKTHROUGH.md generated section up to date');
} else {
  fs.writeFileSync(WT, next);
  console.log(`wrote generated tables (${L.length} lines)`);
}

#!/usr/bin/env node
// Review sheet generator (sprints/v3/school-contract.md §4, instruction.md §7).
// One markdown sheet per school worksheet, built from the JSON alone, ⚑ items first.
// A parent reads it before the child uses the worksheet. Deterministic: no dates, zero dependencies.
// Usage: node scripts/review-sheet.js [wsNN ...] [--data DIR] [--out DIR]
//   no ids: every DIR/hindi-wsNN.json (default app/data); writes OUT/wsNN.md (default sprints/v3/answer-review)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RULE = 'अभिभावक: बच्चे को कार्यपत्रक देने से पहले यह पूरी सूची पढ़ें — ⚑ वाले उत्तर पहले।';
const KIND = {
  objective: 'वस्तुनिष्ठ (objective)',
  spelling: 'वर्तनी (spelling)',
  judgement: 'विवेक से जाँचें (judgement)',
  paperOnly: 'केवल कागज़ पर (paperOnly)',
};
const SOURCE = {
  textbook: 'पाठ्यपुस्तक (textbook)',
  passage: 'गद्यांश/पद्यांश (passage)',
  authored: 'स्वयं लिखा (authored)',
};

// Markdown-escape the characters that would change rendering. `|` (danda stand-in) is left alone: there are no tables.
const esc = (s) => String(s).replace(/([\\`*_[\]<])/g, '\\$1');
const oneLine = (s) => String(s).replace(/\s*\n\s*/g, ' ');
const has = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
const flagged = (it) => it.answerConfidence === 'check';

// 0.5 → ½, 1.5 → 1½, 2 → 2
function num(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return String(m);
  const whole = Math.floor(n);
  const half = Math.abs(n - whole - 0.5) < 1e-9;
  if (half) return whole ? `${whole}½` : '½';
  return String(n);
}
const marks = (m) => `${num(m)} अंक`;

// Escape the question, then wrap the first occurrence of each underline span in <u>…</u>.
function question(it) {
  let q = esc(oneLine(it.q));
  const missing = [];
  for (const u of Array.isArray(it.underline) ? it.underline : []) {
    const e = esc(oneLine(u));
    const at = e ? q.indexOf(e) : -1;
    if (at < 0) { missing.push(e); continue; }
    q = `${q.slice(0, at)}<u>${e}</u>${q.slice(at + e.length)}`;
  }
  if (missing.length) q += ` (रेखांकित: ${missing.join(' · ')})`;
  return q;
}

function location(sec, blk, it) {
  return [sec.title || `खंड ${sec.code}`, blk.num, it.label || it.slot].filter(has).map(s => esc(oneLine(s))).join(' › ');
}

// state: { shownInstr: Set (per output part) } for block-level lines.
function renderItem(x, state) {
  const { sec, blk, it } = x;
  const out = [`### ${flagged(it) ? '⚑ ' : ''}${location(sec, blk, it)} — ${marks(it.marks)}`, ''];
  const blockLines = [];
  const qEmpty = !has(it.q);
  // Instruction, adaptation and block picture repeat once per output part (⚑ / बाकी),
  // so a parent reading only one part still sees how the block is done.
  const firstInPart = !state.shownInstr.has(blk);
  if (has(blk.instruction) && (qEmpty || firstInPart)) blockLines.push(`- निर्देश: ${esc(oneLine(blk.instruction))}`);
  if (firstInPart) {
    if (has(blk.adaptation)) blockLines.push(`- बदलाव (adaptation): ${esc(oneLine(blk.adaptation))}`);
    if (has(blk.picture)) blockLines.push(`- चित्र: ${esc(blk.picture)}`);
  }
  state.shownInstr.add(blk);
  if (blockLines.length) out.push(...blockLines, '');
  out.push(qEmpty ? '> (अलग प्रश्न-पाठ नहीं — ऊपर का निर्देश ही प्रश्न है)' : `> ${question(it)}`, '');

  if (has(it.options)) out.push(`- विकल्प: ${it.options.map(o => esc(oneLine(o))).join(' · ')}`);
  if (has(it.pairs)) {
    out.push('- जोड़े (सही मिलान):');
    it.pairs.forEach(p => out.push(`  - ${esc(oneLine(p && p.left))} → ${esc(oneLine(p && p.right))}`));
  }
  if (has(it.printedRight)) out.push(`- दाईं ओर छपा क्रम: ${it.printedRight.map(o => esc(oneLine(o))).join(' · ')}`);
  if (has(it.picture)) out.push(`- चित्र: ${esc(it.picture)}`);
  out.push(`- **उत्तर: ${has(it.a) ? esc(oneLine(it.a)) : '(नहीं दिया)'}**`);
  const hasRubric = Array.isArray(it.rubric) && it.rubric.length > 0;
  out.push(`- स्वीकार्य उत्तर: ${has(it.acceptable)
    ? it.acceptable.map(a => esc(oneLine(a))).join(' · ')
    : hasRubric ? '— (अंक-योजना से जाँचें)' : '— (केवल यही रूप)'}`);
  if (hasRubric) {
    out.push('- अंक-योजना (rubric):');
    it.rubric.forEach(b => out.push(`  - ${marks(b.marks)}: ${esc(oneLine(b.desc))}`));
  }
  out.push(`- प्रकार: ${KIND[it.answerKind] || esc(String(it.answerKind))}`);
  const ref = has(it.answerRef) && String(it.answerRef).trim() !== '—' ? ` — ${esc(oneLine(it.answerRef))}` : '';
  out.push(`- स्रोत: ${SOURCE[it.answerSource] || esc(String(it.answerSource))}${ref}`);
  if (has(it.teacherNote)) out.push(`- शिक्षक-टिप्पणी: ${esc(oneLine(it.teacherNote))}`);
  return out.join('\n');
}

function renderSheet(paper) {
  const all = [];
  (paper.sections || []).forEach(sec => (sec.blocks || []).forEach(blk =>
    (blk.items || []).forEach(it => all.push({ sec, blk, it }))));
  const flags = all.filter(x => flagged(x.it));
  const rest = all.filter(x => !flagged(x.it));
  const paperOnly = all.filter(x => x.it.answerKind === 'paperOnly').length;
  const sub = [paper.ws, paper.shortLabel].filter(has).map(esc).join(' · ');

  const out = [
    `<!-- generated from app/data/hindi-${paper.ws}.json by scripts/review-sheet.js — do not edit -->`,
    `# उत्तर समीक्षा · ${esc(oneLine(paper.title || paper.ws))}`, '',
  ];
  if (sub) out.push(`*${sub}*`, '');
  out.push(
    `- स्रोत फ़ाइल (source PDF): ${esc(paper.sourceFile || '(अज्ञात)')}`,
    `- मुद्रित कुल अंक (printed total): ${num(paper.totalMarks)}`,
    `- प्रश्न (items): ${all.length} · ⚑ दोबारा देखें: ${flags.length} · केवल कागज़ पर (paper-only): ${paperOnly}`, '',
    `> ${RULE}`, '');

  const state = { shownInstr: new Set() };
  const part = (heading, list) => {
    out.push(`## ${heading} (${list.length})`, '');
    if (!list.length) out.push('कोई नहीं।', '');
    state.shownInstr = new Set();
    list.forEach(x => out.push(renderItem(x, state), ''));
  };
  part('⚑ दोबारा देखें', flags);
  part('बाकी उत्तर', rest);
  return out.join('\n').replace(/\n+$/, '\n');
}

function main(argv) {
  let dataDir = path.join(ROOT, 'app', 'data');
  let outDir = path.join(ROOT, 'sprints', 'v3', 'answer-review');
  const ids = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data') dataDir = path.resolve(argv[++i] || '');
    else if (a === '--out') outDir = path.resolve(argv[++i] || '');
    else if (/^ws\d{2}$/.test(a)) ids.push(a);
    else { console.error(`unknown argument: ${a}`); return 2; }
  }
  const targets = ids.length ? ids
    : fs.readdirSync(dataDir).map(f => /^hindi-(ws\d{2})\.json$/.exec(f)).filter(Boolean).map(m => m[1]).sort();
  let failed = 0;
  for (const ws of targets) {
    const file = path.join(dataDir, `hindi-${ws}.json`);
    try {
      const paper = JSON.parse(fs.readFileSync(file, 'utf8'));
      fs.mkdirSync(outDir, { recursive: true });
      const dest = path.join(outDir, `${ws}.md`);
      fs.writeFileSync(dest, renderSheet(paper));
      console.log(`wrote ${path.relative(ROOT, dest) || dest}`);
    } catch (e) {
      console.error(`${ws}: ${e.message}`);
      failed++;
    }
  }
  console.log(`${targets.length - failed} sheets`);
  return failed ? 1 : 0;
}

module.exports = { renderSheet };
if (require.main === module) process.exit(main(process.argv.slice(2)));

#!/usr/bin/env node
// Fidelity check (sprint v3, contract §4): every printed string in a school
// worksheet JSON must appear in its typed transcript, and the marks must agree
// with the intake. Hard fail: exit 1 on any error.
//
// Usage: node scripts/fidelity.js [wsNN...] [--data dir] [--transcripts dir] [--intake dir]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---------- normalisation ----------

const PAGE_LINE = /^\s*=== page \S+ ===\s*$/;
const BRACKET_NOTE = /\[(?:चित्र|चिह्न):[^\]]*\]/g;
const TABLE_OPEN = /^\s*\[तालिका\]\s*$/;
const TABLE_CLOSE = /^\s*\[\/तालिका\]\s*$/;
const TAGS = /<\/?(?:u|b)>/g;

// Table-row cell separators: " | " becomes one space; a pipe at either end of the row is dropped.
function tableRow(line) {
  return line.replace(/^\s*\|\s+/, '').replace(/\s+\|\s*$/, '').replace(/\s+\|\s+/g, ' ');
}

/**
 * Normalise transcript or JSON text for comparison.
 * Never touches nukta, chandrabindu/anusvara, matras, halant or digits.
 * opts.keepTags: keep <u>/<b> (used to look for underlined spans).
 * opts.table: treat the whole string as table rows (" | " → space).
 */
// A printed page footer ("Page 1 of 4", "प्रष्ठ 2/8", "1 | Page", "पृष्ठ 2 का 10",
// a bare page number) is dropped only when it is the last non-blank line before a
// page marker or the end of the text, so a passage that runs across a page break
// still matches as one string. Footer-like text anywhere else is kept.
const FOOTER = /^(?:page\s*[0-9०-९]+(?:\s*of\s*[0-9०-९]+)?|[0-9०-९]+\s*[|।]\s*page|(?:पृष्ठ|प्रष्ठ)\s*[0-9०-९]+\s*(?:\/|का)\s*[0-9०-९]+|[0-9०-९]{1,2})$/i;
function footerLines(lines) {
  const drop = new Set();
  if (!lines.some(l => PAGE_LINE.test(l))) return drop;
  const lastBefore = (end) => { for (let j = end - 1; j >= 0; j--) if (lines[j].trim()) return j; return -1; };
  const ends = lines.map((l, i) => (PAGE_LINE.test(l) ? i : -1)).filter(i => i > 0).concat(lines.length);
  for (const end of ends) {
    const j = lastBefore(end);
    if (j >= 0 && !PAGE_LINE.test(lines[j]) && FOOTER.test(lines[j].trim().replace(/\s+/g, ' '))) drop.add(j);
  }
  return drop;
}

function normalise(s, opts = {}) {
  if (s === null || s === undefined) return '';
  let text = String(s).normalize('NFC');
  const lines = text.split(/\r?\n/);
  const footers = footerLines(lines);
  const out = [];
  let inTable = !!opts.table;
  for (let [i, line] of lines.entries()) {
    if (PAGE_LINE.test(line) || footers.has(i)) continue;
    if (TABLE_OPEN.test(line)) { inTable = true; continue; }
    if (TABLE_CLOSE.test(line)) { inTable = !!opts.table; continue; }
    line = line.replace(BRACKET_NOTE, ' ');
    if (inTable) line = tableRow(line);
    out.push(line);
  }
  text = out.join('\n');
  if (!opts.keepTags) text = text.replace(TAGS, '');
  text = text
    .replace(/\|/g, '।')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/(?:_+|\.{3,}|-{3,}|…+)+/g, '____')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

// ---------- coverage (labelled transcript lines must be backed by JSON) ----------

const D = '[0-9०-९]+';
const LABEL_RES = [
  new RegExp(`^प्रश्न\\s*${D}\\s*[.:)]?`), // प्रश्न 1.  प्रश्न1.
  new RegExp(`^प्र\\s*[.०]\\s*${D}\\s*[.:)]?`), // प्र.1  प्र० 1
  /^\(\s*[क-ह]\s*\)/, // (क)  (ख )
  new RegExp(`^\\(\\s*(?:${D}|[ivxIVX]+|[a-zA-Z])\\s*\\)`), // (1) (१) (i) (a)
  /^[क-ह]\s*[).]/, // क)  क.
  new RegExp(`^${D}\\s*[.)]`), // 1.  १)
  /^[ivx]+\s*[.)]/, // i)  ii.
];

function stripLabels(s) {
  let rest = s;
  for (let guard = 0; guard < 5; guard++) {
    const re = LABEL_RES.find((r) => r.test(rest));
    if (!re) break;
    rest = rest.replace(re, '').trim();
  }
  return rest;
}
const isLabelOnly = (s) => s !== '' && stripLabels(s) === '';
// Nothing to cover: blanks, mark brackets like (1) / (1X4=4), punctuation.
const isFiller = (s) => s.replace(/____/g, '').replace(/\([^)]*\)/g, '').replace(/[\s.,:;।?!'"-]/g, '') === '';

function coverageUnits(transcript) {
  const units = [];
  let inTable = false;
  for (const raw of String(transcript).split(/\r?\n/)) {
    if (TABLE_OPEN.test(raw)) { inTable = true; continue; }
    if (TABLE_CLOSE.test(raw)) { inTable = false; continue; }
    if (inTable) continue;
    // two-column rows: 4+ spaces or a tab separate columns
    for (const col of raw.split(/ {4,}|\t+/)) {
      const n = normalise(col);
      if (!n) continue;
      if (LABEL_RES.some((r) => r.test(n))) units.push(n);
    }
  }
  return units;
}

function isCovered(unit, candidates) {
  const rest = stripLabels(unit);
  if (isFiller(rest)) return true;
  return candidates.some((c) => unit.startsWith(c) || rest.startsWith(c) || c.includes(rest));
}

// ---------- paper check ----------

function checkPaperDetailed(paper, transcriptText, intake) {
  const errors = [];
  const warnings = [];
  const hay = normalise(transcriptText);
  const candidates = new Set();

  const variants = (s) => {
    const a = normalise(s);
    const b = normalise(s, { table: true });
    return a === b ? [a] : [a, b];
  };
  const found = (s) => variants(s).some((v) => hay.includes(v));
  const remember = (s) => variants(s).forEach((v) => { if (v && !isLabelOnly(v) && !isFiller(v)) candidates.add(v); });
  const need = (field, s) => {
    if (typeof s !== 'string') return;
    const n = normalise(s);
    if (!n) return; // skip empty strings
    remember(s);
    if (!found(s)) errors.push(`${field}: not found in transcript: "${n}"`);
  };

  need('title', paper.title);
  (paper.header || []).forEach((h, i) => need(`header[${i}]`, h));

  (paper.sections || []).forEach((sec, si) => {
    const sp = `s${si}`;
    need(`${sp}.title`, sec.title);
    (sec.blocks || []).forEach((blk, bi) => {
      const bp = `${sp}-b${bi}`;
      const num = typeof blk.num === 'string' ? blk.num : '';
      const ins = typeof blk.instruction === 'string' ? blk.instruction : '';
      const both = `${num} ${ins}`;
      if (normalise(both)) {
        remember(both);
        if (!found(both)) {
          need(`${bp}.num`, num);
          need(`${bp}.instruction`, ins);
        }
      }
      need(`${bp}.passage`, blk.passage);
      (blk.items || []).forEach((it, ii) => {
        const ip = `${bp}-i${ii}`;
        need(`${ip}.label`, it.label);
        need(`${ip}.q`, it.q);
        (it.options || []).forEach((o, k) => need(`${ip}.options[${k}]`, o));
        (it.pairs || []).forEach((p, k) => need(`${ip}.pairs[${k}].left`, p && p.left));
        (it.printedRight || []).forEach((r, k) => need(`${ip}.printedRight[${k}]`, r));
        (it.underline || []).forEach((u, k) => {
          const nu = normalise(u);
          if (!nu) return;
          if (!normalise(it.q).includes(nu)) {
            errors.push(`${ip}.underline[${k}]: span not in q: "${nu}" (q: "${normalise(it.q)}")`);
            return;
          }
          const tagged = normalise(transcriptText, { keepTags: true });
          const spans = [...tagged.matchAll(/<u>(.*?)<\/u>/g)].map((m) => normalise(m[1]));
          if (!spans.some((x) => x.includes(nu))) {
            warnings.push(`${ip}.underline[${k}]: "${nu}" is not inside <u>…</u> in the transcript`);
          }
        });
      });
    });
  });

  // labelled transcript lines must be covered by some checked JSON string
  const cands = [...candidates];
  for (const unit of coverageUnits(transcriptText)) {
    if (!isCovered(unit, cands)) errors.push(`coverage: uncovered labelled transcript line: "${unit}"`);
  }

  // marks vs intake
  if (!intake || typeof intake !== 'object') {
    errors.push('intake: missing intake (needs printedTotal and sections)');
  } else {
    if (paper.totalMarks !== intake.printedTotal) {
      errors.push(`totalMarks: ${paper.totalMarks} ≠ intake printedTotal ${intake.printedTotal}`);
    }
    const ps = paper.sections || [];
    const is = intake.sections || [];
    if (ps.length !== is.length) {
      errors.push(`sections: section count ${ps.length} ≠ intake section count ${is.length}`);
    }
    for (let i = 0; i < Math.min(ps.length, is.length); i++) {
      if (is[i].code !== undefined && String(ps[i].code) !== String(is[i].code)) {
        errors.push(`s${i}.code: "${ps[i].code}" ≠ intake code "${is[i].code}"`);
      }
      if (ps[i].marks !== is[i].marks) {
        errors.push(`s${i}.marks: ${ps[i].marks} ≠ intake marks ${is[i].marks}`);
      }
    }
  }
  return { errors, warnings, checked: candidates.size };
}

function checkPaper(paper, transcriptText, intake) {
  const r = checkPaperDetailed(paper, transcriptText, intake);
  const errs = r.errors;
  // non-enumerable so the result still compares equal to a plain array
  Object.defineProperty(errs, 'warnings', { value: r.warnings, enumerable: false });
  return errs;
}

// ---------- CLI ----------

function parseArgs(argv) {
  const o = {
    data: path.join(ROOT, 'app/data'),
    transcripts: path.join(ROOT, 'source/transcripts'),
    intake: path.join(ROOT, 'source/intake'),
    ws: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data' || a === '--transcripts' || a === '--intake') {
      const v = argv[++i];
      if (!v) throw new Error(`${a} needs a directory`);
      o[a.slice(2)] = path.resolve(v);
    } else if (/^ws\d+$/.test(a)) {
      o.ws.push(a);
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  return o;
}

function readIntake(dir, ws) {
  for (const f of [`${ws}.json`, `intake-${ws}.json`]) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  const merged = path.join(dir, '..', 'intake.json');
  if (fs.existsSync(merged)) {
    const m = JSON.parse(fs.readFileSync(merged, 'utf8'));
    return (m.papers || []).find((p) => p.ws === ws) || null;
  }
  return null;
}

function main(argv) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    return 1;
  }
  const files = fs.existsSync(o.data)
    ? fs.readdirSync(o.data).filter((f) => /^hindi-ws\d+\.json$/.test(f)).sort()
    : [];
  let n = 0;
  let bad = 0;
  for (const f of files) {
    const ws = f.slice('hindi-'.length, -'.json'.length);
    if (o.ws.length && !o.ws.includes(ws)) continue;
    let paper;
    try {
      paper = JSON.parse(fs.readFileSync(path.join(o.data, f), 'utf8'));
    } catch (e) {
      n++; bad++;
      console.log(`${ws} FAIL\n  ${f}: invalid JSON: ${e.message}`);
      continue;
    }
    if (paper.kind !== 'school') continue;
    n++;
    const tp = path.join(o.transcripts, `${ws}.txt`);
    if (!fs.existsSync(tp)) {
      bad++;
      console.log(`${ws} FAIL\n  transcript missing: ${path.relative(ROOT, tp)}`);
      continue;
    }
    const r = checkPaperDetailed(paper, fs.readFileSync(tp, 'utf8'), readIntake(o.intake, ws));
    if (r.errors.length) {
      bad++;
      console.log(`${ws} FAIL (${r.errors.length} error${r.errors.length === 1 ? '' : 's'})`);
      r.errors.forEach((e) => console.log('  ' + e));
    } else {
      console.log(`${ws} OK (${r.checked} strings)`);
    }
    r.warnings.forEach((w) => console.log('  WARN ' + w));
  }
  if (bad) {
    console.log(`FAIL ${bad} of ${n} school paper${n === 1 ? '' : 's'}`);
    return 1;
  }
  console.log(`OK ${n} school paper${n === 1 ? '' : 's'}`);
  return 0;
}

module.exports = { normalise, checkPaper, checkPaperDetailed };

if (require.main === module) process.exitCode = main(process.argv.slice(2));

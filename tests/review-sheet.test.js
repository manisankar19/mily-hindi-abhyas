// Task 16: review sheet generator + existing-paper hash check. Plain node assert, zero dependencies.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'fixtures', 'good');
const { renderSheet } = require('../scripts/review-sheet.js');

const load = () => JSON.parse(fs.readFileSync(path.join(FIX, 'hindi-ws99.json'), 'utf8'));
const run = (script, args) => {
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
};
const scratch = () => {
  const base = process.env.REVIEW_SHEET_TMP || path.join(require('os').tmpdir());
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, 'check-existing-'));
};

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('renderSheet(good fixture) equals tests/fixtures/good/ws99.md', () => {
  const expected = fs.readFileSync(path.join(FIX, 'ws99.md'), 'utf8');
  assert.strictEqual(renderSheet(load()), expected);
});

test('⚑ items come before non-⚑ items', () => {
  const md = renderSheet(load());
  const heads = md.split('\n').filter(l => l.startsWith('### '));
  const firstPlain = heads.findIndex(h => !h.startsWith('### ⚑'));
  assert.ok(firstPlain > 0, 'there are ⚑ items first');
  assert.ok(heads.slice(firstPlain).every(h => !h.startsWith('### ⚑')), 'no ⚑ after the first non-⚑');
  assert.strictEqual(heads.filter(h => h.startsWith('### ⚑')).length, 2);
  assert.ok(md.indexOf('## ⚑ दोबारा देखें') < md.indexOf('## बाकी उत्तर'));
});

test('deterministic: two calls give identical output, no dates', () => {
  const a = renderSheet(load());
  const b = renderSheet(load());
  assert.strictEqual(a, b);
  assert.ok(!/\d{4}-\d{2}-\d{2}T|\b20\d\d-\d\d-\d\d\b/.test(a), 'no ISO dates');
});

test('0.5 marks render as ½', () => {
  const md = renderSheet(load());
  assert.ok(md.includes('  - ½ अंक: एक सही वाक्य'));
  const p = load();
  const it = p.sections[1].blocks[2].items[0];
  it.marks = 1.5;
  it.rubric[0].marks = 1.5;
  const md2 = renderSheet(p);
  assert.ok(md2.includes('प्रश्न 5. — 1½ अंक'));
  assert.ok(md2.includes('  - 1½ अंक:'));
  assert.ok(!md2.includes('0.5') && !md2.includes('1.5'));
});

test('teacherNote is shown on its item', () => {
  const md = renderSheet(load());
  const at = md.indexOf('### ⚑ पठन (3 अंक) › प्रश्न 1. › (ख)');
  const next = md.indexOf('### ', at + 4);
  assert.ok(md.slice(at, next).includes('- शिक्षक-टिप्पणी: ‘दौडता’ (बिना नुक्ता) भी स्वीकार करें।'));
});

test('underline, options, pairs, paperOnly count, adaptation once per part', () => {
  const p = load();
  p.sections[1].blocks[0].items[0].answerConfidence = 'check'; // प्रश्न 3 into ⚑ as well as having an adaptation
  p.sections[1].blocks[0].items.push({ label: '(ख)', q: 'घर / घार', marks: 1, answerKind: 'paperOnly', a: 'घर', acceptable: [],
    rubric: [{ marks: 1, desc: 'सही' }, { marks: 0, desc: 'गलत' }], answerSource: 'authored', answerRef: '—', answerConfidence: 'ok', teacherNote: null });
  p.sections[1].blocks[1].items[0].pairs = [{ left: 'आम', right: 'फल' }];
  p.sections[1].blocks[1].items[0].printedRight = ['फल'];
  p.sections[0].blocks[1].items[0].q = 'a_b *c* गहरा';
  const md = renderSheet(p);
  assert.ok(md.includes('केवल कागज़ पर (paper-only): 1'));
  assert.ok(md.includes('⚑ दोबारा देखें: 3'));
  // प्रश्न 3 has one ⚑ item and one other item: its adaptation shows once in each part, so 2 in all.
  assert.strictEqual(md.split('बदलाव (adaptation): यहाँ सही शब्द लिखिए।').length - 1, 2, 'adaptation once per part');
  const rest = md.slice(md.indexOf('## बाकी उत्तर'));
  assert.ok(rest.includes('बदलाव (adaptation): यहाँ सही शब्द लिखिए।'), 'adaptation visible in बाकी part');
  assert.ok(md.includes('  - आम → फल'));
  assert.ok(md.includes('> a\\_b \\*c\\* <u>गहरा</u>'));
  assert.ok(md.includes('प्रकार: केवल कागज़ पर (paperOnly)'));
});

test('CLI with no hindi-ws*.json in app/data prints "0 sheets" and exits 0', () => {
  const have = fs.readdirSync(path.join(ROOT, 'app', 'data')).some(f => /^hindi-ws\d+\.json$/.test(f));
  if (have) return; // only meaningful before any worksheet exists
  const r = run('review-sheet.js', []);
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(/^0 sheets$/m.test(r.out), r.out);
});

test('CLI writes a sheet equal to renderSheet for a given data dir', () => {
  const dir = scratch();
  fs.copyFileSync(path.join(FIX, 'hindi-ws99.json'), path.join(dir, 'hindi-ws99.json'));
  const out = path.join(dir, 'out');
  const r = run('review-sheet.js', ['ws99', '--data', dir, '--out', out]);
  assert.strictEqual(r.code, 0, r.out);
  assert.strictEqual(fs.readFileSync(path.join(out, 'ws99.md'), 'utf8'), fs.readFileSync(path.join(FIX, 'ws99.md'), 'utf8'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('check-existing passes on the real repo', () => {
  const r = run('check-existing.js', []);
  assert.strictEqual(r.code, 0, r.out);
  assert.strictEqual((r.out.match(/^OK /gm) || []).length, 7, r.out);
});

test('check-existing fails when one byte of a chapter file changes', () => {
  const dir = scratch();
  for (let n = 1; n <= 7; n++) fs.copyFileSync(path.join(ROOT, 'app', 'data', `chapter${n}.json`), path.join(dir, `chapter${n}.json`));
  assert.strictEqual(run('check-existing.js', [dir]).code, 0, 'unchanged copy passes');
  const f = path.join(dir, 'chapter3.json');
  const buf = fs.readFileSync(f);
  buf[buf.length - 1] ^= 1;
  fs.writeFileSync(f, buf);
  const r = run('check-existing.js', [dir]);
  assert.strictEqual(r.code, 1, r.out);
  assert.ok(/^CHANGED .*chapter3\.json/m.test(r.out), r.out);
  assert.strictEqual((r.out.match(/^OK /gm) || []).length, 6, r.out);
  fs.unlinkSync(path.join(dir, 'chapter5.json'));
  const r2 = run('check-existing.js', [dir]);
  assert.strictEqual(r2.code, 1, r2.out);
  assert.ok(/^MISSING .*chapter5\.json/m.test(r2.out), r2.out);
  fs.rmSync(dir, { recursive: true, force: true });
});

let pass = 0;
for (const t of tests) {
  try { t.fn(); pass++; } catch (e) { console.error(`FAIL ${t.name}\n  ${e.message}`); }
}
console.log(`review-sheet ${pass}/${tests.length}`);
process.exit(pass === tests.length ? 0 : 1);

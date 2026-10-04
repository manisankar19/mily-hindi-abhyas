// Tests for scripts/consistency.js: identical keys pass, a differing key fails.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const good = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/good/hindi-ws99.json'), 'utf8'));
const tmpBase = process.env.REVIEW_SHEET_TMP || os.tmpdir();
let pass = 0, total = 0;
function run(papers) {
  const dir = fs.mkdtempSync(path.join(tmpBase, 'consistency-'));
  try {
    papers.forEach(p => fs.writeFileSync(path.join(dir, `hindi-${p.ws}.json`), JSON.stringify(p)));
    return spawnSync(process.execPath, [path.join(ROOT, 'scripts/consistency.js'), '--data', dir], { encoding: 'utf8' });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function test(name, fn) { total++; try { fn(); pass++; } catch (e) { console.error('FAIL', name, '\n ', e.message); } }
const copy = (ws) => {
  const p = Object.assign(JSON.parse(JSON.stringify(good)), { ws });
  p.sections[1].blocks[2].items[0].q = 'बिल्ली के बारे में दो वाक्य लिखिए';   // give the judgement item a question so it is matched
  return p;
};

test('same question, same key in two papers → OK', () => {
  const r = run([copy('ws01'), copy('ws02')]);
  assert.strictEqual(r.status, 0, r.stdout);
  assert.ok(/OK \d+ shared/.test(r.stdout), r.stdout);
  assert.ok(!/OK 0 shared/.test(r.stdout), 'should find shared groups');
});
test('same question, different acceptable → FAIL naming both papers', () => {
  const b = copy('ws02');
  b.sections[0].blocks[0].items[0].acceptable = ['पार्क'];
  const r = run([copy('ws01'), b]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stdout.includes('ws01') && r.stdout.includes('ws02'), r.stdout);
});
test('same question, different answerConfidence → FAIL', () => {
  const b = copy('ws02');
  b.sections[0].blocks[0].items[0].answerConfidence = 'check';
  assert.strictEqual(run([copy('ws01'), b]).status, 1);
});
test('different marks → rubric may differ, key may not', () => {
  const a = copy('ws01'), b = copy('ws02');
  const it = b.sections[1].blocks[2].items[0];          // judgement item
  it.marks = 2; it.rubric = [{ marks: 2, desc: 'x' }, { marks: 1, desc: 'y' }, { marks: 0, desc: 'z' }];
  assert.strictEqual(run([a, b]).status, 0);
});
test('same marks, different rubric bands → FAIL', () => {
  const b = copy('ws02');
  b.sections[1].blocks[2].items[0].rubric[1].desc = 'कुछ और';
  assert.strictEqual(run([copy('ws01'), b]).status, 1);
});
test('one paper only → OK 0 shared', () => {
  const r = run([copy('ws01')]);
  assert.strictEqual(r.status, 0);
  assert.ok(/OK 0 shared/.test(r.stdout), r.stdout);
});
console.log(`consistency ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);

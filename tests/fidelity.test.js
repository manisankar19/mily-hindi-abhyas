// Task 15: scripts/fidelity.js — the JSON must match the typed transcript and the intake.
// Plain node assert; prints "fidelity N/N" and exits non-zero on any failure.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const GOOD = path.join(__dirname, 'fixtures/good');
const FX = path.join(__dirname, 'fixtures/fidelity');
const SCRIPT = path.join(ROOT, 'scripts/fidelity.js');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const readText = (p) => fs.readFileSync(p, 'utf8');

let passed = 0;
let total = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (e) {
    console.log('  FAIL ' + name + '\n       ' + String(e && e.message).split('\n').join('\n       '));
  }
}

let fidelity = {};
try {
  fidelity = require(SCRIPT);
} catch (e) {
  console.log('  (cannot load scripts/fidelity.js: ' + e.message + ')');
}
const { normalise, checkPaper } = fidelity;

const goodPaper = () => readJson(path.join(GOOD, 'hindi-ws99.json'));
const goodText = readText(path.join(GOOD, 'ws99.txt'));
const goodIntake = readJson(path.join(GOOD, 'intake-ws99.json'));
const check = (file, intake = goodIntake, text = goodText) => checkPaper(readJson(path.join(FX, file)), text, intake);
const hasErr = (errs, re) => errs.some((e) => re.test(e));

// --- normalise() ---
test('normalise: whitespace collapsed and trimmed', () => {
  assert.strictEqual(normalise('  क\n\tख    ग  '), 'क ख ग');
});
test('normalise: strips <u>/<b> tags', () => {
  assert.strictEqual(normalise('यह <u>गहरा</u> है <b>ना</b>'), 'यह गहरा है ना');
});
test('normalise: drops page markers and picture/emblem lines', () => {
  assert.strictEqual(normalise('=== page 1 ===\n[चिह्न: school emblem]\nक\n[चित्र: a cat]\nख'), 'क ख');
});
test('normalise: | in running text becomes ।', () => {
  assert.strictEqual(normalise('लिखिए| (2)'), 'लिखिए। (2)');
  assert.strictEqual(normalise('क | ख'), 'क । ख');
});
test('normalise: table separators " | " become a single space', () => {
  assert.strictEqual(normalise('[तालिका]\nशब्द | विलोम\nदिन | ____\n[/तालिका]\nलिखो|'), 'शब्द विलोम दिन ____ लिखो।');
});
test('normalise: curly quotes and dashes', () => {
  assert.strictEqual(normalise('“अरे” ‘हाँ’ इधर – उधर—'), '"अरे" \'हाँ\' इधर - उधर-');
});
test('normalise: blank runs collapse to ____', () => {
  assert.strictEqual(normalise('क __ ख ...... ग --- घ … ङ _'), 'क ____ ख ____ ग ____ घ ____ ङ ____');
  assert.strictEqual(normalise('a.b - c'), 'a.b - c');
});
test('normalise: keeps nukta, chandrabindu/anusvara, matras, halant', () => {
  assert.notStrictEqual(normalise('रोज़'), normalise('रोज'));
  assert.notStrictEqual(normalise('कुआँ'), normalise('कुआं'));
  assert.notStrictEqual(normalise('किताब'), normalise('कीताब'));
  assert.notStrictEqual(normalise('क्या'), normalise('कया'));
});
test('normalise: Devanagari and Latin numerals stay distinct', () => {
  assert.notStrictEqual(normalise('१'), normalise('1'));
  assert.strictEqual(normalise('१ 1'), '१ 1');
});

// --- checkPaper() ---
test('good fixture passes', () => {
  const errs = checkPaper(goodPaper(), goodText, goodIntake);
  assert.deepStrictEqual(errs, []);
});
test('altered matra (ि→ी in a q) fails, naming the field and normalised string', () => {
  const errs = check('bad-matra.json');
  assert.ok(hasErr(errs, /s1-b0-i0\.q/), errs.join('\n'));
  assert.ok(hasErr(errs, /कीताब \/ कीताब/), errs.join('\n'));
});
test('one altered word fails', () => {
  const errs = check('bad-word.json');
  assert.ok(hasErr(errs, /s0-b0-i0\.q.*राम रोज़ शाम/), errs.join('\n'));
});
test('wrong section mark vs intake fails', () => {
  const errs = check('bad-section-mark.json');
  assert.ok(hasErr(errs, /marks/), errs.join('\n'));
  assert.ok(errs.length >= 1);
});
test('totalMarks ≠ printedTotal fails', () => {
  const errs = check('bad-total.json');
  assert.ok(hasErr(errs, /totalMarks/), errs.join('\n'));
});
test('section count ≠ intake fails', () => {
  const errs = checkPaper(goodPaper(), goodText, readJson(path.join(FX, 'intake-ws99-extra-section.json')));
  assert.ok(hasErr(errs, /section count/i), errs.join('\n'));
});
test('missing intake is an error', () => {
  const errs = checkPaper(goodPaper(), goodText, null);
  assert.ok(hasErr(errs, /intake/i), errs.join('\n'));
});
test('dropped question (ख) fails the coverage check', () => {
  const errs = check('missing-item.json');
  assert.ok(hasErr(errs, /uncovered/i), errs.join('\n'));
  assert.ok(hasErr(errs, /राम पार्क में क्या करता है/), errs.join('\n'));
});
test('nukta-only change (ज़→ज) fails', () => {
  const errs = check('bad-nukta.json');
  assert.ok(hasErr(errs, /s0-b0-i0\.q/), errs.join('\n'));
});
test('chandrabindu→anusvara change fails', () => {
  const errs = check('bad-chandrabindu.json');
  assert.ok(hasErr(errs, /s0-b1-i0\.q/), errs.join('\n'));
});
test('numerals: Devanagari digits in title vs Latin in print fails', () => {
  const errs = check('bad-numeral.json');
  assert.ok(hasErr(errs, /^title/), errs.join('\n'));
});
test('underline span not in q fails', () => {
  const errs = check('bad-underline.json');
  assert.ok(hasErr(errs, /s0-b1-i0\.underline\[0\]/), errs.join('\n'));
});
test('underline span in q but not <u> in transcript is a warning only', () => {
  const errs = check('warn-underline.json');
  assert.deepStrictEqual(errs, []);
  assert.ok(Array.isArray(errs.warnings) && errs.warnings.some((w) => /underline/.test(w)), String(errs.warnings));
});
test('table separators, | vs ।, quotes, dashes, blanks, <b> and two-column rows normalise', () => {
  const errs = checkPaper(readJson(path.join(FX, 'table-ws98.json')), readText(path.join(FX, 'ws98.txt')), readJson(path.join(FX, 'intake-ws98.json')));
  assert.deepStrictEqual(errs, []);
});

// --- CLI ---
function run(args) {
  try {
    return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout) + String(e.stderr) };
  }
}
test('CLI: good fixture dir exits 0', () => {
  const r = run(['--data', GOOD, '--transcripts', GOOD, '--intake', GOOD]);
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(/ws99.*OK/.test(r.out), r.out);
  assert.ok(/OK 1 school paper/.test(r.out), r.out);
});
test('CLI: bad paper exits 1 and prints the error', () => {
  const r = run(['--data', path.join(FX, 'cli-bad'), '--transcripts', GOOD, '--intake', GOOD]);
  assert.strictEqual(r.code, 1, r.out);
  assert.ok(/s1-b0-i0\.q/.test(r.out), r.out);
});
test('CLI: no school papers prints "OK 0 school papers"', () => {
  const r = run(['--data', FX, '--transcripts', GOOD, '--intake', GOOD]);
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(/OK 0 school papers/.test(r.out), r.out);
});

console.log(`fidelity ${passed}/${total}`);
process.exit(passed === total ? 0 : 1);

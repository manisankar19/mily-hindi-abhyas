#!/usr/bin/env node
/* Task 14: validator fixtures. Plain node + assert, no test framework.
 *
 *   - the shared good fixture (tests/fixtures/good/hindi-ws99.json) → 0 errors
 *   - every tests/fixtures/validate/bad-*.json → ≥1 error, and every error it
 *     produces carries the fixture's own rule tag (so each trips exactly one rule)
 *   - bad-duplicate-ws.json is a cross-file rule: valid alone, an error next to good
 *   - app/data/chapter1..7.json → 0 errors under the chapter rules
 *   - `node validate.js` on app/data exits 0 and prints "OK 7 papers"
 *
 * Usage: node tests/fixtures.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const GOOD_DIR = path.join(__dirname, 'fixtures', 'good');
const BAD_DIR = path.join(__dirname, 'fixtures', 'validate');
const ASSETS_DIR = path.join(GOOD_DIR, 'assets');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// Fixture name → rule tag, where the two differ.
const EXPECTED_TAG = {
  'spelling-check-no-note': 'spelling-acceptable',
};

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, err });
  }
}

let validator;
try {
  validator = require(path.join(ROOT, 'validate.js'));
} catch (err) {
  process.stderr.write('FAIL: cannot load validate.js: ' + err.message + '\n');
  process.stdout.write('validator 0/1\n');
  process.exit(1);
}
const { validatePaper, findDuplicateWs } = validator;

const good = readJson(path.join(GOOD_DIR, 'hindi-ws99.json'));
const goodIntake = readJson(path.join(GOOD_DIR, 'intake-ws99.json'));

test('good fixture hindi-ws99.json → 0 errors', () => {
  const errors = validatePaper(good, { assetsDir: ASSETS_DIR, intake: goodIntake });
  assert.deepStrictEqual(errors, []);
});

const badFiles = fs.readdirSync(BAD_DIR)
  .filter((f) => /^bad-.*\.json$/.test(f) && !f.endsWith('.intake.json'))
  .sort();

test('bad fixtures exist', () => assert.ok(badFiles.length >= 20, `only ${badFiles.length} bad fixtures`));

for (const file of badFiles) {
  const name = file.replace(/^bad-/, '').replace(/\.json$/, '');
  const tag = EXPECTED_TAG[name] || name;
  const paper = readJson(path.join(BAD_DIR, file));
  const intakeFile = path.join(BAD_DIR, file.replace(/\.json$/, '.intake.json'));
  const intake = fs.existsSync(intakeFile) ? readJson(intakeFile) : goodIntake;

  if (name === 'duplicate-ws') {
    test(`${file} → valid alone, [${tag}] next to the good fixture`, () => {
      assert.deepStrictEqual(validatePaper(paper, { assetsDir: ASSETS_DIR, intake }), []);
      const errors = findDuplicateWs([
        { file: 'tests/fixtures/good/hindi-ws99.json', paper: good },
        { file: 'tests/fixtures/validate/' + file, paper },
      ]);
      assert.ok(errors.length >= 1, 'expected a duplicate-ws error');
      for (const e of errors) assert.ok(e.includes(`[${tag}]`), `unexpected error: ${e}`);
    });
    continue;
  }

  test(`${file} → [${tag}] only`, () => {
    const errors = validatePaper(paper, { assetsDir: ASSETS_DIR, intake });
    assert.ok(errors.length >= 1, 'expected at least one error, got none');
    for (const e of errors) assert.ok(e.includes(`[${tag}]`), `error from another rule: ${e}`);
  });
}

for (let n = 1; n <= 7; n++) {
  const file = path.join(ROOT, 'app', 'data', `chapter${n}.json`);
  test(`chapter${n}.json → 0 errors (chapter rules)`, () => {
    const errors = validatePaper(readJson(file), { assetsDir: path.join(ROOT, 'app', 'assets'), intake: null });
    assert.deepStrictEqual(errors, []);
  });
}

test('CLI: node validate.js on app/data → exit 0, "OK N papers" (7 chapters + every worksheet)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'validate.js')], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const expected = fs.readdirSync(path.join(ROOT, 'app', 'data')).filter(f => /^(chapter\d+|hindi-ws\d{2})\.json$/.test(f)).length;
  assert.ok(expected >= 7);
  assert.ok(new RegExp(`^OK ${expected} papers, \\d+ items$`, 'm').test(r.stdout), r.stdout);
});

test('CLI: a bad fixture → exit 1 with its rule tag', () => {
  const r = spawnSync(process.execPath, [
    path.join(ROOT, 'validate.js'), '--assets', ASSETS_DIR, path.join(BAD_DIR, 'bad-block-sum.json'),
  ], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.ok((r.stdout + r.stderr).includes('[block-sum]'), r.stdout + r.stderr);
});

let passed = 0;
for (const r of results) {
  if (r.ok) {
    passed++;
  } else {
    process.stderr.write(`FAIL: ${r.name}\n  ${String(r.err && r.err.message).split('\n').join('\n  ')}\n`);
  }
}
process.stdout.write(`validator ${passed}/${results.length}\n`);
process.exit(passed === results.length ? 0 : 1);

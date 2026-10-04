// Task 31: build.js discovers papers (no hard-coded counts), inlines each SVG once,
// keeps the GANESH behaviour, and fails loudly on bad input without writing dist.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TMP = process.env.REVIEW_SHEET_TMP || os.tmpdir();
const TEST_CODE = 'test-code-not-the-real-one';
let pass = 0, total = 0;
function test(name, fn) { total++; try { fn(); pass++; console.log('  ok  ', name); } catch (e) { console.error('  FAIL', name, '\n      ', e.message); } }

function build(env = {}) {
  return spawnSync(process.execPath, [path.join(ROOT, 'build.js')], {
    cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { GANESH: TEST_CODE }, env),
  });
}
function tmpDir(name) { return fs.mkdtempSync(path.join(TMP, `build-${name}-`)); }
function copyData(dir) {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'app/data'))) fs.copyFileSync(path.join(ROOT, 'app/data', f), path.join(dir, 'data', f));
  for (const f of fs.readdirSync(path.join(ROOT, 'app/assets'))) fs.copyFileSync(path.join(ROOT, 'app/assets', f), path.join(dir, 'assets', f));
  fs.copyFileSync(path.join(ROOT, 'app/worksheet-order.json'), path.join(dir, 'order.json'));
  return { HINDI_DATA_DIR: path.join(dir, 'data'), HINDI_ASSETS_DIR: path.join(dir, 'assets'), HINDI_ORDER_FILE: path.join(dir, 'order.json'), HINDI_DIST_DIR: path.join(dir, 'dist') };
}
function jsonTag(html, id) {
  const m = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`));
  assert.ok(m, `#${id} present`);
  return JSON.parse(m[1]);
}

const dataFiles = fs.readdirSync(path.join(ROOT, 'app/data')).filter(f => /^(chapter\d+|hindi-ws\d{2})\.json$/.test(f));
const wsIds = dataFiles.filter(f => f.startsWith('hindi-ws')).map(f => f.slice(6, 10)).sort();

// ---- the real build ----
const dir = tmpDir('real');
const env = copyData(dir);
const r = build(env);
const outFile = path.join(env.HINDI_DIST_DIR, 'index.html');
const html = r.status === 0 && fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';

test('real data builds (exit 0) into the requested dist dir', () => { assert.strictEqual(r.status, 0, r.stdout + r.stderr); assert.ok(html, 'dist/index.html written'); });
test('papersData holds every chapter and every worksheet, discovered from app/data', () => {
  const papers = jsonTag(html, 'papersData');
  const keys = Object.keys(papers).sort();
  assert.strictEqual(keys.length, dataFiles.length);
  for (let n = 1; n <= 7; n++) assert.ok(papers[String(n)], `chapter ${n}`);
  for (const ws of wsIds) assert.strictEqual(papers[ws].ws, ws);
});
test('worksheetOrder lists every worksheet exactly once', () => {
  const order = jsonTag(html, 'worksheetOrder');
  assert.deepStrictEqual([...order].sort(), wsIds);
});
test('assetsData has each referenced picture exactly once', () => {
  const papers = jsonTag(html, 'papersData');
  const refs = new Set();
  Object.values(papers).forEach(p => (p.sections || []).forEach(s => s.blocks.forEach(b => {
    if (b.picture) refs.add(b.picture);
    b.items.forEach(i => { if (i.picture) refs.add(i.picture); });
  })));
  const assets = jsonTag(html, 'assetsData');
  assert.deepStrictEqual(Object.keys(assets).sort(), [...refs].sort());
  Object.values(assets).forEach(u => assert.ok(/^data:image\/svg\+xml;base64,/.test(u)));
  assert.strictEqual((html.match(/data:image\/svg\+xml;base64,/g) || []).length, refs.size, 'no duplicate inlining');
});
test('GANESH hash injected; plaintext code absent', () => {
  const hash = crypto.createHash('sha256').update(TEST_CODE).digest('hex');
  assert.ok(html.includes(`'${hash}'`));
  assert.ok(!html.includes(TEST_CODE));
  assert.ok(!html.includes('__GANESH_HASH__'));
});
test('app.js and styles.css are inlined verbatim (no $& / $\' replacement patterns applied)', () => {
  const app = fs.readFileSync(path.join(ROOT, 'app/app.js'), 'utf8');
  const hash = crypto.createHash('sha256').update(TEST_CODE).digest('hex');
  assert.ok(html.includes(app.split('__GANESH_HASH__').join(hash)), 'app.js verbatim');
  assert.ok(html.includes(fs.readFileSync(path.join(ROOT, 'app/styles.css'), 'utf8')), 'styles.css verbatim');
});
test('chapter JSON content is unchanged inside papersData', () => {
  const papers = jsonTag(html, 'papersData');
  for (let n = 1; n <= 7; n++) {
    assert.deepStrictEqual(papers[String(n)], JSON.parse(fs.readFileSync(path.join(ROOT, `app/data/chapter${n}.json`), 'utf8')));
  }
});
fs.rmSync(dir, { recursive: true, force: true });

test('"</script" inside paper text is escaped and round-trips', () => {
  const d = tmpDir('esc');
  try {
    const e = copyData(d);
    const f = path.join(e.HINDI_DATA_DIR, 'hindi-ws07.json');
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    p.sections[0].blocks[0].passage += ' </script><b>x</b>';
    fs.writeFileSync(f, JSON.stringify(p));
    const res = build(e);
    assert.strictEqual(res.status, 0, res.stderr);
    const out = fs.readFileSync(path.join(e.HINDI_DIST_DIR, 'index.html'), 'utf8');
    assert.ok(jsonTag(out, 'papersData').ws07.sections[0].blocks[0].passage.endsWith(' </script><b>x</b>'));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

// ---- failure cases: exit 1, nothing written to dist ----
function failCase(name, mutate, expect) {
  test(name, () => {
    const d = tmpDir('bad');
    try {
      const e = copyData(d);
      mutate(e);
      const res = build(e.GANESH !== undefined ? e : e);
      assert.strictEqual(res.status, 1, res.stdout + res.stderr);
      assert.ok(expect.test(res.stderr), res.stderr);
      assert.ok(!fs.existsSync(path.join(e.HINDI_DIST_DIR, 'index.html')), 'dist not written');
    } finally { fs.rmSync(d, { recursive: true, force: true }); }
  });
}
failCase('GANESH empty → fail', e => { e.GANESH = ''; }, /GANESH/);
failCase('duplicate worksheet id → fail', e => {
  const p = JSON.parse(fs.readFileSync(path.join(e.HINDI_DATA_DIR, 'hindi-ws01.json'), 'utf8'));
  p.ws = 'ws02';
  fs.writeFileSync(path.join(e.HINDI_DATA_DIR, 'hindi-ws01.json'), JSON.stringify(p));
}, /duplicate|ws02/i);
failCase('missing picture asset → fail', e => { fs.unlinkSync(path.join(e.HINDI_ASSETS_DIR, 'shared-postbox.svg')); }, /shared-postbox\.svg/);
failCase('order file missing a worksheet → fail', e => {
  const o = JSON.parse(fs.readFileSync(e.HINDI_ORDER_FILE, 'utf8')).filter(x => x !== 'ws03');
  fs.writeFileSync(e.HINDI_ORDER_FILE, JSON.stringify(o));
}, /ws03/);
failCase('invalid JSON → fail', e => { fs.writeFileSync(path.join(e.HINDI_DATA_DIR, 'hindi-ws07.json'), '{oops'); }, /hindi-ws07\.json/);

console.log(`build ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);

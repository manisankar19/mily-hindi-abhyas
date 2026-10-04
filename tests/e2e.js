// Playwright e2e for sprint v3 (Tasks 32–36; extended in 38–39).
// Builds the site with a TEST code (never the real GANESH) into a temp dir and
// drives it over file://. Screenshots: tests/screenshots/taskN-NN-*.png.
//
// Usage: node tests/e2e.js [--only 32,33]
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const TMP = fs.mkdtempSync(path.join(process.env.REVIEW_SHEET_TMP || os.tmpdir(), 'e2e-'));
const CODE = 'e2e-test-code';
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null;

const b = spawnSync(process.execPath, [path.join(ROOT, 'build.js')], {
  cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { GANESH: CODE, HINDI_DIST_DIR: TMP }),
});
if (b.status !== 0) { console.error(b.stderr); process.exit(1); }
const URL = 'file://' + path.join(TMP, 'index.html');

const DATA = path.join(ROOT, 'app', 'data');
const order = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'worksheet-order.json'), 'utf8'));
const papers = Object.fromEntries(order.map(ws => [ws, JSON.parse(fs.readFileSync(path.join(DATA, `hindi-${ws}.json`), 'utf8'))]));
const items = p => p.sections.flatMap(s => s.blocks.flatMap(bl => bl.items));
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
const HI = '०१२३४५६७८९';
const hin = n => String(n).replace(/\d/g, d => HI[d]);

// Printed text of a paper: answers that also appear here can't be used to detect a leak.
function printedText(p) {
  const parts = [p.title, ...(p.header || []), p.subtitle, p.shortLabel];
  p.sections.forEach(s => {
    parts.push(s.title);
    s.blocks.forEach(bl => {
      parts.push(bl.num, bl.instruction, bl.passage, bl.adaptation, bl.pictureAlt);
      bl.items.forEach(i => parts.push(i.label, i.slot, i.q, ...(i.options || []), ...(i.printedRight || []), ...((i.pairs || []).map(x => x.left))));
    });
  });
  return norm(parts.filter(Boolean).join(' '));
}
// Strings that must not be in the DOM before reveal.
function secrets(p) {
  const printed = printedText(p);
  const out = new Set();
  items(p).forEach(i => {
    [i.a, ...(i.acceptable || []), i.teacherNote, ...((i.rubric || []).map(r => r.desc))].forEach(s => {
      const n = norm(s);
      if (n.length >= 6 && !printed.includes(n)) out.add(n);
    });
  });
  return [...out];
}

let pass = 0, total = 0;
const fails = [];
async function test(task, name, fn) {
  if (ONLY && !ONLY.includes(String(task))) return;
  total++;
  try { await fn(); pass++; console.log(`  ok   [${task}] ${name}`); }
  catch (e) { fails.push(name); console.error(`  FAIL [${task}] ${name}\n       ${String(e.message).split('\n').slice(0, 4).join('\n       ')}`); }
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name), fullPage: false });

async function login(page, seed = {}) {
  await page.goto(URL);
  await page.evaluate(s => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, seed);
  await page.goto(URL);
  await page.fill('#userInput', 'Mily');
  await page.fill('#passInput', '2026');
  await page.press('#passInput', 'Enter');
  await page.waitForSelector('[data-testid="chapter-card"]');
}
async function openWorksheet(page, ws) {
  await page.click(`[data-testid="ws-card"][data-ws="${ws}"]`);
  await page.waitForSelector('#paperView:not([hidden])');
}
async function unlock(page) {
  await page.click('#checkModeBtn');
  await page.fill('#ganeshInput', CODE);
  await page.click('#ganeshSubmit');
  await page.waitForSelector('#checkModeBtn.on');
}
const bodyText = page => page.evaluate(() => document.querySelector('#paperBody').innerText + '\n' + document.querySelector('#paperHead').innerText);
const bodyHTML = page => page.evaluate(() => document.querySelector('#paperView').innerHTML);
const leaks = (html, list) => list.filter(s => norm(html.replace(/<[^>]+>/g, ' ')).includes(s));

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  // ---------------- Task 32: home group, ids, score keys ----------------
  await test(32, 'home shows 7 chapter cards and a विद्यालय कार्यपत्रक group in the configured order', async () => {
    await login(page);
    assert.strictEqual(await page.locator('[data-testid="chapter-card"]').count(), 7);
    assert.ok((await page.locator('[data-testid="ws-group"]').innerText()).includes('विद्यालय कार्यपत्रक'));
    const shown = await page.locator('[data-testid="ws-card"]').evaluateAll(cs => cs.map(c => c.dataset.ws));
    assert.deepStrictEqual(shown, order);
    for (const ws of order) {
      const t = await page.locator(`[data-testid="ws-card"][data-ws="${ws}"]`).innerText();
      assert.ok(t.includes(papers[ws].shortLabel), `${ws} label`);
      assert.ok(t.includes(hin(papers[ws].totalMarks)), `${ws} total`);
    }
    await shot(page, 'task32-01-home-worksheet-group.png');
  });
  await test(32, 'old chapter score keys still load (mily.scores.ch6)', async () => {
    await login(page, { 'mily.scores.ch6': { '0-0-0': 1, '0-0-1': 1 } });
    const t = await page.locator('[data-testid="chapter-card"]').nth(5).innerText();
    assert.ok(t.includes('प्राप्तांक २/१००'), t);
  });
  await test(32, 'opening a worksheet shows its printed title', async () => {
    await login(page);
    await openWorksheet(page, 'ws04');
    assert.ok((await page.locator('#paperHead').innerText()).includes('Half-Yearly Practice Paper'));
    await shot(page, 'task32-02-ws04-open.png');
  });

  // ---------------- Task 33: no answers in the DOM before reveal ----------------
  await test(33, 'chapter 6: no answer text in DOM in practice mode or before reveal', async () => {
    await login(page);
    await page.locator('[data-testid="chapter-card"]').nth(5).click();
    assert.strictEqual(await page.locator('#paperBody .answer').count(), 0, 'no .answer nodes in practice');
    await unlock(page);
    assert.strictEqual(await page.locator('#paperBody .answer').count(), 0, 'no .answer nodes before reveal');
    await page.locator('#paperBody .ans-btn').first().click();
    assert.strictEqual(await page.locator('#paperBody .answer').count(), 1);
    await shot(page, 'task33-01-ch6-one-revealed.png');
    await page.locator('#paperBody .ans-btn').first().click();
    assert.strictEqual(await page.locator('#paperBody .answer').count(), 0, 'hiding removes it');
  });
  for (const ws of order) {
    await test(33, `${ws}: no answer/acceptable/note/rubric text before reveal; all present after "सभी उत्तर दिखाएँ"`, async () => {
      await login(page);
      await openWorksheet(page, ws);
      const list = secrets(papers[ws]);
      assert.deepStrictEqual(leaks(await bodyHTML(page), list).slice(0, 3), [], 'practice mode');
      assert.ok(!(await bodyText(page)).includes('⚑'), 'no ⚑ in practice');
      await unlock(page);
      assert.deepStrictEqual(leaks(await bodyHTML(page), list).slice(0, 3), [], 'checking mode before reveal');
      await page.click('#revealAllBtn');
      const after = leaks(await bodyHTML(page), list);
      assert.strictEqual(after.length, list.length, `revealed ${after.length}/${list.length}`);
      await page.click('#checkModeBtn'); // lock again
      assert.deepStrictEqual(leaks(await bodyHTML(page), list).slice(0, 3), [], 'locked again');
    });
  }

  // ---------------- Task 34: worksheet rendering ----------------
  await test(34, 'ws04: printed header lines, section titles, passages, underline spans', async () => {
    await login(page);
    await openWorksheet(page, 'ws04');
    const head = norm(await page.locator('#paperHead').innerText());
    papers.ws04.header.filter(h => !/____/.test(h)).forEach(h => assert.ok(head.includes(norm(h)), `header: ${h}`));
    const text = norm(await bodyText(page));
    papers.ws04.sections.forEach(s => s.title && assert.ok(text.includes(norm(s.title)), `section ${s.title}`));
    const u = await page.locator('#paperBody u').allInnerTexts();
    items(papers.ws04).flatMap(i => i.underline || []).forEach(w => assert.ok(u.includes(w), `underline ${w}`));
    const bm = await page.locator('#paperBody .block-marks').allInnerTexts();
    const printedNotInInstr = papers.ws04.sections.flatMap(s => s.blocks).filter(bl => bl.printedMarks && !(bl.instruction || '').includes(bl.printedMarks));
    assert.strictEqual(bm.length, printedNotInInstr.length, 'printed block marks shown');
    await shot(page, 'task34-01-ws04-header.png');
  });
  await test(34, 'pictures load (every worksheet); alt text set', async () => {
    for (const ws of order) {
      const pics = papers[ws].sections.flatMap(s => s.blocks).filter(bl => bl.picture);
      if (!pics.length) continue;
      await login(page);
      await openWorksheet(page, ws);
      const imgs = page.locator('[data-testid="block-picture"]');
      assert.strictEqual(await imgs.count(), pics.length, ws);
      const ok = await imgs.evaluateAll(xs => xs.map(x => x.complete && x.naturalWidth > 0 && !!x.alt));
      assert.ok(ok.every(Boolean), `${ws} images ${ok}`);
    }
    await page.locator('[data-testid="block-picture"]').first().scrollIntoViewIfNeeded();
    await shot(page, 'task34-02-picture.png');
  });
  await test(34, 'ws03: adaptation notes, slot labels, paper-only badge, match words shown', async () => {
    await login(page);
    await openWorksheet(page, 'ws03');
    const ad = await page.locator('[data-testid="adaptation"]').allInnerTexts();
    const want = papers.ws03.sections.flatMap(s => s.blocks).filter(bl => bl.adaptation);
    assert.strictEqual(ad.length, want.length);
    const text = await bodyText(page);
    ['चित्र 1', 'चित्र 4', 'डिब्बा 2'].forEach(s => assert.ok(text.includes(s), s));
    assert.strictEqual(await page.locator('[data-testid="paper-only"]').count(), 1);
    await page.locator('[data-testid="block-picture"]').nth(2).scrollIntoViewIfNeeded();
    await shot(page, 'task34-03-ws03-slots.png');
  });
  await test(34, 'ws04: MCQ options and ws01 match column are visible', async () => {
    await login(page);
    await openWorksheet(page, 'ws04');
    const opts = items(papers.ws04).flatMap(i => i.options || []);
    const text = norm(await bodyText(page));
    opts.forEach(o => assert.ok(text.includes(norm(o)), `option ${o}`));
    await login(page);
    await openWorksheet(page, 'ws01');
    const right = items(papers.ws01).find(i => i.printedRight).printedRight;
    const t1 = norm(await bodyText(page));
    right.forEach(r => assert.ok(t1.includes(norm(r)), `match ${r}`));
  });
  await test(34, 'chapter 6 still renders as before (खंड क — …, no worksheet extras)', async () => {
    await login(page);
    await page.locator('[data-testid="chapter-card"]').nth(5).click();
    const t = await bodyText(page);
    assert.ok(t.includes('खंड क — पठन पर आधारित प्रश्न'));
    assert.strictEqual(await page.locator('[data-testid="adaptation"], [data-testid="paper-only"], [data-testid="block-picture"]').count(), 0);
    assert.ok((await page.locator('#paperHead').innerText()).includes('पाठ ६ — जयपुर से पत्र'));
  });

  // ---------------- Task 35: checking-mode answer panel ----------------
  await test(35, 'ws06 after reveal: acceptable, rubric, ⚑, teacherNote, ref; disclaimer only in checking mode', async () => {
    await login(page);
    await openWorksheet(page, 'ws06');
    assert.strictEqual(await page.locator('[data-testid="ws-disclaimer"]').count(), 0, 'no disclaimer in practice');
    await unlock(page);
    assert.strictEqual(await page.locator('[data-testid="ws-disclaimer"]').count(), 1);
    assert.ok((await page.locator('[data-testid="ws-disclaimer"]').innerText()).includes('⚑'));
    await page.click('#revealAllBtn');
    const its = items(papers.ws06);
    assert.strictEqual(await page.locator('[data-testid="ans-flag"]').count(), its.filter(i => i.answerConfidence === 'check').length);
    assert.strictEqual(await page.locator('[data-testid="ans-acceptable"]').count(), its.filter(i => (i.acceptable || []).length).length);
    assert.strictEqual(await page.locator('[data-testid="ans-rubric"]').count(), its.filter(i => (i.rubric || []).length).length);
    assert.strictEqual(await page.locator('[data-testid="ans-note"]').count(), its.filter(i => i.teacherNote).length);
    await page.locator('[data-testid="ans-flag"]').first().scrollIntoViewIfNeeded();
    await shot(page, 'task35-01-ws06-answer-panel.png');
    await page.click('#checkModeBtn');
    assert.strictEqual(await page.locator('[data-testid="ws-disclaimer"]').count(), 0, 'disclaimer gone when locked');
  });
  await test(35, 'chapter 6 answer panel unchanged (no ⚑ / disclaimer)', async () => {
    await login(page);
    await page.locator('[data-testid="chapter-card"]').nth(5).click();
    await unlock(page);
    await page.click('#revealAllBtn');
    assert.strictEqual(await page.locator('[data-testid="ws-disclaimer"], [data-testid="ans-flag"]').count(), 0);
    assert.ok((await page.locator('#paperBody .answer').first().innerText()).includes('आदर्श उत्तर'));
  });

  // ---------------- Task 36: ½ marks, printed total, title ----------------
  await test(36, 'ws01: ½-mark buttons; marks saved under mily.scores.ws01; result uses printed total and title', async () => {
    await login(page);
    await openWorksheet(page, 'ws01');
    await unlock(page);
    // Two different items: a ½-mark item (max ½) and a 1-mark item.
    const halfItem = page.locator('#paperBody .item').filter({ has: page.locator('.mk[data-val="0.5"]') }).filter({ hasNot: page.locator('.mk[data-val="1"]') }).first();
    assert.ok(await halfItem.count(), 'a ½-mark item exists');
    await halfItem.locator('.mk[data-val="0.5"]').click();
    const oneItem = page.locator('#paperBody .item').filter({ has: page.locator('.mk[data-val="1"]') }).filter({ hasNot: page.locator('.mk[data-val="1.5"]') }).first();
    await oneItem.locator('.mk[data-val="1"]').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mily.scores.ws01')));
    const vals = Object.values(saved).sort();
    assert.deepStrictEqual(vals, [0.5, 1]);
    assert.ok((await page.locator('#sbGot').innerText()).includes('१½'));
    await shot(page, 'task36-01-half-marks.png');
    await page.click('#resultBtn');
    const r = await page.locator('#resultView').innerText();
    assert.ok(r.includes('/ ४०'), 'printed total 40');
    assert.ok(r.includes(papers.ws01.title) || r.includes(papers.ws01.shortLabel), 'worksheet title');
    assert.ok(!/पाठ undefined|पाठ ws/.test(r));
    await shot(page, 'task36-02-result.png');
    await page.click('#homeBtn');
    const card = await page.locator('[data-testid="ws-card"][data-ws="ws01"]').innerText();
    assert.ok(card.includes('१½/४०'), card);
  });
  await test(36, 'chapter marks stay whole numbers and result /100', async () => {
    await login(page);
    await page.locator('[data-testid="chapter-card"]').nth(0).click();
    await unlock(page);
    assert.strictEqual(await page.locator('#paperBody .mk[data-val="0.5"]').count(), 0);
    await page.click('#resultBtn');
    assert.ok((await page.locator('#resultView').innerText()).includes('/ १००'));
  });

  // ---------------- Task 37: print ----------------
  await test(37, 'print view of a worksheet: questions + pictures, no answers / marks UI / banners / screen-only notes', async () => {
    await login(page);
    await openWorksheet(page, 'ws03');
    await unlock(page);
    await page.click('#revealAllBtn');
    await page.emulateMedia({ media: 'print' });
    const vis = sel => page.locator(sel).evaluateAll(xs => xs.filter(x => getComputedStyle(x).display !== 'none' && x.offsetParent !== null).length);
    assert.strictEqual(await vis('#paperBody .answer'), 0, 'answers hidden');
    assert.strictEqual(await vis('#paperBody .item-tools'), 0, 'marks UI hidden');
    assert.strictEqual(await vis('[data-testid="ws-disclaimer"], #practiceBanner, [data-testid="adaptation"], [data-testid="paper-only"], .scorebar, .topbar'), 0, 'screen-only hidden');
    assert.ok(await vis('[data-testid="block-picture"]') >= 3, 'pictures print');
    assert.ok(await vis('.match-word') + await vis('.option') > 0, 'choices print');
    await page.screenshot({ path: path.join(SHOTS, 'task37-01-ws03-print.png'), fullPage: false });
    await page.emulateMedia({ media: 'screen' });
  });

  await test(36, 'no page errors during the run', async () => { assert.deepStrictEqual(consoleErrors, []); });

  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`e2e ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });

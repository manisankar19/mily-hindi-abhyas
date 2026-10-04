// Task 39: every worksheet at phone (390 px) and desktop (1280 px) width.
// Built with a TEST code into a temp dir, driven over file://.
// Screenshots: tests/screenshots/task39-<ws>-<width>-*.png
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const TMP = fs.mkdtempSync(path.join(process.env.REVIEW_SHEET_TMP || os.tmpdir(), 'e2e-ws-'));
const CODE = 'e2e-test-code';
const b = spawnSync(process.execPath, [path.join(ROOT, 'build.js')], {
  cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { GANESH: CODE, HINDI_DIST_DIR: TMP }),
});
if (b.status !== 0) { console.error(b.stderr); process.exit(1); }
const URL = 'file://' + path.join(TMP, 'index.html');

const order = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/worksheet-order.json'), 'utf8'));
const papers = Object.fromEntries(order.map(ws => [ws, JSON.parse(fs.readFileSync(path.join(ROOT, `app/data/hindi-${ws}.json`), 'utf8'))]));
const HI = '०१२३४५६७८९';
const hin = n => String(n).replace(/\d/g, d => HI[d]);
const hinMarks = v => { const w = Math.floor(v), h = v - w >= 0.5; return (w || !h ? hin(w) : '') + (h ? '½' : ''); };

let pass = 0, total = 0;
async function test(name, fn) {
  total++;
  try { await fn(); pass++; console.log('  ok  ', name); }
  catch (e) { console.error('  FAIL', name, '\n      ', String(e.message).split('\n').slice(0, 3).join('\n       ')); }
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.goto(URL);
    await page.fill('#userInput', 'Mily');
    await page.fill('#passInput', '2026');
    await page.press('#passInput', 'Enter');
    await page.waitForSelector('[data-testid="ws-card"]');
    await page.locator('[data-testid="ws-group"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, `task39-home-${width}.png`) });

    for (const ws of order) {
      const p = papers[ws];
      const nItems = p.sections.flatMap(s => s.blocks.flatMap(bl => bl.items)).length;
      const nPics = p.sections.flatMap(s => s.blocks).filter(bl => bl.picture).length;
      await test(`${width}px ${ws}: layout, pictures, all answers, full marks = printed total ${p.totalMarks}`, async () => {
        await page.click('#homeBtn');
        await page.click(`[data-testid="ws-card"][data-ws="${ws}"]`);
        await page.waitForSelector('#paperView:not([hidden])');

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 1, `horizontal overflow ${overflow}px`);
        const pics = await page.locator('[data-testid="block-picture"]').evaluateAll(xs => xs.map(x => x.complete && x.naturalWidth > 0));
        assert.strictEqual(pics.length, nPics);
        assert.ok(pics.every(Boolean), 'pictures load');
        await page.screenshot({ path: path.join(SHOTS, `task39-${ws}-${width}-practice.png`) });

        await page.click('#checkModeBtn');
        await page.fill('#ganeshInput', CODE);
        await page.click('#ganeshSubmit');
        await page.waitForSelector('#checkModeBtn.on');
        await page.click('#revealAllBtn');
        assert.strictEqual(await page.locator('#paperBody .answer').count(), nItems, 'one answer panel per item');

        // Full marks on every item: click each item's highest mark button.
        await page.locator('#paperBody .item').evaluateAll(items => items.forEach(it => {
          const bs = [...it.querySelectorAll('.mk[data-val]')];
          bs[bs.length - 1].click();
        }));
        assert.strictEqual(await page.locator('#sbGot').innerText(), hinMarks(p.totalMarks), 'score bar = printed total');
        const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow2 <= 1, `overflow with answers open ${overflow2}px`);
        await page.locator('[data-testid="ans-flag"]').first().scrollIntoViewIfNeeded().catch(() => {});
        await page.screenshot({ path: path.join(SHOTS, `task39-${ws}-${width}-checking.png`) });

        await page.click('#resultBtn');
        const r = await page.locator('#resultView').innerText();
        assert.ok(r.includes(`${hinMarks(p.totalMarks)} / ${hin(p.totalMarks)}`), 'result total');
        assert.ok(r.includes('१००%'), '100%');
        assert.ok(r.includes(p.shortLabel));
        await page.click('#homeBtn');
        await page.evaluate(k => localStorage.removeItem(k), `mily.scores.${ws}`);
      });
    }
    await test(`${width}px: no console/page errors`, async () => assert.deepStrictEqual(errors, []));
    await ctx.close();
  }
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`e2e-worksheets ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });

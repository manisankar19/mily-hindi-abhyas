// Task 42: real-browser check of PRODUCTION. Uses the real code (GANESH from the
// environment, else .env.local) in-process only — it is never printed.
// Usage: node tests/e2e-live.js [url]
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const URL = process.argv[2] || 'https://mily-hindi-abhyas-nu.vercel.app/';
const SHOTS = path.join(__dirname, 'screenshots');
function code() {
  if (process.env.GANESH) return process.env.GANESH.trim();
  const m = /^GANESH=(.*)$/m.exec(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8'));
  if (!m) throw new Error('GANESH not available');
  return m[1].trim();
}
const CODE = code();
const ws05 = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/data/hindi-ws05.json'), 'utf8'));
const items = p => p.sections.flatMap(s => s.blocks.flatMap(b => b.items));

let pass = 0, total = 0;
async function test(name, fn) {
  total++;
  try { await fn(); pass++; console.log('  ok  ', name); }
  catch (e) { console.error('  FAIL', name, '\n      ', String(e.message).split('\n')[0]); }
}

(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
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

    const unlock = async () => {
      await page.click('#checkModeBtn');
      await page.fill('#ganeshInput', CODE);
      await page.click('#ganeshSubmit');
      await page.waitForSelector('#checkModeBtn.on');
    };

    await test(`${width}px live: home shows 7 chapters + 7 worksheets`, async () => {
      assert.strictEqual(await page.locator('[data-testid="chapter-card"]').count(), 7);
      assert.strictEqual(await page.locator('[data-testid="ws-card"]').count(), 7);
      await page.locator('[data-testid="ws-group"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOTS, `task42-live-home-${width}.png`) });
    });
    await test(`${width}px live: chapter 6 — no answers before reveal; real code unlocks; reveal works`, async () => {
      await page.locator('[data-testid="chapter-card"]').nth(5).click();
      assert.strictEqual(await page.locator('#paperBody .answer').count(), 0);
      await unlock();
      assert.strictEqual(await page.locator('#paperBody .answer').count(), 0);
      await page.click('#revealAllBtn');
      assert.ok(await page.locator('#paperBody .answer').count() > 20);
      await page.click('#homeBtn');
    });
    await test(`${width}px live: ws05 — no answers/⚑ before reveal; panel, ⚑ and disclaimer after; picture loads`, async () => {
      await page.click('[data-testid="ws-card"][data-ws="ws05"]');
      await page.waitForSelector('#paperView:not([hidden])');
      assert.strictEqual(await page.locator('#paperBody .answer').count(), 0);
      assert.ok(!(await page.locator('#paperBody').innerText()).includes('⚑'));
      const pic = await page.locator('[data-testid="block-picture"]').evaluateAll(xs => xs.map(x => x.complete && x.naturalWidth > 0));
      assert.ok(pic.length === 1 && pic[0], 'post box picture');
      await unlock();
      assert.strictEqual(await page.locator('[data-testid="ws-disclaimer"]').count(), 1);
      assert.strictEqual(await page.locator('#paperBody .answer').count(), 0);
      await page.click('#revealAllBtn');
      assert.strictEqual(await page.locator('#paperBody .answer').count(), items(ws05).length);
      assert.strictEqual(await page.locator('[data-testid="ans-flag"]').count(), items(ws05).filter(i => i.answerConfidence === 'check').length);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `overflow ${overflow}`);
      await page.locator('[data-testid="ans-flag"]').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SHOTS, `task42-live-ws05-checking-${width}.png`) });
    });
    await test(`${width}px live: no console/page errors`, async () => assert.deepStrictEqual(errors, []));
    await ctx.close();
  }
  await browser.close();
  console.log(`e2e-live ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(String(e).replace(CODE, '[code]')); process.exit(1); });

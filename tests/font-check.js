// Task 3: confirm Devanagari renders in headless Chromium (not tofu boxes).
// Logs in, opens chapter 6, screenshots it, and compares the rendered width of a
// set of Devanagari glyphs: tofu boxes all have equal width, real glyphs do not. Hindi strings of different shapes must give >= 4 distinct widths.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
  await page.fill('#userInput', 'Mily');
  await page.fill('#passInput', '2026');
  await page.press('#passInput', 'Enter');
  await page.waitForSelector('#chapterGrid button');
  await page.locator('#chapterGrid button').nth(5).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve(__dirname, 'screenshots/task3-01-chapter6-devanagari.png') });
  const widths = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('2d');
    c.font = '20px sans-serif';
    const chars = ['क', 'म', 'ष', 'ङ', 'ञ', 'ॐ', 'क्ष', 'ड़', 'श्र'];
    return chars.map(ch => Math.round(c.measureText(ch).width * 10) / 10);
  });
  await browser.close();
  const ok = new Set(widths).size >= 4; // tofu boxes are all one width
  console.log(JSON.stringify(widths), ok ? 'PASS: distinct Devanagari glyph widths' : 'FAIL: looks like tofu');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });

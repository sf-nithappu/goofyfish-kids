// Plays games with ?bot (random toddler taps) on tablet and laptop sizes and fails on any console error.
// usage: pnpm check [slug ...] [--seconds 6]     Screenshots go to tmp/check/.
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { serve } from './serve.mjs';

const args = process.argv.slice(2);
const secIdx = args.indexOf('--seconds');
const seconds = secIdx >= 0 ? Number(args.splice(secIdx, 2)[1]) : 6;
const games = JSON.parse(await readFile(new URL('../games.json', import.meta.url)));
const slugs = args.length ? args : games.map((g) => g.slug);

const DEVICES = [
  { name: 'ipad-landscape', viewport: { width: 1024, height: 768 }, hasTouch: true },
  { name: 'ipad-portrait', viewport: { width: 768, height: 1024 }, hasTouch: true },
  { name: 'android-tablet', viewport: { width: 800, height: 1280 }, hasTouch: true },
  { name: 'mac', viewport: { width: 1440, height: 900 }, hasTouch: false },
];

await mkdir('tmp/check', { recursive: true });
const server = await serve(0);
const PORT = server.address().port;
const browser = await chromium.launch();
let failed = 0;
for (const slug of slugs) {
  for (const d of DEVICES) {
    const ctx = await browser.newContext({ viewport: d.viewport, hasTouch: d.hasTouch, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${PORT}/games/${slug}.html?bot`);
    await page.waitForTimeout(seconds * 1000);
    if (!d.hasTouch) {
      // Mac: keyboard mashing and mouse clicks must work too.
      await page.keyboard.press('Space');
      await page.keyboard.press('KeyA');
      await page.mouse.click(d.viewport.width / 2, d.viewport.height / 2);
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `tmp/check/${slug}-${d.name}.png` });
    const bad = errors.length ? errors : [];
    console.log(`${bad.length ? 'FAIL' : 'ok  '} ${slug} ${d.name}${bad.length ? '\n  ' + bad.join('\n  ') : ''}`);
    failed += bad.length ? 1 : 0;
    await ctx.close();
  }
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);

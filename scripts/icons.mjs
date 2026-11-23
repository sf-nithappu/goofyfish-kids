// Renders icons/icon-*.png from scripts/icon.html
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const server = await serve(0);
const port = server.address().port;
const browser = await chromium.launch();
for (const s of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: s, height: s } });
  await page.goto(`http://localhost:${port}/scripts/icon.html?s=${s}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `icons/icon-${s}.png` });
}
await browser.close();
server.close();

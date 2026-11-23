// Screenshots each game mid-play (?bot) into thumbs/<slug>.webp for the launcher tiles.
// usage: pnpm thumbs [slug ...]
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { serve } from './serve.mjs';

const games = JSON.parse(await readFile(new URL('../games.json', import.meta.url)));
const args = process.argv.slice(2);
const slugs = args.length ? args : games.map((g) => g.slug);
const server = await serve(0);
const port = server.address().port;
const browser = await chromium.launch();
for (const slug of slugs) {
  // A square-ish landscape window so the card crop matches what a tablet shows.
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${port}/games/${slug}.html?bot`);
  await page.waitForTimeout(4500);
  await page.evaluate(() => document.getElementById('home')?.remove());
  const png = await page.screenshot();
  await sharp(png).resize(520, 520).webp({ quality: 82 }).toFile(`thumbs/${slug}.webp`);
  console.log('thumb', slug);
  await page.close();
}
await browser.close();
server.close();

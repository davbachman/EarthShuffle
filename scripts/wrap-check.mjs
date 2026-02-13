import fs from 'node:fs';
import { chromium } from 'playwright';

const outDir = 'output/wrap-check';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);

const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
if (!box) throw new Error('No canvas');

const advance = async (ms) => {
  await page.evaluate((deltaMs) => {
    if (typeof window.advanceTime === 'function') {
      window.advanceTime(deltaMs);
    }
  }, ms);
};

const dragStartX = box.x + box.width * 0.56;
const dragStartY = box.y + box.height * 0.47;

await page.mouse.move(dragStartX, dragStartY);
await page.mouse.down({ button: 'left' });
await page.mouse.move(dragStartX + 520, dragStartY, { steps: 60 });
await advance(220);
await canvas.screenshot({ path: `${outDir}/during-drag.png` });

await page.mouse.up({ button: 'left' });
await advance(260);
await canvas.screenshot({ path: `${outDir}/after-release.png` });

await browser.close();

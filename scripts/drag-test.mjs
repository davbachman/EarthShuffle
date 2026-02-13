import fs from 'node:fs';
import { chromium } from 'playwright';

const outDir = 'output/web-game-direct';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push({ type: 'console.error', text: msg.text() });
});
page.on('pageerror', (err) => errors.push({ type: 'pageerror', text: String(err) }));

await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);

const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
if (!box) throw new Error('No canvas');

const centerX = box.x + box.width * 0.5;
const centerY = box.y + box.height * 0.5;

const advance = async (ms) => {
  await page.evaluate((deltaMs) => {
    if (typeof window.advanceTime === 'function') {
      window.advanceTime(deltaMs);
    }
  }, ms);
};

const state0 = await page.evaluate(() => window.render_game_to_text?.() ?? null);
await canvas.screenshot({ path: `${outDir}/before.png` });

await page.mouse.move(centerX, centerY);
await page.mouse.down({ button: 'right' });
await page.mouse.move(centerX + 180, centerY - 90, { steps: 28 });
await page.mouse.up({ button: 'right' });
await advance(220);

const dragStartX = box.x + box.width * 0.56;
const dragStartY = box.y + box.height * 0.47;
await page.mouse.move(dragStartX, dragStartY);
await page.mouse.down({ button: 'left' });
await page.mouse.move(dragStartX - 220, dragStartY, { steps: 36 });
await page.mouse.up({ button: 'left' });
await advance(260);

const drag2StartX = box.x + box.width * 0.52;
const drag2StartY = box.y + box.height * 0.58;
await page.mouse.move(drag2StartX, drag2StartY);
await page.mouse.down({ button: 'left' });
await page.mouse.move(drag2StartX, drag2StartY - 230, { steps: 36 });
await page.mouse.up({ button: 'left' });
await advance(260);

const state1 = await page.evaluate(() => window.render_game_to_text?.() ?? null);
await canvas.screenshot({ path: `${outDir}/after.png` });

if (errors.length) {
  fs.writeFileSync(`${outDir}/errors.json`, JSON.stringify(errors, null, 2));
}
fs.writeFileSync(`${outDir}/state-before.json`, state0 ?? 'null');
fs.writeFileSync(`${outDir}/state-after.json`, state1 ?? 'null');

await browser.close();

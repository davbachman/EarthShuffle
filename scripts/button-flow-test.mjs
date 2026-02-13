import fs from 'node:fs';
import { chromium } from 'playwright';

const outDir = 'output/button-flow-test';
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
await page.waitForTimeout(500);

const getState = async () => page.evaluate(() => window.render_game_to_text?.() ?? null);
const advance = async (ms) => {
  await page.evaluate((deltaMs) => {
    if (typeof window.advanceTime === 'function') {
      window.advanceTime(deltaMs);
    }
  }, ms);
};

const initial = await getState();
await page.click('#shuffle-btn');
await advance(200);
const shuffled = await getState();

if (initial === shuffled) {
  throw new Error('Shuffle button did not change state');
}

await page.click('#reset-btn');
await advance(50);
const reset = await getState();

if (reset !== initial) {
  throw new Error('Reset button did not restore initial state');
}

await page.keyboard.press('r');
await page.keyboard.press('f');
await advance(50);
const afterKeys = await getState();

if (afterKeys !== reset) {
  throw new Error('Keyboard input still modifies state');
}

await page.locator('canvas').first().screenshot({ path: `${outDir}/buttons.png` });
fs.writeFileSync(`${outDir}/state-initial.json`, initial ?? 'null');
fs.writeFileSync(`${outDir}/state-shuffled.json`, shuffled ?? 'null');
fs.writeFileSync(`${outDir}/state-reset.json`, reset ?? 'null');
if (errors.length) {
  fs.writeFileSync(`${outDir}/errors.json`, JSON.stringify(errors, null, 2));
}

await browser.close();

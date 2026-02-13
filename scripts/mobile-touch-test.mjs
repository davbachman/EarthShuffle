import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const outDir = 'output/mobile-touch-test';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});

const context = await browser.newContext({
  ...devices['iPhone 13'],
});
const page = await context.newPage();

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push({ type: 'console.error', text: msg.text() });
  }
});
page.on('pageerror', (err) => {
  errors.push({ type: 'pageerror', text: String(err) });
});

await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);

const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
if (!box) {
  throw new Error('Missing canvas');
}

const emit = async (type, pointerId, x, y, buttons) => {
  await page.evaluate(({ type, pointerId, x, y, buttons }) => {
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) {
      throw new Error('Missing canvas element');
    }

    const event = new PointerEvent(type, {
      pointerId,
      pointerType: 'touch',
      isPrimary: pointerId === 1,
      button: 0,
      buttons,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    canvasEl.dispatchEvent(event);
  }, { type, pointerId, x, y, buttons });
};

const advance = async (ms) => {
  await page.evaluate((deltaMs) => {
    if (typeof window.advanceTime === 'function') {
      window.advanceTime(deltaMs);
    }
  }, ms);
};

const readState = async () => {
  const text = await page.evaluate(() => window.render_game_to_text?.() ?? '{}');
  return JSON.parse(text);
};

const initial = await readState();

const startX = box.x + box.width * 0.55;
const startY = box.y + box.height * 0.46;
const endX = startX - 160;

await emit('pointerdown', 1, startX, startY, 1);
for (let i = 1; i <= 24; i += 1) {
  const t = i / 24;
  await emit('pointermove', 1, startX + (endX - startX) * t, startY, 1);
}
await emit('pointerup', 1, endX, startY, 0);
await advance(300);

const afterOneFinger = await readState();
const initialCubelets = JSON.stringify(initial.cubelets);
const afterOneCubelets = JSON.stringify(afterOneFinger.cubelets);
if (initialCubelets === afterOneCubelets) {
  throw new Error('One-finger drag did not move puzzle face');
}

const p1StartX = box.x + box.width * 0.38;
const p2StartX = box.x + box.width * 0.62;
const pStartY = box.y + box.height * 0.55;
const deltaX = 110;
const deltaY = -65;

await emit('pointerdown', 11, p1StartX, pStartY, 1);
await emit('pointerdown', 12, p2StartX, pStartY, 1);
for (let i = 1; i <= 20; i += 1) {
  const t = i / 20;
  await emit('pointermove', 11, p1StartX + deltaX * t, pStartY + deltaY * t, 1);
  await emit('pointermove', 12, p2StartX + deltaX * t, pStartY + deltaY * t, 1);
}
await emit('pointerup', 11, p1StartX + deltaX, pStartY + deltaY, 0);
await emit('pointerup', 12, p2StartX + deltaX, pStartY + deltaY, 0);
await advance(160);

const afterTwoFinger = await readState();
if (
  afterTwoFinger.camera.yaw === afterOneFinger.camera.yaw &&
  afterTwoFinger.camera.pitch === afterOneFinger.camera.pitch
) {
  throw new Error('Two-finger drag did not orbit camera');
}

await canvas.screenshot({ path: `${outDir}/mobile-touch.png` });
fs.writeFileSync(`${outDir}/state-initial.json`, JSON.stringify(initial, null, 2));
fs.writeFileSync(`${outDir}/state-after-one-finger.json`, JSON.stringify(afterOneFinger, null, 2));
fs.writeFileSync(`${outDir}/state-after-two-finger.json`, JSON.stringify(afterTwoFinger, null, 2));
if (errors.length > 0) {
  fs.writeFileSync(`${outDir}/errors.json`, JSON.stringify(errors, null, 2));
}

await context.close();
await browser.close();

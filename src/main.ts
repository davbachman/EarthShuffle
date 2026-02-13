import './style.css';
import { TextureLoader } from 'three';
import { GameStateEngine } from './core/gameState';
import { createFacePickingRig } from './render/picking';
import { createWireCube } from './render/wireCube';
import { createSceneBundle } from './render/scene';
import { createEarthChunkRig, syncEarthChunkRig } from './render/earthChunks';
import { createStarfield } from './render/starfield';
import { OrbitController } from './input/orbitController';
import { InputController } from './input/inputController';
import { renderGameToText } from './testing/textState';

const app = document.querySelector<HTMLDivElement>('#app');
if (app === null) {
  throw new Error('Missing #app root element');
}

app.innerHTML = `
  <div id="viewport"></div>
  <div id="hud">
    <h1>EarthShuffle</h1>
    <p>Drag face: one finger / LMB</p>
    <p>Orbit view: two fingers / RMB</p>
    <div class="hud-buttons">
      <button id="reset-btn" type="button">Reset</button>
      <button id="shuffle-btn" type="button">Shuffle</button>
    </div>
  </div>
`;

const viewport = document.querySelector<HTMLDivElement>('#viewport');
if (viewport === null) {
  throw new Error('Missing viewport host');
}

const resetButton = document.querySelector<HTMLButtonElement>('#reset-btn');
const shuffleButton = document.querySelector<HTMLButtonElement>('#shuffle-btn');
if (resetButton === null || shuffleButton === null) {
  throw new Error('Missing HUD controls');
}

const sceneBundle = createSceneBundle(viewport);
const { scene, camera, renderer } = sceneBundle;

const orbit = new OrbitController();

function applyResponsiveViewPreset(): void {
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  orbit.distance = isPortrait && isCoarsePointer ? 2.45 : 2.2;
  orbit.apply(camera);
}

applyResponsiveViewPreset();

const starfield = createStarfield();
scene.add(starfield);

const wireCube = createWireCube();
scene.add(wireCube);

const pickingRig = createFacePickingRig();
scene.add(pickingRig.group);

const loader = new TextureLoader();
const earthTextureUrl = `${import.meta.env.BASE_URL}textures/earth_day.jpg`;
const earthTexture = await loader.loadAsync(earthTextureUrl);
earthTexture.colorSpace = renderer.outputColorSpace;

const earthRig = createEarthChunkRig(earthTexture);
scene.add(earthRig.group);

const gameState = new GameStateEngine();
syncEarthChunkRig(earthRig, gameState.cubelets, gameState.activeMove);

const inputController = new InputController({
  domElement: renderer.domElement,
  camera,
  pickingRig,
  gameState,
  orbit,
});

window.render_game_to_text = () => renderGameToText(gameState, orbit);

function stepSimulation(deltaSeconds: number): void {
  gameState.tick(deltaSeconds);
  syncEarthChunkRig(earthRig, gameState.cubelets, gameState.activeMove);
  orbit.apply(camera);
}

function renderFrame(): void {
  renderer.render(scene, camera);
}

window.advanceTime = (ms: number): void => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  const dt = ms / 1000 / steps;
  for (let i = 0; i < steps; i += 1) {
    stepSimulation(dt);
  }
  renderFrame();
};

let lastFrameTime = performance.now();

function animationFrame(now: number): void {
  const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;

  stepSimulation(deltaSeconds);
  renderFrame();

  requestAnimationFrame(animationFrame);
}

requestAnimationFrame(animationFrame);

resetButton.addEventListener('click', () => {
  gameState.reset();
  syncEarthChunkRig(earthRig, gameState.cubelets, gameState.activeMove);
});

shuffleButton.addEventListener('click', () => {
  gameState.shuffle(20);
  syncEarthChunkRig(earthRig, gameState.cubelets, gameState.activeMove);
});

window.addEventListener('resize', () => {
  sceneBundle.resize();
  applyResponsiveViewPreset();
});

window.addEventListener('beforeunload', () => {
  inputController.dispose();
  sceneBundle.dispose();
});

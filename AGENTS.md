# AGENTS.md

## Repository purpose
`EarthShuffle` is a browser-based 3D puzzle game. The scene contains:
- A textured Earth sphere split into 27 movable chunks.
- A wireframe Rubik-style 3x3x3 cube.
- Toroidal slice movement (pieces wrap through opposite cube side while dragging).
- Interior Earth layers (bright red core, orange middle, yellow near-surface).
- Desktop + mobile controls and GitHub Pages deployment.

The production app is served at: `https://davbachman.github.io/EarthShuffle/`.

## Stack and tooling
- Runtime: TypeScript + Vite + Three.js.
- Geometry: `three-bvh-csg` + `three-mesh-bvh` for sphere/cubelet chunk intersections.
- Tests: `vitest` (unit tests for core math and state engine).
- Browser automation: Playwright helper scripts + Codex skill Playwright client.
- Deployment: GitHub Actions workflow deploying `dist/` to GitHub Pages.

## Key directories
- `src/main.ts`: app bootstrap, scene wiring, UI button actions, responsive camera sizing.
- `src/core/`: deterministic game logic and math.
  - `gameState.ts`: cubelet state, drag lifecycle, commit, shuffle.
  - `math.ts`: snapping/wrapping/axis utilities.
  - `types.ts`: shared types/constants.
- `src/input/`:
  - `inputController.ts`: pointer/touch gesture state machine.
  - `orbitController.ts`: camera orbit behavior.
  - `gestureAdapter.ts`: orbit gesture interface.
- `src/render/`:
  - `earthChunks.ts`: chunk mesh construction + sync/wrap clones.
  - `chunkMaterial.ts`: Earth shader (texture, seams, interior layers, clipping).
  - `wireCube.ts`: wireframe 3x3x3 cube grid.
  - `picking.ts`: face hit-testing planes and ray intersection helpers.
  - `scene.ts`: renderer/camera creation and resize handling.
  - `starfield.ts`: 3D star background points.
- `src/testing/textState.ts`: `window.render_game_to_text()` state serializer.
- `public/textures/earth_day.jpg`: Earth texture map.
- `tests/`: unit tests.
- `scripts/`: automation/regression scripts.
- `.github/workflows/deploy-pages.yml`: Pages build/deploy workflow.

## Controls and interaction model
- Desktop:
  - Left mouse drag on a cube face: slide a 9-piece layer.
  - Right mouse drag: orbit camera.
  - HUD buttons: `Reset`, `Shuffle`.
- Mobile:
  - One-finger drag on a cube face: slide a layer.
  - Two-finger drag: orbit camera using touch midpoint.
  - HUD buttons: `Reset`, `Shuffle`.

### Gesture arbitration in `inputController.ts`
- One touch starts face-drag selection if touching a valid face.
- A second concurrent touch cancels active face-drag and transitions into two-finger orbit.
- Ending two-finger gesture exits orbit when touches drop below two.
- Pointer capture is used defensively with guarded release.

## Game-state behavior
- World cube bounds: `[-0.5, 0.5]^3`.
- Cube subdivided into 27 logical cubelets.
- Face drags classify to face-tangent axis and snap to nearest `1/3` on release.
- Commit updates cubelet grid indices modulo 3.
- Shuffle applies 20 random face-tangent ±1 moves by default.

## Rendering notes
- Earth chunks are CSG intersections of a sphere and each cubelet box.
- Shader mixes:
  - Outer shell Earth texture with seam outlines.
  - Interior layered colors when exposed.
- Ambient/even Earth lighting (no directional sun shading).
- Stars are rendered in world space (orbit visually with camera movement).

## Environment hooks expected by automation
- `window.render_game_to_text(): string`
- `window.advanceTime(ms: number): void`

These are required for deterministic Playwright automation via skill scripts.

## Development commands
- Install: `npm ci`
- Dev server: `npm run dev`
- Build: `npm run build`
- Unit tests: `npm test`
- Preview production build: `npm run preview`

## Automation scripts
- `scripts/button-flow-test.mjs`: verifies shuffle/reset flow and keyboard no-op behavior.
- `scripts/drag-test.mjs`: desktop drag/orbit scenario.
- `scripts/wrap-check.mjs`: captures wrap/interior visuals during drag.
- `scripts/mobile-touch-test.mjs`: emulated mobile one-finger move + two-finger orbit validation.

Generated test artifacts are written under `output/` and should not be committed.

## GitHub Pages deployment
- Workflow: `.github/workflows/deploy-pages.yml`.
- On push to `main`, CI runs `npm ci`, `npm run build`, uploads `dist`, and deploys.
- `vite.config.ts` sets `base` to `/EarthShuffle/` during GitHub Actions builds.
- Runtime texture URL uses `import.meta.env.BASE_URL` to avoid Pages path breakage.

## Files to keep in sync when changing controls/UX
- `src/main.ts` (HUD text, button behavior, responsive camera preset).
- `src/input/inputController.ts` (gesture semantics).
- `README.md` (public controls description).
- `scripts/mobile-touch-test.mjs` / `scripts/button-flow-test.mjs` (regression coverage).

## Expectations for future agents
- Preserve deterministic hooks and avoid breaking Playwright scripts.
- Re-run at minimum: `npm run build`, `npm test`, and one Playwright scenario after interaction/render changes.
- For Pages-impacting changes, verify `GITHUB_ACTIONS=true npm run build` and check generated `/EarthShuffle/...` asset paths.

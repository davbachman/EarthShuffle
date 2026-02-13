Original prompt: Make a plan to build a Rubik's cube like game played on a three dimensional torus, as described below. It should look like a planet Earth, modeled as a sphere of radius one with an Earth texture map. It should look like its sitting inside a wireframe version of a traditional Rubik's cube of sidelength one, i.e. a wireframe cube that has been subdivided into 27 smaller cubes. Both cube and Earth should be centered  at the origin, with sides parallel to the (invisible) coordinate planes.

Right-click and drag should rotate the coordinate system, allowing the user to orbit around the object. Eventualy we will also implement this on mobile with two-finger drag doing the same thing. You do not need to set up mobile functionality yet, but knowing that is coming may help in deciding how to structure the code.

Play happens when the user left-clicks a face of the cube and drags. You'll need to first calculate the closest coordinate direction to the direction of the drag, since the coordinate system may have been rotated. In other words, each user drag will be calculated as being closest to the positive or negative x, y, or z direction. For exampe, clicking on the front face and dragging left may be closest to a move in the negative z direction.

Once you've calcuated which face F the user has clicked on and which direction d to move it, the following should happen. The 9 subcubes, togoether with whatever part of the Earth model is in them, should slide continuously in the d direction as the user drags. Any part of the model that end up outside the unit cube should appear on the opposite side. For example, if the user click on the face at z=1, and drags in the positive y-direction, then any part of the model with y>1 should appear inside the unit cube near the plane y=-1.

As the user drags, they will reveal interior faces of the Earth model. These should be rendered with a continuous radial gradient, with red at the center of the sphere simulating the Earth-core.

Make a plan to construct this game. Spawn subagents when possible to design UI, backend, subagent coordination, etc.

## 2026-02-13
- Scaffolding complete with Vite + TypeScript.
- Installed core dependencies: three, three-bvh-csg, three-mesh-bvh.
- Installed tests: vitest.
- Implementation in progress: core state engine, chunked Earth render, input controls, and deterministic test hooks.

- Added implementation modules for core engine, input, rendering, and tests.
- Added Earth texture asset and removed default Vite starter files.
- Downloaded Earth texture map to public/textures/earth_day.jpg via Node HTTPS fetch.
- Removed unused Vite starter assets/files.
- Fixed chunk transform bug: cubelet meshes now render at their correct grid centers.
- Validation run: `npm run build` passed and `npm test` passed (7 tests).
- Required skill run: `web_game_playwright_client.js` executed against local dev server; no console/page errors; screenshots + state artifacts captured in `output/web-game/`.
- Additional drag/orbit automation run with local Playwright module (`scripts/drag-test.mjs`); verified camera orbit and cubelet index updates after left-drag moves; artifacts in `output/web-game-direct/`.
- Additional wrap continuity capture (`scripts/wrap-check.mjs`) produced during-drag and post-release screenshots showing torus wrap behavior and interior radial gradient in `output/wrap-check/`.

TODO / next iteration:
- Add explicit touch gesture adapter implementation for two-finger orbit on mobile.
- Add stronger axis-classification tests under multiple camera rotations.
- Add solved-state/scramble game logic if requested.
- Updated Earth shader orientation to correct upside-down starting map issue (vertical UV flip).
- Added ocean lightening pass in shader for brighter blue water while preserving land tones.
- Replaced interior radial gradient with layered core colors: red center, orange middle, yellow near-surface band.
- Added black surface seam curves along piece boundaries on the Earth shell; seams are content-space based so they move with sliding pieces.
- Added 3D starfield points and switched scene background to black; stars are part of world space so they move with camera orbit.
- Re-ran validation: `npm run build`, `npm test`, skill Playwright loop, direct drag/orbit script, and wrap-check script all passed without console/page errors.
- Increased Earth shell brightness in shader using gamma lift + stronger RGB scaling + higher diffuse floor.
- Reduced piece seam width by tightening outline smoothstep threshold from 0.0115 -> 0.0036 over iterative tuning.
- Revalidated with `npm run build`, `npm test`, and `web_game_playwright_client.js` (output in `output/web-game-brightness/`, no console/page errors).
- Switched Earth lighting to fully ambient/even lighting by removing directional diffuse and rim contributions in the chunk shader.
- Revalidated with `npm run build`, `npm test`, and Playwright client capture (`output/web-game-ambient/`) with no console/page errors.
- Interior core layer updated to be bright red and larger (core threshold 0.34 -> 0.50), while preserving yellow layer boundary at t=0.76.
- Revalidated with `npm run build`, `npm test`, wrap visual script (`scripts/wrap-check.mjs`), and skill Playwright client (`output/web-game-core-red/`) with no console/page errors.
- Added HUD buttons: `Reset` and `Shuffle`; removed keyboard-based controls and key listeners.
- Implemented `GameStateEngine.applyDiscreteMove(...)` and `GameStateEngine.shuffle(moveCount, rng)`; shuffle applies 20 random face-tangent ±1 moves by default.
- Added deterministic unit test coverage for shuffle invocation and state mutation.
- Revalidated with `npm run build`, `npm test` (8 tests), required skill Playwright run (`output/web-game-buttons/`), and direct button flow script (`scripts/button-flow-test.mjs`) confirming: shuffle changes state, reset restores initial state, and keyboard keys no longer affect state.
- Added GitHub Pages deployment workflow (`.github/workflows/deploy-pages.yml`) to build and deploy on pushes to `main`.
- Updated Vite config to use `/EarthShuffle/` base path on GitHub Actions builds so asset URLs resolve on GitHub Pages.
- Removed stale `/vite.svg` favicon reference from `index.html` to avoid Pages 404.
- Verified with local tests and CI-mode build (`GITHUB_ACTIONS=true npm run build`) that generated asset paths are `/EarthShuffle/...`.
- Added mobile gesture support in input controller: one-finger drag performs face slides, two-finger drag orbits camera via touch midpoint.
- Added robust pointer capture guards to handle synthetic/platform pointer edge cases safely.
- Updated HUD copy to document touch controls while retaining desktop mouse guidance.
- Added `scripts/mobile-touch-test.mjs` automated touch regression script (iPhone emulation) verifying one-finger puzzle move and two-finger orbit camera movement.
- Revalidated with `npm run build`, `npm test`, required skill Playwright run (`output/web-game-mobile-pass/`), mobile touch script (`output/mobile-touch-test/`), and existing button flow script.
- Fixed GitHub Pages black-screen issue by loading Earth texture with `import.meta.env.BASE_URL` (`/EarthShuffle/...` in Pages) instead of absolute `/textures/...`.
- Confirmed production build output now references `/EarthShuffle/textures/earth_day.jpg` in bundled JS.

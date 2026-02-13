import { describe, expect, test } from 'vitest';
import { GameStateEngine } from '../src/core/gameState';
import type { FaceRef } from '../src/core/types';

const frontFace: FaceRef = {
  normalAxis: 'z',
  normalSign: 1,
  layerIndex: 2,
};

describe('GameStateEngine', () => {
  test('selects exactly nine pieces for a face layer', () => {
    const engine = new GameStateEngine();
    engine.startFaceDrag(frontFace);

    expect(engine.activeMove).not.toBeNull();
    expect(engine.activeMove?.selectedPieceIds.length).toBe(9);
  });

  test('commits snapped translation along selected tangent axis', () => {
    const engine = new GameStateEngine();
    engine.startFaceDrag(frontFace);
    engine.updateDragVector({ x: 0.38, y: 0.03, z: 0.0 });
    engine.releaseDrag();

    for (let i = 0; i < 10; i += 1) {
      engine.tick(0.016);
    }

    expect(engine.activeMove).toBeNull();

    const moved = engine.cubelets.filter((c) => c.origin.z === 2);
    expect(moved.every((piece) => piece.index.x === ((piece.origin.x + 1) % 3))).toBe(true);
  });

  test('drag release with no axis cancels move', () => {
    const engine = new GameStateEngine();
    engine.startFaceDrag(frontFace);
    engine.updateDragVector({ x: 0.001, y: 0.002, z: 0 });
    engine.releaseDrag();

    expect(engine.activeMove).toBeNull();
  });

  test('shuffle applies exactly the requested move count and changes state', () => {
    const engine = new GameStateEngine();
    const before = JSON.stringify(engine.cubelets.map((c) => c.index));

    // Deterministic random sequence for test stability.
    const picks = [
      0.02, 0.88, 0.15, 0.90,
      0.45, 0.24, 0.63, 0.10,
      0.70, 0.55, 0.42, 0.84,
      0.31, 0.63, 0.91, 0.12,
    ];
    let ptr = 0;
    const rng = () => {
      const value = picks[ptr % picks.length];
      ptr += 1;
      return value;
    };

    engine.shuffle(20, rng);
    const after = JSON.stringify(engine.cubelets.map((c) => c.index));

    expect(ptr).toBe(20 * 4);
    expect(after).not.toBe(before);
  });
});

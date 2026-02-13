import type { GameStateEngine } from '../core/gameState';
import { OrbitController } from '../input/orbitController';

export function renderGameToText(gameState: GameStateEngine, orbit: OrbitController): string {
  const active = gameState.activeMove;

  const payload = {
    coordinateSystem: {
      note: 'origin at cube center; axes are world-fixed: +x right, +y up, +z toward initial camera direction',
      cubeBounds: [-0.5, 0.5],
      cellSize: 1 / 3,
    },
    camera: {
      yaw: Number(orbit.yaw.toFixed(4)),
      pitch: Number(orbit.pitch.toFixed(4)),
      distance: Number(orbit.distance.toFixed(4)),
    },
    move: active
      ? {
          phase: active.phase,
          face: active.face,
          moveAxis: active.moveAxis,
          rawOffset: Number(active.rawOffset.toFixed(4)),
          snappedSteps: active.snappedSteps,
          selectedCount: active.selectedPieceIds.length,
        }
      : null,
    cubelets: gameState.cubelets.map((cubelet) => ({
      id: cubelet.id,
      index: cubelet.index,
    })),
  };

  return JSON.stringify(payload);
}

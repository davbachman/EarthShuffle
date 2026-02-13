import { CELL_SIZE, GRID_VALUES } from './types';
import type { ActiveMoveState, Axis, CubeletState, FaceRef, GridCoord, GridIndex, Vec3Like } from './types';
import { axisComponent, classifyFaceTangentAxis, clamp, easeOutCubic, mod3, otherAxes, snapOffsetSteps } from './math';

function cloneIndex(index: GridIndex): GridIndex {
  return { x: index.x, y: index.y, z: index.z };
}

function setAxisIndex(index: GridIndex, axis: Axis, value: GridCoord): void {
  if (axis === 'x') {
    index.x = value;
  } else if (axis === 'y') {
    index.y = value;
  } else {
    index.z = value;
  }
}

function getAxisIndex(index: GridIndex, axis: Axis): GridCoord {
  if (axis === 'x') {
    return index.x;
  }
  if (axis === 'y') {
    return index.y;
  }
  return index.z;
}

function createInitialCubelets(): CubeletState[] {
  const cubelets: CubeletState[] = [];
  let id = 0;

  for (const x of GRID_VALUES) {
    for (const y of GRID_VALUES) {
      for (const z of GRID_VALUES) {
        const origin: GridIndex = { x, y, z };
        cubelets.push({
          id,
          origin,
          index: cloneIndex(origin),
        });
        id += 1;
      }
    }
  }

  return cubelets;
}

function selectLayerPieces(cubelets: CubeletState[], face: FaceRef): number[] {
  return cubelets
    .filter((cubelet) => getAxisIndex(cubelet.index, face.normalAxis) === face.layerIndex)
    .map((cubelet) => cubelet.id);
}

const AXES: readonly Axis[] = ['x', 'y', 'z'] as const;

export class GameStateEngine {
  readonly cubelets: CubeletState[];
  activeMove: ActiveMoveState | null = null;

  constructor() {
    this.cubelets = createInitialCubelets();
  }

  startFaceDrag(face: FaceRef): void {
    if (this.activeMove !== null) {
      return;
    }

    this.activeMove = {
      face,
      selectedPieceIds: selectLayerPieces(this.cubelets, face),
      moveAxis: null,
      rawOffset: 0,
      snappedSteps: 0,
      phase: 'dragging',
      settleFrom: 0,
      settleTo: 0,
      settleElapsed: 0,
      settleDuration: 0.12,
    };
  }

  updateDragVector(delta: Vec3Like): void {
    if (this.activeMove === null || this.activeMove.phase !== 'dragging') {
      return;
    }

    if (this.activeMove.moveAxis === null) {
      this.activeMove.moveAxis = classifyFaceTangentAxis(this.activeMove.face.normalAxis, delta);
      if (this.activeMove.moveAxis === null) {
        return;
      }
    }

    const nextOffset = axisComponent(delta, this.activeMove.moveAxis);
    this.activeMove.rawOffset = clamp(nextOffset, -1, 1);
  }

  releaseDrag(): void {
    if (this.activeMove === null || this.activeMove.phase !== 'dragging') {
      return;
    }

    if (this.activeMove.moveAxis === null) {
      this.activeMove = null;
      return;
    }

    const snappedSteps = snapOffsetSteps(this.activeMove.rawOffset);
    this.activeMove.snappedSteps = snappedSteps;
    this.activeMove.phase = 'settling';
    this.activeMove.settleFrom = this.activeMove.rawOffset;
    this.activeMove.settleTo = snappedSteps * CELL_SIZE;
    this.activeMove.settleElapsed = 0;
  }

  cancelActiveDrag(): void {
    this.activeMove = null;
  }

  reset(): void {
    for (const cubelet of this.cubelets) {
      cubelet.index = cloneIndex(cubelet.origin);
    }
    this.activeMove = null;
  }

  applyDiscreteMove(face: FaceRef, moveAxis: Axis, steps: number): void {
    if (steps === 0) {
      return;
    }

    const selectedPieceIds = selectLayerPieces(this.cubelets, face);
    for (const pieceId of selectedPieceIds) {
      const cubelet = this.cubelets[pieceId];
      const current = getAxisIndex(cubelet.index, moveAxis);
      setAxisIndex(cubelet.index, moveAxis, mod3(current + steps));
    }
  }

  shuffle(moveCount = 20, rng: () => number = Math.random): void {
    this.activeMove = null;

    for (let i = 0; i < moveCount; i += 1) {
      const normalAxis = AXES[Math.floor(rng() * AXES.length)];
      const normalSign = rng() < 0.5 ? -1 : 1;
      const layerIndex: GridCoord = normalSign === 1 ? 2 : 0;
      const face: FaceRef = {
        normalAxis,
        normalSign,
        layerIndex,
      };

      const tangents = otherAxes(normalAxis);
      const moveAxis = tangents[Math.floor(rng() * tangents.length)];
      const steps = rng() < 0.5 ? -1 : 1;
      this.applyDiscreteMove(face, moveAxis, steps);
    }
  }

  tick(deltaSeconds: number): void {
    if (this.activeMove === null || this.activeMove.phase !== 'settling') {
      return;
    }

    this.activeMove.settleElapsed += deltaSeconds;
    const normalized = this.activeMove.settleDuration <= 0
      ? 1
      : this.activeMove.settleElapsed / this.activeMove.settleDuration;
    const eased = easeOutCubic(normalized);

    this.activeMove.rawOffset =
      this.activeMove.settleFrom +
      (this.activeMove.settleTo - this.activeMove.settleFrom) * eased;

    if (normalized >= 1) {
      this.commitSettledMove();
    }
  }

  getPieceDragOffset(pieceId: number): number {
    if (this.activeMove === null || this.activeMove.moveAxis === null) {
      return 0;
    }

    if (!this.activeMove.selectedPieceIds.includes(pieceId)) {
      return 0;
    }

    return this.activeMove.rawOffset;
  }

  isPieceInMovingLayer(pieceId: number): boolean {
    return this.activeMove?.selectedPieceIds.includes(pieceId) ?? false;
  }

  private commitSettledMove(): void {
    if (this.activeMove === null || this.activeMove.moveAxis === null) {
      this.activeMove = null;
      return;
    }

    const { moveAxis, selectedPieceIds, snappedSteps } = this.activeMove;

    if (snappedSteps !== 0) {
      for (const pieceId of selectedPieceIds) {
        const cubelet = this.cubelets[pieceId];
        const current = getAxisIndex(cubelet.index, moveAxis);
        setAxisIndex(cubelet.index, moveAxis, mod3(current + snappedSteps));
      }
    }

    this.activeMove = null;
  }
}

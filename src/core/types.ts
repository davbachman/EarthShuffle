export type Axis = 'x' | 'y' | 'z';
export type Sign = -1 | 1;
export type GridCoord = 0 | 1 | 2;

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface FaceRef {
  normalAxis: Axis;
  normalSign: Sign;
  layerIndex: GridCoord;
}

export interface GridIndex {
  x: GridCoord;
  y: GridCoord;
  z: GridCoord;
}

export interface CubeletState {
  id: number;
  origin: GridIndex;
  index: GridIndex;
}

export type MovePhase = 'dragging' | 'settling';

export interface ActiveMoveState {
  face: FaceRef;
  selectedPieceIds: number[];
  moveAxis: Axis | null;
  rawOffset: number;
  snappedSteps: number;
  phase: MovePhase;
  settleFrom: number;
  settleTo: number;
  settleElapsed: number;
  settleDuration: number;
}

export const CUBE_HALF = 0.5;
export const CELL_SIZE = 1 / 3;
export const EARTH_RADIUS = 0.49;
export const GRID_VALUES: readonly GridCoord[] = [0, 1, 2] as const;

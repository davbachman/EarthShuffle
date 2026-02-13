import { CELL_SIZE, CUBE_HALF } from './types';
import type { Axis, GridCoord, Vec3Like } from './types';

const AXIS_TO_INDEX: Record<Axis, 0 | 1 | 2> = {
  x: 0,
  y: 1,
  z: 2,
};

export function axisToIndex(axis: Axis): 0 | 1 | 2 {
  return AXIS_TO_INDEX[axis];
}

export function otherAxes(axis: Axis): [Axis, Axis] {
  if (axis === 'x') {
    return ['y', 'z'];
  }
  if (axis === 'y') {
    return ['x', 'z'];
  }
  return ['x', 'y'];
}

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function mod3(value: number): GridCoord {
  return mod(value, 3) as GridCoord;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function indexToCenter(index: number): number {
  return (index - 1) * CELL_SIZE;
}

export function snapOffsetSteps(offset: number): number {
  return Math.round(offset / CELL_SIZE);
}

export function axisComponent(vector: Vec3Like, axis: Axis): number {
  if (axis === 'x') {
    return vector.x;
  }
  if (axis === 'y') {
    return vector.y;
  }
  return vector.z;
}

export function classifyFaceTangentAxis(
  normalAxis: Axis,
  dragDelta: Vec3Like,
  threshold = 0.006,
): Axis | null {
  const [a, b] = otherAxes(normalAxis);
  const aMag = Math.abs(axisComponent(dragDelta, a));
  const bMag = Math.abs(axisComponent(dragDelta, b));
  const bestMagnitude = Math.max(aMag, bMag);

  if (bestMagnitude < threshold) {
    return null;
  }

  return aMag >= bMag ? a : b;
}

export function wrapUnitCubeCoordinate(value: number): number {
  const period = 2 * CUBE_HALF;
  let wrapped = value;

  while (wrapped > CUBE_HALF) {
    wrapped -= period;
  }
  while (wrapped < -CUBE_HALF) {
    wrapped += period;
  }

  return wrapped;
}

export function easeOutCubic(t: number): number {
  const k = clamp(t, 0, 1);
  return 1 - Math.pow(1 - k, 3);
}

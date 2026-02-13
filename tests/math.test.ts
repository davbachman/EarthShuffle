import { describe, expect, test } from 'vitest';
import { classifyFaceTangentAxis, mod3, snapOffsetSteps, wrapUnitCubeCoordinate } from '../src/core/math';

describe('core math', () => {
  test('wrapUnitCubeCoordinate wraps on both sides', () => {
    expect(wrapUnitCubeCoordinate(0.62)).toBeCloseTo(-0.38);
    expect(wrapUnitCubeCoordinate(-0.76)).toBeCloseTo(0.24);
  });

  test('snapOffsetSteps snaps to nearest one-third', () => {
    expect(snapOffsetSteps(0.16)).toBe(0);
    expect(snapOffsetSteps(0.18)).toBe(1);
    expect(snapOffsetSteps(-0.34)).toBe(-1);
  });

  test('classifies tangent axis only', () => {
    const delta = { x: 0.01, y: 0.26, z: -0.11 };
    expect(classifyFaceTangentAxis('z', delta)).toBe('y');
    expect(classifyFaceTangentAxis('x', delta)).toBe('y');
  });

  test('mod3 keeps indices in 0..2', () => {
    expect(mod3(-1)).toBe(2);
    expect(mod3(3)).toBe(0);
    expect(mod3(7)).toBe(1);
  });
});

import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';

const GRID = [-0.5, -1 / 6, 1 / 6, 0.5];

export function createWireCube(): LineSegments {
  const positions: number[] = [];

  for (const y of GRID) {
    for (const z of GRID) {
      positions.push(-0.5, y, z, 0.5, y, z);
    }
  }

  for (const x of GRID) {
    for (const z of GRID) {
      positions.push(x, -0.5, z, x, 0.5, z);
    }
  }

  for (const x of GRID) {
    for (const y of GRID) {
      positions.push(x, y, -0.5, x, y, 0.5);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const material = new LineBasicMaterial({
    color: 0xb9d7ff,
    transparent: true,
    opacity: 0.8,
  });

  return new LineSegments(geometry, material);
}

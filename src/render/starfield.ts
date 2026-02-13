import { BufferGeometry, Color, Float32BufferAttribute, Points, PointsMaterial } from 'three';

function pseudoRandom(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

export function createStarfield(starCount = 1700): Points {
  const rng = pseudoRandom(0x53a7f11d);

  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const u = rng() * 2 - 1;
    const phi = rng() * 2 * Math.PI;
    const radial = 13 + rng() * 7;
    const lateral = Math.sqrt(1 - u * u);

    const x = radial * lateral * Math.cos(phi);
    const y = radial * u;
    const z = radial * lateral * Math.sin(phi);

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const twinkle = 0.78 + rng() * 0.22;
    const tint = 0.94 + rng() * 0.06;
    colors[i * 3 + 0] = twinkle;
    colors[i * 3 + 1] = twinkle * tint;
    colors[i * 3 + 2] = twinkle * (0.96 + rng() * 0.04);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

  const material = new PointsMaterial({
    size: 0.07,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    color: new Color(0xffffff),
    sizeAttenuation: true,
  });

  return new Points(geometry, material);
}

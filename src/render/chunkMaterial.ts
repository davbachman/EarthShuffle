import { DoubleSide, ShaderMaterial, Texture } from 'three';
import { CUBE_HALF, EARTH_RADIUS } from '../core/types';

const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vContentPos;
  varying vec3 vWorldNormal;

  attribute vec3 contentPos;

  void main() {
    vContentPos = contentPos;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vContentPos;
  varying vec3 vWorldNormal;

  uniform sampler2D uEarthTexture;
  uniform float uCubeHalf;
  uniform float uRadius;
  uniform float uCellSize;

  const float PI = 3.14159265359;

  vec2 sphericalUv(vec3 p) {
    vec3 radial = normalize(p);
    float lon = atan(radial.z, radial.x);
    float lat = asin(clamp(radial.y, -1.0, 1.0));
    float u = 0.5 + lon / (2.0 * PI);
    // Flip vertical mapping so the initial Earth orientation is upright.
    float v = 0.5 + lat / PI;
    return vec2(u, v);
  }

  vec3 lightenOceans(vec3 tex) {
    float oceanMask = smoothstep(0.03, 0.16, tex.b - max(tex.r, tex.g));
    vec3 boosted = tex + vec3(0.02, 0.10, 0.18);
    boosted = mix(boosted, vec3(0.24, 0.50, 0.78), 0.18);
    return mix(tex, boosted, oceanMask);
  }

  vec3 interiorColor(vec3 p) {
    float t = clamp(length(p) / uRadius, 0.0, 1.0);
    vec3 core = vec3(1.00, 0.08, 0.05);
    vec3 mantle = vec3(0.96, 0.44, 0.10);
    vec3 nearSurface = vec3(0.97, 0.84, 0.12);

    // Larger bright-red core while preserving the yellow band start radius.
    if (t < 0.50) {
      return core;
    }
    if (t < 0.76) {
      return mantle;
    }
    return nearSurface;
  }

  float surfaceOutlineMask(vec3 p, float outerMask) {
    float boundary = uCellSize * 0.5;
    float dx = min(abs(p.x - boundary), abs(p.x + boundary));
    float dy = min(abs(p.y - boundary), abs(p.y + boundary));
    float dz = min(abs(p.z - boundary), abs(p.z + boundary));
    float nearest = min(dx, min(dy, dz));

    float line = 1.0 - smoothstep(0.0, 0.0036, nearest);
    return line * outerMask;
  }

  void main() {
    if (
      abs(vWorldPos.x) > uCubeHalf + 0.0005 ||
      abs(vWorldPos.y) > uCubeHalf + 0.0005 ||
      abs(vWorldPos.z) > uCubeHalf + 0.0005
    ) {
      discard;
    }

    vec3 worldNormal = normalize(vWorldNormal);
    vec3 radial = normalize(vContentPos);
    float radialAlign = dot(worldNormal, radial);
    float outerMask = smoothstep(0.90, 0.97, radialAlign);

    vec3 earthTex = texture2D(uEarthTexture, sphericalUv(vContentPos)).rgb;
    earthTex = lightenOceans(earthTex);
    earthTex = pow(earthTex, vec3(0.88));
    earthTex = min(earthTex * vec3(1.24, 1.28, 1.36), vec3(1.0));
    vec3 interior = interiorColor(vContentPos);
    vec3 shellColor = min(earthTex * vec3(1.10, 1.10, 1.12), vec3(1.0));
    vec3 base = mix(interior, shellColor, outerMask);

    float outlineMask = surfaceOutlineMask(vContentPos, outerMask);
    base = mix(base, vec3(0.02, 0.02, 0.02), outlineMask);

    // Use fully ambient lighting so all parts of the Earth are evenly lit.
    gl_FragColor = vec4(base, 1.0);
  }
`;

export function createChunkMaterial(texture: Texture): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uEarthTexture: { value: texture },
      uCubeHalf: { value: CUBE_HALF },
      uRadius: { value: EARTH_RADIUS },
      uCellSize: { value: 1 / 3 },
    },
    side: DoubleSide,
  });
}

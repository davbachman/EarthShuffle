import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Plane,
  PlaneGeometry,
  Ray,
  Raycaster,
  Vector3,
} from 'three';
import type { Axis, FaceRef, Sign } from '../core/types';

interface FacePickMetadata {
  face: FaceRef;
}

export interface FacePickingRig {
  group: Group;
  meshes: Mesh[];
}

function axisNormal(axis: Axis, sign: Sign): Vector3 {
  if (axis === 'x') {
    return new Vector3(sign, 0, 0);
  }
  if (axis === 'y') {
    return new Vector3(0, sign, 0);
  }
  return new Vector3(0, 0, sign);
}

function makeFaceMesh(axis: Axis, sign: Sign): Mesh {
  const geometry = new PlaneGeometry(1, 1);
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);

  if (axis === 'x') {
    mesh.rotation.y = sign === 1 ? -Math.PI * 0.5 : Math.PI * 0.5;
    mesh.position.x = sign * 0.5;
  } else if (axis === 'y') {
    mesh.rotation.x = sign === 1 ? -Math.PI * 0.5 : Math.PI * 0.5;
    mesh.position.y = sign * 0.5;
  } else {
    mesh.rotation.y = sign === 1 ? 0 : Math.PI;
    mesh.position.z = sign * 0.5;
  }

  const layerIndex = sign === 1 ? 2 : 0;
  const metadata: FacePickMetadata = {
    face: {
      normalAxis: axis,
      normalSign: sign,
      layerIndex,
    },
  };
  mesh.userData.facePick = metadata;

  return mesh;
}

export function createFacePickingRig(): FacePickingRig {
  const group = new Group();
  const meshes: Mesh[] = [];

  for (const axis of ['x', 'y', 'z'] as const) {
    for (const sign of [-1, 1] as const) {
      const mesh = makeFaceMesh(axis, sign);
      meshes.push(mesh);
      group.add(mesh);
    }
  }

  return { group, meshes };
}

export function pickFace(raycaster: Raycaster, meshes: Mesh[]): FaceRef | null {
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) {
    return null;
  }

  const hit = hits[0].object as Mesh;
  const metadata = hit.userData.facePick as FacePickMetadata | undefined;
  return metadata?.face ?? null;
}

export function intersectFacePlane(ray: Ray, face: FaceRef, out = new Vector3()): Vector3 | null {
  const normal = axisNormal(face.normalAxis, face.normalSign);
  const plane = new Plane(normal, -0.5);
  const intersection = ray.intersectPlane(plane, out);
  return intersection ?? null;
}

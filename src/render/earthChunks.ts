import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  SphereGeometry,
  Texture,
  Vector3,
} from 'three';
import { Brush, Evaluator, INTERSECTION } from 'three-bvh-csg';
import type { ActiveMoveState, Axis, CubeletState, GridCoord } from '../core/types';
import { CELL_SIZE, EARTH_RADIUS, GRID_VALUES } from '../core/types';
import { indexToCenter } from '../core/math';
import { createChunkMaterial } from './chunkMaterial';

interface PieceVisual {
  id: number;
  originCenter: Vector3;
  mainMesh: Mesh;
  wrapMinusMesh: Mesh;
  wrapPlusMesh: Mesh;
}

export interface EarthChunkRig {
  group: Group;
  pieces: PieceVisual[];
}

function axisVector(axis: Axis): Vector3 {
  if (axis === 'x') {
    return new Vector3(1, 0, 0);
  }
  if (axis === 'y') {
    return new Vector3(0, 1, 0);
  }
  return new Vector3(0, 0, 1);
}

function centerFromGrid(x: GridCoord, y: GridCoord, z: GridCoord): Vector3 {
  return new Vector3(indexToCenter(x), indexToCenter(y), indexToCenter(z));
}

function createChunkGeometry(
  evaluator: Evaluator,
  sphereBrush: Brush,
  center: Vector3,
): BufferGeometry {
  const boxBrush = new Brush(new BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE));
  boxBrush.position.copy(center);
  boxBrush.updateMatrixWorld(true);

  const result = evaluator.evaluate(sphereBrush, boxBrush, INTERSECTION);
  const geometry = result.geometry.clone() as BufferGeometry;
  geometry.clearGroups();

  const position = geometry.getAttribute('position');
  const contentPos = new Float32Array(position.array.length);
  contentPos.set(position.array as ArrayLike<number>);
  geometry.setAttribute('contentPos', new Float32BufferAttribute(contentPos, 3));

  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeVertexNormals();

  boxBrush.geometry.dispose();
  return geometry;
}

export function createEarthChunkRig(texture: Texture): EarthChunkRig {
  const group = new Group();
  const pieces: PieceVisual[] = [];

  const evaluator = new Evaluator();
  evaluator.useGroups = false;

  const sphereBrush = new Brush(new SphereGeometry(EARTH_RADIUS, 72, 54));
  sphereBrush.updateMatrixWorld(true);

  const material = createChunkMaterial(texture);

  let id = 0;
  for (const x of GRID_VALUES) {
    for (const y of GRID_VALUES) {
      for (const z of GRID_VALUES) {
        const center = centerFromGrid(x, y, z);
        const geometry = createChunkGeometry(evaluator, sphereBrush, center);

        const mainMesh = new Mesh(geometry, material);
        const wrapMinusMesh = new Mesh(geometry, material);
        const wrapPlusMesh = new Mesh(geometry, material);

        wrapMinusMesh.visible = false;
        wrapPlusMesh.visible = false;

        group.add(mainMesh, wrapMinusMesh, wrapPlusMesh);

        pieces.push({
          id,
          originCenter: center,
          mainMesh,
          wrapMinusMesh,
          wrapPlusMesh,
        });

        id += 1;
      }
    }
  }

  sphereBrush.geometry.dispose();

  return { group, pieces };
}

export function syncEarthChunkRig(
  rig: EarthChunkRig,
  cubelets: CubeletState[],
  activeMove: ActiveMoveState | null,
): void {
  const axis = activeMove?.moveAxis ?? null;
  const axisShift = axis === null ? new Vector3(0, 0, 0) : axisVector(axis);

  for (const piece of rig.pieces) {
    const cubelet = cubelets[piece.id];
    const currentCenter = centerFromGrid(cubelet.index.x, cubelet.index.y, cubelet.index.z);
    const basePosition = currentCenter;

    const moving = activeMove !== null && activeMove.selectedPieceIds.includes(piece.id) && axis !== null;
    const dragOffset = moving ? activeMove.rawOffset : 0;

    piece.mainMesh.position.copy(basePosition).addScaledVector(axisShift, dragOffset);

    if (moving) {
      piece.wrapMinusMesh.visible = true;
      piece.wrapPlusMesh.visible = true;

      piece.wrapMinusMesh.position.copy(piece.mainMesh.position).addScaledVector(axisShift, -1);
      piece.wrapPlusMesh.position.copy(piece.mainMesh.position).addScaledVector(axisShift, 1);
    } else {
      piece.wrapMinusMesh.visible = false;
      piece.wrapPlusMesh.visible = false;
    }
  }
}

import { Camera, Raycaster, Vector2, Vector3 } from 'three';
import type { GameStateEngine } from '../core/gameState';
import type { FaceRef } from '../core/types';
import { OrbitController } from './orbitController';
import { intersectFacePlane, pickFace } from '../render/picking';
import type { FacePickingRig } from '../render/picking';

interface InputControllerOptions {
  domElement: HTMLElement;
  camera: Camera;
  pickingRig: FacePickingRig;
  gameState: GameStateEngine;
  orbit: OrbitController;
}

export class InputController {
  private readonly domElement: HTMLElement;
  private readonly camera: Camera;
  private readonly pickingRig: FacePickingRig;
  private readonly gameState: GameStateEngine;
  private readonly orbit: OrbitController;

  private readonly raycaster = new Raycaster();
  private readonly pointerNdc = new Vector2();
  private readonly dragStart = new Vector3();
  private readonly dragCurrent = new Vector3();

  private leftPointerId: number | null = null;
  private rightPointerId: number | null = null;
  private activeFace: FaceRef | null = null;

  constructor(options: InputControllerOptions) {
    this.domElement = options.domElement;
    this.camera = options.camera;
    this.pickingRig = options.pickingRig;
    this.gameState = options.gameState;
    this.orbit = options.orbit;

    this.domElement.style.touchAction = 'none';
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointercancel', this.onPointerUp);
  }

  dispose(): void {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerUp);
  }

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.domElement.setPointerCapture(event.pointerId);

    if (event.button === 2 && this.rightPointerId === null) {
      this.rightPointerId = event.pointerId;
      this.orbit.beginDrag(event.pointerId, event.clientX, event.clientY);
      return;
    }

    if (event.button !== 0 || this.leftPointerId !== null || this.rightPointerId !== null) {
      return;
    }

    const ray = this.eventRay(event);
    const face = pickFace(this.raycaster, this.pickingRig.meshes);
    if (face === null) {
      return;
    }

    const point = intersectFacePlane(ray, face, this.dragStart);
    if (point === null) {
      return;
    }

    this.leftPointerId = event.pointerId;
    this.activeFace = face;
    this.gameState.startFaceDrag(face);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.rightPointerId === event.pointerId) {
      this.orbit.updateDrag(event.pointerId, event.clientX, event.clientY);
    }

    if (this.leftPointerId !== event.pointerId || this.activeFace === null) {
      return;
    }

    const ray = this.eventRay(event);
    const point = intersectFacePlane(ray, this.activeFace, this.dragCurrent);
    if (point === null) {
      return;
    }

    const delta = this.dragCurrent.sub(this.dragStart);
    this.gameState.updateDragVector(delta);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.rightPointerId === event.pointerId) {
      this.orbit.endDrag(event.pointerId);
      this.rightPointerId = null;
    }

    if (this.leftPointerId === event.pointerId) {
      this.gameState.releaseDrag();
      this.leftPointerId = null;
      this.activeFace = null;
    }

    this.domElement.releasePointerCapture(event.pointerId);
  };

  private eventRay(event: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.raycaster.ray;
  }
}

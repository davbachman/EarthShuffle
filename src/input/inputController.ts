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
  private readonly touchPoints = new Map<number, { x: number; y: number }>();

  private faceDragPointerId: number | null = null;
  private faceDragPointerType: 'mouse' | 'touch' | null = null;
  private rightPointerId: number | null = null;
  private activeFace: FaceRef | null = null;
  private twoFingerOrbitActive = false;
  private readonly twoFingerOrbitPointerId = -9999;

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
    this.domElement.addEventListener('pointercancel', this.onPointerCancel);
  }

  dispose(): void {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerCancel);
  }

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.capturePointer(event.pointerId);

    if (event.pointerType === 'touch') {
      this.onTouchPointerDown(event);
      return;
    }

    if (event.button === 2 && this.rightPointerId === null) {
      this.rightPointerId = event.pointerId;
      this.orbit.beginDrag(event.pointerId, event.clientX, event.clientY);
      return;
    }

    if (event.button !== 0 || this.rightPointerId !== null) {
      return;
    }

    this.tryStartFaceDrag(event, 'mouse');
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.onTouchPointerMove(event);
      return;
    }

    if (this.rightPointerId === event.pointerId) {
      this.orbit.updateDrag(event.pointerId, event.clientX, event.clientY);
    }

    if (
      this.faceDragPointerId !== event.pointerId ||
      this.faceDragPointerType !== 'mouse' ||
      this.activeFace === null
    ) {
      return;
    }

    this.updateFaceDrag(event);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.onTouchPointerUp(event, false);
      this.releasePointer(event.pointerId);
      return;
    }

    if (this.rightPointerId === event.pointerId) {
      this.orbit.endDrag(event.pointerId);
      this.rightPointerId = null;
    }

    if (this.faceDragPointerId === event.pointerId && this.faceDragPointerType === 'mouse') {
      this.finishFaceDrag(false);
    }

    this.releasePointer(event.pointerId);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.onTouchPointerUp(event, true);
      this.releasePointer(event.pointerId);
      return;
    }

    if (this.rightPointerId === event.pointerId) {
      this.orbit.endDrag(event.pointerId);
      this.rightPointerId = null;
    }

    if (this.faceDragPointerId === event.pointerId && this.faceDragPointerType === 'mouse') {
      this.finishFaceDrag(true);
    }

    this.releasePointer(event.pointerId);
  };

  private onTouchPointerDown(event: PointerEvent): void {
    this.touchPoints.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (this.touchPoints.size === 1) {
      this.tryStartFaceDrag(event, 'touch');
      return;
    }

    if (this.touchPoints.size === 2) {
      this.finishFaceDrag(true);
      const midpoint = this.computeTouchMidpoint();
      if (midpoint === null) {
        return;
      }
      this.twoFingerOrbitActive = true;
      this.orbit.beginDrag(this.twoFingerOrbitPointerId, midpoint.x, midpoint.y);
    }
  }

  private onTouchPointerMove(event: PointerEvent): void {
    if (!this.touchPoints.has(event.pointerId)) {
      return;
    }

    this.touchPoints.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (this.twoFingerOrbitActive) {
      const midpoint = this.computeTouchMidpoint();
      if (midpoint !== null) {
        this.orbit.updateDrag(this.twoFingerOrbitPointerId, midpoint.x, midpoint.y);
      }
      return;
    }

    if (
      this.faceDragPointerId !== event.pointerId ||
      this.faceDragPointerType !== 'touch' ||
      this.activeFace === null
    ) {
      return;
    }

    this.updateFaceDrag(event);
  }

  private onTouchPointerUp(event: PointerEvent, cancelled: boolean): void {
    this.touchPoints.delete(event.pointerId);

    if (this.twoFingerOrbitActive && this.touchPoints.size < 2) {
      this.orbit.endDrag(this.twoFingerOrbitPointerId);
      this.twoFingerOrbitActive = false;
    }

    if (this.faceDragPointerId === event.pointerId && this.faceDragPointerType === 'touch') {
      this.finishFaceDrag(cancelled);
    }
  }

  private tryStartFaceDrag(event: PointerEvent, pointerType: 'mouse' | 'touch'): void {
    if (this.faceDragPointerId !== null) {
      return;
    }

    const ray = this.eventRay(event);
    const face = pickFace(this.raycaster, this.pickingRig.meshes);
    if (face === null) {
      return;
    }

    if (intersectFacePlane(ray, face, this.dragStart) === null) {
      return;
    }

    this.faceDragPointerId = event.pointerId;
    this.faceDragPointerType = pointerType;
    this.activeFace = face;
    this.gameState.startFaceDrag(face);
  }

  private updateFaceDrag(event: PointerEvent): void {
    if (this.activeFace === null) {
      return;
    }

    const ray = this.eventRay(event);
    const point = intersectFacePlane(ray, this.activeFace, this.dragCurrent);
    if (point === null) {
      return;
    }

    const delta = this.dragCurrent.sub(this.dragStart);
    this.gameState.updateDragVector(delta);
  }

  private finishFaceDrag(cancelled: boolean): void {
    if (this.faceDragPointerId === null) {
      return;
    }

    if (cancelled) {
      this.gameState.cancelActiveDrag();
    } else {
      this.gameState.releaseDrag();
    }

    this.faceDragPointerId = null;
    this.faceDragPointerType = null;
    this.activeFace = null;
  }

  private computeTouchMidpoint(): { x: number; y: number } | null {
    if (this.touchPoints.size < 2) {
      return null;
    }

    const points = Array.from(this.touchPoints.values());
    return {
      x: (points[0].x + points[1].x) * 0.5,
      y: (points[0].y + points[1].y) * 0.5,
    };
  }

  private capturePointer(pointerId: number): void {
    try {
      this.domElement.setPointerCapture(pointerId);
    } catch {
      // Some synthetic or platform events may not support pointer capture.
    }
  }

  private releasePointer(pointerId: number): void {
    try {
      if (this.domElement.hasPointerCapture(pointerId)) {
        this.domElement.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore release errors when capture was not established.
    }
  }

  private eventRay(event: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.raycaster.ray;
  }
}

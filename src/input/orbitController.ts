import { MathUtils, PerspectiveCamera } from 'three';
import type { OrbitGestureAdapter } from './gestureAdapter';

export class OrbitController implements OrbitGestureAdapter {
  private pointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;

  yaw = Math.PI * 0.25;
  pitch = Math.PI * 0.22;
  distance = 2.2;

  beginDrag(pointerId: number, x: number, y: number): void {
    this.pointerId = pointerId;
    this.lastX = x;
    this.lastY = y;
  }

  updateDrag(pointerId: number, x: number, y: number): void {
    if (this.pointerId !== pointerId) {
      return;
    }

    const deltaX = x - this.lastX;
    const deltaY = y - this.lastY;
    this.lastX = x;
    this.lastY = y;

    this.yaw -= deltaX * 0.006;
    this.pitch += deltaY * 0.006;
    this.pitch = MathUtils.clamp(this.pitch, -1.35, 1.35);
  }

  endDrag(pointerId: number): void {
    if (this.pointerId === pointerId) {
      this.pointerId = null;
    }
  }

  isDragging(pointerId: number): boolean {
    return this.pointerId === pointerId;
  }

  apply(camera: PerspectiveCamera): void {
    const cp = Math.cos(this.pitch);
    const x = this.distance * Math.sin(this.yaw) * cp;
    const y = this.distance * Math.sin(this.pitch);
    const z = this.distance * Math.cos(this.yaw) * cp;

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }
}

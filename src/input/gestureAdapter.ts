export interface OrbitGestureAdapter {
  beginDrag(pointerId: number, x: number, y: number): void;
  updateDrag(pointerId: number, x: number, y: number): void;
  endDrag(pointerId: number): void;
}

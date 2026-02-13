import { Color, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';

export interface SceneBundle {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  resize: () => void;
  dispose: () => void;
}

export function createSceneBundle(hostElement: HTMLElement): SceneBundle {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  scene.background = new Color('#000000');

  const camera = new PerspectiveCamera(42, 1, 0.01, 40);

  hostElement.appendChild(renderer.domElement);

  const resize = () => {
    const width = hostElement.clientWidth;
    const height = hostElement.clientHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  resize();

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    renderer,
    resize,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    },
  };
}

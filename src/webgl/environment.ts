import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
} from 'three';
import type { Texture, WebGLRenderer, WebGLRenderTarget } from 'three';

export interface ChromeEnvironment {
  readonly texture: Texture;
  dispose(): void;
}

interface BarSpec {
  readonly width: number;
  readonly height: number;
  readonly position: readonly [number, number, number];
  readonly colour: number;
  readonly intensity: number;
}

/**
 * The light rig the chrome torus reflects.
 *
 * Polished metal has no colour of its own — everything you read as "chrome" is
 * the environment bent around it. So instead of loading an HDRI, a few
 * emissive bars are arranged into the reflection we actually want: one hard
 * white band overhead for the specular streak, cool cyan from both flanks, and
 * a single red kick from below. That is the whole palette, delivered through
 * reflection rather than applied as a tint.
 */
const BARS: readonly BarSpec[] = [
  // Overhead key light: wide and hot, gives the horizontal specular streak.
  { width: 26, height: 3.2, position: [0, 11, -1], colour: 0xffffff, intensity: 7.5 },
  // Cool flanks, the Sony-futurism highlight.
  { width: 2.4, height: 20, position: [-12, 0, 2], colour: 0x00e5ff, intensity: 4.2 },
  { width: 2.0, height: 18, position: [12, -1, -3], colour: 0xb6f4ff, intensity: 3.0 },
  // Low red kick, so the metal never reads as purely cold.
  { width: 14, height: 1.4, position: [2, -9, 6], colour: 0xff3b1f, intensity: 3.4 },
  // Soft fill behind, keeps the unlit side from crushing to pure black.
  { width: 30, height: 22, position: [0, 0, -18], colour: 0x121a26, intensity: 1.0 },
];

export function createChromeEnvironment(renderer: WebGLRenderer): ChromeEnvironment {
  const pmrem = new PMREMGenerator(renderer);
  const rig = new Scene();
  rig.background = new Color(0x04060a);

  const geometries: PlaneGeometry[] = [];
  const materials: MeshBasicMaterial[] = [];

  for (const bar of BARS) {
    const geometry = new PlaneGeometry(bar.width, bar.height);
    const material = new MeshBasicMaterial({
      // Values above 1 are legal in the linear working space and are what give
      // the reflection its blown-out core once bloom picks it up.
      color: new Color(bar.colour).multiplyScalar(bar.intensity),
      side: DoubleSide,
      toneMapped: false,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(...bar.position);
    mesh.lookAt(0, 0, 0);
    rig.add(mesh);

    geometries.push(geometry);
    materials.push(material);
  }

  // A little blur keeps the bars from reflecting as hard-edged rectangles.
  const target: WebGLRenderTarget = pmrem.fromScene(rig, 0.035);

  // The render target owns the only reference we need from here on, so the rig
  // and the generator can go immediately.
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  rig.clear();
  pmrem.dispose();

  return {
    texture: target.texture,
    dispose: () => {
      target.dispose();
    },
  };
}

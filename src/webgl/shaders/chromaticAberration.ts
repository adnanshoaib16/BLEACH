import { Vector2 } from 'three';
import type { IUniform, Texture } from 'three';

/**
 * Chromatic aberration, vignette, scanlines and grain in one full-screen pass.
 *
 * Bundling them is deliberate: each is a couple of instructions, and a single
 * pass avoids three extra full-resolution round trips. The channel split is
 * scaled by the square of the distance from centre, the way a cheap lens
 * actually misbehaves — dead sharp in the middle, smeared at the corners.
 */

interface AberrationUniforms {
  readonly [name: string]: IUniform;
  tDiffuse: IUniform<Texture | null>;
  uAmount: IUniform<number>;
  uTime: IUniform<number>;
  uVignette: IUniform<number>;
  uScanline: IUniform<number>;
  uResolution: IUniform<Vector2>;
}

export interface AberrationShader {
  readonly name: string;
  readonly uniforms: AberrationUniforms;
  readonly vertexShader: string;
  readonly fragmentShader: string;
}

export function createAberrationShader(): AberrationShader {
  return {
    name: 'ReiatsuAberration',
    uniforms: {
      tDiffuse: { value: null },
      uAmount: { value: 0.002 },
      uTime: { value: 0 },
      uVignette: { value: 0.3 },
      uScanline: { value: 0.045 },
      uResolution: { value: new Vector2(1, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D tDiffuse;
      uniform float uAmount;
      uniform float uTime;
      uniform float uVignette;
      uniform float uScanline;
      uniform vec2  uResolution;

      varying vec2 vUv;

      void main() {
        vec2 centred = vUv - 0.5;
        float r2 = dot(centred, centred);

        // Split grows with the square of the radius: sharp centre, smeared edge.
        vec2 offset = centred * uAmount * (0.30 + r2 * 2.6);

        float red   = texture2D(tDiffuse, vUv - offset).r;
        vec4  green = texture2D(tDiffuse, vUv);
        float blue  = texture2D(tDiffuse, vUv + offset).b;

        vec3 colour = vec3(red, green.g, blue);

        // Scanlines in device pixels, so density is independent of canvas size.
        float line = sin(vUv.y * uResolution.y * 1.5708);
        colour *= 1.0 - uScanline * (0.5 + 0.5 * line);

        // Grain, animated so it reads as sensor noise rather than a texture.
        float grain = fract(sin(dot(vUv * uResolution + uTime * 60.0, vec2(12.9898, 78.233))) * 43758.5453);
        colour += (grain - 0.5) * 0.022;

        colour *= 1.0 - uVignette * r2 * 1.6;

        gl_FragColor = vec4(colour, green.a);
      }
    `,
  };
}

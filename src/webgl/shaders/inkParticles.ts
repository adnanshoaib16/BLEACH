/**
 * Ink particles — GPU-instanced billboard quads.
 *
 * One PlaneGeometry is shared by every instance; per-instance attributes carry
 * position, size, spin and tone, and all motion happens in the vertex shader,
 * so the CPU touches nothing per frame except two uniforms.
 *
 * Each quad is shaded as a lobed blot rather than a soft circle, so a cluster
 * reads as ink suspended in water instead of as a particle system.
 */

export const inkParticlesVertex = /* glsl */ `
  attribute vec3  aOffset;
  attribute float aSeed;
  attribute float aScale;
  attribute float aSpin;
  attribute float aTone;

  uniform float uTime;
  uniform float uEnergy;
  uniform vec2  uPointer;
  uniform float uSpan;

  varying vec2  vUv;
  varying float vTone;
  varying float vFade;
  varying float vSeed;

  void main() {
    vUv   = uv;
    vTone = aTone;
    vSeed = aSeed;

    float t = uTime * 0.12 + aSeed * 6.2831853;

    vec3 p = aOffset;

    // Layered sines stand in for curl noise: three octaves is enough to stop
    // the drift reading as periodic, at a fraction of the instruction count.
    p.x += sin(t * 0.90 + aOffset.y * 0.35) * (0.9 + uEnergy * 1.5);
    p.x += sin(t * 2.30 + aOffset.z * 0.80) * 0.35;
    p.z += sin(t * 0.50 + aSeed * 3.0) * 1.6;

    // Steady rise, wrapped through the span so the field never empties.
    float rise = uTime * (0.45 + aSeed * 0.75) + aSeed * uSpan;
    p.y = mod(aOffset.y + rise + uSpan * 0.5, uSpan) - uSpan * 0.5;
    p.y += cos(t * 0.7 + aOffset.x * 0.28) * (0.6 + uEnergy);

    // Parallax toward the pointer, weighted by depth so the field has volume.
    float depth = (p.z + 30.0) / 60.0;
    p.xy += uPointer * mix(0.6, 3.4, depth);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    float size = aScale * (0.62 + uEnergy * 0.85);
    float spin = aSpin + uTime * 0.3 * (aSeed - 0.5);
    float c = cos(spin);
    float s = sin(spin);
    mv.xy += mat2(c, -s, s, c) * position.xy * size;

    // Fade in at the far plane and out as a blot passes the camera, so nothing
    // ever pops into or out of existence.
    float dist = -mv.z;
    vFade = smoothstep(2.0, 12.0, dist) * (1.0 - smoothstep(48.0, 86.0, dist));

    gl_Position = projectionMatrix * mv;
  }
`;

export const inkParticlesFragment = /* glsl */ `
  precision highp float;

  uniform float uEnergy;
  uniform vec3  uInk;
  uniform vec3  uHot;

  varying vec2  vUv;
  varying float vTone;
  varying float vFade;
  varying float vSeed;

  void main() {
    vec2 d = vUv - 0.5;
    float r = length(d);
    float a = atan(d.y, d.x);

    // Three lobes plus a finer ripple: the silhouette of a dropped blot.
    float edge = 0.46
      + 0.060 * sin(a * 3.0 + vSeed * 19.0)
      + 0.030 * sin(a * 5.0 - vSeed * 11.0)
      + 0.014 * sin(a * 9.0 + vSeed * 31.0);

    float mask = smoothstep(edge, edge - 0.20, r);
    if (mask < 0.004) discard;

    // A hot core that only appears as reiatsu rises; at rest the motes are
    // bone white and the scene stays monochrome.
    float core = pow(max(0.0, 1.0 - r * 2.1), 3.0);
    vec3 colour = mix(uInk, uHot, clamp(vTone * 0.8 + uEnergy * core * 0.9, 0.0, 1.0));

    float alpha = mask * vFade * (0.18 + 0.5 * vTone) * (0.55 + uEnergy * 0.75);

    // Additive blending, so the colour is premultiplied by its own coverage.
    gl_FragColor = vec4(colour * alpha, alpha);
  }
`;

import {
  AdditiveBlending,
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { createChromeEnvironment } from './environment';
import { createAberrationShader } from './shaders/chromaticAberration';
import { inkParticlesFragment, inkParticlesVertex } from './shaders/inkParticles';
import { reiatsuWispFragment, reiatsuWispVertex } from './shaders/reiatsuWisp';
import { mulberry32 } from '../lib/random';
import type { ChromeEnvironment } from './environment';
import type { QualityProfile } from './quality';
import type { Feedback } from '../types/quiz';

/** Vertical distance the particle field wraps through. */
const FIELD_SPAN = 70;

const BLOOM_BASE = 0.52;
const ABERRATION_BASE = 0.0016;

interface WispEntry {
  readonly mesh: Mesh<TubeGeometry, ShaderMaterial>;
  readonly uEnergy: { value: number };
  readonly uTime: { value: number };
  readonly drift: number;
}

/**
 * The persistent background: ink particles, reiatsu ribbons and one chrome
 * torus, composited through bloom and a lens pass.
 *
 * Written as a class rather than a set of hooks so that every GPU resource it
 * allocates has exactly one owner and one disposal path. React's only job is
 * to construct it, feed it state, and destroy it.
 */
export class ReiatsuScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly environment: ChromeEnvironment;
  private readonly profile: QualityProfile;

  private readonly particles: Mesh<InstancedBufferGeometry, ShaderMaterial> | null = null;
  private readonly wisps: WispEntry[] = [];
  private readonly torus: Mesh<TorusGeometry, MeshStandardMaterial>;

  private readonly bloom: UnrealBloomPass | null = null;
  private readonly aberration: ShaderPass | null = null;
  private readonly passes: { dispose: () => void }[] = [];

  // Uniform handles kept directly, so per-frame updates never go through a
  // string lookup on the material.
  private readonly uTime = { value: 0 };
  private readonly uEnergy = { value: 0.3 };
  private readonly uPointer = { value: new Vector2() };

  private readonly torusBaseColour = new Color(0xdfe8f2);
  private readonly torusHotColour = new Color(0x00e5ff);
  private readonly torusWrongColour = new Color(0xff3b1f);

  /** Eased toward `energyTarget`; what the shaders actually read. */
  private energy = 0.3;
  private energyTarget = 0.3;
  /** One-shot additions that decay: a correct burst, a wrong-answer chill. */
  private burst = 0;
  private chill = 0;
  private progress = 0;
  private readonly pointerTarget = new Vector2();
  private lastTime: number | null = null;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, profile: QualityProfile) {
    this.profile = profile;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: profile.tier === 'high',
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setClearColor(0x050507, 1);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxPixelRatio));
    this.renderer.setSize(width, height, false);

    this.camera = new PerspectiveCamera(52, width / height, 0.1, 220);
    this.camera.position.set(0, 0, 26);

    this.environment = createChromeEnvironment(this.renderer);
    this.scene.environment = this.environment.texture;

    this.torus = this.buildTorus();
    this.scene.add(this.torus);

    if (profile.particles > 0) {
      this.particles = this.buildParticles(profile.particles);
      this.scene.add(this.particles);
    }

    this.buildWisps(profile.wisps, profile.wispSegments);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(width, height);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.passes.push(renderPass);

    if (profile.bloom) {
      this.bloom = new UnrealBloomPass(new Vector2(width, height), BLOOM_BASE, 0.75, 0.22);
      this.composer.addPass(this.bloom);
      this.passes.push(this.bloom);
    }

    if (profile.aberration) {
      this.aberration = new ShaderPass(createAberrationShader());
      this.composer.addPass(this.aberration);
      this.passes.push(this.aberration);
      this.setAberrationResolution(width, height);
    }

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
    this.passes.push(outputPass);
  }

  /* ---- Construction --------------------------------------------------- */

  private buildTorus(): Mesh<TorusGeometry, MeshStandardMaterial> {
    const geometry = new TorusGeometry(9.2, 1.05, 32, 220);
    const material = new MeshStandardMaterial({
      color: this.torusBaseColour.clone(),
      metalness: 1,
      roughness: 0.14,
      envMapIntensity: 1.5,
      emissive: new Color(0x000000),
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(1.5, -1, -13);
    mesh.rotation.set(-0.42, 0.3, 0.12);
    return mesh;
  }

  /**
   * One quad, 2000 instances. The quad is written out by hand rather than
   * taken from a PlaneGeometry, because sharing attribute objects between two
   * geometries means a single dispose() would free buffers the other still
   * needs.
   */
  private buildParticles(count: number): Mesh<InstancedBufferGeometry, ShaderMaterial> {
    const geometry = new InstancedBufferGeometry();

    geometry.setAttribute(
      'position',
      new BufferAttribute(
        // prettier-ignore
        new Float32Array([
          -0.5, -0.5, 0,
           0.5, -0.5, 0,
           0.5,  0.5, 0,
          -0.5,  0.5, 0,
        ]),
        3,
      ),
    );
    geometry.setAttribute(
      'uv',
      new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);

    const offsets = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);
    const spins = new Float32Array(count);
    const tones = new Float32Array(count);

    const random = mulberry32(0x5a4f);

    for (let i = 0; i < count; i += 1) {
      offsets[i * 3] = (random() - 0.5) * 72;
      offsets[i * 3 + 1] = (random() - 0.5) * FIELD_SPAN;
      offsets[i * 3 + 2] = -28 + random() * 38;

      seeds[i] = random();
      spins[i] = random() * Math.PI * 2;

      // Mostly fine motes with a few large blots: a flat size distribution
      // reads as noise, a biased one reads as ink dispersing in water.
      const size = random();
      scales[i] = 0.06 + size * size * size * 1.55;

      // Tone leans cool only on the smallest motes, keeping big blots white.
      tones[i] = Math.pow(random(), 1.6) * (1 - size * 0.55);
    }

    geometry.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3));
    geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
    geometry.setAttribute('aScale', new InstancedBufferAttribute(scales, 1));
    geometry.setAttribute('aSpin', new InstancedBufferAttribute(spins, 1));
    geometry.setAttribute('aTone', new InstancedBufferAttribute(tones, 1));
    geometry.instanceCount = count;

    const material = new ShaderMaterial({
      vertexShader: inkParticlesVertex,
      fragmentShader: inkParticlesFragment,
      uniforms: {
        uTime: this.uTime,
        uEnergy: this.uEnergy,
        uPointer: this.uPointer,
        uSpan: { value: FIELD_SPAN },
        uInk: { value: new Color(0xf4f8ff) },
        uHot: { value: new Color(0x00e5ff) },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const mesh = new Mesh(geometry, material);
    // The field is bigger than any frustum test would help with, and the
    // vertex shader moves everything anyway, so culling is only a hazard here.
    mesh.frustumCulled = false;
    return mesh;
  }

  private buildWisps(count: number, segments: number): void {
    const random = mulberry32(0x9e3b);

    for (let i = 0; i < count; i += 1) {
      // Each ribbon enters and exits the frame, so it reads as pressure
      // venting through the shot rather than an object floating in it.
      const points: Vector3[] = [];
      const side = i % 2 === 0 ? -1 : 1;
      const knots = 5;

      for (let k = 0; k <= knots; k += 1) {
        const t = k / knots;
        points.push(
          new Vector3(
            side * (42 - t * 84) + (random() - 0.5) * 18,
            (random() - 0.5) * 30 + (i - count / 2) * 5.5,
            -20 + random() * 26,
          ),
        );
      }

      const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.6);
      const radius = 0.1 + random() * 0.12;
      const geometry = new TubeGeometry(curve, segments, radius, 6, false);

      const uTime = { value: 0 };
      const uEnergy = { value: this.energy };

      const material = new ShaderMaterial({
        vertexShader: reiatsuWispVertex,
        fragmentShader: reiatsuWispFragment,
        uniforms: {
          uTime,
          uEnergy,
          uRadius: { value: radius },
          uPhase: { value: random() * Math.PI * 2 },
          uAmplitude: { value: 1.1 + random() * 1.4 },
          uColourCool: { value: new Color(0xe0ffff) },
          uColourHot: { value: new Color(i % 3 === 0 ? 0xff3b1f : 0x00e5ff) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });

      const mesh = new Mesh(geometry, material);
      mesh.frustumCulled = false;
      this.scene.add(mesh);

      this.wisps.push({ mesh, uEnergy, uTime, drift: 0.04 + random() * 0.07 });
    }
  }

  /* ---- Inputs ---------------------------------------------------------- */

  /** Ambient energy the scene eases toward, 0–1. */
  setEnergy(target: number): void {
    this.energyTarget = Math.min(Math.max(target, 0), 1);
  }

  /** 0–1 through the round. Opens the torus up as the player advances. */
  setProgress(value: number): void {
    this.progress = Math.min(Math.max(value, 0), 1);
  }

  /** Fires a one-shot reaction to an answer. */
  pulse(kind: Feedback): void {
    if (kind === 'correct') {
      this.burst = 1;
      this.chill = 0;
    } else {
      this.chill = 1;
      this.burst = 0;
    }
  }

  /** Pointer position in normalised device coordinates, -1 to 1. */
  setPointer(x: number, y: number): void {
    this.pointerTarget.set(x, y);
  }

  resize(width: number, height: number): void {
    if (this.disposed || width === 0 || height === 0) return;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.profile.maxPixelRatio));
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloom?.setSize(width, height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.setAberrationResolution(width, height);
  }

  private setAberrationResolution(width: number, height: number): void {
    const pass = this.aberration;
    if (pass === null) return;
    const ratio = this.renderer.getPixelRatio();
    const uniform = pass.uniforms['uResolution'];
    if (uniform !== undefined) {
      (uniform.value as Vector2).set(width * ratio, height * ratio);
    }
  }

  /* ---- Frame ----------------------------------------------------------- */

  render(now: number): void {
    if (this.disposed) return;

    // Clamp dt so a backgrounded tab does not resume with a huge jump.
    const dt = this.lastTime === null ? 0.016 : Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const time = now / 1000;
    this.uTime.value = time;

    // Exponential approach, frame-rate independent.
    this.energy += (this.energyTarget - this.energy) * Math.min(1, dt * 2.6);
    this.burst *= Math.exp(-dt * 1.9);
    this.chill *= Math.exp(-dt * 1.4);

    const effective = Math.min(1.8, Math.max(0, this.energy + this.burst * 0.95 - this.chill * 0.45));
    this.uEnergy.value = effective;

    const pointer = this.uPointer.value;
    pointer.x += (this.pointerTarget.x - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (this.pointerTarget.y - pointer.y) * Math.min(1, dt * 3);

    for (const wisp of this.wisps) {
      wisp.uTime.value = time;
      wisp.uEnergy.value = effective;
      wisp.mesh.rotation.z = Math.sin(time * wisp.drift) * 0.22;
    }

    // The torus is the one element tied to quiz progress: it tilts upright and
    // spins faster as the round advances, so the background quietly tracks how
    // far through the ten questions the player is.
    const torus = this.torus;
    torus.rotation.y += dt * (0.08 + effective * 0.26 + this.progress * 0.12);
    torus.rotation.x = -0.42 + this.progress * 0.5 + Math.sin(time * 0.21) * 0.05;
    const swell = 1 + this.progress * 0.14 + this.burst * 0.07;
    torus.scale.setScalar(swell);

    const material = torus.material;
    material.envMapIntensity = 1.5 + effective * 1.1;
    material.roughness = 0.14 + this.chill * 0.3;
    material.emissive
      .copy(this.chill > this.burst ? this.torusWrongColour : this.torusHotColour)
      .multiplyScalar(Math.max(this.burst, this.chill) * 0.5);
    material.color
      .copy(this.torusBaseColour)
      .lerp(this.torusWrongColour, this.chill * 0.35);

    if (this.bloom !== null) {
      this.bloom.strength = BLOOM_BASE + effective * 0.62 + this.burst * 0.5;
      this.bloom.radius = 0.75 + this.burst * 0.25;
      // A wrong answer raises the threshold, so the scene visibly loses light
      // rather than simply changing colour.
      this.bloom.threshold = 0.22 + this.chill * 0.4;
    }

    const aberration = this.aberration;
    if (aberration !== null) {
      const amount = aberration.uniforms['uAmount'];
      const clock = aberration.uniforms['uTime'];
      const vignette = aberration.uniforms['uVignette'];
      if (amount !== undefined) {
        amount.value =
          ABERRATION_BASE + effective * 0.0014 + this.burst * 0.006 + this.chill * 0.012;
      }
      if (clock !== undefined) clock.value = time;
      if (vignette !== undefined) vignette.value = 0.3 + this.chill * 0.22 - this.burst * 0.1;
    }

    // Slow counter-drift on the camera keeps the still screens from feeling
    // like a static image without pulling focus from the type.
    this.camera.position.x = Math.sin(time * 0.07) * 1.4 + pointer.x * 0.9;
    this.camera.position.y = Math.cos(time * 0.05) * 0.9 + pointer.y * 0.6;
    this.camera.lookAt(0, 0, -6);

    this.composer.render(dt);
  }

  /* ---- Teardown -------------------------------------------------------- */

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.particles !== null) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }

    for (const wisp of this.wisps) {
      this.scene.remove(wisp.mesh);
      wisp.mesh.geometry.dispose();
      wisp.mesh.material.dispose();
    }
    this.wisps.length = 0;

    this.scene.remove(this.torus);
    this.torus.geometry.dispose();
    this.torus.material.dispose();

    for (const pass of this.passes) pass.dispose();
    this.passes.length = 0;

    this.composer.dispose();
    this.scene.environment = null;
    this.environment.dispose();
    this.scene.clear();

    this.renderer.dispose();
    // Hand the GPU context back immediately. Browsers cap live WebGL contexts,
    // and in development the hook remounts on every edit.
    this.renderer.forceContextLoss();
  }
}

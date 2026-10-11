import { useEffect, useRef, useState } from 'react';
import { ReiatsuScene } from '../webgl/ReiatsuScene';
import { detectQuality } from '../webgl/quality';
import { selectProgress, useQuizStore } from '../store/useQuizStore';
import type { RefObject } from 'react';
import type { QualityProfile } from '../webgl/quality';

export interface UseThreeResult {
  readonly canvasRef: RefObject<HTMLCanvasElement>;
  readonly profile: QualityProfile;
}

/**
 * Owns the entire Three.js layer: construction, the frame loop, the bridge
 * from quiz state into scene uniforms, and teardown.
 *
 * Quiz state reaches the scene through store subscriptions rather than props,
 * so a correct answer never re-renders this component — the only thing that
 * changes is a uniform. React mounts the canvas once per session and then stays
 * out of the render loop entirely.
 */
export function useThree(): UseThreeResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Capability detection touches the DOM, so it runs once in a lazy initialiser
  // rather than on every render.
  const [profile] = useState<QualityProfile>(detectQuality);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || profile.tier === 'off') return;

    let scene: ReiatsuScene;
    try {
      scene = new ReiatsuScene(canvas, profile);
    } catch (error) {
      // A context failure should cost the background, not the quiz.
      console.warn('Reiatsu background unavailable:', error);
      return;
    }

    let frame = 0;
    let running = true;

    const loop = (now: number): void => {
      if (!running) return;
      scene.render(now);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);

    /* ---- Sizing -------------------------------------------------------- */

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      const { width, height } = entry.contentRect;
      scene.resize(Math.round(width), Math.round(height));
    });
    observer.observe(canvas);

    /* ---- Inputs -------------------------------------------------------- */

    const onPointerMove = (event: PointerEvent): void => {
      scene.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // A hidden tab still gets rAF callbacks in some browsers at a throttled
    // rate; stopping outright is cheaper and avoids a dt spike on return.
    const onVisibility = (): void => {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = window.requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    /* ---- Quiz state ---------------------------------------------------- */

    const unsubscribeEnergy = useQuizStore.subscribe(
      (state) => state.reiatsu,
      (reiatsu) => scene.setEnergy(reiatsu),
      { fireImmediately: true },
    );

    const unsubscribeProgress = useQuizStore.subscribe(selectProgress, (progress) =>
      scene.setProgress(progress),
    );

    const unsubscribePulse = useQuizStore.subscribe(
      (state) => state.pulseId,
      () => {
        const kind = useQuizStore.getState().pulseKind;
        if (kind !== null) scene.pulse(kind);
      },
    );

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribeEnergy();
      unsubscribeProgress();
      unsubscribePulse();
      scene.dispose();
    };
  }, [profile]);

  return { canvasRef, profile };
}

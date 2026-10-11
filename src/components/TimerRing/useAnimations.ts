import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';

/** Below this, the housing starts pulsing. */
export const DANGER_MS = 5_000;

interface TimerAnimationArgs {
  readonly housingRef: RefObject<HTMLDivElement>;
  readonly arcRef: RefObject<SVGCircleElement>;
  readonly labelRef: RefObject<HTMLSpanElement>;
  readonly durationMs: number;
  /** Changing this restarts the countdown from full. */
  readonly runKey: string | number;
  readonly paused: boolean;
  readonly onExpire: () => void;
  readonly onTick: (msRemaining: number) => void;
}

/**
 * Drives the countdown from a single GSAP tween.
 *
 * The clock is the tween: one linear interpolation from 0 to 1 over fifteen
 * seconds, writing the arc and the digits straight to the DOM. React is not
 * involved per frame — a countdown held in state would re-render the question,
 * the four answer buttons and the progress rail sixty times a second to move
 * one number.
 *
 * The callbacks are read through refs so that a parent re-creating them does
 * not restart the clock mid-question.
 */
export function useTimerAnimations({
  housingRef,
  arcRef,
  labelRef,
  durationMs,
  runKey,
  paused,
  onExpire,
  onTick,
}: TimerAnimationArgs): void {
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onExpireRef.current = onExpire;
    onTickRef.current = onTick;
  }, [onExpire, onTick]);

  useEffect(() => {
    const arc = arcRef.current;
    const label = labelRef.current;
    const housing = housingRef.current;
    if (arc === null || label === null || housing === null) return;

    // quickSetter caches the property lookup, which matters when it is the
    // only thing running every frame.
    const setOffset = gsap.quickSetter(arc, 'strokeDashoffset') as (value: number) => void;
    const progress = { t: 0 };
    let shownSecond = -1;
    let danger = false;

    setOffset(0);
    label.textContent = String(Math.ceil(durationMs / 1000));
    housing.classList.remove('timer-danger');

    const tween = gsap.to(progress, {
      t: 1,
      duration: durationMs / 1000,
      ease: 'none',
      onUpdate: () => {
        const remaining = durationMs * (1 - progress.t);
        setOffset(progress.t);
        onTickRef.current(remaining);

        // The digits only change on a whole second, so the text node is
        // touched fifteen times rather than nine hundred.
        const second = Math.ceil(remaining / 1000);
        if (second !== shownSecond) {
          shownSecond = second;
          label.textContent = String(second);
        }

        if (!danger && remaining <= DANGER_MS) {
          danger = true;
          housing.classList.add('timer-danger');
        }
      },
      onComplete: () => {
        setOffset(1);
        label.textContent = '0';
        onExpireRef.current();
      },
    });

    tweenRef.current = tween;

    return () => {
      tween.kill();
      tweenRef.current = null;
      housing.classList.remove('timer-danger');
    };
  }, [arcRef, labelRef, housingRef, durationMs, runKey]);

  // Pausing is a separate effect so that locking the question after an answer
  // freezes the clock instead of restarting it.
  useEffect(() => {
    const tween = tweenRef.current;
    if (tween === null) return;
    if (paused) tween.pause();
    else tween.play();
  }, [paused, runKey]);
}

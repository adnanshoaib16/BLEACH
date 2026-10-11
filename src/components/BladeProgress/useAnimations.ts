import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';

interface BladeAnimationArgs {
  readonly bladeRef: RefObject<HTMLDivElement>;
  readonly value: number;
  readonly reduced: boolean;
}

/**
 * Fills the blade.
 *
 * The tween writes the `--blade-fill` custom property rather than a transform,
 * so the fill, its glow and its highlight all follow from one animated value
 * and stay in step. `back.out` lets the energy overshoot slightly and settle —
 * the blade takes the charge rather than being topped up.
 */
export function useBladeAnimations({ bladeRef, value, reduced }: BladeAnimationArgs): void {
  useEffect(() => {
    const blade = bladeRef.current;
    if (blade === null) return;

    const context = gsap.context(() => {
      gsap.to(blade, {
        '--blade-fill': value,
        duration: reduced ? 0.12 : 0.85,
        ease: reduced ? 'none' : 'back.out(1.6)',
      });
    }, blade);

    return () => context.revert();
  }, [bladeRef, value, reduced]);
}

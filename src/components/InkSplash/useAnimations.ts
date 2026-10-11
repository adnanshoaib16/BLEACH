import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';

interface InkSplashAnimationArgs {
  readonly groupRef: RefObject<SVGGElement>;
  readonly turbulenceRef: RefObject<SVGFETurbulenceElement>;
  readonly displacementRef: RefObject<SVGFEDisplacementMapElement>;
  readonly playKey: string | number;
  readonly hot: boolean;
  readonly reduced: boolean;
}

/**
 * Blooms the splash.
 *
 * The movement people read as "ink" is in the filter, not the shapes: the
 * displacement scale ramps hard and then settles, so the blob's edge tears
 * into fronds and feathers out, while the turbulence frequency drops to make
 * those fronds coarsen as they spread. The geometry underneath only scales.
 */
export function useInkSplashAnimations({
  groupRef,
  turbulenceRef,
  displacementRef,
  playKey,
  hot,
  reduced,
}: InkSplashAnimationArgs): void {
  useEffect(() => {
    const group = groupRef.current;
    const turbulence = turbulenceRef.current;
    const displacement = displacementRef.current;
    if (group === null || turbulence === null || displacement === null) return;

    const context = gsap.context(() => {
      if (reduced) {
        gsap.set(group, { scale: 1, opacity: 0.5, transformOrigin: '50% 50%' });
        gsap.set(displacement, { attr: { scale: 14 } });
        return;
      }

      const timeline = gsap.timeline();

      timeline
        .fromTo(
          group,
          { scale: 0.12, opacity: 1, transformOrigin: '50% 50%' },
          { scale: 1.08, duration: 0.5, ease: 'power4.out' },
        )
        // A wrong answer tears further and never fully settles, which is what
        // separates it from the clean bloom of a correct one.
        .fromTo(
          displacement,
          { attr: { scale: 0 } },
          { attr: { scale: hot ? 64 : 44 }, duration: 0.34, ease: 'power2.out' },
          0,
        )
        .to(displacement, { attr: { scale: hot ? 26 : 10 }, duration: 0.66 }, 0.34)
        .fromTo(
          turbulence,
          { attr: { baseFrequency: 0.026 } },
          { attr: { baseFrequency: 0.0075 }, duration: 0.9, ease: 'power2.out' },
          0,
        )
        .to(group, { scale: 1.3, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.56);
    }, group);

    return () => context.revert();
  }, [groupRef, turbulenceRef, displacementRef, playKey, hot, reduced]);
}

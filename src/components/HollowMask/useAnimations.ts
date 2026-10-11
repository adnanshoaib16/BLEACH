import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';

interface HollowMaskAnimationArgs {
  readonly rootRef: RefObject<SVGSVGElement>;
  readonly playKey: string | number;
  readonly reduced: boolean;
}

/**
 * Snaps the mask into frame and lets it drift back.
 *
 * Deliberately no fade: the opacity is handled by a stepped CSS keyframe so
 * the mask cuts in and out on hard frames, the way a held cel flickers. GSAP
 * only owns the transform, so the two never fight over a property.
 */
export function useHollowMaskAnimations({
  rootRef,
  playKey,
  reduced,
}: HollowMaskAnimationArgs): void {
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;

    const context = gsap.context(() => {
      if (reduced) {
        gsap.set(root, { scale: 1, rotate: 0, transformOrigin: '50% 50%' });
        return;
      }

      gsap
        .timeline()
        .fromTo(
          root,
          { scale: 1.5, rotate: -7, transformOrigin: '50% 45%' },
          { scale: 1, rotate: -2, duration: 0.3, ease: 'power4.out' },
        )
        .to(root, { scale: 1.12, rotate: 1.5, duration: 0.9, ease: 'power1.inOut' });
    }, root);

    return () => context.revert();
  }, [rootRef, playKey, reduced]);
}

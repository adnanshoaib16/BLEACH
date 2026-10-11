import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';

interface SpeedLineAnimationArgs {
  readonly groupRef: RefObject<SVGGElement>;
  readonly originX: number;
  readonly originY: number;
  readonly playKey: string | number;
  readonly duration: number;
  readonly reduced: boolean;
}

/**
 * Bursts the fan outward from its origin and fades it.
 *
 * The group scales as one object while the individual lines fade in on a
 * random stagger. One transform does the movement — cheap, and it keeps every
 * line's travel perfectly radial, which is what sells the effect as drawn
 * rather than generated.
 */
export function useSpeedLineAnimations({
  groupRef,
  originX,
  originY,
  playKey,
  duration,
  reduced,
}: SpeedLineAnimationArgs): void {
  useEffect(() => {
    const group = groupRef.current;
    if (group === null) return;

    const context = gsap.context(() => {
      const lines = gsap.utils.toArray<SVGLineElement>('line', group);
      const svgOrigin = `${String(originX)} ${String(originY)}`;

      if (reduced) {
        gsap.set(group, { opacity: 0.3, scale: 1, svgOrigin });
        return;
      }

      gsap
        .timeline()
        .fromTo(
          group,
          { scale: 0.18, opacity: 1, svgOrigin },
          { scale: 1.26, duration: duration * 0.62, ease: 'power4.out', svgOrigin },
        )
        .fromTo(
          lines,
          { opacity: 0 },
          {
            opacity: 1,
            duration: duration * 0.16,
            stagger: { each: duration * 0.012, from: 'random' },
          },
          0,
        )
        .to(
          lines,
          {
            opacity: 0,
            duration: duration * 0.4,
            stagger: { each: duration * 0.01, from: 'center' },
          },
          duration * 0.4,
        );
    }, group);

    // revert() kills every tween the context created and restores the inline
    // styles it wrote, so a remount starts from clean markup.
    return () => context.revert();
  }, [groupRef, originX, originY, playKey, duration, reduced]);
}

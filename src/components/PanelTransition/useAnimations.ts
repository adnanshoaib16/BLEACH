import { useCallback, useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { sliceAngle } from '../../lib/motion';
import type { RefObject } from 'react';

interface PanelWipeArgs {
  readonly rootRef: RefObject<HTMLDivElement>;
  readonly contentRef: RefObject<HTMLDivElement>;
  readonly reduced: boolean;
  /** Called when the screen is covered, to replay the burst graphics. */
  readonly onBurst: () => void;
}

export interface PanelWipeControls {
  /**
   * Runs the wipe. `onCover` fires at the frame the screen is fully black,
   * which is where the caller should swap what is underneath.
   */
  readonly wipe: (onCover: () => void) => void;
}

/** Slabs enter from alternating edges. */
const entryPercent = (index: number): number => (index % 2 === 0 ? -115 : 115);
/** And leave through the far edge, so each one travels in one direction. */
const exitPercent = (index: number): number => (index % 2 === 0 ? 115 : -115);

/**
 * The page-turn.
 *
 * Four slabs, sheared to the shared diagonal, sweep in from alternating edges
 * on a tight stagger until the frame is black; the screen behind is swapped
 * during that blackout; then each slab continues out through the opposite edge
 * rather than retreating the way it came. Travelling through is what makes it
 * read as a blade passing across the page instead of a shutter closing.
 */
export function usePanelWipe({
  rootRef,
  contentRef,
  reduced,
  onBurst,
}: PanelWipeArgs): PanelWipeControls {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Park the slabs off-frame and shear them before the first run, so the very
  // first wipe looks identical to every later one.
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;

    const context = gsap.context(() => {
      gsap.set(root, { autoAlpha: 0 });
      gsap.set(contentRef.current, { autoAlpha: 0 });
      gsap.set('.wipe-slab', {
        skewY: -sliceAngle(),
        xPercent: (index: number) => entryPercent(index),
      });
    }, root);

    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      context.revert();
    };
  }, [rootRef, contentRef]);

  const wipe = useCallback(
    (onCover: () => void) => {
      const root = rootRef.current;
      const content = contentRef.current;

      if (root === null) {
        onCover();
        return;
      }

      // A wipe already running is abandoned rather than queued: the player has
      // moved on, and two overlapping page-turns look like a glitch.
      timelineRef.current?.kill();

      if (reduced) {
        timelineRef.current = gsap
          .timeline()
          .set(root, { autoAlpha: 1 })
          .to(root, { backgroundColor: '#040406', duration: 0.12 })
          .add(onCover)
          .to(root, { autoAlpha: 0, duration: 0.14 });
        return;
      }

      const slabs = gsap.utils.toArray<HTMLDivElement>('.wipe-slab', root);

      timelineRef.current = gsap
        .timeline()
        .set(root, { autoAlpha: 1, pointerEvents: 'auto' })
        .set(slabs, { xPercent: (index: number) => entryPercent(index) })
        .to(slabs, {
          xPercent: 0,
          duration: 0.4,
          ease: 'power4.in',
          stagger: { each: 0.045, from: 'start' },
        })
        // Fully covered. Swap the screen and fire the burst graphics.
        .add(() => {
          onCover();
          onBurst();
        })
        .set(content, { autoAlpha: 1 })
        .to({}, { duration: 0.3 })
        .to(
          slabs,
          {
            xPercent: (index: number) => exitPercent(index),
            duration: 0.52,
            ease: 'power3.out',
            stagger: { each: 0.05, from: 'end' },
          },
          '>-0.05',
        )
        .set(content, { autoAlpha: 0 })
        .set(root, { autoAlpha: 0, pointerEvents: 'none' });
    },
    [rootRef, contentRef, reduced, onBurst],
  );

  return { wipe };
}

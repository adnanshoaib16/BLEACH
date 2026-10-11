import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';

interface QuizAnimationArgs {
  readonly headerRef: RefObject<HTMLElement>;
  readonly footerRef: RefObject<HTMLElement>;
  readonly glyphRef: RefObject<HTMLDivElement>;
  readonly reduced: boolean;
}

/**
 * Settles the HUD into place when the quiz opens.
 *
 * Runs once per round, not once per question: the rails are the frame around
 * the quiz, and re-animating them ten times would make the furniture compete
 * with the content. Everything else on this screen is triggered by something
 * the player did.
 */
export function useQuizAnimations({
  headerRef,
  footerRef,
  glyphRef,
  reduced,
}: QuizAnimationArgs): void {
  useEffect(() => {
    const header = headerRef.current;
    if (header === null) return;

    const context = gsap.context(() => {
      const targets = [header, footerRef.current, glyphRef.current];

      if (reduced) {
        gsap.set(targets, { opacity: 1, y: 0, clearProps: 'transform' });
        return;
      }

      gsap
        .timeline({ delay: 0.1 })
        .fromTo(header, { opacity: 0, y: -22 }, { opacity: 1, y: 0, duration: 0.6 })
        .fromTo(footerRef.current, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.6 }, 0.08)
        .fromTo(
          glyphRef.current,
          { opacity: 0, x: 40 },
          { opacity: 1, x: 0, duration: 1.1, ease: 'power2.out' },
          0.2,
        );
    });

    return () => context.revert();
  }, [headerRef, footerRef, glyphRef, reduced]);
}

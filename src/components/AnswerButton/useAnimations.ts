import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';

export type AnswerState = 'open' | 'chosen-correct' | 'chosen-wrong' | 'reveal' | 'dim';

interface AnswerAnimationArgs {
  readonly buttonRef: RefObject<HTMLButtonElement>;
  readonly state: AnswerState;
  readonly reduced: boolean;
}

/**
 * The flourish on a resolved answer.
 *
 * Colour and layout are CSS — they are states, not animations, and the browser
 * transitions them perfectly well. GSAP is here only for the one-shot impact
 * that CSS cannot express: a correct answer gets a sharp overshoot, a wrong one
 * recoils sideways and settles crooked.
 */
export function useAnswerAnimations({
  buttonRef,
  state,
  reduced,
}: AnswerAnimationArgs): void {
  useEffect(() => {
    const button = buttonRef.current;
    if (button === null || reduced) return;
    if (state !== 'chosen-correct' && state !== 'chosen-wrong') return;

    const context = gsap.context(() => {
      if (state === 'chosen-correct') {
        gsap
          .timeline()
          .fromTo(
            button,
            { scale: 1 },
            { scale: 1.035, duration: 0.14, ease: 'power3.out', transformOrigin: 'left center' },
          )
          .to(button, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' });
      } else {
        gsap
          .timeline()
          .fromTo(button, { x: 0, skewX: 0 }, { x: -14, skewX: 4, duration: 0.08, ease: 'none' })
          .to(button, { x: 6, skewX: -2, duration: 0.07, ease: 'none' })
          .to(button, { x: 0, skewX: 0, duration: 0.45, ease: 'power2.out' });
      }
    }, button);

    return () => context.revert();
  }, [buttonRef, state, reduced]);
}

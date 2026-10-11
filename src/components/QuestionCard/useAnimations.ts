import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import { splitText } from '../../lib/splitText';
import type { RefObject } from 'react';

interface QuestionAnimationArgs {
  readonly promptRef: RefObject<HTMLHeadingElement>;
  readonly ruleRef: RefObject<HTMLDivElement>;
  /** Changing this replays the reveal. */
  readonly runKey: string | number;
  readonly reduced: boolean;
}

/**
 * Reveals the prompt word by word, with the rule beneath it cutting across.
 *
 * Words, not characters: the player has fifteen seconds, and a per-character
 * stagger on a seventy-character question spends two of them before the
 * sentence is even legible. The rule is what carries the drama instead — it
 * wipes in from the left on the shared diagonal as the last word lands.
 */
export function useQuestionAnimations({
  promptRef,
  ruleRef,
  runKey,
  reduced,
}: QuestionAnimationArgs): void {
  useEffect(() => {
    const prompt = promptRef.current;
    if (prompt === null) return;

    const split = splitText(prompt, 'words');
    const context = gsap.context(() => {
      if (reduced) {
        gsap.set(split.parts, { opacity: 1, y: 0 });
        gsap.set(ruleRef.current, { scaleX: 1, transformOrigin: 'left center' });
        return;
      }

      gsap
        .timeline()
        .fromTo(
          split.parts,
          { opacity: 0, yPercent: 60, rotate: 2.5 },
          {
            opacity: 1,
            yPercent: 0,
            rotate: 0,
            duration: 0.5,
            ease: 'power3.out',
            stagger: { each: 0.035, from: 'start' },
          },
        )
        .fromTo(
          ruleRef.current,
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.55, ease: 'power4.out' },
          0.12,
        );
    }, prompt);

    return () => {
      context.revert();
      // Unwrap after the tweens are gone, so the element is left holding a
      // plain text node rather than a pile of spans.
      split.restore();
    };
  }, [promptRef, ruleRef, runKey, reduced]);
}

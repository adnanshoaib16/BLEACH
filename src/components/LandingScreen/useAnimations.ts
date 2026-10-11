import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import { splitText } from '../../lib/splitText';
import type { RefObject } from 'react';

interface LandingAnimationArgs {
  readonly rootRef: RefObject<HTMLElement>;
  readonly titleRef: RefObject<SVGSVGElement>;
  readonly leadRef: RefObject<HTMLParagraphElement>;
  readonly reduced: boolean;
}

/**
 * The opening sequence — the one piece of motion in the app that nobody asked
 * for, so it gets to be the only one.
 *
 * Order matters more than duration here. The seal appears first, then the
 * title lands letter by letter, then the rule cuts underneath it, then the
 * sentence that explains the thing, then the button you press. That is the
 * reading order, so the animation teaches it.
 */
export function useLandingAnimations({
  rootRef,
  titleRef,
  leadRef,
  reduced,
}: LandingAnimationArgs): void {
  useEffect(() => {
    const root = rootRef.current;
    const lead = leadRef.current;
    if (root === null) return;

    // The lead sentence is split per word; the title is split per character in
    // the markup, since each glyph is its own <text> inside the mask.
    const split = lead === null ? null : splitText(lead, 'words');

    const context = gsap.context(() => {
      const glyphs = titleRef.current?.querySelectorAll('.title-glyph') ?? [];

      if (reduced) {
        gsap.set(['.landing-seal', '.landing-rule', '.landing-cta', '.landing-readout'], {
          opacity: 1,
          x: 0,
          y: 0,
          scaleX: 1,
        });
        gsap.set(glyphs, { opacity: 1, yPercent: 0 });
        gsap.set('.title-echo', { opacity: 0.55 });
        if (split !== null) gsap.set(split.parts, { opacity: 1, y: 0 });
        return;
      }

      const timeline = gsap.timeline({ delay: 0.15 });

      timeline
        .fromTo(
          '.landing-seal',
          { opacity: 0, y: -14 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 },
        )
        // Letters drop in from under their own baseline. Because they live in
        // the mask, what actually moves is the window the chrome shows
        // through — the metal itself never moves.
        .fromTo(
          glyphs,
          { opacity: 0, yPercent: 115 },
          {
            opacity: 1,
            yPercent: 0,
            duration: 0.72,
            ease: 'power4.out',
            stagger: { each: 0.055, from: 'start' },
          },
          0.18,
        )
        // The offset ink copies arrive late and slightly apart, which is where
        // the printed-misregistration look comes from.
        .fromTo(
          '.title-echo',
          { opacity: 0, x: (index: number) => (index === 0 ? -26 : 26) },
          { opacity: 0.6, x: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 },
          0.42,
        )
        .fromTo(
          '.landing-rule',
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.7, ease: 'power4.out' },
          0.68,
        );

      if (split !== null) {
        timeline.fromTo(
          split.parts,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.04 },
          0.78,
        );
      }

      timeline
        .fromTo(
          '.landing-cta',
          { opacity: 0, y: 22, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' },
          1,
        )
        .fromTo('.landing-readout', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.1);
    }, root);

    return () => {
      context.revert();
      split?.restore();
    };
  }, [rootRef, titleRef, leadRef, reduced]);
}

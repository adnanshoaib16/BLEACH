import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import type { RefObject } from 'react';
import type { Feedback } from '../../types/quiz';

interface FeedbackAnimationArgs {
  readonly rootRef: RefObject<HTMLDivElement>;
  readonly flashRef: RefObject<HTMLDivElement>;
  readonly stampRef: RefObject<HTMLDivElement>;
  readonly shardsRef: RefObject<HTMLDivElement>;
  readonly kind: Feedback;
  readonly playKey: number;
  readonly reduced: boolean;
}

/** Decaying impact offsets, in pixels, for the wrong-answer shake. */
const SHAKE_STEPS = [17, -14, 11, -8.5, 6, -4, 2, -1, 0];

const html = (): HTMLElement => document.documentElement;

/**
 * The answer reaction.
 *
 * Both outcomes are built from the same four moves — flash, stamp, shards,
 * palette — tuned in opposite directions. A correct answer is one clean
 * inversion and a cool outward burst. A wrong one stutters: the palette flips
 * twice, the frame shakes on a decaying curve, and the aberration channel
 * stays raised after everything else has settled, so the screen takes a moment
 * to recover rather than snapping back.
 */
export function useFeedbackAnimations({
  rootRef,
  flashRef,
  stampRef,
  shardsRef,
  kind,
  playKey,
  reduced,
}: FeedbackAnimationArgs): void {
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;

    const correct = kind === 'correct';
    const context = gsap.context(() => {
      const stamp = stampRef.current;
      const flash = flashRef.current;

      if (reduced) {
        // No flashing, no shake, no inversion: the stamp simply appears, which
        // is the only part carrying information.
        gsap.set(flash, { opacity: 0.12 });
        gsap.fromTo(
          stamp,
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 0.18, ease: 'none' },
        );
        return;
      }

      const shards = gsap.utils.toArray<HTMLSpanElement>('span', shardsRef.current);
      const timeline = gsap.timeline();

      /* ---- Impact ----------------------------------------------------- */

      timeline
        .fromTo(
          flash,
          { opacity: 0 },
          { opacity: correct ? 0.92 : 0.8, duration: 0.05, ease: 'none' },
        )
        .to(flash, { opacity: 0, duration: correct ? 0.45 : 0.3, ease: 'power2.out' });

      /* ---- Palette flip ------------------------------------------------ */

      // Deliberately after the flash has peaked and started to fall. Inverting
      // while the screen is at its brightest just turns a white flash black and
      // cancels both effects out; landing the flip into the falling edge reads
      // as two distinct hits.
      if (correct) {
        timeline.set(html(), { '--invert': 1 }, 0.3).set(html(), { '--invert': 0 }, 0.42);
      } else {
        timeline
          .set(html(), { '--invert': 1 }, 0.26)
          .set(html(), { '--invert': 0 }, 0.33)
          .set(html(), { '--invert': 1 }, 0.44)
          .set(html(), { '--invert': 0 }, 0.52);
      }

      /* ---- Stamp ------------------------------------------------------- */

      if (correct) {
        timeline.fromTo(
          stamp,
          { opacity: 0, scale: 1.9, filter: 'blur(14px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.42, ease: 'power4.out' },
          0.04,
        );
      } else {
        // Overshoots past its resting size and snaps back, so it lands like a
        // rubber stamp rather than arriving at its final size.
        timeline.fromTo(
          stamp,
          { opacity: 0, scale: 0.55, rotate: -9 },
          { opacity: 1, scale: 1.06, rotate: -3, duration: 0.14, ease: 'power2.out' },
          0.02,
        );
        timeline.to(stamp, { scale: 1, rotate: -2, duration: 0.3, ease: 'back.out(3)' });
      }

      timeline.to(
        stamp,
        { opacity: 0, scale: correct ? 1.14 : 1.02, duration: 0.3, ease: 'power2.in' },
        correct ? 0.95 : 1.1,
      );

      /* ---- Shards ------------------------------------------------------ */

      timeline.fromTo(
        shards,
        { opacity: 0, x: 0, scaleX: 0.2 },
        {
          opacity: 1,
          scaleX: 1,
          x: () => (correct ? gsap.utils.random(90, 340) : gsap.utils.random(50, 170)),
          duration: correct ? 0.72 : 0.5,
          ease: 'power3.out',
          stagger: { each: 0.008, from: 'random' },
        },
        0.03,
      );
      timeline.to(shards, { opacity: 0, duration: 0.3, ease: 'power1.in' }, correct ? 0.5 : 0.36);

      /* ---- Frame ------------------------------------------------------- */

      if (!correct) {
        const shake = gsap.timeline();
        for (const offset of SHAKE_STEPS) {
          shake.to(html(), { '--shake': `${String(offset)}px`, duration: 0.042, ease: 'none' });
        }
        timeline.add(shake, 0);

        timeline
          .fromTo(
            html(),
            { '--aberration': '0px' },
            { '--aberration': '3.5px', duration: 0.08, ease: 'none' },
            0,
          )
          .to(html(), { '--aberration': '0px', duration: 0.9, ease: 'power2.out' }, 0.4);
      } else {
        timeline
          .fromTo(html(), { '--glow': 0 }, { '--glow': 1, duration: 0.1, ease: 'none' }, 0)
          .to(html(), { '--glow': 0.25, duration: 1, ease: 'power2.out' }, 0.2);
      }
    }, root);

    return () => {
      context.revert();
      // The channels live on <html>, outside the context's scope, so they are
      // reset by hand to make sure a torn-down reaction cannot leave the frame
      // shaken, inverted or glowing.
      gsap.set(html(), { '--shake': '0px', '--invert': 0, '--aberration': '0px', '--glow': 0 });
    };
  }, [rootRef, flashRef, stampRef, shardsRef, kind, playKey, reduced]);
}

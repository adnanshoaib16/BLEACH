import { useEffect } from 'react';
import { gsap } from '../../lib/gsap';
import { splitText } from '../../lib/splitText';
import type { RefObject } from 'react';

interface ResultsAnimationArgs {
  readonly rootRef: RefObject<HTMLElement>;
  readonly kanjiRef: RefObject<HTMLSpanElement>;
  readonly titleRef: RefObject<HTMLParagraphElement>;
  readonly scoreRef: RefObject<HTMLSpanElement>;
  readonly score: number;
  readonly reduced: boolean;
}

/**
 * The rank reveal.
 *
 * Built as an arrival rather than a fade-in: the rank kanji drops out of a
 * blur at two and a half times its final size while its bloom peaks and then
 * falls away, which is the moment the screen is for. The title then lands
 * character by character — short enough that a per-character stagger is
 * dramatic instead of tiring — and the score counts up underneath it.
 */
export function useResultsAnimations({
  rootRef,
  kanjiRef,
  titleRef,
  scoreRef,
  score,
  reduced,
}: ResultsAnimationArgs): void {
  useEffect(() => {
    const root = rootRef.current;
    const title = titleRef.current;
    if (root === null) return;

    const split = title === null ? null : splitText(title, 'chars');

    const context = gsap.context(() => {
      const scoreNode = scoreRef.current;

      if (reduced) {
        gsap.set([kanjiRef.current, '.results-stat', '.results-mark', '.results-action'], {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: 'none',
        });
        if (split !== null) gsap.set(split.parts, { opacity: 1, y: 0 });
        if (scoreNode !== null) scoreNode.textContent = score.toLocaleString();
        return;
      }

      const timeline = gsap.timeline({ delay: 0.12 });

      timeline
        .fromTo(
          kanjiRef.current,
          { opacity: 0, scale: 2.5, filter: 'blur(26px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.95, ease: 'expo.out' },
        )
        // The bloom is a separate tween so it can peak before the glyph has
        // finished settling, the way a real flare leads the subject.
        .fromTo(
          kanjiRef.current,
          { '--glow': 0 },
          { '--glow': 1, duration: 0.3, ease: 'power2.out' },
          0.1,
        )
        .to(kanjiRef.current, { '--glow': 0.3, duration: 1.4, ease: 'power2.out' }, 0.42);

      if (split !== null) {
        timeline.fromTo(
          split.parts,
          { opacity: 0, yPercent: 70 },
          {
            opacity: 1,
            yPercent: 0,
            duration: 0.6,
            ease: 'power4.out',
            stagger: { each: 0.045, from: 'start' },
          },
          0.3,
        );
      }

      timeline
        .fromTo(
          '.results-epithet',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6 },
          0.62,
        )
        .fromTo(
          '.results-stat',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 },
          0.7,
        )
        .fromTo(
          '.results-mark',
          { opacity: 0, scaleY: 0.2 },
          {
            opacity: 1,
            scaleY: 1,
            duration: 0.4,
            ease: 'back.out(2.4)',
            stagger: { each: 0.035, from: 'start' },
          },
          0.85,
        )
        .fromTo(
          '.results-action',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.07 },
          1.05,
        );

      if (scoreNode !== null) {
        const counter = { value: 0 };
        timeline.to(
          counter,
          {
            value: score,
            duration: 1.25,
            ease: 'power2.out',
            onUpdate: () => {
              scoreNode.textContent = Math.round(counter.value).toLocaleString();
            },
          },
          0.72,
        );
      }
    }, root);

    return () => {
      context.revert();
      split?.restore();
    };
  }, [rootRef, kanjiRef, titleRef, scoreRef, score, reduced]);
}

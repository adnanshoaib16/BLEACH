import { useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useBladeAnimations } from './useAnimations';
import type { ReactElement } from 'react';

export interface BladeProgressProps {
  /** Fill level, 0–1. */
  readonly value: number;
  /** One entry per question: true correct, false wrong, null not yet reached. */
  readonly outcomes: readonly (boolean | null)[];
  /** Shown at the right of the rail — the arc the current question comes from. */
  readonly caption?: string;
}

/**
 * Progress drawn as a zanpakutō taking on energy, with a tally of answers
 * beneath it.
 *
 * Two devices, two jobs. The blade is the continuous one — how far through the
 * round you are, charging as you go. The row of slashes underneath is the
 * discrete one, and it carries information the bar cannot: which questions you
 * got right. Reading your own run back is most of why a quiz screen needs a
 * progress indicator at all.
 */
export function BladeProgress({ value, outcomes, caption }: BladeProgressProps): ReactElement {
  const bladeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useBladeAnimations({ bladeRef, value, reduced });

  const answered = outcomes.filter((outcome) => outcome !== null).length;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="hud-label numeric text-micro text-bone/55">
          {String(answered).padStart(2, '0')} of {String(outcomes.length).padStart(2, '0')}
        </span>
        {caption !== undefined && (
          <span className="hud-label truncate text-micro" style={{ color: 'var(--accent)' }}>
            {caption}
          </span>
        )}
      </div>

      <div
        ref={bladeRef}
        className="blade relative h-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={outcomes.length}
        aria-valuenow={answered}
        aria-label="Questions answered"
      >
        <div className="blade-energy" />
        <div className="blade-hamon" />
      </div>

      <div className="mt-2 flex gap-[3px]" aria-hidden>
        {outcomes.map((outcome, index) => (
          <span
            key={index}
            className="h-[6px] flex-1 transition-colors duration-300"
            style={{
              // Sheared to the shared diagonal, so the tally reads as a row of
              // sword cuts rather than a segmented bar.
              transform: 'skewX(calc(var(--slice) * -2))',
              background:
                outcome === null
                  ? 'rgb(255 255 255 / 0.12)'
                  : outcome
                    ? 'linear-gradient(90deg, #00e5ff, #e0ffff)'
                    : 'linear-gradient(90deg, #ff3b1f, #5a0d00)',
              boxShadow: outcome === true ? '0 0 10px -2px #00e5ff' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

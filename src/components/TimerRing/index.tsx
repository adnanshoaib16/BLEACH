import { useMemo, useRef } from 'react';
import { useTimerAnimations } from './useAnimations';
import type { ReactElement } from 'react';

export interface TimerRingProps {
  readonly durationMs: number;
  /** Changing this restarts the countdown from full. */
  readonly runKey: string | number;
  readonly paused: boolean;
  readonly onExpire: () => void;
  /** Fires every frame with the milliseconds left, for scoring. */
  readonly onTick: (msRemaining: number) => void;
  readonly className?: string;
}

const TICKS = 15;

/**
 * The countdown, as a chrome HUD instrument.
 *
 * One tick mark per second around the bezel, so the ring can be read at a
 * glance as "four left" without parsing the number in the middle. Under five
 * seconds the housing itself starts pulsing red, which puts the warning in
 * peripheral vision — where it is useful while you are reading the answers.
 */
export function TimerRing({
  durationMs,
  runKey,
  paused,
  onExpire,
  onTick,
  className = '',
}: TimerRingProps): ReactElement {
  const housingRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const ticks = useMemo(
    () => Array.from({ length: TICKS }, (_unused, index) => (index / TICKS) * 360),
    [],
  );

  useTimerAnimations({
    housingRef,
    arcRef,
    labelRef,
    durationMs,
    runKey,
    paused,
    onExpire,
    onTick,
  });

  return (
    <div
      ref={housingRef}
      className={`chrome relative grid aspect-square place-items-center rounded-full ${className}`}
      style={{ width: 'clamp(3.6rem, 7.5vw, 5.6rem)' }}
      role="timer"
      aria-label="Time left on this question"
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="rgb(255 255 255 / 0.1)"
          strokeWidth="3.4"
        />
        <circle
          ref={arcRef}
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.4"
          // pathLength normalises the circumference to 1, so the tween writes a
          // plain 0–1 progress value and no radius maths is needed.
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={0}
          style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }}
        />
      </svg>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
        <g stroke="rgb(255 255 255 / 0.3)" strokeWidth="1">
          {ticks.map((angle) => (
            <line
              key={angle}
              x1="50"
              y1="4.5"
              x2="50"
              y2="9"
              transform={`rotate(${String(angle)} 50 50)`}
            />
          ))}
        </g>
      </svg>

      <span
        ref={labelRef}
        className="display numeric relative z-10 font-black leading-none text-bone"
        style={{ fontSize: 'clamp(1.1rem, 2.4vw, 1.8rem)' }}
      />
    </div>
  );
}

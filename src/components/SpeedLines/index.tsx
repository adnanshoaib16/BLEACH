import { useMemo, useRef } from 'react';
import { mulberry32 } from '../../lib/random';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSpeedLineAnimations } from './useAnimations';
import type { ReactElement } from 'react';

export interface SpeedLinesProps {
  /** Number of lines in the fan. */
  readonly count?: number;
  /** Burst origin in viewBox units, 0–100 on each axis. */
  readonly originX?: number;
  readonly originY?: number;
  readonly tone?: 'bone' | 'hot' | 'mixed';
  /** Changing this replays the burst. */
  readonly playKey?: string | number;
  readonly duration?: number;
  readonly seed?: number;
  readonly className?: string;
}

interface Line {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly width: number;
  readonly hot: boolean;
}

const REACH = 86;

/**
 * Manga speed lines: a radial fan drawn in SVG, burst outward with GSAP.
 *
 * Angles are drawn from a deterministic PRNG and clumped rather than evenly
 * spaced, because an even fan reads as a sunburst graphic while an uneven one
 * reads as hand-inked. Each line starts some distance out from the origin,
 * leaving the clear centre that lets the subject sit inside the burst.
 *
 * Origin is passed as two numbers rather than a tuple so the geometry memo and
 * the GSAP effect are not invalidated by a fresh array on every render.
 */
export function SpeedLines({
  count = 64,
  originX = 50,
  originY = 50,
  tone = 'bone',
  playKey = 0,
  duration = 1,
  seed = 0x51ee,
  className = '',
}: SpeedLinesProps): ReactElement {
  const groupRef = useRef<SVGGElement>(null);
  const reduced = useReducedMotion();

  const lines = useMemo<readonly Line[]>(() => {
    const random = mulberry32(seed);
    const out: Line[] = [];

    for (let i = 0; i < count; i += 1) {
      // Even base angle, then a wide jitter: keeps full coverage without the
      // mechanical regularity of a pure sunburst.
      const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * (Math.PI / count) * 5.5;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      const inner = 0.1 + random() * 0.34;
      const outer = inner + 0.5 + random() * 0.95;

      out.push({
        x1: originX + dx * inner * REACH,
        y1: originY + dy * inner * REACH,
        x2: originX + dx * outer * REACH,
        y2: originY + dy * outer * REACH,
        // Squaring the roll biases toward hairlines with a few heavy strokes,
        // the weight distribution of a real inked fan.
        width: 0.35 + random() * random() * 2.6,
        hot: random() > 0.76,
      });
    }

    return out;
  }, [count, originX, originY, seed]);

  useSpeedLineAnimations({ groupRef, originX, originY, playKey, duration, reduced });

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g ref={groupRef}>
        {lines.map((line, index) => (
          <line
            // Geometry comes from a fixed seed, so index is a stable identity.
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            strokeWidth={line.width}
            className={
              tone === 'hot' || (tone === 'mixed' && line.hot)
                ? 'speed-line speed-line-hot'
                : 'speed-line'
            }
          />
        ))}
      </g>
    </svg>
  );
}

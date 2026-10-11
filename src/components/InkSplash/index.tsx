import { useId, useMemo, useRef } from 'react';
import { mulberry32 } from '../../lib/random';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useInkSplashAnimations } from './useAnimations';
import type { ReactElement } from 'react';

export interface InkSplashProps {
  readonly tone?: 'correct' | 'wrong';
  /** Changing this replays the splash. */
  readonly playKey?: string | number;
  readonly seed?: number;
  readonly className?: string;
}

interface Blob {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/**
 * Organic ink bloom, built from plain circles put through a turbulence
 * displacement filter.
 *
 * Drawing believable ink by hand means a lot of bezier work that still looks
 * authored. Displacing simple geometry with fractal noise gets there in three
 * filter primitives, and because the filter is animated the edge keeps
 * evolving while it spreads — which is the part that actually reads as liquid.
 */
export function InkSplash({
  tone = 'correct',
  playKey = 0,
  seed = 0x1ac5,
  className = '',
}: InkSplashProps): ReactElement {
  const groupRef = useRef<SVGGElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const reduced = useReducedMotion();

  // useId can contain colons, which are not valid in an XML id, so they are
  // stripped before the value reaches a url() reference.
  const rawId = useId();
  const uid = useMemo(() => rawId.replace(/:/g, ''), [rawId]);
  const filterId = `ink-${uid}`;
  const coreId = `ink-core-${uid}`;

  const blobs = useMemo<readonly Blob[]>(() => {
    const random = mulberry32(seed);
    const out: Blob[] = [{ cx: 100, cy: 100, r: 31 }];

    // Satellites, thrown outward on a ring. Ink does not land evenly, so the
    // radius and the throw distance both vary a lot.
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2 + random() * 0.9;
      const reach = 30 + random() * 26;
      out.push({
        cx: 100 + Math.cos(angle) * reach,
        cy: 100 + Math.sin(angle) * reach,
        r: 5 + random() * random() * 15,
      });
    }

    // Fine spatter, further out and much smaller.
    for (let i = 0; i < 12; i += 1) {
      const angle = random() * Math.PI * 2;
      const reach = 48 + random() * 42;
      out.push({
        cx: 100 + Math.cos(angle) * reach,
        cy: 100 + Math.sin(angle) * reach,
        r: 1 + random() * 3.6,
      });
    }

    return out;
  }, [seed]);

  useInkSplashAnimations({
    groupRef,
    turbulenceRef,
    displacementRef,
    playKey,
    hot: tone === 'wrong',
    reduced,
  });

  const edge = tone === 'wrong' ? '#ff3b1f' : '#e0ffff';
  const core = tone === 'wrong' ? '#1a0300' : '#ffffff';

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <filter
          id={filterId}
          x="-45%"
          y="-45%"
          width="190%"
          height="190%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            ref={turbulenceRef}
            type="fractalNoise"
            baseFrequency={0.026}
            numOctaves={4}
            seed={seed % 100}
            result="noise"
          />
          <feDisplacementMap
            ref={displacementRef}
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
            result="torn"
          />
          {/* A whisper of blur welds the displaced fronds back together, so the
              shape reads as one mass of ink rather than scattered fragments. */}
          <feGaussianBlur in="torn" stdDeviation={0.7} />
        </filter>

        <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={core} stopOpacity={0.95} />
          <stop offset="42%" stopColor={edge} stopOpacity={0.9} />
          <stop offset="100%" stopColor={edge} stopOpacity={0.12} />
        </radialGradient>
      </defs>

      <g ref={groupRef} filter={`url(#${filterId})`}>
        {blobs.map((blob, index) => (
          <circle
            key={index}
            cx={blob.cx}
            cy={blob.cy}
            r={blob.r}
            fill={index === 0 ? `url(#${coreId})` : edge}
            opacity={index === 0 ? 1 : 0.8}
          />
        ))}
      </g>
    </svg>
  );
}

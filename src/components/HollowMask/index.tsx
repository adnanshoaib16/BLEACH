import { useMemo, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useHollowMaskAnimations } from './useAnimations';
import type { ReactElement } from 'react';

export interface HollowMaskProps {
  /** Changing this replays the flicker. */
  readonly playKey?: string | number;
  readonly className?: string;
}

/**
 * Outer skull with the eye sockets and mouth cut out of the same path, so the
 * holes are true voids and the black behind shows through — on this background
 * that is what makes it a mask rather than a drawing of one.
 */
const SILHOUETTE = [
  // Cranium down to a narrow chin.
  'M100 6 C141 6 170 41 172 92 C174 134 159 178 128 214 C118 226 106 234 100 234',
  'C94 234 82 226 72 214 C41 178 26 134 28 92 C30 41 59 6 100 6 Z',
  // Horns.
  'M58 22 L38 -10 L78 12 Z',
  'M142 22 L162 -10 L122 12 Z',
  // Eye sockets, raked inward and down.
  'M48 92 L90 78 L96 112 L53 121 Z',
  'M152 92 L110 78 L104 112 L147 121 Z',
  // Mouth cavity.
  'M52 148 L148 148 L139 190 L61 190 Z',
].join(' ');

const TOOTH_COUNT = 7;

/**
 * The hollow mask silhouette, flickering in behind a wrong answer.
 *
 * Drawn rather than illustrated: one evenodd path for the skull and its voids,
 * plus generated teeth. That keeps it a few hundred bytes, lets it take its
 * colour from the surrounding palette, and means it stays crisp at the size it
 * appears — most of the viewport.
 */
export function HollowMask({ playKey = 0, className = '' }: HollowMaskProps): ReactElement {
  const rootRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useHollowMaskAnimations({ rootRef, playKey, reduced });

  // Teeth alternate long and short, and taper, so the grin is irregular.
  const teeth = useMemo(() => {
    const out: { x: number; width: number; height: number }[] = [];
    const left = 54;
    const span = 92;
    const pitch = span / TOOTH_COUNT;

    for (let i = 0; i < TOOTH_COUNT; i += 1) {
      out.push({
        x: left + i * pitch + 1,
        width: pitch - 2.5,
        height: i % 2 === 0 ? 38 : 25,
      });
    }

    return out;
  }, []);

  return (
    <svg
      ref={rootRef}
      className={`pointer-events-none ${className}`}
      viewBox="0 -14 200 254"
      fill="none"
      aria-hidden
    >
      <path d={SILHOUETTE} fillRule="evenodd" clipRule="evenodd" fill="#ffffff" />

      {/* Teeth sit inside the mouth void, hanging from its upper edge. */}
      <g fill="#ffffff">
        {teeth.map((tooth) => (
          <path
            key={tooth.x}
            d={`M${String(tooth.x)} 148 h${String(tooth.width)} l${String(-tooth.width * 0.22)} ${String(tooth.height)} h${String(-tooth.width * 0.56)} Z`}
          />
        ))}
      </g>

      {/* The red stripe every Visored mask carries. One mark, off-centre. */}
      <path d="M118 2 L132 0 L116 232 L104 226 Z" fill="#ff3b1f" opacity={0.85} />
    </svg>
  );
}

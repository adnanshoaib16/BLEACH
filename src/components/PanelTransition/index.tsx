import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { InkSplash } from '../InkSplash';
import { SpeedLines } from '../SpeedLines';
import { WIPE_SLABS } from '../../lib/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePanelWipe } from './useAnimations';
import type { ReactElement } from 'react';

export interface PanelTransitionHandle {
  /** Runs the wipe; `onCover` fires while the screen is fully black. */
  readonly wipe: (onCover: () => void) => void;
}

export interface PanelTransitionProps {
  /** Kanji shown on the black page at the midpoint of the cut. */
  readonly glyph?: string;
}

const SLAB_INDICES = Array.from({ length: WIPE_SLABS }, (_, index) => index);

/**
 * The transition between screens: a diagonal slice, a black page, speed lines
 * and an ink burst, then the slabs continue out the far side.
 *
 * Mounted once at the top of the app and driven through a ref, so a screen
 * never has to know about the transition that reveals it — the caller wipes,
 * and swaps state in the callback.
 */
export const PanelTransition = forwardRef<PanelTransitionHandle, PanelTransitionProps>(
  function PanelTransition({ glyph = '斬' }, ref): ReactElement {
    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();

    // Bumped at the blackout so the burst graphics replay on every wipe
    // instead of only animating once on mount.
    const [burstKey, setBurstKey] = useState(0);
    const onBurst = useCallback(() => setBurstKey((key) => key + 1), []);

    const { wipe } = usePanelWipe({ rootRef, contentRef, reduced, onBurst });

    useImperativeHandle(ref, () => ({ wipe }), [wipe]);

    return (
      <div
        ref={rootRef}
        className="pointer-events-none fixed inset-0 z-wipe overflow-hidden"
        aria-hidden
      >
        <div className="wipe-stack">
          {SLAB_INDICES.map((index) => (
            <div key={index} className="wipe-slab" />
          ))}
        </div>

        {/* Only visible during the blackout, which is the one moment the
            composition can carry a full-bleed graphic without competing with
            anything the player needs to read. */}
        <div ref={contentRef} className="absolute inset-0">
          <SpeedLines count={78} tone="mixed" playKey={burstKey} duration={1.05} seed={0x33a1} />
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-[46vmin] w-[46vmin]">
              <InkSplash tone="correct" playKey={burstKey} seed={0x7bc1} />
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <span
              className="kanji text-bone"
              style={{
                fontSize: 'min(34vmin, 34vmax)',
                textShadow: '0 0 60px rgba(255,59,31,0.55)',
              }}
            >
              {glyph}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

import { useMemo, useRef } from 'react';
import { HollowMask } from '../HollowMask';
import { InkSplash } from '../InkSplash';
import { SpeedLines } from '../SpeedLines';
import { mulberry32 } from '../../lib/random';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useFeedbackAnimations } from './useAnimations';
import type { ReactElement } from 'react';
import type { Feedback } from '../../types/quiz';

export interface AnswerFeedbackProps {
  readonly kind: Feedback;
  /** The store's pulse id. Remounting on it replays the whole reaction. */
  readonly playKey: number;
}

interface Shard {
  readonly angle: number;
  readonly length: number;
  readonly thickness: number;
}

const SHARD_COUNT = 22;

/** Vertical ゴゴゴ, the JoJo rumble, for wrong answers only. */
const MENACE = ['ゴ', 'ゴ', 'ゴ', 'ゴ', 'ゴ'];

const FLASH: Readonly<Record<Feedback, string>> = {
  // Green-white at the core cooling to the reiatsu cyan the HUD already uses,
  // so the flash belongs to the same palette it interrupts.
  correct:
    'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.97) 0%, rgba(183,255,216,0.85) 26%, rgba(0,229,255,0.4) 58%, rgba(255,255,255,0) 82%)',
  wrong:
    'radial-gradient(circle at 50% 48%, rgba(255,59,31,0.95) 0%, rgba(120,8,0,0.9) 38%, rgba(4,0,0,0.96) 78%)',
};

/**
 * Everything that happens in the second after an answer lands.
 *
 * Composed rather than monolithic: the splash, the mask and the speed lines
 * are the same components used elsewhere, and this screen only decides which
 * of them appear and in what colour. The shards are local, because a thin
 * outward slash is the one shape nothing else needed.
 */
export function AnswerFeedback({ kind, playKey }: AnswerFeedbackProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const shardsRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const correct = kind === 'correct';

  const shards = useMemo<readonly Shard[]>(() => {
    const random = mulberry32(0x4d21);
    return Array.from({ length: SHARD_COUNT }, (_unused, index) => ({
      angle: (index / SHARD_COUNT) * 360 + (random() - 0.5) * 26,
      length: 16 + random() * random() * 70,
      thickness: random() > 0.72 ? 3 : 1.5,
    }));
  }, []);

  useFeedbackAnimations({ rootRef, flashRef, stampRef, shardsRef, kind, playKey, reduced });

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-feedback overflow-hidden"
      // The outcome is announced through the answer buttons, which carry real
      // labels; this layer is pure decoration and is kept out of the tree.
      aria-hidden
    >
      <div ref={flashRef} className="absolute inset-0 opacity-0" style={{ background: FLASH[kind] }} />

      {correct ? (
        <SpeedLines count={56} tone="bone" playKey={playKey} duration={0.9} seed={0x2f17} />
      ) : (
        <HollowMask
          key={playKey}
          playKey={playKey}
          className="mask-flicker absolute left-1/2 top-1/2 h-[82vmin] w-[62vmin] -translate-x-1/2 -translate-y-1/2"
        />
      )}

      <div className="absolute left-1/2 top-1/2 h-[66vmin] w-[66vmin] -translate-x-1/2 -translate-y-1/2">
        <InkSplash tone={kind} playKey={playKey} seed={correct ? 0x1ac5 : 0x6b02} />
      </div>

      <div ref={shardsRef} className="absolute left-1/2 top-1/2 h-0 w-0">
        {shards.map((shard, index) => (
          <div
            key={index}
            className="absolute left-0 top-0 h-0 w-0"
            style={{ transform: `rotate(${String(shard.angle)}deg)` }}
          >
            <span
              className="block opacity-0"
              style={{
                width: `${String(shard.length)}px`,
                height: `${String(shard.thickness)}px`,
                transformOrigin: 'left center',
                background: correct
                  ? 'linear-gradient(90deg, #ffffff, rgba(0,229,255,0))'
                  : 'linear-gradient(90deg, #ff3b1f, rgba(255,107,0,0))',
              }}
            />
          </div>
        ))}
      </div>

      <div ref={stampRef} className="absolute inset-0 grid place-items-center opacity-0">
        <span
          className="kanji leading-none"
          style={{
            fontSize: correct ? 'min(22vw, 20vh)' : 'min(17vw, 16vh)',
            color: correct ? '#ffffff' : '#ff3b1f',
            textShadow: correct
              ? '0 0 8px rgba(0,229,255,0.9), 0 0 70px rgba(0,229,255,0.6)'
              : '0 0 10px rgba(0,0,0,1), 4px 0 0 rgba(0,229,255,0.5), -4px 0 0 rgba(255,59,31,0.7)',
          }}
        >
          {correct ? '正解' : '不正解'}
        </span>
      </div>

      {!correct && !reduced && (
        <div
          className="menace kanji absolute bottom-[6vh] left-[3vw] flex flex-col leading-[0.8] text-bone/35"
          style={{ fontSize: 'min(9vw, 7vh)' }}
        >
          {MENACE.map((glyph, index) => (
            <span key={index}>{glyph}</span>
          ))}
        </div>
      )}
    </div>
  );
}

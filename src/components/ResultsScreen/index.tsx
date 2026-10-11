import { useCallback, useMemo, useRef } from 'react';
import { rankFor } from '../../data/ranks';
import { maxScoreFor } from '../../lib/scoring';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useShare } from '../../hooks/useShare';
import { selectAccuracy, selectCorrectCount, useQuizStore } from '../../store/useQuizStore';
import { useResultsAnimations } from './useAnimations';
import type { ReactElement, ReactNode } from 'react';

export interface ResultsScreenProps {
  readonly onRetry: () => void;
  readonly onHome: () => void;
}

const SHARE_TITLE = 'Reiatsu — a Bleach lore quiz';

interface StatProps {
  readonly label: string;
  readonly sublabel?: string;
  readonly children: ReactNode;
}

function Stat({ label, sublabel, children }: StatProps): ReactElement {
  return (
    <div className="results-stat px-[clamp(0.75rem,2.2vw,1.75rem)] py-[clamp(0.75rem,2vh,1.25rem)] first:pl-0">
      <p
        className="display numeric font-black leading-none text-bone"
        style={{ fontSize: 'clamp(1.5rem, 4vw, 2.6rem)' }}
      >
        {children}
      </p>
      <p className="hud-label mt-2 text-micro text-bone/40">{label}</p>
      {sublabel !== undefined && (
        <p className="numeric mt-1 text-micro text-bone/25">{sublabel}</p>
      )}
    </div>
  );
}

/**
 * The results screen.
 *
 * Ordered by what the player actually came for: the rank first and at the
 * largest size on the page, then the numbers behind it, then the run itself as
 * a row of marks, then the button that starts another round. The rank kanji
 * carries the whole reveal, so nothing else on the screen is allowed to be
 * large.
 */
export function ResultsScreen({ onRetry, onHome }: ResultsScreenProps): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  const kanjiRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const records = useQuizStore((state) => state.records);
  const score = useQuizStore((state) => state.score);
  const bestStreak = useQuizStore((state) => state.bestStreak);
  const correct = useQuizStore(selectCorrectCount);
  const accuracy = useQuizStore(selectAccuracy);

  const total = records.length;
  const rank = useMemo(() => rankFor(accuracy), [accuracy]);
  const bestPossible = useMemo(() => maxScoreFor(Math.max(total, 1)), [total]);

  const { canShare, status, share } = useShare();

  useResultsAnimations({ rootRef, kanjiRef, titleRef, scoreRef, score, reduced });

  const handleShare = useCallback(() => {
    // Filled and hollow diamonds: the run reads at a glance in plain text,
    // wherever it gets pasted.
    const run = records.map((record) => (record.wasCorrect ? '◆' : '◇')).join('');
    share({
      title: SHARE_TITLE,
      text: [
        SHARE_TITLE,
        `Rank: ${rank.title} ${rank.kanji}`,
        `Score: ${score.toLocaleString()}`,
        `Correct: ${String(correct)} of ${String(total)}`,
        run,
      ].join('\n'),
    });
  }, [records, rank, score, correct, total, share]);

  const shareLabel =
    status === 'shared'
      ? 'Shared'
      : status === 'copied'
        ? 'Copied'
        : status === 'failed'
          ? 'Could not copy'
          : canShare
            ? 'Share result'
            : 'Copy result';

  return (
    <section
      ref={rootRef}
      className="pad-safe pad-safe-y scroll-chrome relative flex h-full flex-col justify-center gap-[clamp(1.25rem,3.5vh,2.75rem)] overflow-y-auto"
    >
      <div className="flex flex-col items-start gap-[clamp(0.5rem,2vw,2.5rem)] sm:flex-row sm:items-end">
        <span
          ref={kanjiRef}
          className="kanji chrome-text block shrink-0 leading-[0.78]"
          style={{
            fontSize: 'clamp(5rem, 19vw, 13rem)',
            // Clipped text cannot take a text-shadow, so the bloom is a filter
            // on the element, scaled by the --glow channel the timeline drives.
            filter:
              'drop-shadow(0 0 calc(12px * var(--glow)) rgba(255,255,255,0.85)) drop-shadow(0 0 calc(48px * var(--glow)) rgba(0,229,255,0.7))',
          }}
        >
          {rank.kanji}
        </span>

        <div className="min-w-0 pb-[clamp(0.25rem,1.5vh,1.1rem)]">
          <p
            ref={titleRef}
            className="chrome-text display m-0 text-rank font-black tracking-[-0.02em]"
          >
            {rank.title}
          </p>
          <p className="results-epithet mt-[clamp(0.5rem,1.4vh,1rem)] max-w-[44ch] text-pretty text-[clamp(0.9rem,1.1vw,1.1rem)] leading-relaxed text-bone/65 opacity-0">
            {rank.epithet}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/[0.12] border-y border-white/[0.12]">
        <Stat label="Reiatsu" sublabel={`of ${bestPossible.toLocaleString()} possible`}>
          <span ref={scoreRef} className="numeric">
            0
          </span>
        </Stat>
        <Stat label="Correct">
          {correct}
          <span className="text-bone/30"> / </span>
          {total}
        </Stat>
        <Stat label="Best streak">{bestStreak}</Stat>
      </div>

      <div>
        <div className="flex gap-[3px]" aria-hidden>
          {records.map((record, index) => (
            <span
              key={`${String(record.questionId)}-${String(index)}`}
              className="results-mark h-[clamp(1.5rem,4vh,2.4rem)] flex-1 opacity-0"
              style={{
                transform: 'skewX(calc(var(--slice) * -2))',
                background: record.wasCorrect
                  ? 'linear-gradient(180deg, #e0ffff, #00e5ff)'
                  : 'linear-gradient(180deg, #ff3b1f, #2b0600)',
                boxShadow: record.wasCorrect ? '0 0 16px -4px #00e5ff' : 'none',
              }}
            />
          ))}
        </div>
        <p className="hud-label mt-2.5 text-micro text-bone/35">
          Your run, in order. Hollow marks are the ones that got away.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-[clamp(0.6rem,2vw,1.25rem)]">
        <button
          type="button"
          onClick={onRetry}
          className="results-action cta chrome sheen focus-slice opacity-0"
        >
          <span className="hud-label text-label">Run it again</span>
          <span className="cta-glyph kanji text-lead leading-none text-blood">再</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="results-action cta cta-ghost focus-slice opacity-0"
          aria-live="polite"
        >
          <span className="hud-label text-label">{shareLabel}</span>
        </button>

        <button
          type="button"
          onClick={onHome}
          className="results-action focus-slice hud-label ml-auto text-micro text-bone/40 underline decoration-white/20 underline-offset-4 opacity-0 transition-colors hover:text-bone"
        >
          Back to the title
        </button>
      </div>
    </section>
  );
}

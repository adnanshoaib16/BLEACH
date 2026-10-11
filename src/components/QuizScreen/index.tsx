import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AnswerFeedback } from '../AnswerFeedback';
import { BladeProgress } from '../BladeProgress';
import { QuestionCard } from '../QuestionCard';
import { TimerRing } from '../TimerRing';
import { QUESTION_MS } from '../../lib/scoring';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  selectProgress,
  selectQuestion,
  selectTotal,
  useQuizStore,
} from '../../store/useQuizStore';
import { useQuizAnimations } from './useAnimations';
import type { ReactElement } from 'react';
import type { AnswerIndex, Difficulty } from '../../types/quiz';

export interface QuizScreenProps {
  /** Called after the last question resolves, so the caller can wipe out. */
  readonly onComplete: () => void;
}

/** How long the reaction holds before the next question opens. */
const FEEDBACK_MS = 1500;

const DIFFICULTY_KANJI: Readonly<Record<Difficulty, string>> = {
  easy: '易',
  medium: '中',
  hard: '難',
};

/** Keyboard shortcuts. The A–D markers on the buttons are these keys. */
const KEY_MAP: Readonly<Record<string, AnswerIndex>> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  '1': 0,
  '2': 1,
  '3': 2,
  '4': 3,
};

/**
 * The quiz.
 *
 * Holds no copy of the round — every value is read from the store with an
 * atomic selector, so a tick of the clock or a change of score cannot
 * accidentally re-render the question. The only local state is a ref holding
 * the milliseconds left, which exists so that pressing an answer can be scored
 * without the clock living in React.
 */
export function QuizScreen({ onComplete }: QuizScreenProps): ReactElement | null {
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const glyphRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef(QUESTION_MS);
  const reduced = useReducedMotion();

  const question = useQuizStore(selectQuestion);
  const total = useQuizStore(selectTotal);
  const progress = useQuizStore(selectProgress);
  const index = useQuizStore((state) => state.index);
  const chosen = useQuizStore((state) => state.chosen);
  const locked = useQuizStore((state) => state.locked);
  const feedback = useQuizStore((state) => state.feedback);
  const pulseId = useQuizStore((state) => state.pulseId);
  const score = useQuizStore((state) => state.score);
  const streak = useQuizStore((state) => state.streak);
  const records = useQuizStore((state) => state.records);
  const submit = useQuizStore((state) => state.submit);
  const advance = useQuizStore((state) => state.advance);

  useQuizAnimations({ headerRef, footerRef, glyphRef, reduced });

  /* ---- Answering ------------------------------------------------------- */

  const handleTick = useCallback((msRemaining: number) => {
    remainingRef.current = msRemaining;
  }, []);

  const handlePick = useCallback(
    (picked: AnswerIndex) => submit(picked, remainingRef.current),
    [submit],
  );

  // Running out of time is a wrong answer with no credit for speed.
  const handleExpire = useCallback(() => submit(null, 0), [submit]);

  // Reset before the first tick of a new question, in case the player answers
  // faster than one frame.
  useEffect(() => {
    remainingRef.current = QUESTION_MS;
  }, [index]);

  useEffect(() => {
    if (locked) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const picked = KEY_MAP[event.key.toLowerCase()];
      if (picked === undefined) return;
      event.preventDefault();
      handlePick(picked);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, handlePick]);

  /* ---- Advancing ------------------------------------------------------- */

  useEffect(() => {
    if (feedback === null) return;

    const wasLast = index >= total - 1;
    const timer = window.setTimeout(() => {
      if (wasLast) onComplete();
      else advance();
    }, FEEDBACK_MS);

    return () => window.clearTimeout(timer);
  }, [feedback, pulseId, index, total, advance, onComplete]);

  // Swings the global accent warm or cool for the duration of the reaction.
  useEffect(() => {
    const root = document.documentElement;
    if (feedback === null) {
      root.removeAttribute('data-mood');
      return;
    }
    root.setAttribute('data-mood', feedback);
    return () => root.removeAttribute('data-mood');
  }, [feedback]);

  const outcomes = useMemo(
    () => Array.from({ length: total }, (_unused, slot) => records[slot]?.wasCorrect ?? null),
    [records, total],
  );

  // The store clears the round before the results screen mounts, so this is a
  // normal frame rather than an error.
  if (question === null) return null;

  const announcement =
    feedback === null
      ? ''
      : feedback === 'correct'
        ? 'Correct.'
        : `Wrong. The answer was ${question.answers[question.correct]}.`;

  return (
    <section className="pad-safe pad-safe-y relative flex h-full flex-col">
      {/* Decorative kanji bleeding off the right edge. Hidden on narrow
          screens, where the column would crowd the answers. */}
      <div
        ref={glyphRef}
        aria-hidden
        className="kanji kanji-column pointer-events-none absolute right-[-0.08em] top-1/2 hidden -translate-y-1/2 select-none leading-none text-bone/[0.045] lg:block"
        style={{ fontSize: 'min(26vh, 15vw)' }}
      >
        霊圧
      </div>

      <header
        ref={headerRef}
        className="relative flex items-start justify-between gap-4 pt-[clamp(0.6rem,2vh,1.6rem)]"
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <span className="kanji text-lead leading-none" style={{ color: 'var(--accent)' }}>
              {DIFFICULTY_KANJI[question.difficulty]}
            </span>
            <span className="hud-label truncate text-micro text-bone/50">{question.arc}</span>
          </div>
          <p className="mt-2 hidden text-micro text-bone/30 xs:block">
            Press A to D, or tap an answer
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-[clamp(0.55rem,1.6vw,1.1rem)]">
          <div className="text-right">
            <p
              className="chrome-text display numeric font-black leading-none"
              style={{ fontSize: 'clamp(1.35rem, 3.4vw, 2.3rem)' }}
            >
              {score}
            </p>
            <p className="hud-label mt-1 text-micro text-bone/40">Reiatsu</p>
          </div>

          <TimerRing
            durationMs={QUESTION_MS}
            runKey={`${String(question.id)}-${String(index)}`}
            paused={locked}
            onExpire={handleExpire}
            onTick={handleTick}
          />
        </div>
      </header>

      <div className="scroll-chrome relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-[clamp(0.9rem,3vh,2.4rem)]">
        <AnimatePresence mode="wait" initial={false}>
          <QuestionCard
            key={question.id}
            question={question}
            chosen={chosen}
            locked={locked}
            onPick={handlePick}
          />
        </AnimatePresence>
      </div>

      <footer ref={footerRef} className="relative pb-[clamp(0.4rem,1.5vh,1.1rem)]">
        <BladeProgress
          value={progress}
          outcomes={outcomes}
          caption={streak >= 2 ? `${String(streak)} in a row` : undefined}
        />
      </footer>

      {/* Screen readers get the outcome as text, since the reaction layer that
          carries it visually is entirely decorative. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {feedback !== null && <AnswerFeedback key={pulseId} kind={feedback} playKey={pulseId} />}
    </section>
  );
}

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { buildRound, ROUND_SIZE } from '../data/questionBank';
import { pointsFor } from '../lib/scoring';
import type { AnswerIndex, AnswerRecord, Feedback, Phase, Question } from '../types/quiz';

interface QuizState {
  phase: Phase;
  /** The ten questions drawn for this round, already shuffled. */
  round: readonly Question[];
  index: number;
  /** Which answer the player pressed, or null while the question is open. */
  chosen: AnswerIndex | null;
  /** True from the moment an answer lands until the next question opens. */
  locked: boolean;
  feedback: Feedback | null;
  records: readonly AnswerRecord[];
  score: number;
  streak: number;
  bestStreak: number;
  /** Increments once per round, so React can key the whole quiz subtree. */
  roundNumber: number;

  /**
   * Ambient energy level, 0–1, that the WebGL layer eases toward. Rises with
   * a streak and with progress through the round.
   */
  reiatsu: number;
  /** Bumped on every answer so the WebGL layer can fire a one-shot burst. */
  pulseId: number;
  pulseKind: Feedback | null;

  beginRound: () => void;
  submit: (chosen: AnswerIndex | null, msRemaining: number) => void;
  advance: () => void;
  returnToLanding: () => void;
}

const IDLE_REIATSU = 0.28;

function reiatsuFor(streak: number, answered: number, total: number): number {
  const progress = total > 0 ? answered / total : 0;
  const heat = Math.min(streak, 5) / 5;
  return Math.min(1, IDLE_REIATSU + heat * 0.55 + progress * 0.22);
}

export const useQuizStore = create<QuizState>()(
  subscribeWithSelector((set, get) => ({
    phase: 'landing',
    round: [],
    index: 0,
    chosen: null,
    locked: false,
    feedback: null,
    records: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    roundNumber: 0,
    reiatsu: IDLE_REIATSU,
    pulseId: 0,
    pulseKind: null,

    beginRound: () => {
      set((state) => ({
        phase: 'quiz',
        round: buildRound(ROUND_SIZE),
        index: 0,
        chosen: null,
        locked: false,
        feedback: null,
        records: [],
        score: 0,
        streak: 0,
        bestStreak: 0,
        roundNumber: state.roundNumber + 1,
        reiatsu: IDLE_REIATSU,
        pulseKind: null,
      }));
    },

    submit: (chosen, msRemaining) => {
      const { round, index, locked, score, streak, bestStreak, records, pulseId } = get();
      const question = round[index];

      // Guard against a late timer firing after the player already answered,
      // and against an answer arriving for a question that does not exist.
      if (locked || question === undefined) return;

      const wasCorrect = chosen !== null && chosen === question.correct;
      const nextStreak = wasCorrect ? streak + 1 : 0;
      const points = wasCorrect ? pointsFor(msRemaining, nextStreak) : 0;

      const record: AnswerRecord = {
        questionId: question.id,
        chosen,
        wasCorrect,
        msRemaining: Math.max(0, Math.round(msRemaining)),
        points,
      };

      set({
        chosen,
        locked: true,
        feedback: wasCorrect ? 'correct' : 'wrong',
        records: [...records, record],
        score: score + points,
        streak: nextStreak,
        bestStreak: Math.max(bestStreak, nextStreak),
        reiatsu: wasCorrect
          ? reiatsuFor(nextStreak, index + 1, round.length)
          : IDLE_REIATSU * 0.55,
        pulseId: pulseId + 1,
        pulseKind: wasCorrect ? 'correct' : 'wrong',
      });
    },

    advance: () => {
      const { index, round } = get();
      const next = index + 1;

      if (next >= round.length) {
        set({ phase: 'results', locked: true, feedback: null, chosen: null });
        return;
      }

      set({ index: next, chosen: null, locked: false, feedback: null });
    },

    returnToLanding: () => {
      set({
        phase: 'landing',
        round: [],
        index: 0,
        chosen: null,
        locked: false,
        feedback: null,
        records: [],
        score: 0,
        streak: 0,
        reiatsu: IDLE_REIATSU,
        pulseKind: null,
      });
    },
  })),
);

/* ---- Selectors ------------------------------------------------------------
   Atomic by design: each returns a primitive or a stable reference, so
   components subscribing to them never re-render on unrelated state changes.
   -------------------------------------------------------------------------- */

export const selectQuestion = (state: QuizState): Question | null =>
  state.round[state.index] ?? null;

export const selectTotal = (state: QuizState): number => state.round.length;

/** 0–1 through the round, counting answered questions. */
export const selectProgress = (state: QuizState): number =>
  state.round.length === 0 ? 0 : state.records.length / state.round.length;

export const selectCorrectCount = (state: QuizState): number =>
  state.records.reduce((total, record) => total + (record.wasCorrect ? 1 : 0), 0);

export const selectAccuracy = (state: QuizState): number =>
  state.records.length === 0 ? 0 : selectCorrectCount(state) / state.records.length;

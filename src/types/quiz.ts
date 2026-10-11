export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Every question has exactly four answers, so the shape is a tuple. */
export type AnswerQuartet = readonly [string, string, string, string];

/** Valid indices into an AnswerQuartet. */
export type AnswerIndex = 0 | 1 | 2 | 3;

export interface Question {
  readonly id: number;
  readonly question: string;
  readonly answers: AnswerQuartet;
  readonly correct: AnswerIndex;
  readonly difficulty: Difficulty;
  readonly arc: string;
}

/** What the player did on one question. `chosen: null` means the timer ran out. */
export interface AnswerRecord {
  readonly questionId: number;
  readonly chosen: AnswerIndex | null;
  readonly wasCorrect: boolean;
  readonly msRemaining: number;
  readonly points: number;
}

export type Phase = 'landing' | 'quiz' | 'results';

/** Drives the palette flip, the WebGL pulse and which kanji stamp appears. */
export type Feedback = 'correct' | 'wrong';

export interface Rank {
  /** Minimum accuracy, 0–1 inclusive, needed to hold this rank. */
  readonly threshold: number;
  readonly title: string;
  readonly kanji: string;
  readonly epithet: string;
}

/** Quality tiers for the WebGL layer, picked once from device capability. */
export type QualityTier = 'high' | 'medium' | 'low' | 'off';

import type { Rank } from '../types/quiz';

/**
 * Ranks run from Hollow to Soul King, ordered high to low so the first match
 * wins. Each carries one kanji that can stand alone as the reveal graphic.
 */
export const RANKS: readonly Rank[] = Object.freeze([
  {
    threshold: 1,
    title: 'Soul King',
    kanji: '王',
    epithet: 'The linchpin. Nothing was hidden from you.',
  },
  {
    threshold: 0.9,
    title: 'Captain',
    kanji: '隊',
    epithet: 'A haori earned. The Gotei 13 would take you today.',
  },
  {
    threshold: 0.8,
    title: 'Lieutenant',
    kanji: '副',
    epithet: 'You hold the division together while the captain is away.',
  },
  {
    threshold: 0.65,
    title: 'Seated Officer',
    kanji: '席',
    epithet: 'Your name is on the roster. Keep reading.',
  },
  {
    threshold: 0.5,
    title: 'Substitute Soul Reaper',
    kanji: '代',
    epithet: 'Borrowed power, real results. Ichigo started here.',
  },
  {
    threshold: 0.3,
    title: 'Academy Student',
    kanji: '学',
    epithet: 'Still swinging an asauchi. The blade has no name yet.',
  },
  {
    threshold: 0,
    title: 'Hollow',
    kanji: '虚',
    epithet: 'You answered on instinct, and instinct was hungry.',
  },
]);

/** Highest rank whose threshold the accuracy clears. Accuracy is 0–1. */
export function rankFor(accuracy: number): Rank {
  const clamped = Math.min(Math.max(accuracy, 0), 1);
  const match = RANKS.find((rank) => clamped >= rank.threshold);
  // The last entry has threshold 0, so a match always exists.
  return match ?? (RANKS[RANKS.length - 1] as Rank);
}

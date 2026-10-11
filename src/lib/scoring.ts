/** Seconds allowed per question. */
export const QUESTION_MS = 15_000;

/** Awarded for any correct answer, regardless of speed. */
export const BASE_POINTS = 100;

/** Additional points available for answering fast, scaled linearly. */
export const MAX_TIME_BONUS = 50;

/** Every third correct answer in a row adds this much again. */
export const STREAK_BONUS = 25;

/**
 * Points for a correct answer with `msRemaining` left on the clock. Answering
 * instantly is worth 150; answering on the buzzer is worth 100. Being fast is
 * rewarded but never decides the round on its own.
 */
export function pointsFor(msRemaining: number, streak: number): number {
  const ratio = Math.min(Math.max(msRemaining, 0), QUESTION_MS) / QUESTION_MS;
  const streakBonus = streak > 0 && streak % 3 === 0 ? STREAK_BONUS : 0;
  return BASE_POINTS + Math.round(MAX_TIME_BONUS * ratio) + streakBonus;
}

/** Highest score a round of `size` questions can produce, for the results bar. */
export function maxScoreFor(size: number): number {
  let total = 0;
  for (let i = 1; i <= size; i += 1) {
    total += pointsFor(QUESTION_MS, i);
  }
  return total;
}

import rawQuestions from './questions.json';
import { DIFFICULTIES } from '../types/quiz';
import type { AnswerIndex, AnswerQuartet, Difficulty, Question } from '../types/quiz';

export const ROUND_SIZE = 10;

/**
 * How many questions of each difficulty make up a round. The round is then
 * ordered easy to hard, so a session escalates the way an arc does, while the
 * specific questions still differ every time.
 */
const ROUND_BLEND: Readonly<Record<Difficulty, number>> = {
  easy: 4,
  medium: 4,
  hard: 2,
};

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}

function isAnswerIndex(value: unknown): value is AnswerIndex {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/**
 * The JSON is authored by hand, so it is validated once at module load rather
 * than trusted. A malformed entry is a build-time mistake and should fail
 * loudly on first render instead of producing an unanswerable question.
 */
function parseQuestion(raw: unknown, position: number): Question {
  if (typeof raw !== 'object' || raw === null) {
    throw new TypeError(`questions.json[${position}] is not an object`);
  }

  const record = raw as Record<string, unknown>;
  const { id, question, answers, correct, difficulty, arc } = record;

  if (typeof id !== 'number' || !Number.isInteger(id)) {
    throw new TypeError(`questions.json[${position}] needs an integer id`);
  }
  if (typeof question !== 'string' || question.trim() === '') {
    throw new TypeError(`Question ${String(id)} needs non-empty question text`);
  }
  if (!Array.isArray(answers) || answers.length !== 4) {
    throw new TypeError(`Question ${String(id)} needs exactly 4 answers`);
  }
  if (!answers.every((answer): answer is string => typeof answer === 'string')) {
    throw new TypeError(`Question ${String(id)} has a non-string answer`);
  }
  if (!isAnswerIndex(correct)) {
    throw new TypeError(`Question ${String(id)} needs a correct index of 0–3`);
  }
  if (!isDifficulty(difficulty)) {
    throw new TypeError(`Question ${String(id)} has an unknown difficulty`);
  }
  if (typeof arc !== 'string' || arc.trim() === '') {
    throw new TypeError(`Question ${String(id)} needs an arc`);
  }

  const quartet = [answers[0], answers[1], answers[2], answers[3]] as AnswerQuartet;

  return Object.freeze({ id, question, answers: quartet, correct, difficulty, arc });
}

export const QUESTION_BANK: readonly Question[] = Object.freeze(
  (rawQuestions as readonly unknown[]).map(parseQuestion),
);

{
  const ids = new Set(QUESTION_BANK.map((question) => question.id));
  if (ids.size !== QUESTION_BANK.length) {
    throw new Error('questions.json contains duplicate ids');
  }
}

/** Fisher–Yates. Returns a new array; the input is never mutated. */
function shuffle<T>(input: readonly T[]): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    // Indices are in range by construction, so the reads are safe to narrow.
    const atI = out[i] as T;
    const atJ = out[j] as T;
    out[i] = atJ;
    out[j] = atI;
  }
  return out;
}

/**
 * Reorders the four answers and moves `correct` with them, so a player who
 * replays a question cannot lean on remembered answer positions.
 */
function shuffleAnswers(question: Question): Question {
  const order = shuffle<AnswerIndex>([0, 1, 2, 3]);
  const answers = [
    question.answers[order[0] as AnswerIndex],
    question.answers[order[1] as AnswerIndex],
    question.answers[order[2] as AnswerIndex],
    question.answers[order[3] as AnswerIndex],
  ] as AnswerQuartet;

  const correct = order.indexOf(question.correct);
  if (!isAnswerIndex(correct)) {
    throw new Error(`Lost the correct answer while shuffling question ${String(question.id)}`);
  }

  return Object.freeze({ ...question, answers, correct });
}

const DIFFICULTY_ORDER: Readonly<Record<Difficulty, number>> = { easy: 0, medium: 1, hard: 2 };

/**
 * Draws a round from the bank: a fixed blend of difficulties, chosen at
 * random within each tier, ordered easy to hard, with answers shuffled.
 *
 * If a tier cannot fill its quota the shortfall is topped up from whatever is
 * left, so the round is always `size` questions long even if the bank is
 * edited down.
 */
export function buildRound(size: number = ROUND_SIZE): readonly Question[] {
  const byTier = new Map<Difficulty, Question[]>(
    DIFFICULTIES.map((tier) => [
      tier,
      shuffle(QUESTION_BANK.filter((question) => question.difficulty === tier)),
    ]),
  );

  const picked: Question[] = [];
  for (const tier of DIFFICULTIES) {
    const pool = byTier.get(tier) ?? [];
    const quota = Math.min(ROUND_BLEND[tier], pool.length);
    picked.push(...pool.splice(0, quota));
  }

  if (picked.length < size) {
    const used = new Set(picked.map((question) => question.id));
    const spare = shuffle(QUESTION_BANK.filter((question) => !used.has(question.id)));
    picked.push(...spare.slice(0, size - picked.length));
  }

  return Object.freeze(
    picked
      .slice(0, size)
      .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty])
      .map(shuffleAnswers),
  );
}

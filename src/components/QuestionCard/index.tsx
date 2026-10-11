import { useRef } from 'react';
import { motion } from 'framer-motion';
import { AnswerButton } from '../AnswerButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useQuestionAnimations } from './useAnimations';
import type { ReactElement } from 'react';
import type { Variants } from 'framer-motion';
import type { AnswerIndex, Question } from '../../types/quiz';
import type { AnswerState } from '../AnswerButton';

export interface QuestionCardProps {
  readonly question: Question;
  readonly chosen: AnswerIndex | null;
  readonly locked: boolean;
  readonly onPick: (index: AnswerIndex) => void;
}

const INDICES: readonly AnswerIndex[] = [0, 1, 2, 3];

/** The house easing, as a cubic-bezier array for Framer Motion. */
const EASE_SLICE = [0.16, 1, 0.3, 1] as const;

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.16 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

const itemVariants: Variants = {
  // Answers arrive from the left and leave to the right, so a resolved
  // question reads as a page being pulled off rather than a list refreshing.
  hidden: { opacity: 0, x: -36, filter: 'blur(7px)' },
  show: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.44, ease: EASE_SLICE },
  },
  exit: { opacity: 0, x: 30, filter: 'blur(5px)', transition: { duration: 0.2 } },
};

/**
 * Resolves what each answer should look like once the question is locked.
 *
 * A wrong pick shows both the mistake and the right answer, and dims the two
 * that were never in contention — the point of a lore quiz is to learn the
 * lore, so the correct answer is always surfaced.
 */
function answerState(
  index: AnswerIndex,
  correct: AnswerIndex,
  chosen: AnswerIndex | null,
  locked: boolean,
): AnswerState {
  if (!locked) return 'open';
  if (index === correct) return chosen === index ? 'chosen-correct' : 'reveal';
  if (index === chosen) return 'chosen-wrong';
  return 'dim';
}

/**
 * The question and its four answers.
 *
 * Each answer button is wrapped in its own motion element: Framer Motion owns
 * the wrapper's transform for entry and exit, GSAP owns the button's transform
 * for the impact on selection. Keeping them on separate nodes means the two
 * libraries never write the same style property.
 */
export function QuestionCard({
  question,
  chosen,
  locked,
  onPick,
}: QuestionCardProps): ReactElement {
  const promptRef = useRef<HTMLHeadingElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useQuestionAnimations({ promptRef, ruleRef, runKey: question.id, reduced });

  return (
    <div className="flex w-full flex-col">
      <h2
        ref={promptRef}
        className="display max-w-[26ch] text-q font-semibold tracking-[-0.015em] text-bone"
      >
        {question.question}
      </h2>

      <div ref={ruleRef} className="rule-slice mt-[clamp(1rem,2.4vh,2rem)] w-full max-w-[34ch]" />

      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        className="mt-[clamp(1.1rem,3vh,2.4rem)] flex list-none flex-col gap-[clamp(0.5rem,1.1vh,0.85rem)] p-0"
      >
        {INDICES.map((index) => (
          <motion.li key={`${String(question.id)}-${String(index)}`} variants={itemVariants}>
            <AnswerButton
              index={index}
              label={question.answers[index]}
              state={answerState(index, question.correct, chosen, locked)}
              disabled={locked}
              onPick={onPick}
            />
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

import { useCallback, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAnswerAnimations } from './useAnimations';
import type { ReactElement } from 'react';
import type { AnswerIndex } from '../../types/quiz';
import type { AnswerState } from './useAnimations';

export type { AnswerState } from './useAnimations';

export interface AnswerButtonProps {
  readonly index: AnswerIndex;
  readonly label: string;
  readonly state: AnswerState;
  readonly disabled: boolean;
  readonly onPick: (index: AnswerIndex) => void;
}

/** A–D rather than 1–4: the letters double as the keyboard shortcuts. */
const MARKERS = ['A', 'B', 'C', 'D'] as const;

const STATE_CLASS: Readonly<Record<AnswerState, string>> = {
  open: '',
  'chosen-correct': 'is-correct',
  'chosen-wrong': 'is-wrong',
  reveal: 'is-reveal',
  dim: 'is-dim',
};

/**
 * One answer.
 *
 * Each sits a step further right than the last, so the stack falls on the same
 * diagonal as every other cut in the layout and the eye travels down it at an
 * angle rather than straight down a column.
 */
export function AnswerButton({
  index,
  label,
  state,
  disabled,
  onPick,
}: AnswerButtonProps): ReactElement {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useAnswerAnimations({ buttonRef, state, reduced });

  const handleClick = useCallback(() => onPick(index), [onPick, index]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`answer focus-slice ${STATE_CLASS[state]}`}
      style={{ marginInlineStart: `calc(var(--step) * ${String(index)})` }}
    >
      <span className="answer-marker hud-label text-label" aria-hidden>
        {MARKERS[index]}
      </span>
      <span className="text-balance text-[0.95rem] leading-snug sm:text-body">{label}</span>
    </button>
  );
}

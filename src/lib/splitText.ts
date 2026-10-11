export type SplitMode = 'chars' | 'words';

export interface SplitResult {
  /** The wrapped pieces, in document order, ready to hand to a GSAP stagger. */
  readonly parts: readonly HTMLSpanElement[];
  /** Puts the original text node back. */
  readonly restore: () => void;
}

const WHITESPACE = /^\s+$/;

/**
 * Wraps the text of an element in spans so each piece can be animated.
 *
 * A hand-rolled split rather than GSAP's SplitText: this needs about fifteen
 * lines, adds no plugin to register, and lets the accessibility behaviour be
 * correct by default — the container keeps the full string as its label and
 * every fragment is hidden, so a screen reader reads "Substitute Soul Reaper"
 * instead of twenty-three separate letters.
 *
 * Use `chars` for short display strings and `words` for anything a reader has
 * to get through quickly. Per-character inline-blocks break line-wrapping
 * inside words, and a stagger long enough to be dramatic is too long to sit
 * through on a timed question.
 */
export function splitText(element: HTMLElement, mode: SplitMode): SplitResult {
  const original = element.textContent ?? '';

  element.setAttribute('aria-label', original);
  element.textContent = '';

  const tokens = mode === 'chars' ? Array.from(original) : original.split(/(\s+)/);
  const parts: HTMLSpanElement[] = [];

  for (const token of tokens) {
    if (token === '') continue;

    if (WHITESPACE.test(token)) {
      element.appendChild(document.createTextNode(token));
      continue;
    }

    const span = document.createElement('span');
    span.textContent = token;
    span.style.display = 'inline-block';
    span.setAttribute('aria-hidden', 'true');
    element.appendChild(span);
    parts.push(span);
  }

  return {
    parts,
    restore: () => {
      element.textContent = original;
      element.removeAttribute('aria-label');
    },
  };
}

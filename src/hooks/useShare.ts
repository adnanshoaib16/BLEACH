import { useCallback, useEffect, useRef, useState } from 'react';

export type ShareStatus = 'idle' | 'shared' | 'copied' | 'failed';

export interface SharePayload {
  readonly title: string;
  readonly text: string;
}

export interface UseShareResult {
  /** True when the OS share sheet is available, which changes the button's label. */
  readonly canShare: boolean;
  readonly status: ShareStatus;
  readonly share: (payload: SharePayload) => void;
}

const RESET_MS = 2600;

/**
 * Shares a result, or copies it when there is nowhere to share to.
 *
 * Both outcomes are reported honestly rather than both claiming success — the
 * button says "Copied" when it copied and "Shared" when it shared, because
 * those leave the result in different places and the player needs to know
 * which happened. A cancelled share sheet is not a failure and says nothing.
 */
export function useShare(): UseShareResult {
  const [status, setStatus] = useState<ShareStatus>('idle');
  const timerRef = useRef<number | null>(null);

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = useCallback((next: ShareStatus) => {
    setStatus(next);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus('idle'), RESET_MS);
  }, []);

  const share = useCallback(
    (payload: SharePayload) => {
      void (async () => {
        if (typeof navigator.share === 'function') {
          try {
            await navigator.share({ title: payload.title, text: payload.text });
            flash('shared');
            return;
          } catch (error) {
            // Dismissing the sheet throws AbortError. That is a decision, not
            // a problem, so the button stays as it was.
            if (error instanceof DOMException && error.name === 'AbortError') return;
          }
        }

        try {
          await navigator.clipboard.writeText(payload.text);
          flash('copied');
        } catch {
          flash('failed');
        }
      })();
    },
    [flash],
  );

  return { canShare, status, share };
}

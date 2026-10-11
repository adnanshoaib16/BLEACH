import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the reduced-motion preference and keeps tracking it, since it can be
 * toggled mid-session from the OS.
 *
 * Components use this to skip decorative timelines. Transitions that tell the
 * player what changed are kept either way, only shortened — removing them
 * would make the quiz harder to follow, not calmer.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const list = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent): void => setReduced(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

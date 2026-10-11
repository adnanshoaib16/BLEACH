import { useCallback, useRef, useState } from 'react';
import { LandingScreen } from './components/LandingScreen';
import { PanelTransition } from './components/PanelTransition';
import { QuizScreen } from './components/QuizScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { WebGLBackground } from './components/WebGLBackground';
import { useQuizStore } from './store/useQuizStore';
import type { ReactElement } from 'react';
import type { PanelTransitionHandle } from './components/PanelTransition';

/**
 * The glyph shown on the black page mid-cut. Naming the transition is a small
 * thing, but it means the blackout says something about where you are going
 * rather than just hiding the swap.
 */
const GLYPH = {
  begin: '斬', // cut
  finish: '終', // end
  retry: '再', // again
  home: '戻', // return
} as const;

type Destination = keyof typeof GLYPH;

/**
 * The app shell.
 *
 * Screens are swapped behind the panel wipe rather than cross-faded, so only
 * one is ever mounted. That matters more than it sounds: keeping two copies of
 * the quiz alive during a transition would mean two running clocks, and each
 * screen's own entrance timeline is already choreographed to play as the slabs
 * retreat, which a crossfade would fight.
 */
export function App(): ReactElement {
  const transitionRef = useRef<PanelTransitionHandle>(null);
  const [glyph, setGlyph] = useState<string>(GLYPH.begin);

  const phase = useQuizStore((state) => state.phase);
  const roundNumber = useQuizStore((state) => state.roundNumber);
  const feedback = useQuizStore((state) => state.feedback);
  const beginRound = useQuizStore((state) => state.beginRound);
  const advance = useQuizStore((state) => state.advance);
  const returnToLanding = useQuizStore((state) => state.returnToLanding);

  const wipeTo = useCallback((destination: Destination, action: () => void) => {
    setGlyph(GLYPH[destination]);

    const handle = transitionRef.current;
    if (handle === null) {
      // Without the overlay there is no cover to hide behind, so the swap
      // happens immediately rather than not at all.
      action();
      return;
    }
    handle.wipe(action);
  }, []);

  const handleBegin = useCallback(() => wipeTo('begin', beginRound), [wipeTo, beginRound]);
  const handleComplete = useCallback(() => wipeTo('finish', advance), [wipeTo, advance]);
  const handleRetry = useCallback(() => wipeTo('retry', beginRound), [wipeTo, beginRound]);
  const handleHome = useCallback(() => wipeTo('home', returnToLanding), [wipeTo, returnToLanding]);

  return (
    // The invert filter is only mounted while a reaction is on screen. Leaving
    // `filter: invert(0)` on a full-viewport element permanently would cost a
    // compositing pass over the WebGL layer on every single frame, to achieve
    // nothing for the 98% of the time nothing is flipping.
    <div className={`frame ${feedback === null ? '' : 'frame-flip flip-armed'}`}>
      <WebGLBackground />

      <main className="relative z-stage h-full">
        {phase === 'landing' && <LandingScreen onBegin={handleBegin} />}
        {phase === 'quiz' && <QuizScreen key={roundNumber} onComplete={handleComplete} />}
        {phase === 'results' && <ResultsScreen onRetry={handleRetry} onHome={handleHome} />}
      </main>

      <PanelTransition ref={transitionRef} glyph={glyph} />
    </div>
  );
}

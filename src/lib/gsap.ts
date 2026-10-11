import gsap from 'gsap';

/**
 * One configured GSAP instance for the whole app.
 *
 * Defaults are set here rather than repeated at every call site, so the
 * easing of the UI is a single decision. `power3.out` is the house curve: fast
 * departure, long settle — the timing of a brush stroke lifting off paper.
 */
gsap.config({
  nullTargetWarn: false,
  force3D: true,
});

gsap.defaults({
  ease: 'power3.out',
  duration: 0.55,
});

// A long frame should not be smoothed away; a dropped frame during a panel
// wipe is better than a timeline that silently desynchronises from state.
gsap.ticker.lagSmoothing(0);

export { gsap };

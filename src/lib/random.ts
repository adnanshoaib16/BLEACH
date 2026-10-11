/**
 * Deterministic PRNG (mulberry32).
 *
 * Used anywhere a composition needs to look hand-placed but identical on every
 * load: the particle field, the ribbon paths, the angles of a speed-line fan.
 * Math.random would re-roll those on every mount, which makes art direction
 * impossible to judge and visual regressions impossible to spot.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear interpolation, clamped to the 0–1 range of `t`. */
export function lerp(from: number, to: number, t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return from + (to - from) * clamped;
}

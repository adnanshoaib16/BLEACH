import type { QualityTier } from '../types/quiz';

interface NavigatorWithMemory extends Navigator {
  readonly deviceMemory?: number;
}

export interface QualityProfile {
  readonly tier: QualityTier;
  readonly particles: number;
  readonly wisps: number;
  /** Tube segments per wisp. The dominant cost of the ribbon geometry. */
  readonly wispSegments: number;
  readonly bloom: boolean;
  readonly aberration: boolean;
  /** Upper bound on devicePixelRatio, the single biggest fill-rate lever. */
  readonly maxPixelRatio: number;
}

const PROFILES: Readonly<Record<QualityTier, QualityProfile>> = {
  high: {
    tier: 'high',
    particles: 2000,
    wisps: 5,
    wispSegments: 180,
    bloom: true,
    aberration: true,
    maxPixelRatio: 2,
  },
  medium: {
    tier: 'medium',
    particles: 1100,
    wisps: 4,
    wispSegments: 120,
    bloom: true,
    aberration: false,
    maxPixelRatio: 1.5,
  },
  low: {
    tier: 'low',
    particles: 450,
    wisps: 2,
    wispSegments: 72,
    bloom: false,
    aberration: false,
    maxPixelRatio: 1,
  },
  off: {
    tier: 'off',
    particles: 0,
    wisps: 0,
    wispSegments: 0,
    bloom: false,
    aberration: false,
    maxPixelRatio: 1,
  },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');
    // Release the probe context immediately; browsers cap concurrent contexts.
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

/**
 * Picks a quality tier once, from signals that are cheap and available before
 * the first frame. Deliberately conservative: a stuttering background is worse
 * than a simpler one, and the composition still reads at every tier.
 *
 * Honouring prefers-reduced-motion switches WebGL off entirely rather than
 * slowing it down, because the objection is to the movement, not the cost.
 */
export function detectQuality(): QualityProfile {
  if (prefersReducedMotion()) return PROFILES.off;
  if (!hasWebGL2()) return PROFILES.off;

  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const dpr = window.devicePixelRatio;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 500;

  // A coarse pointer on a small screen at high DPR is a phone: it has the
  // pixels to fill but rarely the bandwidth to fill them with post-processing.
  if (coarse && narrow && dpr > 2) return PROFILES.low;
  if (cores <= 4 || memory <= 2) return PROFILES.low;
  if (cores <= 6 || (coarse && narrow)) return PROFILES.medium;
  return PROFILES.high;
}

export function profileFor(tier: QualityTier): QualityProfile {
  return PROFILES[tier];
}

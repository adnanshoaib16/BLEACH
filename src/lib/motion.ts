let cachedSlice: number | null = null;

/**
 * The shared diagonal, in degrees, read from the `--slice` custom property.
 *
 * Panels, dividers and the wipe all cut at the same angle, which is what makes
 * the layout read as one sliced page rather than assorted shapes. CSS owns the
 * value; this reads it so JavaScript-driven transforms cannot drift from it.
 */
export function sliceAngle(): number {
  if (cachedSlice !== null) return cachedSlice;

  const raw = getComputedStyle(document.documentElement).getPropertyValue('--slice');
  const parsed = Number.parseFloat(raw);
  cachedSlice = Number.isFinite(parsed) ? parsed : 7;
  return cachedSlice;
}

/** How many slabs the panel wipe is cut into. */
export const WIPE_SLABS = 4;

/**
 * Writes a custom property on <html>, which is where the live animation
 * channels (`--shake`, `--invert`, `--glow`, `--aberration`) live.
 */
export function setChannel(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value);
}

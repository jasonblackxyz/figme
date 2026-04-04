/**
 * Measure the visual brightness of a character when rendered in a monospace font.
 * Returns a value from 0 (empty/dark) to 1 (fully filled/bright).
 *
 * @experimental Stub — not yet implemented. Returns 0.5 for all characters.
 * Real implementation will render the character to a canvas and compute
 * average pixel brightness. Deferred to Tier 2 (Image tool).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- TODO: remove when implemented */
export function measureCharBrightness(
  _char: string,
  _fontFamily?: string,
  _fontSize?: number,
): number {
  return 0.5;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

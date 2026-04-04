import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { PatternFillConfig } from './types.ts';
import type { PatternTile } from './types.ts';

/**
 * Stamp a repeating pattern fill into a buffer for the given region.
 *
 * Stub: returns null. Real implementation will tile the pattern
 * across the region with offset support.
 */
export function stampPatternFill(
  _config: PatternFillConfig,
  _tile: PatternTile,
): StampBuffer | null {
  return null;
}

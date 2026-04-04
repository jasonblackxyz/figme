import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { AlignmentMode, AlignmentResult } from './types.ts';

/**
 * Compute aligned positions for a set of selected layers.
 *
 * Stub: returns empty positions. Real implementation will compute
 * alignment and distribution for all 8 alignment modes.
 */
export function computeAlignment(
  _selectedRects: Record<string, GridRect>,
  _mode: AlignmentMode,
): AlignmentResult {
  return {
    newPositions: {},
  };
}

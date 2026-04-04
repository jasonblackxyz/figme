import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { AlignmentMode, AlignmentResult } from './types.ts';

/**
 * Compute aligned positions for a set of selected layers.
 *
 * @experimental Stub — not yet implemented. Returns empty positions.
 * Real implementation will compute alignment and distribution for
 * all 8 alignment modes. Deferred to Tier 2 (Alignment feature).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- TODO: remove when implemented */
export function computeAlignment(
  _selectedRects: Record<string, GridRect>,
  _mode: AlignmentMode,
): AlignmentResult {
  return {
    newPositions: {},
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars */

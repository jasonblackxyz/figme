import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { GuideResult } from './types.ts';

/**
 * Compute smart alignment guides for a layer being dragged.
 *
 * @experimental Stub — not yet implemented. Returns empty guides.
 * Real implementation will detect edge-to-edge, center-to-center,
 * and spacing relationships. Deferred to Tier 2 (Smart guides feature).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- TODO: remove when implemented */
export function computeGuides(
  _draggingRect: GridRect,
  _otherRects: GridRect[],
  _snapThreshold?: number,
): GuideResult {
  return {
    guides: [],
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars */

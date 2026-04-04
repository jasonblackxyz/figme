import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { GuideResult } from './types.ts';

/**
 * Compute smart alignment guides for a layer being dragged.
 *
 * Stub: returns empty guides. Real implementation will detect
 * edge-to-edge, center-to-center, and spacing relationships.
 */
export function computeGuides(
  _draggingRect: GridRect,
  _otherRects: GridRect[],
  _snapThreshold?: number,
): GuideResult {
  return {
    guides: [],
  };
}

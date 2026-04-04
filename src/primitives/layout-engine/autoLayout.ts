import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { AutoLayoutConfig } from '@primitives/document-model/types.ts';
import type { AutoLayoutResult } from './types.ts';

/**
 * Compute auto-layout positions for children within a container.
 *
 * Stub: returns empty child rects. Real implementation will stack
 * children vertically or horizontally with gap, padding, and sizing.
 */
export function computeAutoLayout(
  _parentRect: GridRect,
  _config: AutoLayoutConfig,
  _childRects: Record<string, GridRect>,
): AutoLayoutResult {
  return {
    childRects: {},
    parentRect: _parentRect,
    overflow: false,
  };
}

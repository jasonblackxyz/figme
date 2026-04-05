import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { AutoLayoutConfig } from '@primitives/document-model/types.ts';
import type { AutoLayoutResult } from './types.ts';

/**
 * Compute auto-layout positions for children within a container.
 *
 * Stacks children in the configured direction with gap between them.
 * Applies padding inside the parent rect.
 * Cross-axis alignment (start/center/end) positions children perpendicular
 * to the layout direction.
 *
 * If sizing='hug-contents': compute minimal parent rect wrapping all children + padding.
 * If sizing='fixed': use provided parentRect, report overflow if children exceed bounds.
 */
export function computeAutoLayout(
  parentRect: GridRect,
  config: AutoLayoutConfig,
  childRects: Record<string, GridRect>,
): AutoLayoutResult {
  const entries = Object.entries(childRects);
  if (entries.length === 0) {
    return {
      childRects: {},
      parentRect,
      overflow: false,
    };
  }

  const { direction, gap, padding, alignment, sizing } = config;

  // Sort children by their current position along the layout direction
  // to preserve visual order
  if (direction === 'horizontal') {
    entries.sort((a, b) => a[1].col - b[1].col);
  } else {
    entries.sort((a, b) => a[1].row - b[1].row);
  }

  // Compute content area inside padding
  const contentCol = parentRect.col + padding.left;
  const contentRow = parentRect.row + padding.top;
  const contentWidth = Math.max(0, parentRect.width - padding.left - padding.right);
  const contentHeight = Math.max(0, parentRect.height - padding.top - padding.bottom);

  const newChildRects: Record<string, GridRect> = {};

  if (direction === 'horizontal') {
    // Stack children horizontally
    let currentCol = contentCol;

    // Compute total main-axis size needed
    let totalMainSize = 0;
    for (let i = 0; i < entries.length; i++) {
      const [, rect] = entries[i]!;
      totalMainSize += rect.width;
      if (i < entries.length - 1) {
        totalMainSize += gap;
      }
    }

    // Find max cross-axis size for hug-contents
    let maxCrossSize = 0;
    for (const [, rect] of entries) {
      maxCrossSize = Math.max(maxCrossSize, rect.height);
    }

    for (let i = 0; i < entries.length; i++) {
      const [id, rect] = entries[i]!;

      // Cross-axis (vertical) alignment
      let childRow: number;
      if (sizing === 'fixed') {
        switch (alignment) {
          case 'start':
            childRow = contentRow;
            break;
          case 'center':
            childRow = contentRow + Math.floor((contentHeight - rect.height) / 2);
            break;
          case 'end':
            childRow = contentRow + contentHeight - rect.height;
            break;
        }
      } else {
        // hug-contents: align relative to max cross size
        switch (alignment) {
          case 'start':
            childRow = contentRow;
            break;
          case 'center':
            childRow = contentRow + Math.floor((maxCrossSize - rect.height) / 2);
            break;
          case 'end':
            childRow = contentRow + maxCrossSize - rect.height;
            break;
        }
      }

      newChildRects[id] = {
        col: currentCol,
        row: childRow,
        width: rect.width,
        height: rect.height,
      };

      currentCol += rect.width + gap;
    }

    // Compute resulting parent rect
    let finalParentRect: GridRect;
    let overflow = false;

    if (sizing === 'hug-contents') {
      finalParentRect = {
        col: parentRect.col,
        row: parentRect.row,
        width: totalMainSize + padding.left + padding.right,
        height: maxCrossSize + padding.top + padding.bottom,
      };
    } else {
      finalParentRect = parentRect;
      overflow =
        totalMainSize > contentWidth ||
        maxCrossSize > contentHeight;
    }

    return { childRects: newChildRects, parentRect: finalParentRect, overflow };
  } else {
    // Stack children vertically
    let currentRow = contentRow;

    let totalMainSize = 0;
    for (let i = 0; i < entries.length; i++) {
      const [, rect] = entries[i]!;
      totalMainSize += rect.height;
      if (i < entries.length - 1) {
        totalMainSize += gap;
      }
    }

    let maxCrossSize = 0;
    for (const [, rect] of entries) {
      maxCrossSize = Math.max(maxCrossSize, rect.width);
    }

    for (let i = 0; i < entries.length; i++) {
      const [id, rect] = entries[i]!;

      // Cross-axis (horizontal) alignment
      let childCol: number;
      if (sizing === 'fixed') {
        switch (alignment) {
          case 'start':
            childCol = contentCol;
            break;
          case 'center':
            childCol = contentCol + Math.floor((contentWidth - rect.width) / 2);
            break;
          case 'end':
            childCol = contentCol + contentWidth - rect.width;
            break;
        }
      } else {
        switch (alignment) {
          case 'start':
            childCol = contentCol;
            break;
          case 'center':
            childCol = contentCol + Math.floor((maxCrossSize - rect.width) / 2);
            break;
          case 'end':
            childCol = contentCol + maxCrossSize - rect.width;
            break;
        }
      }

      newChildRects[id] = {
        col: childCol,
        row: currentRow,
        width: rect.width,
        height: rect.height,
      };

      currentRow += rect.height + gap;
    }

    let finalParentRect: GridRect;
    let overflow = false;

    if (sizing === 'hug-contents') {
      finalParentRect = {
        col: parentRect.col,
        row: parentRect.row,
        width: maxCrossSize + padding.left + padding.right,
        height: totalMainSize + padding.top + padding.bottom,
      };
    } else {
      finalParentRect = parentRect;
      overflow =
        totalMainSize > contentHeight ||
        maxCrossSize > contentWidth;
    }

    return { childRects: newChildRects, parentRect: finalParentRect, overflow };
  }
}

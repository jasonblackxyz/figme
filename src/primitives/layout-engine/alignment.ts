import type { GridRect, GridPosition } from '@primitives/grid-engine/types.ts';
import type { AlignmentMode, AlignmentResult } from './types.ts';

/**
 * Compute aligned positions for a set of selected layers.
 *
 * Implements all 8 AlignmentMode values:
 * - align-left/right/top/bottom: align edges
 * - align-center-h/center-v: center on bounding box
 * - distribute-h/distribute-v: equal spacing distribution
 */
export function computeAlignment(
  selectedRects: Record<string, GridRect>,
  mode: AlignmentMode,
): AlignmentResult {
  const entries = Object.entries(selectedRects);
  if (entries.length === 0) {
    return { newPositions: {} };
  }

  const newPositions: Record<string, GridPosition> = {};

  // Compute bounding box of all rects
  let minCol = Infinity;
  let maxRight = -Infinity;
  let minRow = Infinity;
  let maxBottom = -Infinity;

  for (const [, rect] of entries) {
    minCol = Math.min(minCol, rect.col);
    maxRight = Math.max(maxRight, rect.col + rect.width);
    minRow = Math.min(minRow, rect.row);
    maxBottom = Math.max(maxBottom, rect.row + rect.height);
  }

  switch (mode) {
    case 'align-left': {
      for (const [id, rect] of entries) {
        newPositions[id] = { col: minCol, row: rect.row };
      }
      break;
    }

    case 'align-right': {
      for (const [id, rect] of entries) {
        newPositions[id] = { col: maxRight - rect.width, row: rect.row };
      }
      break;
    }

    case 'align-top': {
      for (const [id, rect] of entries) {
        newPositions[id] = { col: rect.col, row: minRow };
      }
      break;
    }

    case 'align-bottom': {
      for (const [id, rect] of entries) {
        newPositions[id] = { col: rect.col, row: maxBottom - rect.height };
      }
      break;
    }

    case 'align-center-h': {
      const centerCol = Math.floor((minCol + maxRight) / 2);
      for (const [id, rect] of entries) {
        newPositions[id] = {
          col: centerCol - Math.floor(rect.width / 2),
          row: rect.row,
        };
      }
      break;
    }

    case 'align-center-v': {
      const centerRow = Math.floor((minRow + maxBottom) / 2);
      for (const [id, rect] of entries) {
        newPositions[id] = {
          col: rect.col,
          row: centerRow - Math.floor(rect.height / 2),
        };
      }
      break;
    }

    case 'distribute-h': {
      if (entries.length < 2) {
        for (const [id, rect] of entries) {
          newPositions[id] = { col: rect.col, row: rect.row };
        }
        break;
      }

      // Sort by col position
      const sorted = [...entries].sort((a, b) => a[1].col - b[1].col);

      // Total width occupied by rects
      let totalRectWidth = 0;
      for (const [, rect] of sorted) {
        totalRectWidth += rect.width;
      }

      // Available space for gaps
      const totalSpace = maxRight - minCol;
      const totalGapSpace = totalSpace - totalRectWidth;
      const gapCount = sorted.length - 1;

      if (gapCount <= 0) {
        for (const [id, rect] of entries) {
          newPositions[id] = { col: rect.col, row: rect.row };
        }
        break;
      }

      const baseGap = Math.floor(totalGapSpace / gapCount);
      const remainder = totalGapSpace - baseGap * gapCount;

      // First rect stays at minCol
      let currentCol = minCol;
      for (let i = 0; i < sorted.length; i++) {
        const [id, rect] = sorted[i]!;
        newPositions[id] = { col: currentCol, row: rect.row };
        if (i < gapCount) {
          // First `remainder` gaps get +1 cell
          const gap = baseGap + (i < remainder ? 1 : 0);
          currentCol += rect.width + gap;
        }
      }
      break;
    }

    case 'distribute-v': {
      if (entries.length < 2) {
        for (const [id, rect] of entries) {
          newPositions[id] = { col: rect.col, row: rect.row };
        }
        break;
      }

      // Sort by row position
      const sorted = [...entries].sort((a, b) => a[1].row - b[1].row);

      let totalRectHeight = 0;
      for (const [, rect] of sorted) {
        totalRectHeight += rect.height;
      }

      const totalSpace = maxBottom - minRow;
      const totalGapSpace = totalSpace - totalRectHeight;
      const gapCount = sorted.length - 1;

      if (gapCount <= 0) {
        for (const [id, rect] of entries) {
          newPositions[id] = { col: rect.col, row: rect.row };
        }
        break;
      }

      const baseGap = Math.floor(totalGapSpace / gapCount);
      const remainder = totalGapSpace - baseGap * gapCount;

      let currentRow = minRow;
      for (let i = 0; i < sorted.length; i++) {
        const [id, rect] = sorted[i]!;
        newPositions[id] = { col: rect.col, row: currentRow };
        if (i < gapCount) {
          const gap = baseGap + (i < remainder ? 1 : 0);
          currentRow += rect.height + gap;
        }
      }
      break;
    }
  }

  return { newPositions };
}

import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface HandleDef {
  key: ResizeHandle;
  cursor: string;
  /** CSS position: [top|bottom|center, left|right|center] */
  x: 'left' | 'center' | 'right';
  y: 'top' | 'center' | 'bottom';
}

interface PixelPoint {
  x: number;
  y: number;
}

export const HANDLES: HandleDef[] = [
  { key: 'nw', cursor: 'nwse-resize', x: 'left', y: 'top' },
  { key: 'n', cursor: 'ns-resize', x: 'center', y: 'top' },
  { key: 'ne', cursor: 'nesw-resize', x: 'right', y: 'top' },
  { key: 'e', cursor: 'ew-resize', x: 'right', y: 'center' },
  { key: 'se', cursor: 'nwse-resize', x: 'right', y: 'bottom' },
  { key: 's', cursor: 'ns-resize', x: 'center', y: 'bottom' },
  { key: 'sw', cursor: 'nesw-resize', x: 'left', y: 'bottom' },
  { key: 'w', cursor: 'ew-resize', x: 'left', y: 'center' },
];

function handleMovesLeftEdge(handle: ResizeHandle): boolean {
  return handle === 'nw' || handle === 'w' || handle === 'sw';
}

function handleMovesRightEdge(handle: ResizeHandle): boolean {
  return handle === 'ne' || handle === 'e' || handle === 'se';
}

function handleMovesTopEdge(handle: ResizeHandle): boolean {
  return handle === 'nw' || handle === 'n' || handle === 'ne';
}

function handleMovesBottomEdge(handle: ResizeHandle): boolean {
  return handle === 'sw' || handle === 's' || handle === 'se';
}

function quantizeDelta(
  startPx: number,
  currentPx: number,
  anchorPx: number,
  cellSize: number,
): number {
  const startBucket = Math.round((startPx - anchorPx) / cellSize);
  const currentBucket = Math.round((currentPx - anchorPx) / cellSize);
  return currentBucket - startBucket;
}

export function getHandleAnchorPx(
  rect: GridRect,
  handle: ResizeHandle,
  gridConfig: GridConfig,
): PixelPoint {
  const left = rect.col * gridConfig.cellWidth;
  const right = (rect.col + rect.width) * gridConfig.cellWidth;
  const top = rect.row * gridConfig.cellHeight;
  const bottom = (rect.row + rect.height) * gridConfig.cellHeight;

  return {
    x: handleMovesLeftEdge(handle)
      ? left
      : handleMovesRightEdge(handle)
        ? right
        : left + (right - left) / 2,
    y: handleMovesTopEdge(handle)
      ? top
      : handleMovesBottomEdge(handle)
        ? bottom
        : top + (bottom - top) / 2,
  };
}

export function computeResizeDragDelta(
  rect: GridRect,
  handle: ResizeHandle,
  startPointerPx: PixelPoint,
  currentPointerPx: PixelPoint,
  gridConfig: GridConfig,
): { deltaCol: number; deltaRow: number } {
  const anchor = getHandleAnchorPx(rect, handle, gridConfig);

  return {
    deltaCol:
      handleMovesLeftEdge(handle) || handleMovesRightEdge(handle)
        ? quantizeDelta(startPointerPx.x, currentPointerPx.x, anchor.x, gridConfig.cellWidth)
        : 0,
    deltaRow:
      handleMovesTopEdge(handle) || handleMovesBottomEdge(handle)
        ? quantizeDelta(startPointerPx.y, currentPointerPx.y, anchor.y, gridConfig.cellHeight)
        : 0,
  };
}

/**
 * Compute a new GridRect after dragging a resize handle by (deltaCol, deltaRow) grid cells.
 * Clamps to a minimum of 1×1.
 */
export function computeResizedRect(
  orig: GridRect,
  handle: ResizeHandle,
  deltaCol: number,
  deltaRow: number,
): GridRect {
  let { col, row, width, height } = orig;

  // Horizontal: handles containing 'w' move the left edge, 'e' move the right edge
  if (handleMovesLeftEdge(handle)) {
    const maxDelta = width - 1; // can't shrink past 1
    const clamped = Math.min(deltaCol, maxDelta);
    col = orig.col + clamped;
    width = orig.width - clamped;
  } else if (handleMovesRightEdge(handle)) {
    width = Math.max(1, orig.width + deltaCol);
  }

  // Vertical: handles containing 'n' move the top edge, 's' move the bottom edge
  if (handleMovesTopEdge(handle)) {
    const maxDelta = height - 1;
    const clamped = Math.min(deltaRow, maxDelta);
    row = orig.row + clamped;
    height = orig.height - clamped;
  } else if (handleMovesBottomEdge(handle)) {
    height = Math.max(1, orig.height + deltaRow);
  }

  return { col, row, width, height };
}

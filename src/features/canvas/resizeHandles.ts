import type { GridRect } from '@primitives/grid-engine/types.ts';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface HandleDef {
  key: ResizeHandle;
  cursor: string;
  /** CSS position: [top|bottom|center, left|right|center] */
  x: 'left' | 'center' | 'right';
  y: 'top' | 'center' | 'bottom';
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
  if (handle === 'nw' || handle === 'w' || handle === 'sw') {
    const maxDelta = width - 1; // can't shrink past 1
    const clamped = Math.min(deltaCol, maxDelta);
    col = orig.col + clamped;
    width = orig.width - clamped;
  } else if (handle === 'ne' || handle === 'e' || handle === 'se') {
    width = Math.max(1, orig.width + deltaCol);
  }

  // Vertical: handles containing 'n' move the top edge, 's' move the bottom edge
  if (handle === 'nw' || handle === 'n' || handle === 'ne') {
    const maxDelta = height - 1;
    const clamped = Math.min(deltaRow, maxDelta);
    row = orig.row + clamped;
    height = orig.height - clamped;
  } else if (handle === 'sw' || handle === 's' || handle === 'se') {
    height = Math.max(1, orig.height + deltaRow);
  }

  return { col, row, width, height };
}

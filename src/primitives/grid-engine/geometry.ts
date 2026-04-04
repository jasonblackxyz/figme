import type { GridRect } from './types.ts';

/**
 * Check if two grid rects intersect (overlap at all).
 */
export function rectIntersects(a: GridRect, b: GridRect): boolean {
  return (
    a.col < b.col + b.width &&
    a.col + a.width > b.col &&
    a.row < b.row + b.height &&
    a.row + a.height > b.row
  );
}

/**
 * Check if the outer rect fully contains the inner rect.
 */
export function rectContains(outer: GridRect, inner: GridRect): boolean {
  return (
    inner.col >= outer.col &&
    inner.row >= outer.row &&
    inner.col + inner.width <= outer.col + outer.width &&
    inner.row + inner.height <= outer.row + outer.height
  );
}

/**
 * Compute the overlapping region of two rects.
 * Returns null if there is no overlap.
 */
export function rectOverlap(a: GridRect, b: GridRect): GridRect | null {
  const col = Math.max(a.col, b.col);
  const row = Math.max(a.row, b.row);
  const right = Math.min(a.col + a.width, b.col + b.width);
  const bottom = Math.min(a.row + a.height, b.row + b.height);

  const width = right - col;
  const height = bottom - row;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { col, row, width, height };
}

/**
 * Compute the inner rect after applying padding.
 * Returns the available content area inside a padded rect.
 */
export function innerRect(
  rect: GridRect,
  padding: { top: number; right: number; bottom: number; left: number },
): GridRect {
  return {
    col: rect.col + padding.left,
    row: rect.row + padding.top,
    width: Math.max(0, rect.width - padding.left - padding.right),
    height: Math.max(0, rect.height - padding.top - padding.bottom),
  };
}

/**
 * Check if two rects are equal (same position and dimensions).
 */
export function rectsEqual(a: GridRect, b: GridRect): boolean {
  return (
    a.col === b.col &&
    a.row === b.row &&
    a.width === b.width &&
    a.height === b.height
  );
}

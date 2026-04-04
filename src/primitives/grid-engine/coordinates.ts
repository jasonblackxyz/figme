import type { GridConfig, GridPosition } from './types.ts';

/**
 * Convert pixel coordinates to grid position.
 * Returns the cell that contains the given pixel coordinate.
 */
export function pixelToGrid(
  px: { x: number; y: number },
  config: GridConfig,
): GridPosition {
  return {
    col: Math.floor(px.x / config.cellWidth),
    row: Math.floor(px.y / config.cellHeight),
  };
}

/**
 * Convert grid position to pixel coordinates.
 * Returns the top-left corner of the given cell.
 */
export function gridToPixel(
  pos: GridPosition,
  config: GridConfig,
): { x: number; y: number } {
  return {
    x: pos.col * config.cellWidth,
    y: pos.row * config.cellHeight,
  };
}

/**
 * Snap pixel coordinates to the nearest grid cell.
 * Uses rounding rather than flooring for nearest-cell behavior.
 */
export function snapToGrid(
  px: { x: number; y: number },
  config: GridConfig,
): GridPosition {
  return {
    col: Math.round(px.x / config.cellWidth),
    row: Math.round(px.y / config.cellHeight),
  };
}

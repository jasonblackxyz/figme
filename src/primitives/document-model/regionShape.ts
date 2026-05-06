import type { GridPosition, GridRect } from '@primitives/grid-engine/types.ts';
import type { RegionShape, SemanticRegion } from './types.ts';

const cellKey = (row: number, col: number) => `${row},${col}`;

/**
 * Compute the smallest rectangle that contains every given cell.
 * Returns a 0-cell rect at (0,0) if cells is empty.
 */
export function boundingRectFromCells(cells: ReadonlyArray<GridPosition>): GridRect {
  if (cells.length === 0) {
    return { col: 0, row: 0, width: 0, height: 0 };
  }
  let minCol = Infinity;
  let minRow = Infinity;
  let maxCol = -Infinity;
  let maxRow = -Infinity;
  for (const cell of cells) {
    if (cell.col < minCol) minCol = cell.col;
    if (cell.col > maxCol) maxCol = cell.col;
    if (cell.row < minRow) minRow = cell.row;
    if (cell.row > maxRow) maxRow = cell.row;
  }
  return {
    col: minCol,
    row: minRow,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}

/**
 * Given a bounding rect and the included cells, return the cells inside
 * the rect that are NOT included. These belong in `RegionShape.exclude`.
 */
export function computeExclude(rect: GridRect, cells: ReadonlyArray<GridPosition>): GridPosition[] {
  if (rect.width <= 0 || rect.height <= 0) return [];
  const included = new Set<string>();
  for (const cell of cells) included.add(cellKey(cell.row, cell.col));

  const exclude: GridPosition[] = [];
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      if (!included.has(cellKey(r, c))) exclude.push({ row: r, col: c });
    }
  }
  return exclude;
}

/** True when the cell is inside the rect and not excluded. */
export function cellInShape(shape: RegionShape, cell: GridPosition): boolean {
  const { rect, exclude } = shape;
  if (
    cell.col < rect.col ||
    cell.col >= rect.col + rect.width ||
    cell.row < rect.row ||
    cell.row >= rect.row + rect.height
  ) {
    return false;
  }
  if (!exclude || exclude.length === 0) return true;
  for (const excluded of exclude) {
    if (excluded.col === cell.col && excluded.row === cell.row) return false;
  }
  return true;
}

/**
 * Find the topmost region whose shape contains the given cell. Higher z wins;
 * ties break in favour of the later-defined region (regionOrder respected).
 */
export function findRegionAtCell(
  regions: Record<string, SemanticRegion> | undefined,
  regionOrder: string[] | undefined,
  cell: GridPosition,
): SemanticRegion | undefined {
  if (!regions) return undefined;
  const order = regionOrder ?? Object.keys(regions);
  let best: SemanticRegion | undefined;
  for (const id of order) {
    const region = regions[id];
    if (!region) continue;
    if (!cellInShape(region.shape, cell)) continue;
    if (!best) {
      best = region;
      continue;
    }
    const aZ = region.z ?? 0;
    const bZ = best.z ?? 0;
    if (aZ >= bZ) best = region;
  }
  return best;
}

/**
 * Return all cells (row,col) that the shape covers — useful for overlays
 * and tests. Skips excluded cells.
 */
export function expandShapeToCells(shape: RegionShape): GridPosition[] {
  const cells: GridPosition[] = [];
  const { rect, exclude } = shape;
  const excludeSet = new Set((exclude ?? []).map((c) => cellKey(c.row, c.col)));
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      if (excludeSet.has(cellKey(r, c))) continue;
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

/** Bounding rect for an arbitrary set of GridRects (e.g. layer rects). */
export function unionRect(rects: ReadonlyArray<GridRect>): GridRect | null {
  if (rects.length === 0) return null;
  let minCol = Infinity;
  let minRow = Infinity;
  let maxCol = -Infinity;
  let maxRow = -Infinity;
  for (const r of rects) {
    if (r.col < minCol) minCol = r.col;
    if (r.row < minRow) minRow = r.row;
    if (r.col + r.width > maxCol) maxCol = r.col + r.width;
    if (r.row + r.height > maxRow) maxRow = r.row + r.height;
  }
  return { col: minCol, row: minRow, width: maxCol - minCol, height: maxRow - minRow };
}

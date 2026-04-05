import type { StampBuffer } from './types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { StyleKey } from '@primitives/style-system/types.ts';
import { createBuffer } from './buffer.ts';

/**
 * Compute the center point of a rect.
 */
function rectCenter(rect: GridRect): { col: number; row: number } {
  return {
    col: rect.col + Math.floor(rect.width / 2),
    row: rect.row + Math.floor(rect.height / 2),
  };
}

/**
 * Draw box-drawing characters along an L-shaped path between two layer rects.
 *
 * For v1, uses simple L-shaped routing: go horizontal first from source center,
 * then vertical to target center. Uses appropriate box-drawing characters:
 * - '─' for horizontal segments
 * - '│' for vertical segments
 * - Corner characters for the turn point (┐ ┘ └ ┌)
 *
 * Returns a buffer sized to canvas dimensions with the path drawn.
 */
export function stampEdge(
  sourceRect: GridRect,
  targetRect: GridRect,
  styleKey: StyleKey,
  canvasWidth: number,
  canvasHeight: number,
): StampBuffer {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return createBuffer(0, 0);
  }

  const buffer = createBuffer(canvasWidth, canvasHeight);
  const source = rectCenter(sourceRect);
  const target = rectCenter(targetRect);

  // Clamp coordinates to canvas bounds
  const srcCol = Math.max(0, Math.min(canvasWidth - 1, source.col));
  const srcRow = Math.max(0, Math.min(canvasHeight - 1, source.row));
  const tgtCol = Math.max(0, Math.min(canvasWidth - 1, target.col));
  const tgtRow = Math.max(0, Math.min(canvasHeight - 1, target.row));

  // Special case: same point
  if (srcCol === tgtCol && srcRow === tgtRow) {
    setCell(buffer, srcRow, srcCol, '·', styleKey);
    return buffer;
  }

  // Special case: purely horizontal line
  if (srcRow === tgtRow) {
    drawHorizontalSegment(buffer, srcRow, srcCol, tgtCol, styleKey);
    return buffer;
  }

  // Special case: purely vertical line
  if (srcCol === tgtCol) {
    drawVerticalSegment(buffer, srcCol, srcRow, tgtRow, styleKey);
    return buffer;
  }

  // L-shaped routing: horizontal from source, then vertical to target
  // The corner is at (tgtCol, srcRow)
  const cornerCol = tgtCol;
  const cornerRow = srcRow;

  // Draw horizontal segment from source to corner
  drawHorizontalSegment(buffer, srcRow, srcCol, cornerCol, styleKey);

  // Draw vertical segment from corner to target
  drawVerticalSegment(buffer, cornerCol, cornerRow, tgtRow, styleKey);

  // Place corner character
  const cornerChar = getCornerChar(srcCol, srcRow, tgtCol, tgtRow);
  setCell(buffer, cornerRow, cornerCol, cornerChar, styleKey);

  return buffer;
}

/**
 * Draw a horizontal segment of '─' characters.
 */
function drawHorizontalSegment(
  buffer: StampBuffer,
  row: number,
  fromCol: number,
  toCol: number,
  styleKey: StyleKey,
): void {
  const minCol = Math.min(fromCol, toCol);
  const maxCol = Math.max(fromCol, toCol);
  for (let c = minCol; c <= maxCol; c++) {
    setCell(buffer, row, c, '─', styleKey);
  }
}

/**
 * Draw a vertical segment of '│' characters.
 */
function drawVerticalSegment(
  buffer: StampBuffer,
  col: number,
  fromRow: number,
  toRow: number,
  styleKey: StyleKey,
): void {
  const minRow = Math.min(fromRow, toRow);
  const maxRow = Math.max(fromRow, toRow);
  for (let r = minRow; r <= maxRow; r++) {
    setCell(buffer, r, col, '│', styleKey);
  }
}

/**
 * Determine the correct corner character for an L-shaped path.
 *
 * The corner is at (tgtCol, srcRow). Direction determines which corner:
 *
 * Source left of target:
 *   Target below: ┐  (going right then down)
 *   Target above: ┘  (going right then up)
 * Source right of target:
 *   Target below: ┌  (going left then down)
 *   Target above: └  (going left then up)
 */
function getCornerChar(
  srcCol: number,
  srcRow: number,
  tgtCol: number,
  tgtRow: number,
): string {
  const goingRight = tgtCol > srcCol;
  const goingDown = tgtRow > srcRow;

  if (goingRight && goingDown) return '┐';
  if (goingRight && !goingDown) return '┘';
  if (!goingRight && goingDown) return '┌';
  return '└';
}

/**
 * Safely set a cell in the buffer (bounds-checked).
 */
function setCell(
  buffer: StampBuffer,
  row: number,
  col: number,
  char: string,
  styleKey: StyleKey,
): void {
  if (row >= 0 && row < buffer.height && col >= 0 && col < buffer.width) {
    buffer.chars[row]![col] = char;
    buffer.styles[row]![col] = styleKey;
  }
}

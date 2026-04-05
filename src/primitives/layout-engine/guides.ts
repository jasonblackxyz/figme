import type { GridRect, GridPosition } from '@primitives/grid-engine/types.ts';
import type { Guide, GuideResult } from './types.ts';

/**
 * Extract all 6 edge positions from a rect:
 * left, right, top, bottom, center-h, center-v
 */
interface RectEdges {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerH: number;
  centerV: number;
}

function getRectEdges(rect: GridRect): RectEdges {
  return {
    left: rect.col,
    right: rect.col + rect.width,
    top: rect.row,
    bottom: rect.row + rect.height,
    centerH: rect.col + Math.floor(rect.width / 2),
    centerV: rect.row + Math.floor(rect.height / 2),
  };
}

/**
 * Compute guide line span from two rects along a given orientation.
 * For vertical guides: span covers min-top to max-bottom of both rects.
 * For horizontal guides: span covers min-left to max-right of both rects.
 */
function computeSpan(
  dragRect: GridRect,
  otherRect: GridRect,
  orientation: 'horizontal' | 'vertical',
): { fromCell: number; toCell: number } {
  if (orientation === 'vertical') {
    const fromCell = Math.min(dragRect.row, otherRect.row);
    const toCell = Math.max(
      dragRect.row + dragRect.height,
      otherRect.row + otherRect.height,
    );
    return { fromCell, toCell };
  } else {
    const fromCell = Math.min(dragRect.col, otherRect.col);
    const toCell = Math.max(
      dragRect.col + dragRect.width,
      otherRect.col + otherRect.width,
    );
    return { fromCell, toCell };
  }
}

/**
 * Compute smart alignment guides for a layer being dragged.
 *
 * Checks dragging rect edges (left, right, top, bottom, center-h, center-v)
 * against all other rects' edges. When aligned within threshold, emits a Guide.
 * Also detects equal-spacing patterns between gaps.
 * Returns guides + snap suggestion.
 */
export function computeGuides(
  draggingRect: GridRect,
  otherRects: GridRect[],
  snapThreshold: number = 1,
): GuideResult {
  if (otherRects.length === 0) {
    return { guides: [] };
  }

  const guides: Guide[] = [];
  const dragEdges = getRectEdges(draggingRect);

  // Track closest snap distances for suggestion
  let bestSnapDeltaCol = Infinity;
  let bestSnapDeltaRow = Infinity;
  let snapCol: number | undefined;
  let snapRow: number | undefined;

  // Check vertical edge alignment (left, right, center-h)
  const verticalChecks: Array<{
    dragEdge: number;
    kind: 'edge' | 'center';
    edgeName: string;
  }> = [
    { dragEdge: dragEdges.left, kind: 'edge', edgeName: 'left' },
    { dragEdge: dragEdges.right, kind: 'edge', edgeName: 'right' },
    { dragEdge: dragEdges.centerH, kind: 'center', edgeName: 'centerH' },
  ];

  // Check horizontal edge alignment (top, bottom, center-v)
  const horizontalChecks: Array<{
    dragEdge: number;
    kind: 'edge' | 'center';
    edgeName: string;
  }> = [
    { dragEdge: dragEdges.top, kind: 'edge', edgeName: 'top' },
    { dragEdge: dragEdges.bottom, kind: 'edge', edgeName: 'bottom' },
    { dragEdge: dragEdges.centerV, kind: 'center', edgeName: 'centerV' },
  ];

  for (const other of otherRects) {
    const otherEdges = getRectEdges(other);

    // Vertical guides (left/right/centerH alignment)
    const otherVerticalEdges: Array<{
      pos: number;
      kind: 'edge' | 'center';
    }> = [
      { pos: otherEdges.left, kind: 'edge' },
      { pos: otherEdges.right, kind: 'edge' },
      { pos: otherEdges.centerH, kind: 'center' },
    ];

    for (const check of verticalChecks) {
      for (const otherCheck of otherVerticalEdges) {
        const delta = check.dragEdge - otherCheck.pos;
        if (Math.abs(delta) <= snapThreshold) {
          const span = computeSpan(draggingRect, other, 'vertical');
          const kind = check.kind === 'center' && otherCheck.kind === 'center'
            ? 'center'
            : 'edge';
          guides.push({
            orientation: 'vertical',
            position: otherCheck.pos,
            fromCell: span.fromCell,
            toCell: span.toCell,
            kind,
          });

          // Track best snap for col adjustment
          const absDelta = Math.abs(delta);
          if (absDelta < Math.abs(bestSnapDeltaCol)) {
            bestSnapDeltaCol = delta;
            // Compute the col snap: shift dragging rect so this edge aligns
            if (check.edgeName === 'left') {
              snapCol = otherCheck.pos;
            } else if (check.edgeName === 'right') {
              snapCol = otherCheck.pos - draggingRect.width;
            } else {
              // centerH
              snapCol = otherCheck.pos - Math.floor(draggingRect.width / 2);
            }
          }
        }
      }
    }

    // Horizontal guides (top/bottom/centerV alignment)
    const otherHorizontalEdges: Array<{
      pos: number;
      kind: 'edge' | 'center';
    }> = [
      { pos: otherEdges.top, kind: 'edge' },
      { pos: otherEdges.bottom, kind: 'edge' },
      { pos: otherEdges.centerV, kind: 'center' },
    ];

    for (const check of horizontalChecks) {
      for (const otherCheck of otherHorizontalEdges) {
        const delta = check.dragEdge - otherCheck.pos;
        if (Math.abs(delta) <= snapThreshold) {
          const span = computeSpan(draggingRect, other, 'horizontal');
          const kind = check.kind === 'center' && otherCheck.kind === 'center'
            ? 'center'
            : 'edge';
          guides.push({
            orientation: 'horizontal',
            position: otherCheck.pos,
            fromCell: span.fromCell,
            toCell: span.toCell,
            kind,
          });

          // Track best snap for row adjustment
          const absDelta = Math.abs(delta);
          if (absDelta < Math.abs(bestSnapDeltaRow)) {
            bestSnapDeltaRow = delta;
            if (check.edgeName === 'top') {
              snapRow = otherCheck.pos;
            } else if (check.edgeName === 'bottom') {
              snapRow = otherCheck.pos - draggingRect.height;
            } else {
              // centerV
              snapRow = otherCheck.pos - Math.floor(draggingRect.height / 2);
            }
          }
        }
      }
    }
  }

  // Check for equal-spacing patterns
  const spacingGuides = computeSpacingGuides(draggingRect, otherRects, snapThreshold);
  guides.push(...spacingGuides);

  // Build snap suggestion
  let snapSuggestion: GridPosition | undefined;
  if (snapCol !== undefined || snapRow !== undefined) {
    snapSuggestion = {
      col: snapCol ?? draggingRect.col,
      row: snapRow ?? draggingRect.row,
    };
  }

  return { guides, snapSuggestion };
}

/**
 * Detect equal-spacing patterns between the dragging rect and other rects.
 * When the gap between dragging rect and one neighbor equals the gap
 * between two other neighbors, emit spacing guides.
 */
function computeSpacingGuides(
  draggingRect: GridRect,
  otherRects: GridRect[],
  snapThreshold: number,
): Guide[] {
  const guides: Guide[] = [];
  if (otherRects.length < 2) return guides;

  // Sort rects by col for horizontal spacing analysis
  const hSorted = [...otherRects].sort((a, b) => a.col - b.col);

  // Compute gaps between consecutive rects (horizontally)
  for (let i = 0; i < hSorted.length - 1; i++) {
    const rectA = hSorted[i]!;
    const rectB = hSorted[i + 1]!;
    const gapAB = rectB.col - (rectA.col + rectA.width);
    if (gapAB < 0) continue; // overlapping

    // Check gap from dragging rect to rectA (dragging on left)
    const gapDragToA = rectA.col - (draggingRect.col + draggingRect.width);
    if (Math.abs(gapDragToA - gapAB) <= snapThreshold && gapDragToA >= 0) {
      const midPos = draggingRect.col + draggingRect.width + Math.floor(gapDragToA / 2);
      const fromRow = Math.min(draggingRect.row, rectA.row, rectB.row);
      const toRow = Math.max(
        draggingRect.row + draggingRect.height,
        rectA.row + rectA.height,
        rectB.row + rectB.height,
      );
      guides.push({
        orientation: 'vertical',
        position: midPos,
        fromCell: fromRow,
        toCell: toRow,
        kind: 'spacing',
        label: `${gapAB}`,
      });
    }

    // Check gap from rectB to dragging rect (dragging on right)
    const gapBToDrag = draggingRect.col - (rectB.col + rectB.width);
    if (Math.abs(gapBToDrag - gapAB) <= snapThreshold && gapBToDrag >= 0) {
      const midPos = rectB.col + rectB.width + Math.floor(gapBToDrag / 2);
      const fromRow = Math.min(draggingRect.row, rectA.row, rectB.row);
      const toRow = Math.max(
        draggingRect.row + draggingRect.height,
        rectA.row + rectA.height,
        rectB.row + rectB.height,
      );
      guides.push({
        orientation: 'vertical',
        position: midPos,
        fromCell: fromRow,
        toCell: toRow,
        kind: 'spacing',
        label: `${gapAB}`,
      });
    }
  }

  // Sort rects by row for vertical spacing analysis
  const vSorted = [...otherRects].sort((a, b) => a.row - b.row);

  for (let i = 0; i < vSorted.length - 1; i++) {
    const rectA = vSorted[i]!;
    const rectB = vSorted[i + 1]!;
    const gapAB = rectB.row - (rectA.row + rectA.height);
    if (gapAB < 0) continue;

    const gapDragToA = rectA.row - (draggingRect.row + draggingRect.height);
    if (Math.abs(gapDragToA - gapAB) <= snapThreshold && gapDragToA >= 0) {
      const midPos = draggingRect.row + draggingRect.height + Math.floor(gapDragToA / 2);
      const fromCol = Math.min(draggingRect.col, rectA.col, rectB.col);
      const toCol = Math.max(
        draggingRect.col + draggingRect.width,
        rectA.col + rectA.width,
        rectB.col + rectB.width,
      );
      guides.push({
        orientation: 'horizontal',
        position: midPos,
        fromCell: fromCol,
        toCell: toCol,
        kind: 'spacing',
        label: `${gapAB}`,
      });
    }

    const gapBToDrag = draggingRect.row - (rectB.row + rectB.height);
    if (Math.abs(gapBToDrag - gapAB) <= snapThreshold && gapBToDrag >= 0) {
      const midPos = rectB.row + rectB.height + Math.floor(gapBToDrag / 2);
      const fromCol = Math.min(draggingRect.col, rectA.col, rectB.col);
      const toCol = Math.max(
        draggingRect.col + draggingRect.width,
        rectA.col + rectA.width,
        rectB.col + rectB.width,
      );
      guides.push({
        orientation: 'horizontal',
        position: midPos,
        fromCell: fromCol,
        toCell: toCol,
        kind: 'spacing',
        label: `${gapAB}`,
      });
    }
  }

  return guides;
}

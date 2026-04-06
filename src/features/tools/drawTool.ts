import type { ToolHandler } from './types.ts';
import type { GridPosition } from '@primitives/grid-engine/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { hitTestLayers } from './hitTest.ts';

let isPainting = false;

function getBrushCells(center: GridPosition, size: 1 | 2 | 3): Array<{ row: number; col: number }> {
  if (size === 1) return [{ row: center.row, col: center.col }];
  const offset = Math.floor(size / 2);
  const cells: Array<{ row: number; col: number }> = [];
  for (let dr = -offset; dr < size - offset; dr++) {
    for (let dc = -offset; dc < size - offset; dc++) {
      cells.push({ row: center.row + dr, col: center.col + dc });
    }
  }
  return cells;
}

function paintAt(gridPos: GridPosition) {
  const { brushSize, eraserMode, activeColor } = useUiStore.getState();
  const color = eraserMode ? undefined : activeColor;
  const cells = getBrushCells(gridPos, brushSize);
  const hit = hitTestLayers(gridPos);

  if (hit) {
    // Paint on the layer's cellColorOverrides
    for (const cell of cells) {
      const relRow = cell.row - hit.rect.row;
      const relCol = cell.col - hit.rect.col;
      if (relRow >= 0 && relRow < hit.rect.height && relCol >= 0 && relCol < hit.rect.width) {
        useDocumentStore.getState().setCellColorOverride(hit.id, relRow, relCol, color);
      }
    }
  } else {
    // Paint on the page's cellColorOverrides
    if (cells.length === 1) {
      const cell = cells[0]!;
      useDocumentStore.getState().setPageCellOverride(cell.row, cell.col, color);
    } else {
      useDocumentStore.getState().setPageCellOverridesBulk(cells, color);
    }
  }
}

export const drawTool: ToolHandler = {
  cursor: 'crosshair',

  onPointerDown(gridPos: GridPosition, _event: PointerEvent) {
    isPainting = true;
    paintAt(gridPos);
  },

  onPointerMove(gridPos: GridPosition, _event: PointerEvent) {
    if (!isPainting) return;
    paintAt(gridPos);
  },

  onPointerUp(_gridPos: GridPosition, _event: PointerEvent) {
    isPainting = false;
  },
};

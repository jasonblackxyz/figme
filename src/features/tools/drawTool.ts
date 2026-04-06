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
  const docStore = useDocumentStore.getState();
  const pageCells: Array<{ row: number; col: number }> = [];
  const layerCells = new Map<string, Array<{ row: number; col: number }>>();

  for (const cell of cells) {
    const hit = hitTestLayers({ col: cell.col, row: cell.row });
    if (!hit) {
      pageCells.push(cell);
      continue;
    }

    const relCell = {
      row: cell.row - hit.rect.row,
      col: cell.col - hit.rect.col,
    };
    const existing = layerCells.get(hit.id) ?? [];
    existing.push(relCell);
    layerCells.set(hit.id, existing);
  }

  if (pageCells.length > 0) {
    docStore.setPageCellOverridesBulk(pageCells, color, { pushUndo: false });
  }

  for (const [layerId, relCells] of layerCells) {
    if (relCells.length === 1) {
      const cell = relCells[0]!;
      docStore.setCellColorOverride(layerId, cell.row, cell.col, color, { pushUndo: false });
      continue;
    }

    docStore.setLayerCellOverridesBulk(layerId, relCells, color, { pushUndo: false });
  }
}

export const drawTool: ToolHandler = {
  cursor: 'crosshair',

  onPointerDown(gridPos: GridPosition, _event: PointerEvent) {
    useDocumentStore.getState().pushUndo();
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

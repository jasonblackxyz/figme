import type { ToolHandler } from './types.ts';
import type { GridPosition } from '@primitives/grid-engine/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { addLayer } from '@primitives/document-model/operations.ts';

let dragStart: GridPosition | null = null;

export function computeDividerRect(start: GridPosition, current: GridPosition) {
  const dx = Math.abs(current.col - start.col);
  const dy = Math.abs(current.row - start.row);
  const isHorizontal = dx >= dy;

  if (isHorizontal) {
    return {
      col: Math.min(start.col, current.col),
      row: start.row,
      width: Math.max(2, dx + 1),
      height: 1,
    };
  }
  return {
    col: start.col,
    row: Math.min(start.row, current.row),
    width: 1,
    height: Math.max(2, dy + 1),
  };
}

export const dividerTool: ToolHandler = {
  onPointerDown(gridPos: GridPosition, _event: PointerEvent) {
    dragStart = gridPos;
    useUiStore.getState().setIsDragging(true);
  },

  onPointerMove(gridPos: GridPosition, _event: PointerEvent) {
    if (!dragStart) return;
    const rect = computeDividerRect(dragStart, gridPos);
    useUiStore.getState().setDrawingPreview({ rect, kind: 'divider' });
  },

  onPointerUp(gridPos: GridPosition, _event: PointerEvent) {
    if (!dragStart) return;
    const rect = computeDividerRect(dragStart, gridPos);

    const docStore = useDocumentStore.getState();
    docStore.pushUndo();

    const doc = docStore.document;
    const activePage = doc.pages.find(p => p.id === doc.activePageId);
    if (activePage) {
      const updatedPage = addLayer(activePage, 'divider', 'Divider', rect, 'border', {});
      const newLayerId = updatedPage.layerOrder[updatedPage.layerOrder.length - 1];
      const updatedDoc = {
        ...doc,
        pages: doc.pages.map(p => p.id === activePage.id ? updatedPage : p),
      };
      docStore.setDocument(updatedDoc);
      if (newLayerId) {
        useUiStore.getState().setSelectedLayers([newLayerId]);
      }
    }

    dragStart = null;
    useUiStore.getState().setIsDragging(false);
    useUiStore.getState().setDrawingPreview(null);
  },

  cursor: 'crosshair',
};

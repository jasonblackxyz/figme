import type { ToolHandler } from './types.ts';
import type { GridPosition } from '@primitives/grid-engine/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { addLayer } from '@primitives/document-model/operations.ts';
import type { BorderBoxProperties } from '@primitives/document-model/types.ts';

let dragStart: GridPosition | null = null;

export function computeRect(start: GridPosition, current: GridPosition) {
  const col = Math.min(start.col, current.col);
  const row = Math.min(start.row, current.row);
  const width = Math.max(2, Math.abs(current.col - start.col) + 1);
  const height = Math.max(2, Math.abs(current.row - start.row) + 1);
  return { col, row, width, height };
}

export const borderBoxTool: ToolHandler = {
  onPointerDown(gridPos: GridPosition, _event: PointerEvent) {
    dragStart = gridPos;
    useUiStore.getState().setIsDragging(true);
    useUiStore.getState().setDragStartPos(gridPos);
  },

  onPointerMove(gridPos: GridPosition, _event: PointerEvent) {
    if (!dragStart) return;
    const rect = computeRect(dragStart, gridPos);
    useUiStore.getState().setDrawingPreview({ rect, kind: 'border-box' });
  },

  onPointerUp(gridPos: GridPosition, _event: PointerEvent) {
    if (!dragStart) return;
    const rect = computeRect(dragStart, gridPos);

    const docStore = useDocumentStore.getState();
    docStore.pushUndo();

    const doc = docStore.document;
    const activePage = doc.pages.find(p => p.id === doc.activePageId);
    if (activePage) {
      const props: BorderBoxProperties = {
        borderStyle: 'rounded',
        padding: { top: 1, right: 1, bottom: 1, left: 1 },
      };
      const updatedPage = addLayer(activePage, 'border-box', 'Border Box', rect, 'border', props);
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
    useUiStore.getState().setDragStartPos(null);
  },

  cursor: 'crosshair',
};

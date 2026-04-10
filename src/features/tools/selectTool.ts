import type { ToolHandler } from './types.ts';
import type { GridPosition } from '@primitives/grid-engine/types.ts';
import { rectIntersects } from '@primitives/grid-engine/geometry.ts';
import { moveLayer } from '@primitives/document-model/operations.ts';
import { flattenLayerOrder, isEffectivelyLocked, isEffectivelyHidden } from '@primitives/document-model/hierarchy.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { hitTestLayers } from './hitTest.ts';

let dragOriginCol = 0;
let dragOriginRow = 0;
let dragLayerOriginalPositions: Array<{ id: string; col: number; row: number }> = [];
let isDraggingLayer = false;
let isMarqueeActive = false;

export const selectTool: ToolHandler = {
  cursor: 'default',

  onPointerDown(gridPos: GridPosition, event: PointerEvent) {
    const uiState = useUiStore.getState();
    const hit = hitTestLayers(gridPos);

    if (hit) {
      const isShift = event.shiftKey;
      const currentSelected = uiState.selectedLayerIds;

      if (isShift) {
        if (currentSelected.includes(hit.id)) {
          uiState.setSelectedLayers(currentSelected.filter((id) => id !== hit.id));
        } else {
          uiState.setSelectedLayers([...currentSelected, hit.id]);
        }
      } else {
        if (!currentSelected.includes(hit.id)) {
          uiState.setSelectedLayers([hit.id]);
        }
      }

      isDraggingLayer = true;
      dragOriginCol = gridPos.col;
      dragOriginRow = gridPos.row;

      const doc = useDocumentStore.getState().document;
      const page = doc.pages.find((p) => p.id === doc.activePageId);
      if (page) {
        const selected = useUiStore.getState().selectedLayerIds;
        dragLayerOriginalPositions = selected
          .map((id) => {
            const layer = page.layers[id];
            return layer ? { id, col: layer.rect.col, row: layer.rect.row } : null;
          })
          .filter((x): x is { id: string; col: number; row: number } => x !== null);
      }

      useDocumentStore.getState().pushUndo();
      uiState.setIsDragging(true);
      uiState.setDragStartPos(gridPos);
    } else {
      if (!event.shiftKey) {
        uiState.setSelectedLayers([]);
      }
      isMarqueeActive = true;
      isDraggingLayer = false;
      dragOriginCol = gridPos.col;
      dragOriginRow = gridPos.row;
      uiState.setIsDragging(true);
      uiState.setDragStartPos(gridPos);
      uiState.setMarqueeRect({ col: gridPos.col, row: gridPos.row, width: 0, height: 0 });
    }
  },

  onPointerMove(gridPos: GridPosition, _event: PointerEvent) {
    const uiState = useUiStore.getState();
    if (!uiState.isDragging) return;

    if (isDraggingLayer) {
      const deltaCol = gridPos.col - dragOriginCol;
      const deltaRow = gridPos.row - dragOriginRow;
      if (deltaCol === 0 && deltaRow === 0) return;

      const doc = useDocumentStore.getState().document;
      const page = doc.pages.find((p) => p.id === doc.activePageId);
      if (!page) return;

      let updatedPage = page;
      for (const orig of dragLayerOriginalPositions) {
        updatedPage = moveLayer(updatedPage, orig.id, orig.col + deltaCol, orig.row + deltaRow);
      }

      useDocumentStore.getState().setDocument({
        ...doc,
        pages: doc.pages.map((p) => (p.id === doc.activePageId ? updatedPage : p)),
      });
    } else if (isMarqueeActive) {
      const col = Math.min(dragOriginCol, gridPos.col);
      const row = Math.min(dragOriginRow, gridPos.row);
      const width = Math.abs(gridPos.col - dragOriginCol);
      const height = Math.abs(gridPos.row - dragOriginRow);
      uiState.setMarqueeRect({ col, row, width, height });
    }
  },

  onDoubleClick(gridPos: GridPosition, _event: MouseEvent) {
    const hit = hitTestLayers(gridPos);
    if (hit && hit.kind === 'text-block' && !hit.locked) {
      useUiStore.getState().setEditingLayerId(hit.id);
    }
  },

  onPointerUp(_gridPos: GridPosition, _event: PointerEvent) {
    const uiState = useUiStore.getState();

    if (isMarqueeActive && uiState.marqueeRect) {
      const marquee = uiState.marqueeRect;
      if (marquee.width > 0 || marquee.height > 0) {
        const doc = useDocumentStore.getState().document;
        const page = doc.pages.find((p) => p.id === doc.activePageId);
        if (page) {
          const hits: string[] = [];
          for (const layerId of flattenLayerOrder(page)) {
            const layer = page.layers[layerId];
            if (!layer || layer.kind === 'group') continue;
            if (isEffectivelyHidden(page, layerId) || isEffectivelyLocked(page, layerId)) continue;
            if (rectIntersects(marquee, layer.rect)) {
              hits.push(layer.id);
            }
          }
          uiState.setSelectedLayers(hits);
        }
      }
    }

    isMarqueeActive = false;
    isDraggingLayer = false;
    dragLayerOriginalPositions = [];
    uiState.setIsDragging(false);
    uiState.setDragStartPos(null);
    uiState.setMarqueeRect(null);
  },
};

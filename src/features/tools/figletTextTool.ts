import type { ToolHandler } from './types.ts';
import type { GridPosition } from '@primitives/grid-engine/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { addLayer } from '@primitives/document-model/operations.ts';
import type { FigletTextProperties } from '@primitives/document-model/types.ts';

export const figletTextTool: ToolHandler = {
  onPointerDown(_gridPos: GridPosition, _event: PointerEvent) {
    // Single click creates — no drag behavior
  },

  onPointerMove(_gridPos: GridPosition, _event: PointerEvent) {
    // No preview during move
  },

  onPointerUp(gridPos: GridPosition, _event: PointerEvent) {
    const docStore = useDocumentStore.getState();
    docStore.pushUndo();

    const doc = docStore.document;
    const activePage = doc.pages.find(p => p.id === doc.activePageId);
    if (!activePage) return;

    const rect = { col: gridPos.col, row: gridPos.row, width: 40, height: 8 };
    const props: FigletTextProperties = {
      content: 'Hello',
      fontName: 'standard',
      alignment: 'left',
      styleKey: 'accentText',
    };

    const updatedPage = addLayer(activePage, 'figlet-text', 'FIGlet Text', rect, 'accentText', props);
    const newLayerId = updatedPage.layerOrder[updatedPage.layerOrder.length - 1];
    const updatedDoc = {
      ...doc,
      pages: doc.pages.map(p => p.id === activePage.id ? updatedPage : p),
    };
    docStore.setDocument(updatedDoc);

    if (newLayerId) {
      useUiStore.getState().setSelectedLayers([newLayerId]);
    }

    // Switch back to select tool after placing
    useToolStore.getState().setActiveTool('select');
  },

  cursor: 'crosshair',
};

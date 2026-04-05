import { create } from 'zustand';
import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { createEmptyDocument, updateLayer, removeLayer, addLayer } from '@primitives/document-model/operations.ts';
import { useUiStore } from '@stores/uiStore.ts';

interface DocumentState {
  document: FigMeDocument;
  undoStack: FigMeDocument[];
  redoStack: FigMeDocument[];
  setDocument: (doc: FigMeDocument) => void;
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  deleteSelectedLayers: () => void;
  duplicateSelectedLayers: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: createEmptyDocument(),
  undoStack: [],
  redoStack: [],

  setDocument: (doc: FigMeDocument) => {
    set({ document: doc });
  },

  pushUndo: () => {
    const { document, undoStack } = get();
    set({
      undoStack: [...undoStack.slice(-49), document],
      redoStack: [],
    });
  },

  undo: () => {
    const { undoStack, document } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    set({
      document: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, document],
    });
  },

  redo: () => {
    const { redoStack, document } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    set({
      document: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, document],
    });
  },

  toggleLayerVisibility: (layerId: string) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const layer = page.layers[layerId];
    if (!layer) return;
    get().pushUndo();
    const updatedPage = updateLayer(page, layerId, { visible: !layer.visible });
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
  },

  toggleLayerLock: (layerId: string) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const layer = page.layers[layerId];
    if (!layer) return;
    get().pushUndo();
    const updatedPage = updateLayer(page, layerId, { locked: !layer.locked });
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
  },

  renameLayer: (layerId: string, name: string) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const layer = page.layers[layerId];
    if (!layer) return;
    get().pushUndo();
    const updatedPage = updateLayer(page, layerId, { name });
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
  },

  deleteSelectedLayers: () => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const selectedIds = useUiStore.getState().selectedLayerIds;
    if (selectedIds.length === 0) return;
    get().pushUndo();
    let updatedPage = page;
    for (const id of selectedIds) {
      updatedPage = removeLayer(updatedPage, id);
    }
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
    useUiStore.getState().setSelectedLayers([]);
  },

  duplicateSelectedLayers: () => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const selectedIds = useUiStore.getState().selectedLayerIds;
    if (selectedIds.length === 0) return;
    get().pushUndo();
    let updatedPage = page;
    const newIds: string[] = [];
    for (const id of selectedIds) {
      const layer = updatedPage.layers[id];
      if (!layer) continue;
      const offsetRect = {
        ...layer.rect,
        col: layer.rect.col + 2,
        row: layer.rect.row + 2,
      };
      updatedPage = addLayer(
        updatedPage,
        layer.kind,
        `${layer.name} copy`,
        offsetRect,
        layer.styleKey,
        layer.properties,
      );
      const newId = updatedPage.layerOrder[updatedPage.layerOrder.length - 1];
      if (newId) {
        newIds.push(newId);
      }
    }
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
    useUiStore.getState().setSelectedLayers(newIds);
  },
}));

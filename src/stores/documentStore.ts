import { create } from 'zustand';
import type { FigMeDocument, SwatchCollection } from '@primitives/document-model/types.ts';
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
  updateLayerColors: (layerId: string, customColors: { color?: string; bg?: string } | undefined) => void;
  setCellColorOverride: (layerId: string, relRow: number, relCol: number, bgColor: string | undefined) => void;
  addSwatchCollection: (name: string) => void;
  removeSwatchCollection: (collectionId: string) => void;
  renameSwatchCollection: (collectionId: string, name: string) => void;
  addColorToCollection: (collectionId: string, hex: string) => void;
  removeColorFromCollection: (collectionId: string, colorIndex: number) => void;
  setPageCellOverride: (row: number, col: number, bgColor: string | undefined) => void;
  setPageCellOverridesBulk: (cells: Array<{ row: number; col: number }>, bgColor: string | undefined) => void;
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
        // Copy custom color fields to the duplicated layer
        const newLayer = updatedPage.layers[newId];
        if (newLayer) {
          updatedPage = updateLayer(updatedPage, newId, {
            customColors: layer.customColors,
            cellColorOverrides: layer.cellColorOverrides ? { ...layer.cellColorOverrides } : undefined,
          });
        }
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

  updateLayerColors: (layerId: string, customColors: { color?: string; bg?: string } | undefined) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page || !page.layers[layerId]) return;
    get().pushUndo();
    const updatedPage = updateLayer(page, layerId, { customColors });
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
  },

  setCellColorOverride: (layerId: string, relRow: number, relCol: number, bgColor: string | undefined) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const layer = page.layers[layerId];
    if (!layer) return;
    get().pushUndo();
    const key = `${relRow},${relCol}`;
    const existing = layer.cellColorOverrides ?? {};
    let overrides: Record<string, string> | undefined;
    if (bgColor === undefined) {
      const rest = Object.fromEntries(Object.entries(existing).filter(([k]) => k !== key));
      overrides = Object.keys(rest).length > 0 ? rest : undefined;
    } else {
      overrides = { ...existing, [key]: bgColor };
    }
    const updatedPage = updateLayer(page, layerId, { cellColorOverrides: overrides });
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
  },

  addSwatchCollection: (name: string) => {
    const { document: doc } = get();
    get().pushUndo();
    const collection: SwatchCollection = {
      id: `swatch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      colors: [],
    };
    set({
      document: {
        ...doc,
        swatchCollections: [...(doc.swatchCollections ?? []), collection],
      },
    });
  },

  removeSwatchCollection: (collectionId: string) => {
    const { document: doc } = get();
    if (!doc.swatchCollections) return;
    get().pushUndo();
    set({
      document: {
        ...doc,
        swatchCollections: doc.swatchCollections.filter(c => c.id !== collectionId),
      },
    });
  },

  renameSwatchCollection: (collectionId: string, name: string) => {
    const { document: doc } = get();
    if (!doc.swatchCollections) return;
    get().pushUndo();
    set({
      document: {
        ...doc,
        swatchCollections: doc.swatchCollections.map(c =>
          c.id === collectionId ? { ...c, name } : c,
        ),
      },
    });
  },

  addColorToCollection: (collectionId: string, hex: string) => {
    const { document: doc } = get();
    if (!doc.swatchCollections) return;
    get().pushUndo();
    set({
      document: {
        ...doc,
        swatchCollections: doc.swatchCollections.map(c =>
          c.id === collectionId ? { ...c, colors: [...c.colors, hex] } : c,
        ),
      },
    });
  },

  removeColorFromCollection: (collectionId: string, colorIndex: number) => {
    const { document: doc } = get();
    if (!doc.swatchCollections) return;
    get().pushUndo();
    set({
      document: {
        ...doc,
        swatchCollections: doc.swatchCollections.map(c =>
          c.id === collectionId
            ? { ...c, colors: c.colors.filter((_, i) => i !== colorIndex) }
            : c,
        ),
      },
    });
  },

  setPageCellOverride: (row: number, col: number, bgColor: string | undefined) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    get().pushUndo();
    const key = `${row},${col}`;
    const existing = page.cellColorOverrides ?? {};
    let overrides: Record<string, string> | undefined;
    if (bgColor === undefined) {
      const rest = Object.fromEntries(Object.entries(existing).filter(([k]) => k !== key));
      overrides = Object.keys(rest).length > 0 ? rest : undefined;
    } else {
      overrides = { ...existing, [key]: bgColor };
    }
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p =>
          p.id === page.id ? { ...p, cellColorOverrides: overrides } : p,
        ),
      },
    });
  },

  setPageCellOverridesBulk: (cells: Array<{ row: number; col: number }>, bgColor: string | undefined) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    get().pushUndo();
    const existing = { ...(page.cellColorOverrides ?? {}) };
    for (const { row, col } of cells) {
      const key = `${row},${col}`;
      if (bgColor === undefined) {
        delete existing[key];
      } else {
        existing[key] = bgColor;
      }
    }
    const overrides = Object.keys(existing).length > 0 ? existing : undefined;
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p =>
          p.id === page.id ? { ...p, cellColorOverrides: overrides } : p,
        ),
      },
    });
  },
}));

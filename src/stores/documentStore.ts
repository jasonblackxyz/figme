import { create } from 'zustand';
import type { FigMeDocument, FigMePage, SwatchCollection } from '@primitives/document-model/types.ts';
import {
  createEmptyDocument,
  updateLayer,
  removeLayer,
  addLayer,
  groupLayers,
  ungroupLayers,
  bringForward as bringForwardOp,
  sendBackward as sendBackwardOp,
  bringToFront as bringToFrontOp,
  sendToBack as sendToBackOp,
  moveLayerToGroup as moveLayerToGroupOp,
} from '@primitives/document-model/operations.ts';
import { useUiStore } from '@stores/uiStore.ts';

interface CellCoord {
  row: number;
  col: number;
}

interface PaintMutationOptions {
  pushUndo?: boolean;
}

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
  setCellColorOverride: (
    layerId: string,
    relRow: number,
    relCol: number,
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => void;
  setLayerCellOverridesBulk: (
    layerId: string,
    cells: CellCoord[],
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => void;
  addSwatchCollection: (name: string) => void;
  removeSwatchCollection: (collectionId: string) => void;
  renameSwatchCollection: (collectionId: string, name: string) => void;
  addColorToCollection: (collectionId: string, hex: string) => void;
  removeColorFromCollection: (collectionId: string, colorIndex: number) => void;
  setPageCellOverride: (
    row: number,
    col: number,
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => void;
  setPageCellOverridesBulk: (
    cells: CellCoord[],
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => void;
  groupSelectedLayers: () => void;
  ungroupSelectedLayers: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  moveLayerToGroup: (layerId: string, targetGroupId: string | null, insertIndex?: number) => void;
  toggleLockOnSelection: () => void;
  toggleVisibilityOnSelection: () => void;
}

function buildOverrideMap(
  existing: Record<string, string> | undefined,
  cells: CellCoord[],
  bgColor: string | undefined,
): Record<string, string> | undefined {
  if (cells.length === 0) return existing;

  const next = { ...(existing ?? {}) };
  const keys = new Set(cells.map(({ row, col }) => `${row},${col}`));

  for (const key of keys) {
    if (bgColor === undefined) {
      delete next[key];
    } else {
      next[key] = bgColor;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
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

  setCellColorOverride: (
    layerId: string,
    relRow: number,
    relCol: number,
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => {
    get().setLayerCellOverridesBulk(layerId, [{ row: relRow, col: relCol }], bgColor, options);
  },

  setLayerCellOverridesBulk: (
    layerId: string,
    cells: CellCoord[],
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => {
    if (cells.length === 0) return;
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const layer = page.layers[layerId];
    if (!layer) return;
    if (options?.pushUndo !== false) {
      get().pushUndo();
    }
    const overrides = buildOverrideMap(layer.cellColorOverrides, cells, bgColor);
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

  setPageCellOverride: (
    row: number,
    col: number,
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => {
    get().setPageCellOverridesBulk([{ row, col }], bgColor, options);
  },

  setPageCellOverridesBulk: (
    cells: CellCoord[],
    bgColor: string | undefined,
    options?: PaintMutationOptions,
  ) => {
    if (cells.length === 0) return;
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    if (options?.pushUndo !== false) {
      get().pushUndo();
    }
    const overrides = buildOverrideMap(page.cellColorOverrides, cells, bgColor);
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p =>
          p.id === page.id ? { ...p, cellColorOverrides: overrides } : p,
        ),
      },
    });
  },

  // -- Layer hierarchy actions -----------------------------------------------

  groupSelectedLayers: () => {
    const doc = get().document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    const selected = useUiStore.getState().selectedLayerIds;
    if (!page || selected.length < 2) return;
    get().pushUndo();
    const updated = groupLayers(page, selected);
    commitPage(set, doc, page, updated);
    // Select the new group
    const newGroupId = updated.layerOrder.find(id => updated.layers[id]?.kind === 'group' && !updated.layers[id]?.isBackground && !page.layerOrder.includes(id));
    if (newGroupId) useUiStore.getState().setSelectedLayers([newGroupId]);
  },

  ungroupSelectedLayers: () => {
    const doc = get().document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    const selected = useUiStore.getState().selectedLayerIds;
    if (!page || selected.length === 0) return;
    get().pushUndo();
    let updated = page;
    const freedChildren: string[] = [];
    for (const id of selected) {
      const layer = updated.layers[id];
      if (layer?.kind === 'group' && !layer.isBackground) {
        freedChildren.push(...(layer.children ?? []));
        updated = ungroupLayers(updated, id);
      }
    }
    commitPage(set, doc, page, updated);
    useUiStore.getState().setSelectedLayers(freedChildren);
  },

  bringForward: () => {
    applyZOrder(get, set, bringForwardOp);
  },

  sendBackward: () => {
    applyZOrder(get, set, sendBackwardOp);
  },

  bringToFront: () => {
    applyZOrder(get, set, bringToFrontOp);
  },

  sendToBack: () => {
    applyZOrder(get, set, sendToBackOp);
  },

  moveLayerToGroup: (layerId: string, targetGroupId: string | null, insertIndex?: number) => {
    const doc = get().document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    get().pushUndo();
    const updated = moveLayerToGroupOp(page, layerId, targetGroupId, insertIndex);
    commitPage(set, doc, page, updated);
  },

  toggleLockOnSelection: () => {
    const doc = get().document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    const selected = useUiStore.getState().selectedLayerIds;
    if (!page || selected.length === 0) return;
    const anyUnlocked = selected.some(id => !page.layers[id]?.locked);
    get().pushUndo();
    let updated = page;
    for (const id of selected) {
      updated = updateLayer(updated, id, { locked: anyUnlocked });
    }
    commitPage(set, doc, page, updated);
  },

  toggleVisibilityOnSelection: () => {
    const doc = get().document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    const selected = useUiStore.getState().selectedLayerIds;
    if (!page || selected.length === 0) return;
    const anyVisible = selected.some(id => page.layers[id]?.visible);
    get().pushUndo();
    let updated = page;
    for (const id of selected) {
      updated = updateLayer(updated, id, { visible: !anyVisible });
    }
    commitPage(set, doc, page, updated);
  },
}));

// Helpers to reduce repetition in store actions

type StoreGet = () => DocumentState;
type StoreSet = (partial: Partial<DocumentState>) => void;

function commitPage(set: StoreSet, doc: FigMeDocument, oldPage: FigMePage, newPage: FigMePage) {
  set({
    document: {
      ...doc,
      pages: doc.pages.map(p => p.id === oldPage.id ? newPage : p),
    },
  });
}

function applyZOrder(getState: StoreGet, set: StoreSet, op: (page: FigMePage, layerId: string) => FigMePage) {
  const doc = getState().document;
  const page = doc.pages.find(p => p.id === doc.activePageId);
  const selected = useUiStore.getState().selectedLayerIds;
  if (!page || selected.length === 0) return;
  getState().pushUndo();
  let updated = page;
  for (const id of selected) {
    updated = op(updated, id);
  }
  commitPage(set, doc, page, updated);
}

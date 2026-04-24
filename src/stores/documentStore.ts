import { create } from 'zustand';
import type { FigMeDocument, FigMePage, SwatchCollection } from '@primitives/document-model/types.ts';
import type {
  DesignBinding,
  DesignInteraction,
  DesignStyleDef,
  RuntimeAnnotation,
  RuntimeComponentDef,
  RuntimeDiagnostic,
  RuntimeInferenceOptions,
  RuntimeManifestMetadata,
  PageRuntimeMetadata,
} from '@primitives/runtime-semantics/types.ts';
import {
  loadPersistedDocument,
  loadLegacyDocument,
  saveToDB,
  saveToLocalStorage,
} from '@features/file-io/persistenceDb.ts';
import {
  isLegacyMigrated,
  cleanupLegacySaves,
} from '@features/file-io/staleCleanup.ts';
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
import {
  generateRuntimeId,
  normalizeRuntimeMetadata,
  slugifyRuntimeId,
} from '@primitives/runtime-semantics/defaults.ts';
import { inferRuntimeSemantics as inferRuntimeSemanticsOp } from '@primitives/runtime-semantics/inference.ts';
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
  initializeFromPersistence: (tabId: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  clearActivePage: () => void;
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
  setRuntimeManifest: (manifest: Partial<RuntimeManifestMetadata>) => void;
  setPageRuntime: (pageId: string, runtime: Partial<PageRuntimeMetadata>) => void;
  setRuntimeToken: (id: string, token: DesignStyleDef) => void;
  setRuntimeComponent: (component: RuntimeComponentDef) => void;
  setRuntimeBinding: (binding: DesignBinding) => void;
  setRuntimeInteraction: (interaction: DesignInteraction) => void;
  createRuntimeAnnotation: (annotation: Partial<RuntimeAnnotation>) => string | null;
  updateRuntimeAnnotation: (annotationId: string, updates: Partial<RuntimeAnnotation>) => void;
  removeRuntimeAnnotation: (annotationId: string) => void;
  inferRuntimeSemantics: (options?: RuntimeInferenceOptions) => RuntimeDiagnostic[];
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

  initializeFromPersistence: async (tabId: string) => {
    // Try loading this tab's persisted document
    let doc = await loadPersistedDocument(tabId);

    // Migration: if no tab-scoped save exists, check for legacy v1 data
    if (!doc && !isLegacyMigrated()) {
      doc = await loadLegacyDocument();
      if (doc) {
        // Adopt legacy document under this tab's scope
        saveToLocalStorage(doc, tabId);
        saveToDB(doc, tabId).catch(() => {});
      }
      // Mark migration done regardless (prevents re-checking on future new tabs)
      cleanupLegacySaves().catch(() => {});
    }

    if (doc) {
      set({ document: doc, undoStack: [], redoStack: [] });
    }
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
    if (!page) { console.warn('FigMe store: toggleLayerVisibility skipped \u2014 no active page.'); return; }
    const layer = page.layers[layerId];
    if (!layer) { console.warn(`FigMe store: toggleLayerVisibility skipped \u2014 layer "${layerId}" not found.`); return; }
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
    if (!page) { console.warn('FigMe store: toggleLayerLock skipped \u2014 no active page.'); return; }
    const layer = page.layers[layerId];
    if (!layer) { console.warn(`FigMe store: toggleLayerLock skipped \u2014 layer "${layerId}" not found.`); return; }
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
    if (!page) { console.warn('FigMe store: renameLayer skipped \u2014 no active page.'); return; }
    const layer = page.layers[layerId];
    if (!layer) { console.warn(`FigMe store: renameLayer skipped \u2014 layer "${layerId}" not found.`); return; }
    get().pushUndo();
    const updatedPage = updateLayer(page, layerId, { name });
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      },
    });
  },

  clearActivePage: () => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    const nonBackgroundIds = page.layerOrder.filter(id => !page.layers[id]?.isBackground);
    if (nonBackgroundIds.length === 0) return;
    get().pushUndo();
    let updatedPage = page;
    for (const id of nonBackgroundIds) {
      updatedPage = removeLayer(updatedPage, id);
    }
    updatedPage = { ...updatedPage, cellColorOverrides: undefined };
    commitPage(set, doc, page, updatedPage);
    useUiStore.getState().setSelectedLayers([]);
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
    const layerIdMap = new Map<string, string>();
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
        layerIdMap.set(id, newId);
        // Copy custom color fields to the duplicated layer
        const newLayer = updatedPage.layers[newId];
        if (newLayer) {
          updatedPage = updateLayer(updatedPage, newId, {
            customColors: layer.customColors,
            cellColorOverrides: layer.cellColorOverrides ? { ...layer.cellColorOverrides } : undefined,
            runtime: layer.runtime ? { ...layer.runtime } : undefined,
          });
        }
      }
    }
    const updatedDoc = duplicateRuntimeAnnotations({
      ...doc,
      pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
    }, page.id, layerIdMap);
    set({ document: updatedDoc });
    useUiStore.getState().setSelectedLayers(newIds);
  },

  updateLayerColors: (layerId: string, customColors: { color?: string; bg?: string } | undefined) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) { console.warn('FigMe store: updateLayerColors skipped \u2014 no active page.'); return; }
    if (!page.layers[layerId]) { console.warn(`FigMe store: updateLayerColors skipped \u2014 layer "${layerId}" not found.`); return; }
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
    if (!page) { console.warn('FigMe store: setLayerCellOverridesBulk skipped \u2014 no active page.'); return; }
    const layer = page.layers[layerId];
    if (!layer) { console.warn(`FigMe store: setLayerCellOverridesBulk skipped \u2014 layer "${layerId}" not found.`); return; }
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

  setRuntimeManifest: (manifest: Partial<RuntimeManifestMetadata>) => {
    const { document: doc } = get();
    get().pushUndo();
    const runtime = normalizeRuntimeMetadata(doc.runtime);
    set({
      document: {
        ...doc,
        runtime: {
          ...runtime,
          manifest: { ...runtime.manifest, ...manifest },
        },
      },
    });
  },

  setPageRuntime: (pageId: string, runtimePatch: Partial<PageRuntimeMetadata>) => {
    const { document: doc } = get();
    const page = doc.pages.find(p => p.id === pageId);
    if (!page) return;
    get().pushUndo();
    set({
      document: {
        ...doc,
        pages: doc.pages.map(p =>
          p.id === pageId
            ? { ...p, runtime: { ...p.runtime, ...runtimePatch } }
            : p,
        ),
      },
    });
  },

  setRuntimeToken: (id: string, token: DesignStyleDef) => {
    const { document: doc } = get();
    if (!id.trim()) return;
    get().pushUndo();
    const runtime = normalizeRuntimeMetadata(doc.runtime);
    set({
      document: {
        ...doc,
        runtime: {
          ...runtime,
          tokens: { ...runtime.tokens, [id]: token },
        },
      },
    });
  },

  setRuntimeComponent: (component: RuntimeComponentDef) => {
    const { document: doc } = get();
    if (!component.id.trim()) return;
    get().pushUndo();
    const runtime = normalizeRuntimeMetadata(doc.runtime);
    set({
      document: {
        ...doc,
        runtime: {
          ...runtime,
          components: { ...runtime.components, [component.id]: component },
        },
      },
    });
  },

  setRuntimeBinding: (binding: DesignBinding) => {
    const { document: doc } = get();
    if (!binding.id.trim()) return;
    get().pushUndo();
    const runtime = normalizeRuntimeMetadata(doc.runtime);
    set({
      document: {
        ...doc,
        runtime: {
          ...runtime,
          bindings: { ...runtime.bindings, [binding.id]: binding },
        },
      },
    });
  },

  setRuntimeInteraction: (interaction: DesignInteraction) => {
    const { document: doc } = get();
    if (!interaction.id.trim()) return;
    get().pushUndo();
    const runtime = normalizeRuntimeMetadata(doc.runtime);
    set({
      document: {
        ...doc,
        runtime: {
          ...runtime,
          interactions: { ...runtime.interactions, [interaction.id]: interaction },
        },
      },
    });
  },

  createRuntimeAnnotation: (annotation: Partial<RuntimeAnnotation>) => {
    const { document: doc } = get();
    const activePage = doc.pages.find(p => p.id === doc.activePageId);
    const pageId = annotation.pageId ?? activePage?.id;
    const page = doc.pages.find(p => p.id === pageId);
    if (!page) return null;

    const runtime = normalizeRuntimeMetadata(doc.runtime);
    const id = annotation.id ?? generateRuntimeId('annotation');
    const semanticId = annotation.semanticId?.trim() || uniqueRuntimeSemanticId(
      runtime,
      page.id,
      annotation.name ?? 'node',
    );
    const rect = annotation.rect ?? { col: 0, row: 0, width: 8, height: 3 };
    const nextAnnotation: RuntimeAnnotation = {
      id,
      pageId: page.id,
      semanticId,
      rect,
      export: annotation.export ?? true,
      ...(annotation.name ? { name: annotation.name } : {}),
      ...(annotation.z !== undefined ? { z: annotation.z } : {}),
      ...(annotation.sourceLayerIds ? { sourceLayerIds: [...annotation.sourceLayerIds] } : {}),
      ...(annotation.role ? { role: annotation.role } : {}),
      ...(annotation.componentId ? { componentId: annotation.componentId } : {}),
      ...(annotation.componentKind ? { componentKind: annotation.componentKind } : {}),
      ...(annotation.props ? { props: { ...annotation.props } } : {}),
      ...(annotation.bindingSlots ? { bindingSlots: { ...annotation.bindingSlots } } : {}),
      ...(annotation.interactionIds ? { interactionIds: [...annotation.interactionIds] } : {}),
      ...(annotation.sticky ? { sticky: annotation.sticky } : {}),
      ...(annotation.scrollContainerId ? { scrollContainerId: annotation.scrollContainerId } : {}),
      ...(annotation.constraints ? { constraints: annotation.constraints } : {}),
      ...(annotation.customModuleKind ? { customModuleKind: annotation.customModuleKind } : {}),
      ...(annotation.inputShape ? { inputShape: annotation.inputShape } : {}),
      ...(annotation.breakpointBehavior ? { breakpointBehavior: annotation.breakpointBehavior } : {}),
      ...(annotation.tags ? { tags: [...annotation.tags] } : {}),
      ...(annotation.provenance ? { provenance: annotation.provenance } : {}),
    };

    get().pushUndo();
    set({
      document: {
        ...doc,
        runtime: {
          ...runtime,
          annotations: { ...runtime.annotations, [id]: nextAnnotation },
        },
      },
    });
    return id;
  },

  updateRuntimeAnnotation: (annotationId: string, updates: Partial<RuntimeAnnotation>) => {
    const { document: doc } = get();
    const runtime = normalizeRuntimeMetadata(doc.runtime);
    const existing = runtime.annotations[annotationId];
    if (!existing) return;
    get().pushUndo();
    set({
      document: {
        ...doc,
        runtime: {
          ...runtime,
          annotations: {
            ...runtime.annotations,
            [annotationId]: { ...existing, ...updates, id: annotationId },
          },
        },
      },
    });
  },

  removeRuntimeAnnotation: (annotationId: string) => {
    const { document: doc } = get();
    const runtime = normalizeRuntimeMetadata(doc.runtime);
    if (!runtime.annotations[annotationId]) return;
    get().pushUndo();
    const annotations = { ...runtime.annotations };
    delete annotations[annotationId];
    set({
      document: {
        ...doc,
        runtime: { ...runtime, annotations },
      },
    });
  },

  inferRuntimeSemantics: (options?: RuntimeInferenceOptions) => {
    const { document: doc } = get();
    get().pushUndo();
    const result = inferRuntimeSemanticsOp(doc, options);
    set({ document: result.document });
    return result.diagnostics;
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

function duplicateRuntimeAnnotations(
  doc: FigMeDocument,
  pageId: string,
  layerIdMap: Map<string, string>,
): FigMeDocument {
  if (layerIdMap.size === 0) return doc;
  const runtime = normalizeRuntimeMetadata(doc.runtime);
  const annotations = { ...runtime.annotations };

  for (const annotation of Object.values(runtime.annotations)) {
    if (annotation.pageId !== pageId || !annotation.sourceLayerIds?.some((id) => layerIdMap.has(id))) {
      continue;
    }
    const id = generateRuntimeId('annotation');
    const sourceLayerIds = annotation.sourceLayerIds
      .map((sourceId) => layerIdMap.get(sourceId) ?? sourceId);
    annotations[id] = {
      ...annotation,
      id,
      semanticId: uniqueRuntimeSemanticId({ ...runtime, annotations }, pageId, `${annotation.semanticId}-copy`),
      rect: {
        ...annotation.rect,
        col: annotation.rect.col + 2,
        row: annotation.rect.row + 2,
      },
      sourceLayerIds,
    };
  }

  return {
    ...doc,
    runtime: { ...runtime, annotations },
  };
}

function uniqueRuntimeSemanticId(
  runtime: ReturnType<typeof normalizeRuntimeMetadata>,
  pageId: string,
  base: string,
): string {
  const normalized = slugifyRuntimeId(base, 'node');
  const existing = new Set(
    Object.values(runtime.annotations)
      .filter((annotation) => annotation.pageId === pageId)
      .map((annotation) => annotation.semanticId),
  );
  if (!existing.has(normalized)) return normalized;
  let index = 2;
  while (existing.has(`${normalized}-${index}`)) index += 1;
  return `${normalized}-${index}`;
}

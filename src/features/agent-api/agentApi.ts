import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import type { FigMePage, Layer, LayerKind, LayerProperties } from '@primitives/document-model/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { StyleKey } from '@primitives/style-system/types.ts';
import {
  addLayer as addLayerOp,
  removeLayer as removeLayerOp,
  updateLayer as updateLayerOp,
  moveLayer as moveLayerOp,
  reorderLayers,
  addPage,
  removePage,
  setActivePage,
} from '@primitives/document-model/operations.ts';
import { STYLE_KEYS } from '@primitives/style-system/palette.ts';
import { pixelToGrid, gridToPixel, snapToGrid } from '@primitives/grid-engine/coordinates.ts';
import { rectIntersects, rectContains, innerRect } from '@primitives/grid-engine/geometry.ts';
import { computeTextFlow } from '@primitives/text-flow/compute.ts';
import { exportAsJson, exportAsMarkdown } from '@features/export/exporters.ts';
import { batch, isBatching } from './batch.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActivePage(): FigMePage | undefined {
  const doc = useDocumentStore.getState().document;
  return doc.pages.find(p => p.id === doc.activePageId);
}

function applyPageMutation(fn: (page: FigMePage) => FigMePage): void {
  const store = useDocumentStore.getState();
  const doc = store.document;
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;
  if (!isBatching()) store.pushUndo();
  store.setDocument({
    ...doc,
    pages: doc.pages.map(p => (p.id === page.id ? fn(p) : p)),
  });
}

function defaultPropsForKind(kind: LayerKind): LayerProperties {
  switch (kind) {
    case 'border-box':
      return { borderStyle: 'rounded' as const, padding: { top: 1, right: 1, bottom: 1, left: 1 } };
    case 'text-block':
      return {
        content: 'Text',
        fontFamily: useDocumentStore.getState().document.gridConfig.fontFamily,
        kerning: 1 as const,
        lineSpacing: 0 as const,
        alignment: 'left' as const,
        styleKey: 'text' as StyleKey,
      };
    case 'figlet-text':
      return { content: 'Hello', fontName: 'standard', alignment: 'left' as const, styleKey: 'accentText' as StyleKey };
    case 'divider':
    case 'group':
      return {} as LayerProperties;
    case 'image':
      return { src: '', renderStyle: 'classic' as const, brightness: 0, contrast: 0, invert: false };
    case 'edge-path':
      return { sourceLayerId: '', targetLayerId: '', routingStyle: 'manhattan' as const, waypoints: [], styleKey: 'edge' as StyleKey };
    case 'component':
      return { componentId: '' };
  }
}

// ---------------------------------------------------------------------------
// API builder
// ---------------------------------------------------------------------------

export function buildApi() {
  return {
    version: { api: '1.0', app: 'FigMe 2.0' },

    // Raw store access for operations the convenience layer doesn't cover
    stores: {
      document: useDocumentStore,
      tool: useToolStore,
      ui: useUiStore,
      viewport: useViewportStore,
    },

    // Read helpers
    getDocument: () => useDocumentStore.getState().document,
    getActivePage,
    getLayers(): Layer[] {
      const page = getActivePage();
      if (!page) return [];
      return page.layerOrder.map(id => page.layers[id]).filter((l): l is Layer => l != null);
    },
    getLayer(id: string): Layer | undefined {
      const page = getActivePage();
      return page?.layers[id];
    },

    // Layer mutations (handle page-lookup + undo + default props)
    addLayer(
      kind: LayerKind,
      name: string,
      rect: GridRect,
      styleKey: StyleKey,
      properties?: LayerProperties,
    ): string | undefined {
      let newId: string | undefined;
      applyPageMutation(page => {
        const updated = addLayerOp(page, kind, name, rect, styleKey, properties ?? defaultPropsForKind(kind));
        newId = updated.layerOrder[updated.layerOrder.length - 1];
        return updated;
      });
      return newId;
    },
    removeLayer(id: string): void {
      applyPageMutation(page => removeLayerOp(page, id));
    },
    updateLayer(id: string, updates: Partial<Layer>): void {
      applyPageMutation(page => updateLayerOp(page, id, updates));
    },
    moveLayer(id: string, col: number, row: number): void {
      applyPageMutation(page => moveLayerOp(page, id, col, row));
    },

    // Batch
    batch,

    // Styles
    styles: {
      keys: STYLE_KEYS as readonly string[],
      get palette() {
        return useDocumentStore.getState().document.palette;
      },
      resolve(key: StyleKey) {
        return useDocumentStore.getState().document.palette[key];
      },
    },

    // Event subscription
    subscribe(
      event: 'document' | 'selection' | 'tool',
      cb: (value: unknown) => void,
    ): () => void {
      switch (event) {
        case 'document':
          return useDocumentStore.subscribe(state => cb(state.document));
        case 'selection':
          return useUiStore.subscribe(state => cb(state.selectedLayerIds));
        case 'tool':
          return useToolStore.subscribe(state => cb(state.activeTool));
      }
    },

    // Primitive re-exports for console access
    primitives: {
      pixelToGrid,
      gridToPixel,
      snapToGrid,
      rectIntersects,
      rectContains,
      innerRect,
      computeTextFlow,
      addLayer: addLayerOp,
      removeLayer: removeLayerOp,
      updateLayer: updateLayerOp,
      moveLayer: moveLayerOp,
      reorderLayers,
      addPage,
      removePage,
      setActivePage,
    },

    // Export (returns data, no download dialog)
    export: {
      toJson(): string {
        const doc = useDocumentStore.getState().document;
        console.log('FIGME_EXPORT', { format: 'json', timestamp: Date.now() });
        return exportAsJson(doc);
      },
      toMarkdown(): string {
        const doc = useDocumentStore.getState().document;
        console.log('FIGME_EXPORT', { format: 'markdown', timestamp: Date.now() });
        return exportAsMarkdown(doc);
      },
    },
  };
}

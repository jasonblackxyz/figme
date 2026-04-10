import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import type { FigMeDocument, FigMePage, Layer, LayerKind, LayerProperties } from '@primitives/document-model/types.ts';
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
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { exportAsJson, exportAsMarkdown } from '@features/export/exporters.ts';
import { batch, isBatching, getPendingDocument, setPendingDocument } from './batch.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAYER_KINDS: LayerKind[] = [
  'border-box', 'text-block', 'figlet-text', 'divider',
  'image', 'edge-path', 'group', 'component',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the current document, preferring the pending batch state when inside a batch().
 * All read helpers and mutation paths should use this instead of store.getState().document
 * so that mutations within a batch are visible to subsequent reads.
 */
function getCurrentDocument(): FigMeDocument {
  return getPendingDocument() ?? useDocumentStore.getState().document;
}

function getActivePage(): FigMePage | undefined {
  const doc = getCurrentDocument();
  return doc.pages.find(p => p.id === doc.activePageId);
}

function getLayers(): Layer[] {
  const page = getActivePage();
  if (!page) return [];
  return page.layerOrder.map(id => page.layers[id]).filter((l): l is Layer => l != null);
}

function applyPageMutation(fn: (page: FigMePage) => FigMePage): void {
  const doc = getCurrentDocument();
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;

  const nextDoc = {
    ...doc,
    pages: doc.pages.map(p => (p.id === page.id ? fn(p) : p)),
  };

  if (isBatching()) {
    setPendingDocument(nextDoc);
  } else {
    const store = useDocumentStore.getState();
    store.pushUndo();
    store.setDocument(nextDoc);
  }
}

function defaultPropsForKind(kind: LayerKind): LayerProperties {
  switch (kind) {
    case 'border-box':
      return { borderStyle: 'rounded' as const, padding: { top: 1, right: 1, bottom: 1, left: 1 } };
    case 'text-block':
      return {
        content: 'Text',
        fontFamily: getCurrentDocument().gridConfig.fontFamily,
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
// Object-spec type for the addLayer overload
// ---------------------------------------------------------------------------

interface AddLayerSpec {
  kind: LayerKind;
  name?: string;
  col: number;
  row: number;
  width: number;
  height: number;
  styleKey?: StyleKey;
  [key: string]: unknown;
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

    // Parsed agent briefing — convenience accessor for the hidden DOM element
    get briefing(): unknown {
      const el = document.getElementById('figme-agent-briefing');
      return el ? JSON.parse(el.textContent ?? '{}') : null;
    },

    // Read helpers
    getDocument: () => getCurrentDocument(),
    getActivePage,
    getLayers,
    getLayer(id: string): Layer | undefined {
      const page = getActivePage();
      return page?.layers[id];
    },
    findLayer(name: string): Layer | undefined {
      return getLayers().find(l => l.name === name);
    },
    findLayers(query: { kind?: LayerKind; name?: string; styleKey?: StyleKey }): Layer[] {
      return getLayers().filter(l =>
        (!query.kind || l.kind === query.kind) &&
        (!query.name || l.name === query.name) &&
        (!query.styleKey || l.styleKey === query.styleKey),
      );
    },

    // Page helpers
    addPage(name: string): string {
      const doc = getCurrentDocument();
      const updated = addPage(doc, name);
      const newId = updated.pages[updated.pages.length - 1]!.id;
      const finalDoc = { ...updated, activePageId: newId };

      if (isBatching()) {
        setPendingDocument(finalDoc);
      } else {
        const store = useDocumentStore.getState();
        store.pushUndo();
        store.setDocument(finalDoc);
      }
      return newId;
    },
    setActivePage(id: string): void {
      const doc = getCurrentDocument();
      if (!doc.pages.find(p => p.id === id)) {
        throw new Error(`FigMe.setActivePage: no page with id "${id}"`);
      }
      const finalDoc = { ...doc, activePageId: id };

      if (isBatching()) {
        setPendingDocument(finalDoc);
      } else {
        const store = useDocumentStore.getState();
        store.pushUndo();
        store.setDocument(finalDoc);
      }
    },
    getPage(id: string): FigMePage | undefined {
      return getCurrentDocument().pages.find(p => p.id === id);
    },

    // Layer mutations — supports positional or object-spec call form:
    //   addLayer('border-box', 'name', {col,row,width,height}, 'border', props?)
    //   addLayer({ kind:'border-box', col:2, row:2, width:20, height:5, styleKey:'border', ...props })
    addLayer(
      kindOrSpec: LayerKind | AddLayerSpec,
      name?: string,
      rect?: GridRect,
      styleKey?: StyleKey,
      properties?: LayerProperties,
    ): string | undefined {
      let k: LayerKind;
      let n: string;
      let r: GridRect;
      let sk: StyleKey;
      let props: LayerProperties | undefined;

      if (typeof kindOrSpec === 'object' && kindOrSpec !== null) {
        // Object-spec overload
        const { kind, name: objName, col, row, width, height, styleKey: objSk, ...rest } = kindOrSpec;
        k = kind;
        n = objName ?? kind;
        r = { col, row, width, height };
        sk = (objSk ?? 'text') as StyleKey;
        // Merge remaining keys into default props for this kind
        const defaults = defaultPropsForKind(kind);
        props = Object.keys(rest).length > 0
          ? { ...defaults, ...rest } as LayerProperties
          : undefined;
      } else {
        k = kindOrSpec;
        n = name ?? kindOrSpec;
        if (!rect) throw new Error('FigMe.addLayer: rect is required for positional form — pass {col, row, width, height}');
        if (!styleKey) throw new Error('FigMe.addLayer: styleKey is required for positional form');
        r = rect;
        sk = styleKey;
        props = properties;
      }

      // Validate
      if (!LAYER_KINDS.includes(k)) {
        throw new Error(
          `FigMe.addLayer: invalid kind "${String(k)}". Valid values: ${LAYER_KINDS.join(', ')}`,
        );
      }
      if (!STYLE_KEYS.includes(sk as StyleKey)) {
        throw new Error(
          `FigMe.addLayer: invalid styleKey "${String(sk)}". Use FigMe.styles.keys for the full list.`,
        );
      }

      let newId: string | undefined;
      applyPageMutation(page => {
        const updated = addLayerOp(page, k, n, r, sk, props ?? defaultPropsForKind(k));
        newId = updated.layerOrder[updated.layerOrder.length - 1];
        return updated;
      });
      return newId;
    },
    removeLayer(id: string): void {
      applyPageMutation(page => removeLayerOp(page, id));
    },
    updateLayer(id: string, updates: Partial<Layer>): void {
      // Guard: 'kind' must remain a valid LayerKind string if supplied
      if ('kind' in updates && !LAYER_KINDS.includes(updates.kind as LayerKind)) {
        throw new Error(
          `FigMe.updateLayer: invalid kind "${String(updates.kind)}". Valid values: ${LAYER_KINDS.join(', ')}`,
        );
      }
      // Guard: 'styleKey' must be a known style key if supplied
      if ('styleKey' in updates && !STYLE_KEYS.includes(updates.styleKey as StyleKey)) {
        throw new Error(
          `FigMe.updateLayer: invalid styleKey "${String(updates.styleKey)}". Use FigMe.styles.keys for the full list.`,
        );
      }
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
        return getCurrentDocument().palette;
      },
      resolve(key: StyleKey) {
        return getCurrentDocument().palette[key];
      },
    },

    // Viewport convenience helpers
    viewport: {
      setZoom: (zoom: number) => useViewportStore.getState().setZoom(zoom),
      resetView: () => useViewportStore.getState().resetView(),
      /** Zoom + pan so the full canvas fits the visible area. */
      fitToPage: () => {
        const doc = getCurrentDocument();
        const page = doc.pages.find(p => p.id === doc.activePageId);
        const config = doc.gridConfig;
        const cols = page?.canvasColsOverride ?? config.canvasCols;
        const rows = page?.canvasRowsOverride ?? config.canvasRows;
        const canvasEl = document.querySelector('[role="application"]') as HTMLElement | null;
        const vpW = canvasEl?.clientWidth  ?? window.innerWidth  - 460;
        const vpH = canvasEl?.clientHeight ?? window.innerHeight - 80;
        const zoom = Math.max(0.1, Math.min(5,
          Math.min(vpW / (cols * config.cellWidth), vpH / (rows * config.cellHeight)) * 0.9,
        ));
        useViewportStore.getState().setZoom(zoom);
        useViewportStore.getState().setPan(0, 0);
      },
    },

    // Event subscription
    // WARNING: Do NOT call mutation methods (addLayer, updateLayer, etc.) inside the 'document'
    // callback — that will create an infinite loop and crash the tab. Use subscribe only for
    // observation. Call unsub() when done to avoid memory leaks.
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
        const doc = getCurrentDocument();
        console.log('FIGME_EXPORT', { format: 'json', timestamp: Date.now() });
        return exportAsJson(doc);
      },
      toMarkdown(): string {
        const doc = getCurrentDocument();
        console.log('FIGME_EXPORT', { format: 'markdown', timestamp: Date.now() });
        return exportAsMarkdown(doc);
      },
      /** Returns the rendered ASCII characters for the active (or specified) page as a plain string. */
      toAscii(pageId?: string): string {
        const doc = getCurrentDocument();
        const page = pageId
          ? doc.pages.find(p => p.id === pageId)
          : doc.pages.find(p => p.id === doc.activePageId);
        if (!page) return '';
        const buffer = composePageBuffer(page, doc.gridConfig);
        return buffer.chars.map(row => row.join('')).join('\n');
      },
    },
  };
}

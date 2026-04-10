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
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { exportAsJson, exportAsMarkdown } from '@features/export/exporters.ts';
import { batch, isBatching } from './batch.ts';

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
    findLayer(name: string): Layer | undefined {
      return this.getLayers().find(l => l.name === name);
    },
    findLayers(query: { kind?: LayerKind; name?: string; styleKey?: StyleKey }): Layer[] {
      return this.getLayers().filter(l =>
        (!query.kind || l.kind === query.kind) &&
        (!query.name || l.name === query.name) &&
        (!query.styleKey || l.styleKey === query.styleKey),
      );
    },

    // Page helpers
    addPage(name: string): string {
      const store = useDocumentStore.getState();
      const updated = addPage(store.document, name);
      const newId = updated.pages[updated.pages.length - 1]!.id;
      store.pushUndo();
      store.setDocument({ ...updated, activePageId: newId });
      return newId;
    },
    setActivePage(id: string): void {
      const store = useDocumentStore.getState();
      if (!store.document.pages.find(p => p.id === id)) {
        throw new Error(`FigMe.setActivePage: no page with id "${id}"`);
      }
      store.setDocument({ ...store.document, activePageId: id });
    },
    getPage(id: string): FigMePage | undefined {
      return useDocumentStore.getState().document.pages.find(p => p.id === id);
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
        r = rect!;
        sk = styleKey!;
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

    // Viewport convenience helpers
    viewport: {
      setZoom: (zoom: number) => useViewportStore.getState().setZoom(zoom),
      resetView: () => useViewportStore.getState().resetView(),
      /** Zoom + pan so the full canvas fits the visible area. */
      fitToPage: () => {
        const doc = useDocumentStore.getState().document;
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
      /** Returns the rendered ASCII characters for the active (or specified) page as a plain string. */
      toAscii(pageId?: string): string {
        const doc = useDocumentStore.getState().document;
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

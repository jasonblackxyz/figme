import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore, type InterfaceMode } from '@stores/toolStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import type { FigMeDocument, FigMePage, Layer, LayerKind, LayerProperties, CanvasProperties } from '@primitives/document-model/types.ts';
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
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';
import { STYLE_KEYS } from '@primitives/style-system/palette.ts';
import { pixelToGrid, gridToPixel, snapToGrid } from '@primitives/grid-engine/coordinates.ts';
import { rectIntersects, rectContains, innerRect } from '@primitives/grid-engine/geometry.ts';
import { computeTextFlow } from '@primitives/text-flow/compute.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import {
  applyPageCanvasSizeToGridConfig,
  getPageCanvasSizeInfo,
  getVisiblePageContentBounds,
} from '@primitives/document-model/canvasSize.ts';
import { exportAsJson, exportAsMarkdown } from '@features/export/exporters.ts';
import {
  exportDesignPackageAsJson,
  exportRuntimeSemanticsAsJson,
  validateRuntimeSemantics,
} from '@primitives/runtime-semantics/index.ts';
import type {
  DesignBinding,
  DesignInteraction,
  DesignStyleDef,
  RuntimeAnnotation,
  RuntimeComponentDef,
  RuntimeInferenceOptions,
  RuntimeManifestMetadata,
  PageRuntimeMetadata,
} from '@primitives/runtime-semantics/types.ts';
import { batch, isBatching, getPendingDocument, setPendingDocument } from './batch.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAYER_KINDS: LayerKind[] = [
  'border-box', 'text-block', 'figlet-text', 'divider',
  'image', 'edge-path', 'group', 'component', 'canvas',
];
const AI_DISALLOWED_LAYER_KINDS: ReadonlySet<LayerKind> = new Set([
  'border-box',
  'divider',
  'text-block',
]);

/** Internal default styleKey per layer kind — agents never see these. */
const DEFAULT_STYLE_FOR_KIND: Record<LayerKind, StyleKey> = {
  'border-box': 'border',
  'text-block': 'text',
  'figlet-text': 'accentText',
  'divider': 'border',
  'image': 'imageMid',
  'edge-path': 'edge',
  'group': 'bg',
  'component': 'bg',
  'canvas': 'text',
};

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

function getPageById(pageId?: string): FigMePage | undefined {
  const doc = getCurrentDocument();
  return pageId
    ? doc.pages.find((p) => p.id === pageId)
    : doc.pages.find((p) => p.id === doc.activePageId);
}

function readInterfaceMode(): InterfaceMode {
  return useUiStore.getState().interfaceMode;
}

function readAgentMode(): 'full' | 'raw' {
  return readInterfaceMode() === 'ai' ? 'raw' : 'full';
}

function applyInterfaceMode(mode: InterfaceMode): void {
  useUiStore.getState().setInterfaceMode(mode);
}

function applyAgentMode(mode: 'full' | 'raw'): void {
  applyInterfaceMode(mode === 'raw' ? 'ai' : 'human');
}

function getLayers(): Layer[] {
  const page = getActivePage();
  if (!page) return [];
  return flattenLayerOrder(page).map(id => page.layers[id]).filter((l): l is Layer => l != null);
}

function commitDocument(nextDoc: FigMeDocument): void {
  if (isBatching()) {
    setPendingDocument(nextDoc);
  } else {
    const store = useDocumentStore.getState();
    store.pushUndo();
    store.setDocument(nextDoc);
  }
}

function applyPageMutation(fn: (page: FigMePage) => FigMePage): void {
  const doc = getCurrentDocument();
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) {
    console.warn('FigMe: no active page \u2014 mutation skipped.');
    return;
  }

  const nextDoc = {
    ...doc,
    pages: doc.pages.map(p => (p.id === page.id ? fn(p) : p)),
  };

  commitDocument(nextDoc);
}

function applyTargetPageMutation(pageId: string | undefined, fn: (page: FigMePage) => FigMePage): void {
  const doc = getCurrentDocument();
  const page = getPageById(pageId);
  if (!page) {
    throw new Error(pageId
      ? `FigMe: no page with id "${pageId}"`
      : 'FigMe: no active page');
  }

  const nextDoc = {
    ...doc,
    pages: doc.pages.map((p) => (p.id === page.id ? fn(p) : p)),
  };

  commitDocument(nextDoc);
}

function assertPositiveInteger(value: number, field: 'cols' | 'rows'): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`FigMe.setPageCanvasSize: "${field}" must be a positive integer.`);
  }
  return value;
}

function defaultPropsForKind(kind: LayerKind): LayerProperties {
  switch (kind) {
    case 'border-box':
      return { borderStyle: 'rounded' as const, padding: { top: 1, right: 1, bottom: 1, left: 1 } };
    case 'text-block':
      return {
        content: 'Text',
        fontFamily: getCurrentDocument().gridConfig.fontFamily,
        kerning: 0 as const,
        lineSpacing: 0 as const,
        alignment: 'left' as const,
        styleKey: 'text' as StyleKey,
      };
    case 'figlet-text':
      return { content: 'Hello', fontName: 'koholint', alignment: 'left' as const, styleKey: 'accentText' as StyleKey };
    case 'divider':
    case 'group':
      return {} as LayerProperties;
    case 'image':
      return { src: '', renderStyle: 'classic' as const, brightness: 0, contrast: 0, invert: false };
    case 'edge-path':
      return { sourceLayerId: '', targetLayerId: '', routingStyle: 'manhattan' as const, waypoints: [], styleKey: 'edge' as StyleKey };
    case 'component':
      return { componentId: '' };
    case 'canvas':
      return { content: '', cellColors: {} };
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
  /** Direct hex color for foreground (e.g. '#ffffff'). */
  color?: string;
  /** Direct hex color for background (e.g. '#1a1a2e'). */
  bg?: string;
  /** @internal Accepted for backward compatibility but not documented to agents. */
  styleKey?: StyleKey;
  [key: string]: unknown;
}

interface AddFigletSpec {
  name?: string;
  col: number;
  row: number;
  width?: number;
  height?: number;
  content: string;
  fontName?: string;
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  bg?: string;
}

// ---------------------------------------------------------------------------
// API builder
// ---------------------------------------------------------------------------

export function buildApi() {
  const api = {
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
      commitDocument(finalDoc);
      return newId;
    },
    setActivePage(id: string): void {
      const doc = getCurrentDocument();
      if (!doc.pages.find(p => p.id === id)) {
        throw new Error(`FigMe.setActivePage: no page with id "${id}"`);
      }
      const finalDoc = { ...doc, activePageId: id };
      commitDocument(finalDoc);
    },
    getPage(id: string): FigMePage | undefined {
      return getCurrentDocument().pages.find(p => p.id === id);
    },
    getPageRuntime(pageId: string): PageRuntimeMetadata | undefined {
      return getCurrentDocument().pages.find(p => p.id === pageId)?.runtime;
    },
    setPageRuntime(pageId: string, metadata: Partial<PageRuntimeMetadata>): void {
      useDocumentStore.getState().setPageRuntime(pageId, metadata);
    },
    setRuntimeManifest(metadata: Partial<RuntimeManifestMetadata>): void {
      useDocumentStore.getState().setRuntimeManifest(metadata);
    },
    getPageCanvasSize(pageId?: string) {
      const doc = getCurrentDocument();
      const page = getPageById(pageId);
      if (!page) {
        throw new Error(pageId
          ? `FigMe.getPageCanvasSize: no page with id "${pageId}"`
          : 'FigMe.getPageCanvasSize: no active page');
      }
      return getPageCanvasSizeInfo(page, doc.gridConfig);
    },
    setPageCanvasSize(spec: { cols: number; rows: number; pageId?: string; allowClip?: boolean }) {
      const cols = assertPositiveInteger(spec.cols, 'cols');
      const rows = assertPositiveInteger(spec.rows, 'rows');
      const page = getPageById(spec.pageId);
      const doc = getCurrentDocument();
      if (!page) {
        throw new Error(spec.pageId
          ? `FigMe.setPageCanvasSize: no page with id "${spec.pageId}"`
          : 'FigMe.setPageCanvasSize: no active page');
      }

      const bounds = getVisiblePageContentBounds(page);
      if (spec.allowClip !== true && (cols < bounds.cols || rows < bounds.rows)) {
        throw new Error(
          `FigMe.setPageCanvasSize: ${cols}x${rows} would clip visible content (${bounds.cols}x${bounds.rows}). ` +
          'Pass allowClip: true to permit clipping.',
        );
      }

      const pageCanvas = getPageCanvasSizeInfo(page, doc.gridConfig);
      applyTargetPageMutation(spec.pageId, (targetPage) => ({
        ...targetPage,
        canvasColsOverride: cols === pageCanvas.defaultCols ? undefined : cols,
        canvasRowsOverride: rows === pageCanvas.defaultRows ? undefined : rows,
      }));

      return api.getPageCanvasSize(spec.pageId);
    },
    resetPageCanvasSize(pageId?: string) {
      const page = getPageById(pageId);
      if (!page) {
        throw new Error(pageId
          ? `FigMe.resetPageCanvasSize: no page with id "${pageId}"`
          : 'FigMe.resetPageCanvasSize: no active page');
      }

      applyTargetPageMutation(pageId, (targetPage) => ({
        ...targetPage,
        canvasColsOverride: undefined,
        canvasRowsOverride: undefined,
      }));

      return api.getPageCanvasSize(pageId);
    },
    setInterfaceMode(mode: InterfaceMode): void {
      if (mode !== 'ai' && mode !== 'human') {
        throw new Error(`FigMe.setInterfaceMode: invalid mode "${String(mode)}". Valid values: ai, human`);
      }
      applyInterfaceMode(mode);
    },
    getInterfaceMode(): InterfaceMode {
      return readInterfaceMode();
    },

    // Layer mutations — supports object-spec (preferred) or positional call form:
    //   addLayer({kind:'border-box', col:2, row:2, width:20, height:5, color:'#fff', bg:'#000', ...props})
    //   addLayer('border-box', 'name', {col,row,width,height}, styleKey?, props?)  [backward compat]
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
      let customColors: { color?: string; bg?: string } | undefined;

      if (typeof kindOrSpec === 'object' && kindOrSpec !== null) {
        // Object-spec overload (preferred)
        const { kind, name: objName, col, row, width, height, color, bg, styleKey: objSk, ...rest } = kindOrSpec;
        k = kind;
        n = objName ?? kind;
        r = { col, row, width, height };
        // Derive internal styleKey from kind; accept explicit styleKey for backward compat
        sk = objSk && STYLE_KEYS.includes(objSk as StyleKey)
          ? objSk as StyleKey
          : DEFAULT_STYLE_FOR_KIND[kind] ?? 'text';
        // Build customColors from color/bg
        if (color || bg) {
          customColors = {};
          if (color) customColors.color = color;
          if (bg) customColors.bg = bg;
        }
        // Merge remaining keys into default props for this kind
        const defaults = defaultPropsForKind(kind);
        props = Object.keys(rest).length > 0
          ? { ...defaults, ...rest } as LayerProperties
          : undefined;
      } else {
        k = kindOrSpec;
        n = name ?? kindOrSpec;
        if (!rect) throw new Error('FigMe.addLayer: rect is required for positional form \u2014 pass {col, row, width, height}');
        r = rect;
        // styleKey is optional in positional form; derive from kind if not provided
        sk = styleKey && STYLE_KEYS.includes(styleKey as StyleKey)
          ? styleKey
          : DEFAULT_STYLE_FOR_KIND[k] ?? 'text';
        props = properties;
      }

      // Validate
      if (!LAYER_KINDS.includes(k)) {
        throw new Error(
          `FigMe.addLayer: invalid kind "${String(k)}". Valid values: ${LAYER_KINDS.join(', ')}`,
        );
      }
      if (readInterfaceMode() === 'ai' && AI_DISALLOWED_LAYER_KINDS.has(k)) {
        throw new Error(
          `FigMe.addLayer: "${k}" is unavailable in AI mode. Use FigMe.paint() for freeform design, ` +
          'FigMe.addFiglet() for ASCII display text, or switch to Human mode with FigMe.setInterfaceMode(\'human\').',
        );
      }
      if (k === 'edge-path') {
        console.warn(
          'FigMe.addLayer: edge-path is experimental and may cause rendering issues. Consider using text-block layers with box-drawing characters (\u2502\u2500\u250c\u2514\u251c\u2524) for connections.',
        );
      }

      let newId: string | undefined;
      applyPageMutation(page => {
        let updated = addLayerOp(page, k, n, r, sk, props ?? defaultPropsForKind(k));
        newId = updated.layerOrder[updated.layerOrder.length - 1];
        if (customColors && newId) {
          updated = updateLayerOp(updated, newId, { customColors });
        }
        return updated;
      });
      return newId;
    },
    removeLayer(id: string): void {
      const page = getActivePage();
      if (page && !page.layers[id]) {
        console.warn(`FigMe.removeLayer: layer "${id}" not found on active page.`);
        return;
      }
      applyPageMutation(p => removeLayerOp(p, id));
    },
    updateLayer(id: string, updates: Partial<Layer>): void {
      const page = getActivePage();
      if (page && !page.layers[id]) {
        console.warn(`FigMe.updateLayer: layer "${id}" not found on active page.`);
        return;
      }
      // Guard: 'kind' must remain a valid LayerKind string if supplied
      if ('kind' in updates && !LAYER_KINDS.includes(updates.kind as LayerKind)) {
        throw new Error(
          `FigMe.updateLayer: invalid kind "${String(updates.kind)}". Valid values: ${LAYER_KINDS.join(', ')}`,
        );
      }
      // Warn on invalid styleKey but don't throw — agents primarily use customColors now
      if ('styleKey' in updates && !STYLE_KEYS.includes(updates.styleKey as StyleKey)) {
        console.warn(
          `FigMe.updateLayer: unknown styleKey "${String(updates.styleKey)}" ignored. Use customColors: {color, bg} for direct hex colors.`,
        );
        const { styleKey: _ignored, ...safeUpdates } = updates;
        void _ignored;
        applyPageMutation(p => updateLayerOp(p, id, safeUpdates));
        return;
      }
      applyPageMutation(p => updateLayerOp(p, id, updates));
    },
    createRuntimeAnnotation(spec: Partial<RuntimeAnnotation>): string | null {
      return useDocumentStore.getState().createRuntimeAnnotation(spec);
    },
    updateRuntimeAnnotation(id: string, updates: Partial<RuntimeAnnotation>): void {
      useDocumentStore.getState().updateRuntimeAnnotation(id, updates);
    },
    removeRuntimeAnnotation(id: string): void {
      useDocumentStore.getState().removeRuntimeAnnotation(id);
    },
    addRuntimeToken(id: string, token: DesignStyleDef): void {
      useDocumentStore.getState().setRuntimeToken(id, token);
    },
    addRuntimeComponent(component: RuntimeComponentDef): void {
      useDocumentStore.getState().setRuntimeComponent(component);
    },
    addBinding(binding: DesignBinding): void {
      useDocumentStore.getState().setRuntimeBinding(binding);
    },
    addInteraction(interaction: DesignInteraction): void {
      useDocumentStore.getState().setRuntimeInteraction(interaction);
    },
    inferRuntimeSemantics(options?: RuntimeInferenceOptions) {
      return useDocumentStore.getState().inferRuntimeSemantics(options);
    },
    validateRuntimeSemantics() {
      return validateRuntimeSemantics(getCurrentDocument());
    },
    moveLayer(id: string, col: number, row: number): void {
      const page = getActivePage();
      if (page && !page.layers[id]) {
        console.warn(`FigMe.moveLayer: layer "${id}" not found on active page.`);
        return;
      }
      applyPageMutation(p => moveLayerOp(p, id, col, row));
    },
    addFiglet(spec: AddFigletSpec): string | undefined {
      return api.addLayer({
        kind: 'figlet-text',
        name: spec.name ?? 'FIGlet Text',
        col: spec.col,
        row: spec.row,
        width: spec.width ?? 40,
        height: spec.height ?? 8,
        color: spec.color,
        bg: spec.bg,
        content: spec.content,
        fontName: spec.fontName ?? 'koholint',
        alignment: spec.alignment ?? 'left',
      } as AddLayerSpec);
    },

    // Batch
    batch,

    // Freeform painting — the primary creative tool for agents.
    // Accepts either lines (per-span colors) or content (monochrome).
    paint(spec: {
      name?: string;
      col: number;
      row: number;
      lines?: Array<Array<{ text: string; color?: string; bg?: string }>>;
      content?: string;
      color?: string;
      bg?: string;
    }): string | undefined {
      let content: string;
      const cellColors: Record<string, { color?: string; bg?: string }> = {};

      if (spec.lines) {
        // Lines mode: convert spans into flat content + per-cell colors
        const contentLines: string[] = [];
        for (let row = 0; row < spec.lines.length; row++) {
          const spans = spec.lines[row]!;
          let lineStr = '';
          for (const span of spans) {
            const startCol = lineStr.length;
            lineStr += span.text;
            // Write per-cell colors for non-space characters
            const spanColor = span.color ?? spec.color;
            const spanBg = span.bg ?? spec.bg;
            if (spanColor || spanBg) {
              for (let i = 0; i < span.text.length; i++) {
                if (span.text[i] !== ' ') {
                  const entry: { color?: string; bg?: string } = {};
                  if (spanColor) entry.color = spanColor;
                  if (spanBg) entry.bg = spanBg;
                  cellColors[`${row},${startCol + i}`] = entry;
                }
              }
            }
          }
          contentLines.push(lineStr);
        }
        content = contentLines.join('\n');
      } else if (spec.content != null) {
        // Content mode: monochrome ASCII art
        content = spec.content;
        if (spec.color || spec.bg) {
          const lines = content.split('\n');
          for (let row = 0; row < lines.length; row++) {
            const line = lines[row] ?? '';
            for (let col = 0; col < line.length; col++) {
              if (line[col] !== ' ') {
                const entry: { color?: string; bg?: string } = {};
                if (spec.color) entry.color = spec.color;
                if (spec.bg) entry.bg = spec.bg;
                cellColors[`${row},${col}`] = entry;
              }
            }
          }
        }
      } else {
        throw new Error('FigMe.paint: provide either "lines" (per-span colors) or "content" (plain string).');
      }

      // Auto-compute dimensions from content
      const contentLines = content.split('\n');
      const width = contentLines.reduce((m, l) => Math.max(m, l.length), 1);
      const height = contentLines.length;

      const canvasProps: CanvasProperties = { content, cellColors };

      return api.addLayer({
        kind: 'canvas',
        name: spec.name ?? 'canvas',
        col: spec.col,
        row: spec.row,
        width,
        height,
        content: canvasProps.content,
        cellColors: canvasProps.cellColors,
      } as AddLayerSpec);
    },

    // Viewport convenience helpers
    viewport: {
      setZoom: (zoom: number) => useViewportStore.getState().setZoom(zoom),
      resetView: () => useViewportStore.getState().resetView(),
      /** Zoom + pan so the full canvas fits the visible area. */
      fitToPage: () => {
        useViewportStore.getState().setAutoFitEnabled(true);
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

    // Compatibility wrapper for the older raw/full agent mode API
    setAgentMode(mode: 'full' | 'raw'): void {
      if (mode !== 'full' && mode !== 'raw') {
        throw new Error(`FigMe.setAgentMode: invalid mode "${String(mode)}". Valid values: full, raw`);
      }
      applyAgentMode(mode);
    },
    getAgentMode(): 'full' | 'raw' {
      return readAgentMode();
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
      toDesignPackage(options?: { includeRenderOracle?: boolean }): string {
        const doc = getCurrentDocument();
        console.log('FIGME_EXPORT', { format: 'design-package', timestamp: Date.now() });
        return exportDesignPackageAsJson(doc, options);
      },
      toSemantics(): string {
        const doc = getCurrentDocument();
        console.log('FIGME_EXPORT', { format: 'semantics', timestamp: Date.now() });
        return exportRuntimeSemanticsAsJson(doc);
      },
      /** Returns the rendered ASCII characters for the active (or specified) page as a plain string. */
      toAscii(pageId?: string): string {
        const doc = getCurrentDocument();
        const page = pageId
          ? doc.pages.find(p => p.id === pageId)
          : doc.pages.find(p => p.id === doc.activePageId);
        if (!page) return '';
        const buffer = composePageBuffer(page, applyPageCanvasSizeToGridConfig(page, doc.gridConfig));
        return buffer.chars.map(row => row.join('')).join('\n');
      },
    },
  };
  return api;
}

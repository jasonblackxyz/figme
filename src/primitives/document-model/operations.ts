import type {
  Layer,
  FigMePage,
  FigMeDocument,
  ComponentDef,
  LayerKind,
  LayerProperties,
} from './types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { StyleKey, Palette } from '@primitives/style-system/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `layer_${Date.now()}_${idCounter}`;
}

/**
 * Add a layer to a page. Returns the updated page.
 */
export function addLayer(
  page: FigMePage,
  kind: LayerKind,
  name: string,
  rect: GridRect,
  styleKey: StyleKey,
  properties: LayerProperties,
): FigMePage {
  const id = generateId();
  const layer: Layer = {
    id,
    kind,
    name,
    rect,
    visible: true,
    locked: false,
    opacity: 1,
    styleKey,
    properties,
  };

  return {
    ...page,
    layers: { ...page.layers, [id]: layer },
    layerOrder: [...page.layerOrder, id],
  };
}

/**
 * Remove a layer from a page by ID.
 */
export function removeLayer(page: FigMePage, layerId: string): FigMePage {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [layerId]: _removed, ...remainingLayers } = page.layers;
  return {
    ...page,
    layers: remainingLayers,
    layerOrder: page.layerOrder.filter((id) => id !== layerId),
  };
}

/**
 * Update a layer's properties. Returns the updated page.
 */
export function updateLayer(
  page: FigMePage,
  layerId: string,
  updates: Partial<Layer>,
): FigMePage {
  const existing = page.layers[layerId];
  if (!existing) return page;

  return {
    ...page,
    layers: {
      ...page.layers,
      [layerId]: { ...existing, ...updates },
    },
  };
}

/**
 * Move a layer to a new grid position.
 */
export function moveLayer(
  page: FigMePage,
  layerId: string,
  col: number,
  row: number,
): FigMePage {
  const existing = page.layers[layerId];
  if (!existing) return page;

  return updateLayer(page, layerId, {
    rect: { ...existing.rect, col, row },
  });
}

/**
 * Reorder layers (change z-order).
 */
export function reorderLayers(
  page: FigMePage,
  newOrder: string[],
): FigMePage {
  return { ...page, layerOrder: newOrder };
}

/**
 * Add a new page to the document.
 */
export function addPage(
  doc: FigMeDocument,
  name: string,
): FigMeDocument {
  const page = createEmptyPage(name);
  return {
    ...doc,
    pages: [...doc.pages, page],
  };
}

/**
 * Remove a page from the document by ID.
 */
export function removePage(
  doc: FigMeDocument,
  pageId: string,
): FigMeDocument {
  const pages = doc.pages.filter((p) => p.id !== pageId);
  const activePageId =
    doc.activePageId === pageId
      ? (pages[0]?.id ?? '')
      : doc.activePageId;

  return { ...doc, pages, activePageId };
}

/**
 * Set the active page in the document.
 */
export function setActivePage(
  doc: FigMeDocument,
  pageId: string,
): FigMeDocument {
  return { ...doc, activePageId: pageId };
}

/**
 * Create a reusable component definition from layer IDs.
 */
export function createComponent(
  doc: FigMeDocument,
  name: string,
  description: string,
  sourceLayerIds: string[],
): FigMeDocument {
  const id = `comp_${Date.now()}_${++idCounter}`;
  const comp: ComponentDef = {
    id,
    name,
    description,
    sourceLayerIds,
  };

  return {
    ...doc,
    components: { ...doc.components, [id]: comp },
  };
}

/**
 * Instantiate a component on a page (stub).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- TODO: remove when implemented */
export function instantiateComponent(
  page: FigMePage,
  _componentId: string,
  _rect: GridRect,
): FigMePage {
  return page;
}

/**
 * Detach a component instance, converting it to regular layers (stub).
 */
export function detachComponent(
  page: FigMePage,
  _layerId: string,
): FigMePage {
  return page;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Create an empty FigMe document with default configuration.
 */
export function createEmptyDocument(
  name?: string,
  gridConfig?: GridConfig,
  palette?: Palette,
): FigMeDocument {
  const defaultGridConfig: GridConfig = gridConfig ?? {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
    lineHeight: 1.35,
    cellWidth: 8.4,
    cellHeight: 18.9,
    canvasCols: 228,
    canvasRows: 57,
  };

  const defaultPalette: Palette = palette ?? createMinimalPalette();

  const page = createEmptyPage('Page 1');

  const now = new Date().toISOString();

  return {
    id: `doc_${Date.now()}`,
    name: name ?? 'Untitled',
    gridConfig: defaultGridConfig,
    palette: defaultPalette,
    pages: [page],
    activePageId: page.id,
    components: {},
    metadata: {
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  };
}

/**
 * Create an empty FigMe page.
 */
export function createEmptyPage(name?: string): FigMePage {
  return {
    id: `page_${Date.now()}_${++idCounter}`,
    name: name ?? 'Untitled Page',
    layers: {},
    layerOrder: [],
    canvasX: 0,
    canvasY: 0,
  };
}

/**
 * Create a minimal palette with default dark theme colors for all 56 style keys.
 * This is used internally when no palette is provided.
 */
function createMinimalPalette(): Palette {
  const def = { color: '#e0e0e0', bg: '#1a1a2e' };
  return {
    bg: def,
    dot: { color: '#333355', bg: '#1a1a2e' },
    border: { color: '#444466', bg: '#1a1a2e' },
    dim: { color: '#666688', bg: '#1a1a2e' },
    text: { color: '#e0e0e0', bg: '#252540' },
    badge: { color: '#ffffff', bg: '#6366f1' },
    edge: { color: '#444466', bg: '#1a1a2e' },
    accentBorder: { color: '#6366f1', bg: '#1a1a2e' },
    accentText: { color: '#6366f1', bg: '#1a1a2e' },
    nodeBg: { color: '#c0c0d0', bg: '#252540' },
    modalBorder: { color: '#444466', bg: '#252540' },
    modalBg: { color: '#c0c0d0', bg: '#252540' },
    modalTitle: { color: '#e0e0e0', bg: '#252540', fontWeight: 700 },
    modalText: { color: '#c0c0d0', bg: '#252540' },
    modalClose: { color: '#666688', bg: '#252540' },
    modalTab: { color: '#666688', bg: '#252540' },
    modalTabActive: { color: '#6366f1', bg: '#252540' },
    modalHint: { color: '#666688', bg: '#252540' },
    modalTitleBold: { color: '#e0e0e0', bg: '#252540', fontWeight: 700 },
    modalHeading: { color: '#6366f1', bg: '#252540', fontWeight: 700 },
    queryBorder: { color: '#6366f1', bg: '#1a1a2e' },
    queryBg: { color: '#e0e0e0', bg: '#1a1a2e' },
    queryText: { color: '#e0e0e0', bg: '#1a1a2e' },
    queryCursor: { color: '#6366f1', bg: '#1a1a2e' },
    queryHint: { color: '#666688', bg: '#1a1a2e' },
    queryButton: { color: '#666688', bg: '#1a1a2e' },
    queryButtonActive: { color: '#ffffff', bg: '#6366f1' },
    queryError: { color: '#ef4444', bg: '#1a1a2e' },
    queryPill: { color: '#6366f1', bg: '#1a1a2e' },
    queryPillBlink: { color: '#ffffff', bg: '#6366f1' },
    queryDivider: { color: '#444466', bg: '#1a1a2e' },
    queryCitation: { color: '#666688', bg: '#1a1a2e' },
    queryMatch: { color: '#6366f1', bg: '#1a1a2e', fontWeight: 700 },
    textBold: { color: '#e0e0e0', bg: '#252540', fontWeight: 700 },
    dimOnCard: { color: '#666688', bg: '#252540' },
    etchFrame: { color: '#cc3333', bg: '#aa2222' },
    etchScreen: { color: '#88aa66', bg: '#667744' },
    etchScreenBorder: { color: '#556633', bg: '#667744' },
    etchTrail: { color: '#334422', bg: '#667744' },
    etchCursor: { color: '#ffffff', bg: '#667744' },
    etchKnob: { color: '#ffffff', bg: '#cc3333' },
    ghostBlob: { color: '#aaaaff', bg: '#1a1a2e' },
    ghostEye: { color: '#ffffff', bg: '#aaaaff' },
    ghostBubbleBorder: { color: '#444466', bg: '#252540' },
    ghostBubbleBg: { color: '#c0c0d0', bg: '#252540' },
    ghostBubbleText: { color: '#e0e0e0', bg: '#252540' },
    ghostBubbleUser: { color: '#6366f1', bg: '#252540' },
    ghostInput: { color: '#e0e0e0', bg: '#252540' },
    ghostInputCursor: { color: '#6366f1', bg: '#252540' },
    ghostClose: { color: '#666688', bg: '#252540' },
    ghostInputHint: { color: '#666688', bg: '#252540' },
    imageDeep: { color: '#222222', bg: '#1a1a2e' },
    imageMid: { color: '#888888', bg: '#1a1a2e' },
    imageLight: { color: '#cccccc', bg: '#1a1a2e' },
    imageEdge: { color: '#ffffff', bg: '#1a1a2e' },
    success: { color: '#40b070', bg: '#1a1a2e' },
  };
}

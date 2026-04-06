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
 * Create a minimal palette with default light theme colors for all 40 style keys.
 * This is used internally when no palette is provided.
 */
function createMinimalPalette(): Palette {
  const def = { color: '#1a1a1a', bg: '#faf6ef' };
  return {
    bg: def,
    dot: { color: '#c0c0cc', bg: 'transparent' },
    border: { color: '#6b6b80', bg: 'transparent' },
    dim: { color: '#999999', bg: 'transparent' },
    text: { color: '#1a1a1a', bg: 'transparent' },
    badge: { color: '#ffffff', bg: '#2563eb' },
    edge: { color: '#6b6b80', bg: 'transparent' },
    accentBorder: { color: '#2563eb', bg: 'transparent' },
    accentText: { color: '#2563eb', bg: 'transparent' },
    nodeBg: { color: '#3a3a4a', bg: '#f0ece4' },
    modalBorder: { color: '#6b6b80', bg: '#f0ece4' },
    modalBg: { color: '#3a3a4a', bg: '#f0ece4' },
    modalTitle: { color: '#1a1a1a', bg: '#f0ece4', fontWeight: 700 },
    modalText: { color: '#3a3a4a', bg: '#f0ece4' },
    modalClose: { color: '#999999', bg: '#f0ece4' },
    modalTab: { color: '#999999', bg: '#f0ece4' },
    modalTabActive: { color: '#2563eb', bg: '#f0ece4' },
    modalHint: { color: '#999999', bg: '#f0ece4' },
    modalTitleBold: { color: '#1a1a1a', bg: '#f0ece4', fontWeight: 700 },
    modalHeading: { color: '#2563eb', bg: '#f0ece4', fontWeight: 700 },
    queryBorder: { color: '#2563eb', bg: 'transparent' },
    queryBg: { color: '#1a1a1a', bg: 'transparent' },
    queryText: { color: '#1a1a1a', bg: 'transparent' },
    queryCursor: { color: '#2563eb', bg: 'transparent' },
    queryHint: { color: '#999999', bg: 'transparent' },
    queryButton: { color: '#999999', bg: 'transparent' },
    queryButtonActive: { color: '#ffffff', bg: '#2563eb' },
    queryError: { color: '#dc2626', bg: 'transparent' },
    queryPill: { color: '#2563eb', bg: 'transparent' },
    queryPillBlink: { color: '#ffffff', bg: '#2563eb' },
    queryDivider: { color: '#6b6b80', bg: 'transparent' },
    queryCitation: { color: '#999999', bg: 'transparent' },
    queryMatch: { color: '#2563eb', bg: 'transparent', fontWeight: 700 },
    textBold: { color: '#1a1a1a', bg: 'transparent', fontWeight: 700 },
    dimOnCard: { color: '#999999', bg: '#f0ece4' },
    imageDeep: { color: '#222222', bg: 'transparent' },
    imageMid: { color: '#888888', bg: 'transparent' },
    imageLight: { color: '#cccccc', bg: 'transparent' },
    imageEdge: { color: '#ffffff', bg: 'transparent' },
    success: { color: '#16a34a', bg: 'transparent' },
  };
}

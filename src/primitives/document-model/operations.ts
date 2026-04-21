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
import { createDefaultGridConfig } from '@primitives/grid-engine/measurement.ts';

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
 * Refuses to remove Background layers. Handles hierarchy cleanup.
 */
export function removeLayer(page: FigMePage, layerId: string): FigMePage {
  const layer = page.layers[layerId];
  if (!layer) return page;
  if (layer.isBackground) return page;

  let result = { ...page, layers: { ...page.layers } };

  // Collect IDs to remove (layer + all descendants if group)
  const toRemove = new Set<string>([layerId]);
  if (layer.kind === 'group' && layer.children?.length) {
    const collectDescendants = (ids: string[]) => {
      for (const id of ids) {
        toRemove.add(id);
        const child = page.layers[id];
        if (child?.kind === 'group' && child.children?.length) {
          collectDescendants(child.children);
        }
      }
    };
    collectDescendants(layer.children);
  }

  // Remove from parent's children if nested
  if (layer.parentId) {
    const parent = result.layers[layer.parentId];
    if (parent?.children) {
      result.layers[layer.parentId] = {
        ...parent,
        children: parent.children.filter((id) => id !== layerId),
      };
    }
  }

  // Remove all collected IDs from layers map
  for (const id of toRemove) {
    delete result.layers[id];
  }

  result = {
    ...result,
    layerOrder: result.layerOrder.filter((id) => !toRemove.has(id)),
  };

  return result;
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
  const defaultGridConfig: GridConfig = gridConfig ?? createDefaultGridConfig();

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
 * Create an empty FigMe page with a default Background layer.
 */
export function createEmptyPage(name?: string): FigMePage {
  const bgId = generateId();
  const bgLayer: Layer = {
    id: bgId,
    kind: 'group',
    name: 'Background',
    rect: { col: 0, row: 0, width: 0, height: 0 },
    visible: true,
    locked: false,
    opacity: 1,
    styleKey: 'bg',
    children: [],
    isBackground: true,
    properties: {},
  };

  return {
    id: `page_${Date.now()}_${++idCounter}`,
    name: name ?? 'Untitled Page',
    layers: { [bgId]: bgLayer },
    layerOrder: [bgId],
    canvasX: 0,
    canvasY: 0,
  };
}

// ---------------------------------------------------------------------------
// Group / Ungroup
// ---------------------------------------------------------------------------

/**
 * Group the given layers into a new group.  The group is inserted at the
 * position of the frontmost selected element.
 */
export function groupLayers(
  page: FigMePage,
  layerIds: string[],
  groupName?: string,
): FigMePage {
  if (layerIds.length === 0) return page;

  const layers = { ...page.layers };
  let layerOrder = [...page.layerOrder];

  // Determine each layer's sibling list and remove from it
  for (const id of layerIds) {
    const layer = layers[id];
    if (!layer) continue;
    if (layer.parentId) {
      const parent = layers[layer.parentId];
      if (parent?.children) {
        layers[layer.parentId] = {
          ...parent,
          children: parent.children.filter((c) => c !== id),
        };
      }
    } else {
      layerOrder = layerOrder.filter((c) => c !== id);
    }
  }

  // Compute bounding rect from children
  const rects = layerIds
    .map((id) => page.layers[id]?.rect)
    .filter((r): r is GridRect => r !== undefined);
  if (rects.length === 0) return page;
  const minCol = Math.min(...rects.map((r) => r.col));
  const minRow = Math.min(...rects.map((r) => r.row));
  const maxCol = Math.max(...rects.map((r) => r.col + r.width));
  const maxRow = Math.max(...rects.map((r) => r.row + r.height));

  // Create the group layer
  const groupId = generateId();
  const groupLayer: Layer = {
    id: groupId,
    kind: 'group',
    name: groupName ?? 'Group',
    rect: { col: minCol, row: minRow, width: maxCol - minCol, height: maxRow - minRow },
    visible: true,
    locked: false,
    opacity: 1,
    styleKey: 'bg',
    children: layerIds,
    properties: {},
  };

  // Set parentId on children
  for (const id of layerIds) {
    const child = layers[id];
    if (child) {
      layers[id] = { ...child, parentId: groupId };
    }
  }

  // Insert group at the position of the frontmost element in the original order
  const originalOrder = page.layerOrder;
  let insertIdx = layerOrder.length;
  for (let i = originalOrder.length - 1; i >= 0; i--) {
    if (layerIds.includes(originalOrder[i]!)) {
      // Find where the element _before_ this one ended up in the new order
      const beforeId = originalOrder.slice(0, i).reverse().find((id) => layerOrder.includes(id));
      insertIdx = beforeId ? layerOrder.indexOf(beforeId) + 1 : 0;
      break;
    }
  }

  layerOrder.splice(insertIdx, 0, groupId);
  layers[groupId] = groupLayer;

  return { ...page, layers, layerOrder };
}

/**
 * Dissolve a group — its children are spliced into the parent's order
 * at the group's position.
 */
export function ungroupLayers(page: FigMePage, groupId: string): FigMePage {
  const group = page.layers[groupId];
  if (!group || group.kind !== 'group' || group.isBackground) return page;

  const children = group.children ?? [];
  const layers = { ...page.layers };

  // Clear parentId on children (or set to group's parent if nested)
  for (const childId of children) {
    const child = layers[childId];
    if (child) {
      layers[childId] = group.parentId
        ? { ...child, parentId: group.parentId }
        : { ...child, parentId: undefined };
    }
  }

  // Splice children into the group's position in its sibling list
  if (group.parentId) {
    const parent = layers[group.parentId];
    if (parent?.children) {
      const idx = parent.children.indexOf(groupId);
      const newChildren = [...parent.children];
      newChildren.splice(idx, 1, ...children);
      layers[group.parentId] = { ...parent, children: newChildren };
    }
  } else {
    const idx = page.layerOrder.indexOf(groupId);
    const newOrder = [...page.layerOrder];
    newOrder.splice(idx, 1, ...children);
    // Remove the group from layers, return with spliced order
    delete layers[groupId];
    return { ...page, layers, layerOrder: newOrder };
  }

  delete layers[groupId];
  return { ...page, layers, layerOrder: page.layerOrder.filter((id) => id !== groupId) };
}

// ---------------------------------------------------------------------------
// Z-order operations — work within sibling list
// ---------------------------------------------------------------------------

function getSiblingList(page: FigMePage, layerId: string): { list: string[]; key: 'layerOrder' | 'children'; parentId?: string } {
  const layer = page.layers[layerId];
  if (!layer) return { list: [], key: 'layerOrder' };
  if (layer.parentId) {
    const parent = page.layers[layer.parentId];
    return { list: parent?.children ?? [], key: 'children', parentId: layer.parentId };
  }
  return { list: page.layerOrder, key: 'layerOrder' };
}

function applySiblingOrder(page: FigMePage, newList: string[], parentId?: string): FigMePage {
  if (parentId) {
    const parent = page.layers[parentId];
    if (!parent) return page;
    return {
      ...page,
      layers: { ...page.layers, [parentId]: { ...parent, children: newList } },
    };
  }
  return { ...page, layerOrder: newList };
}

/** Smallest index that a non-background layer can occupy at root level. */
function bgGuardIndex(page: FigMePage, siblings: string[]): number {
  const first = siblings[0];
  if (first && page.layers[first]?.isBackground) return 1;
  return 0;
}

export function bringForward(page: FigMePage, layerId: string): FigMePage {
  if (page.layers[layerId]?.isBackground) return page;
  const { list, parentId } = getSiblingList(page, layerId);
  const idx = list.indexOf(layerId);
  if (idx === -1 || idx >= list.length - 1) return page;
  const next = [...list];
  [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
  return applySiblingOrder(page, next, parentId);
}

export function sendBackward(page: FigMePage, layerId: string): FigMePage {
  if (page.layers[layerId]?.isBackground) return page;
  const { list, parentId } = getSiblingList(page, layerId);
  const idx = list.indexOf(layerId);
  const minIdx = parentId ? 0 : bgGuardIndex(page, list);
  if (idx === -1 || idx <= minIdx) return page;
  const next = [...list];
  [next[idx], next[idx - 1]] = [next[idx - 1]!, next[idx]!];
  return applySiblingOrder(page, next, parentId);
}

export function bringToFront(page: FigMePage, layerId: string): FigMePage {
  if (page.layers[layerId]?.isBackground) return page;
  const { list, parentId } = getSiblingList(page, layerId);
  const idx = list.indexOf(layerId);
  if (idx === -1 || idx >= list.length - 1) return page;
  const next = list.filter((id) => id !== layerId);
  next.push(layerId);
  return applySiblingOrder(page, next, parentId);
}

export function sendToBack(page: FigMePage, layerId: string): FigMePage {
  if (page.layers[layerId]?.isBackground) return page;
  const { list, parentId } = getSiblingList(page, layerId);
  const idx = list.indexOf(layerId);
  const minIdx = parentId ? 0 : bgGuardIndex(page, list);
  if (idx === -1 || idx <= minIdx) return page;
  const next = list.filter((id) => id !== layerId);
  next.splice(minIdx, 0, layerId);
  return applySiblingOrder(page, next, parentId);
}

// ---------------------------------------------------------------------------
// Reparent (drag-and-drop)
// ---------------------------------------------------------------------------

/**
 * Move a layer to a different group (or to root if targetGroupId is null).
 * Validates against circular references.
 */
export function moveLayerToGroup(
  page: FigMePage,
  layerId: string,
  targetGroupId: string | null,
  insertIndex?: number,
): FigMePage {
  const layer = page.layers[layerId];
  if (!layer || layer.isBackground) return page;

  // Prevent circular ref: target must not be a descendant of layerId
  if (targetGroupId) {
    let check: string | undefined = targetGroupId;
    while (check) {
      if (check === layerId) return page;
      check = page.layers[check]?.parentId;
    }
  }

  const layers = { ...page.layers };
  let layerOrder = [...page.layerOrder];

  // Remove from current parent
  if (layer.parentId) {
    const parent = layers[layer.parentId];
    if (parent?.children) {
      layers[layer.parentId] = {
        ...parent,
        children: parent.children.filter((id) => id !== layerId),
      };
    }
  } else {
    layerOrder = layerOrder.filter((id) => id !== layerId);
  }

  // Insert into target
  if (targetGroupId) {
    const target = layers[targetGroupId];
    if (!target || target.kind !== 'group') return page;
    const children = [...(target.children ?? [])];
    const idx = insertIndex !== undefined ? Math.min(insertIndex, children.length) : children.length;
    children.splice(idx, 0, layerId);
    layers[targetGroupId] = { ...target, children };
    layers[layerId] = { ...layer, parentId: targetGroupId };
  } else {
    const idx = insertIndex !== undefined ? Math.min(insertIndex, layerOrder.length) : layerOrder.length;
    // Respect Background position at root
    const minIdx = bgGuardIndex(page, layerOrder);
    layerOrder.splice(Math.max(idx, minIdx), 0, layerId);
    layers[layerId] = { ...layer, parentId: undefined };
  }

  return { ...page, layers, layerOrder };
}

/**
 * Create a minimal palette with default light theme colors for all 56 style keys.
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
    etchFrame: { color: '#cc3333', bg: '#aa2222' },
    etchScreen: { color: '#88aa66', bg: '#667744' },
    etchScreenBorder: { color: '#556633', bg: '#667744' },
    etchTrail: { color: '#334422', bg: '#667744' },
    etchCursor: { color: '#ffffff', bg: '#667744' },
    etchKnob: { color: '#ffffff', bg: '#cc3333' },
    ghostBlob: { color: '#aaaaff', bg: 'transparent' },
    ghostEye: { color: '#ffffff', bg: '#aaaaff' },
    ghostBubbleBorder: { color: '#6b6b80', bg: '#f0ece4' },
    ghostBubbleBg: { color: '#3a3a4a', bg: '#f0ece4' },
    ghostBubbleText: { color: '#1a1a1a', bg: '#f0ece4' },
    ghostBubbleUser: { color: '#2563eb', bg: '#f0ece4' },
    ghostInput: { color: '#1a1a1a', bg: '#f0ece4' },
    ghostInputCursor: { color: '#2563eb', bg: '#f0ece4' },
    ghostClose: { color: '#999999', bg: '#f0ece4' },
    ghostInputHint: { color: '#999999', bg: '#f0ece4' },
    imageDeep: { color: '#222222', bg: 'transparent' },
    imageMid: { color: '#888888', bg: 'transparent' },
    imageLight: { color: '#cccccc', bg: 'transparent' },
    imageEdge: { color: '#ffffff', bg: 'transparent' },
    success: { color: '#16a34a', bg: 'transparent' },
  };
}

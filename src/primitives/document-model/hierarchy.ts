import type { FigMePage, Layer } from './types.ts';

/**
 * Recursively expand layerOrder (and group children) into a flat
 * rendering-order array.  First element = back, last = front.
 */
export function flattenLayerOrder(page: FigMePage): string[] {
  const result: string[] = [];

  function walk(ids: string[]) {
    for (const id of ids) {
      const layer: Layer | undefined = page.layers[id];
      if (!layer) continue;
      result.push(id);
      if (layer.kind === 'group' && layer.children?.length) {
        walk(layer.children);
      }
    }
  }

  walk(page.layerOrder);
  return result;
}

/**
 * True if the layer itself or any ancestor is locked.
 */
export function isEffectivelyLocked(page: FigMePage, layerId: string): boolean {
  let id: string | undefined = layerId;
  while (id) {
    const layer: Layer | undefined = page.layers[id];
    if (!layer) return false;
    if (layer.locked) return true;
    id = layer.parentId;
  }
  return false;
}

/**
 * True if the layer itself or any ancestor is hidden.
 */
export function isEffectivelyHidden(page: FigMePage, layerId: string): boolean {
  let id: string | undefined = layerId;
  while (id) {
    const layer: Layer | undefined = page.layers[id];
    if (!layer) return false;
    if (!layer.visible) return true;
    id = layer.parentId;
  }
  return false;
}

/**
 * Nesting depth (0 = root level).
 */
export function getDepth(page: FigMePage, layerId: string): number {
  let depth = 0;
  let current: Layer | undefined = page.layers[layerId];
  while (current?.parentId) {
    depth++;
    current = page.layers[current.parentId];
  }
  return depth;
}

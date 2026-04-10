import type { GridPosition } from '@primitives/grid-engine/types.ts';
import type { Layer } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { flattenLayerOrder, isEffectivelyLocked, isEffectivelyHidden } from '@primitives/document-model/hierarchy.ts';

export function pointInRect(pos: GridPosition, layer: Layer): boolean {
  return (
    pos.col >= layer.rect.col &&
    pos.col < layer.rect.col + layer.rect.width &&
    pos.row >= layer.rect.row &&
    pos.row < layer.rect.row + layer.rect.height
  );
}

export function hitTestLayers(gridPos: GridPosition): Layer | null {
  const doc = useDocumentStore.getState().document;
  const page = doc.pages.find((p) => p.id === doc.activePageId);
  if (!page) return null;

  const flat = flattenLayerOrder(page);
  for (let i = flat.length - 1; i >= 0; i--) {
    const layerId = flat[i];
    if (!layerId) continue;
    const layer = page.layers[layerId];
    if (!layer || layer.kind === 'group') continue;
    if (isEffectivelyHidden(page, layerId) || isEffectivelyLocked(page, layerId)) continue;
    if (pointInRect(gridPos, layer)) return layer;
  }
  return null;
}

import type { GridPosition } from '@primitives/grid-engine/types.ts';
import type { Layer } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';

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

  for (let i = page.layerOrder.length - 1; i >= 0; i--) {
    const layerId = page.layerOrder[i];
    if (!layerId) continue;
    const layer = page.layers[layerId];
    if (!layer || !layer.visible || layer.locked) continue;
    if (pointInRect(gridPos, layer)) return layer;
  }
  return null;
}

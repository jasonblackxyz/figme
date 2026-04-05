import { useUiStore } from '@stores/uiStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { computeGuides } from '@primitives/layout-engine/guides.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import styles from './SmartGuides.module.css';

export function SmartGuides() {
  const enabled = useUiStore(s => s.smartGuidesEnabled);
  const isDragging = useUiStore(s => s.isDragging);
  const selectedIds = useUiStore(s => s.selectedLayerIds);
  const doc = useDocumentStore(s => s.document);
  const panX = useViewportStore(s => s.panX);
  const panY = useViewportStore(s => s.panY);
  const getConfig = useViewportStore(s => s.getEffectiveGridConfig);

  if (!enabled || !isDragging || selectedIds.length === 0) return null;

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  if (!activePage) return null;

  const config = getConfig();

  // Get the first selected layer's rect as the "dragging rect"
  const firstId = selectedIds[0]!;
  const draggingLayer = activePage.layers[firstId];
  if (!draggingLayer) return null;

  // Collect other rects (non-selected, visible layers)
  const otherRects: GridRect[] = [];
  for (const id of activePage.layerOrder) {
    if (selectedIds.includes(id)) continue;
    const layer = activePage.layers[id];
    if (layer && layer.visible) otherRects.push(layer.rect);
  }

  const result = computeGuides(draggingLayer.rect, otherRects);

  return (
    <div className={styles.container}>
      {result.guides.map((guide, i) => {
        if (guide.orientation === 'vertical') {
          const x = guide.position * config.cellWidth + panX;
          const y1 = guide.fromCell * config.cellHeight + panY;
          const y2 = guide.toCell * config.cellHeight + panY;
          return (
            <div
              key={`v-${i}`}
              className={styles.guideLine}
              style={{ left: x, top: y1, width: 1, height: y2 - y1 }}
              data-guide-kind={guide.kind}
            />
          );
        } else {
          const y = guide.position * config.cellHeight + panY;
          const x1 = guide.fromCell * config.cellWidth + panX;
          const x2 = guide.toCell * config.cellWidth + panX;
          return (
            <div
              key={`h-${i}`}
              className={styles.guideLine}
              style={{ left: x1, top: y, width: x2 - x1, height: 1 }}
              data-guide-kind={guide.kind}
            />
          );
        }
      })}
    </div>
  );
}

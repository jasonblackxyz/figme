import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import styles from './SelectionOverlay.module.css';

interface SelectionOverlayProps {
  gridConfig: GridConfig;
  panX: number;
  panY: number;
}

export function SelectionOverlay({ gridConfig, panX, panY }: SelectionOverlayProps) {
  const selectedLayerIds = useUiStore((s) => s.selectedLayerIds);
  const marqueeRect = useUiStore((s) => s.marqueeRect);
  const doc = useDocumentStore((s) => s.document);
  const page = doc.pages.find((p) => p.id === doc.activePageId);

  return (
    <>
      {page &&
        selectedLayerIds.map((layerId) => {
          const layer = page.layers[layerId];
          if (!layer) return null;
          return (
            <div
              key={layerId}
              className={styles.selectionBox}
              data-testid={`selection-${layerId}`}
              style={{
                left: layer.rect.col * gridConfig.cellWidth + panX,
                top: layer.rect.row * gridConfig.cellHeight + panY,
                width: layer.rect.width * gridConfig.cellWidth,
                height: layer.rect.height * gridConfig.cellHeight,
              }}
            />
          );
        })}
      {marqueeRect && (marqueeRect.width > 0 || marqueeRect.height > 0) && (
        <div
          className={styles.marquee}
          data-testid="marquee"
          style={{
            left: marqueeRect.col * gridConfig.cellWidth + panX,
            top: marqueeRect.row * gridConfig.cellHeight + panY,
            width: marqueeRect.width * gridConfig.cellWidth,
            height: marqueeRect.height * gridConfig.cellHeight,
          }}
        />
      )}
    </>
  );
}

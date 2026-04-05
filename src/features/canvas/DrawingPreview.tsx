import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import styles from './DrawingPreview.module.css';

export function DrawingPreview() {
  const preview = useUiStore((s) => s.drawingPreview);
  const panX = useViewportStore((s) => s.panX);
  const panY = useViewportStore((s) => s.panY);
  const getConfig = useViewportStore((s) => s.getEffectiveGridConfig);

  if (!preview) return null;

  const config = getConfig();
  const left = preview.rect.col * config.cellWidth + panX;
  const top = preview.rect.row * config.cellHeight + panY;
  const width = preview.rect.width * config.cellWidth;
  const height = preview.rect.height * config.cellHeight;

  return (
    <div
      className={styles.drawingPreview}
      style={{ left, top, width, height }}
      data-preview-kind={preview.kind}
    />
  );
}

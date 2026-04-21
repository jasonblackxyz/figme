import { useViewportStore } from '@stores/viewportStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';
import { getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const cursorGridPos = useViewportStore((s) => s.cursorGridPos);
  const zoom = useViewportStore((s) => s.zoom);
  const doc = useDocumentStore((s) => s.document);
  const page = doc.pages.find((p) => p.id === doc.activePageId);
  const layerCount = page ? flattenLayerOrder(page).length : 0;
  const canvasSize = page ? getPageCanvasSizeInfo(page, doc.gridConfig) : null;

  const col = cursorGridPos?.col ?? 0;
  const row = cursorGridPos?.row ?? 0;
  const gridSizeLabel = canvasSize
    ? `${canvasSize.effectiveCols}x${canvasSize.effectiveRows} ${canvasSize.isOverridden ? 'custom' : 'default'}`
    : `${doc.gridConfig.canvasCols}x${doc.gridConfig.canvasRows} default`;

  return (
    <footer className={styles.statusBar} data-testid="status-bar">
      <span data-status="cursor-pos">Col {col}, Row {row}</span>
      <span data-status="zoom">{Math.round(zoom * 100)}%</span>
      <span
        data-status="grid-size"
        data-grid-cols={canvasSize?.effectiveCols ?? doc.gridConfig.canvasCols}
        data-grid-rows={canvasSize?.effectiveRows ?? doc.gridConfig.canvasRows}
        data-grid-mode={canvasSize?.isOverridden ? 'custom' : 'default'}
      >
        {gridSizeLabel}
      </span>
      <span data-status="layer-count">{layerCount} layers</span>
    </footer>
  );
}

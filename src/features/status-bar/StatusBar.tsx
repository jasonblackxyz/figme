import { useViewportStore } from '@stores/viewportStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const cursorGridPos = useViewportStore((s) => s.cursorGridPos);
  const zoom = useViewportStore((s) => s.zoom);
  const gridConfig = useViewportStore((s) => s.getEffectiveGridConfig());
  const toggleExportDialog = useUiStore((s) => s.toggleExportDialog);

  const doc = useDocumentStore((s) => s.document);
  const page = doc.pages.find((p) => p.id === doc.activePageId);
  const layerCount = page ? flattenLayerOrder(page).length : 0;

  const col = cursorGridPos?.col ?? 0;
  const row = cursorGridPos?.row ?? 0;

  return (
    <footer className={styles.statusBar} data-testid="status-bar">
      <span data-status="cursor-pos">Col {col}, Row {row}</span>
      <span data-status="zoom">{Math.round(zoom * 100)}%</span>
      <span data-status="grid-size">{gridConfig.canvasCols}x{gridConfig.canvasRows}</span>
      <span data-status="layer-count">{layerCount} layers</span>
      <button className={styles.exportButton} onClick={toggleExportDialog}>
        Export
      </button>
    </footer>
  );
}

import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import styles from './CanvasChrome.module.css';

export function CanvasChrome() {
  const interfaceMode = useUiStore((s) => s.interfaceMode);
  const selectionMode = useUiStore((s) => s.canvasSelectionMode);
  const setSelectionMode = useUiStore((s) => s.setCanvasSelectionMode);
  const overlayVisible = useUiStore((s) => s.regionOverlayVisible);
  const toggleOverlay = useUiStore((s) => s.toggleRegionOverlay);
  const activeTool = useToolStore((s) => s.activeTool);
  const doc = useDocumentStore((s) => s.document);
  const activePage = doc.pages.find((p) => p.id === doc.activePageId);
  const regionCount = activePage?.regions ? Object.keys(activePage.regions).length : 0;

  // Hide chrome in AI mode — agents work via API.
  if (interfaceMode !== 'human') return null;

  return (
    <div className={styles.chrome} data-component="canvas-chrome" role="toolbar" aria-label="Canvas selection mode">
      <span className={styles.label}>Select</span>
      <div className={styles.segmented} role="group" aria-label="Selection target">
        <button
          type="button"
          className={`${styles.segment} ${selectionMode === 'layers' ? styles.segmentActive : ''}`}
          aria-pressed={selectionMode === 'layers'}
          data-selection-mode="layers"
          onClick={() => setSelectionMode('layers')}
        >
          Layers
        </button>
        <button
          type="button"
          className={`${styles.segment} ${selectionMode === 'regions' ? styles.segmentActive : ''}`}
          aria-pressed={selectionMode === 'regions'}
          data-selection-mode="regions"
          onClick={() => setSelectionMode('regions')}
        >
          Regions
        </button>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <button
        type="button"
        className={`${styles.toggle} ${overlayVisible ? styles.toggleActive : ''}`}
        aria-pressed={overlayVisible}
        onClick={toggleOverlay}
        data-action="toggle-region-overlay"
      >
        Region overlay {overlayVisible ? 'on' : 'off'}
      </button>

      <span className={styles.count} data-status="region-count">
        {regionCount} regions
        {activeTool === 'region-paint' && ' · paint mode'}
      </span>
    </div>
  );
}

import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { CommonProperties } from './CommonProperties.tsx';
import { BorderBoxProperties } from './BorderBoxProperties.tsx';
import { TextBlockProperties } from './TextBlockProperties.tsx';
import { FigletTextProperties } from './FigletTextProperties.tsx';
import { AlignmentButtons } from './AlignmentButtons.tsx';
import { AutoLayoutControls } from './AutoLayoutControls.tsx';
import styles from './PropertiesPanel.module.css';

export function PropertiesPanel() {
  const doc = useDocumentStore(s => s.document);
  const selectedIds = useUiStore(s => s.selectedLayerIds);

  const togglePropertiesPanel = useUiStore(s => s.togglePropertiesPanel);

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  if (!activePage || selectedIds.length === 0) {
    return (
      <div className={styles.panel} data-component="properties-panel">
        <div className={styles.header}>
          <button
            className={styles.collapseButton}
            onClick={togglePropertiesPanel}
            aria-label="Collapse properties panel"
            aria-expanded={true}
            title="Collapse properties panel (Ctrl+Shift+\)"
          >
            {'\u00BB'}
          </button>
          <h2 className={styles.title}>Properties</h2>
        </div>
        <div className={styles.empty}>No selection</div>
      </div>
    );
  }

  // Show properties for first selected layer (multi-select shows common only)
  const layerId = selectedIds[0]!;
  const layer = activePage.layers[layerId];
  if (!layer) return null;

  return (
    <div className={styles.panel} data-component="properties-panel">
      <div className={styles.header}>
        <button
          className={styles.collapseButton}
          onClick={togglePropertiesPanel}
          aria-label="Collapse properties panel"
          aria-expanded={true}
          title="Collapse properties panel (Ctrl+Shift+\)"
        >
          {'\u00BB'}
        </button>
        <h2 className={styles.title}>Properties</h2>
      </div>
      <div className={styles.content}>
        <CommonProperties layer={layer} />
        <AlignmentButtons />
        {layer.autoLayout && <AutoLayoutControls layer={layer} />}
        {layer.kind === 'border-box' && <BorderBoxProperties layer={layer} />}
        {layer.kind === 'text-block' && <TextBlockProperties layer={layer} />}
        {layer.kind === 'figlet-text' && <FigletTextProperties layer={layer} />}
      </div>
    </div>
  );
}

import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { CommonProperties } from './CommonProperties.tsx';
import { BorderBoxProperties } from './BorderBoxProperties.tsx';
import { TextBlockProperties } from './TextBlockProperties.tsx';
import { FigletTextProperties } from './FigletTextProperties.tsx';
import { AlignmentButtons } from './AlignmentButtons.tsx';
import { AutoLayoutControls } from './AutoLayoutControls.tsx';
import { DrawToolProperties } from './DrawToolProperties.tsx';
import { RegionProperties } from './RegionProperties.tsx';
import { PageRuntimeProperties } from './PageRuntimeProperties.tsx';
import styles from './PropertiesPanel.module.css';

export function PropertiesPanel() {
  const doc = useDocumentStore(s => s.document);
  const selectedIds = useUiStore(s => s.selectedLayerIds);
  const selectedRegionId = useUiStore(s => s.selectedRegionId);
  const activeTool = useToolStore(s => s.activeTool);

  const togglePropertiesPanel = useUiStore(s => s.togglePropertiesPanel);

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  const isDrawTool = activeTool === 'draw';
  const isRegionPaintTool = activeTool === 'region-paint';
  const region = selectedRegionId && activePage?.regions
    ? activePage.regions[selectedRegionId]
    : undefined;
  const hasContent = isDrawTool || selectedIds.length > 0 || !!region || isRegionPaintTool;

  if (!activePage || !hasContent) {
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
          {activePage ? <PageRuntimeProperties page={activePage} /> : <div className={styles.empty}>No selection</div>}
        </div>
      </div>
    );
  }

  const layerId = selectedIds[0];
  const layer = layerId ? activePage.layers[layerId] : undefined;

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
        {isDrawTool && <DrawToolProperties />}
        {region && <RegionProperties region={region} />}
        {layer && (
          <>
            <CommonProperties layer={layer} />
            <AlignmentButtons />
            {layer.autoLayout && <AutoLayoutControls layer={layer} />}
            {layer.kind === 'border-box' && <BorderBoxProperties layer={layer} />}
            {layer.kind === 'text-block' && <TextBlockProperties layer={layer} />}
            {layer.kind === 'figlet-text' && <FigletTextProperties layer={layer} />}
          </>
        )}
        {(isRegionPaintTool || region) && <PageRuntimeProperties page={activePage} />}
      </div>
    </div>
  );
}

import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { ArtboardTabs } from '@features/artboard-manager/ArtboardTabs.tsx';
import { LayerRow } from './LayerRow.tsx';
import styles from './LayersPanel.module.css';

export function LayersPanel() {
  const doc = useDocumentStore(s => s.document);
  const selectedIds = useUiStore(s => s.selectedLayerIds);
  const setSelected = useUiStore(s => s.setSelectedLayers);

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  if (!activePage) return null;

  // Reverse order so topmost layer appears first
  const orderedIds = [...activePage.layerOrder].reverse();

  return (
    <div className={styles.panel} data-component="layers-panel">
      <ArtboardTabs />
      <div className={styles.header}>
        <h2 className={styles.title}>Layers</h2>
        <button
          className={styles.collapseButton}
          onClick={useUiStore.getState().toggleLayersPanel}
          aria-label="Collapse layers panel"
          aria-expanded={true}
          title="Collapse layers panel (Ctrl+\)"
        >
          {'\u00AB'}
        </button>
      </div>
      <ul role="tree" className={styles.layerList} aria-label="Layers">
        {orderedIds.map(id => {
          const layer = activePage.layers[id];
          if (!layer) return null;
          return (
            <LayerRow
              key={id}
              layer={layer}
              isSelected={selectedIds.includes(id)}
              onSelect={(shiftKey) => {
                if (shiftKey) {
                  // Toggle selection
                  const newIds = selectedIds.includes(id)
                    ? selectedIds.filter(x => x !== id)
                    : [...selectedIds, id];
                  setSelected(newIds);
                } else {
                  setSelected([id]);
                }
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}

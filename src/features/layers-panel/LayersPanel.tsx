import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { LayerRow } from './LayerRow.tsx';
import type { FIGMIIPage } from '@primitives/document-model/types.ts';
import styles from './LayersPanel.module.css';

export function LayersPanel() {
  const doc = useDocumentStore(s => s.document);
  const selectedIds = useUiStore(s => s.selectedLayerIds);
  const setSelected = useUiStore(s => s.setSelectedLayers);
  const collapsedGroupIds = useUiStore(s => s.collapsedGroupIds);
  const toggleGroupCollapsed = useUiStore(s => s.toggleGroupCollapsed);

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  if (!activePage) return null;

  function handleSelect(id: string, shiftKey: boolean) {
    if (shiftKey) {
      const newIds = selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id];
      setSelected(newIds);
    } else {
      setSelected([id]);
    }
  }

  function renderTree(ids: string[], page: FIGMIIPage, depth: number) {
    // Reverse so top = front (highest z-order first in the UI)
    const reversed = [...ids].reverse();
    return reversed.map(id => {
      const layer = page.layers[id];
      if (!layer) return null;
      const isGroup = layer.kind === 'group' && !layer.isBackground;
      const isCollapsed = collapsedGroupIds.includes(id);
      return (
        <li
          key={id}
          role="treeitem"
          aria-label={layer.name}
          aria-selected={selectedIds.includes(id)}
          aria-expanded={isGroup ? !isCollapsed : undefined}
          data-layer-id={layer.id}
          data-layer-kind={layer.kind}
        >
          <LayerRow
            layer={layer}
            isSelected={selectedIds.includes(id)}
            onSelect={(shiftKey) => handleSelect(id, shiftKey)}
            depth={depth}
            isGroup={isGroup}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => toggleGroupCollapsed(id)}
          />
          {isGroup && !isCollapsed && layer.children?.length ? (
            <ul role="group" className={styles.layerList}>
              {renderTree(layer.children, page, depth + 1)}
            </ul>
          ) : null}
        </li>
      );
    });
  }

  return (
    <div className={styles.panel} data-component="layers-panel">
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
        {renderTree(activePage.layerOrder, activePage, 0)}
      </ul>
    </div>
  );
}

import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { computeAlignment } from '@primitives/layout-engine/alignment.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import type { AlignmentMode } from '@primitives/layout-engine/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import styles from './PropertiesPanel.module.css';

const MODES: Array<{ mode: AlignmentMode; label: string }> = [
  { mode: 'align-left', label: '\u2B05' },
  { mode: 'align-center-h', label: '\u2194' },
  { mode: 'align-right', label: '\u27A1' },
  { mode: 'align-top', label: '\u2B06' },
  { mode: 'align-center-v', label: '\u2195' },
  { mode: 'align-bottom', label: '\u2B07' },
  { mode: 'distribute-h', label: '\u21D4' },
  { mode: 'distribute-v', label: '\u21D5' },
];

export function AlignmentButtons() {
  const selectedIds = useUiStore(s => s.selectedLayerIds);
  const doc = useDocumentStore(s => s.document);

  if (selectedIds.length < 2) return null;

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  if (!activePage) return null;

  const handleAlign = (mode: AlignmentMode) => {
    const rects: Record<string, GridRect> = {};
    for (const id of selectedIds) {
      const layer = activePage.layers[id];
      if (layer) rects[id] = layer.rect;
    }

    const result = computeAlignment(rects, mode);

    const docStore = useDocumentStore.getState();
    docStore.pushUndo();

    let page = activePage;
    for (const [id, pos] of Object.entries(result.newPositions)) {
      const layer = page.layers[id];
      if (layer) {
        page = updateLayer(page, id, { rect: { ...layer.rect, col: pos.col, row: pos.row } });
      }
    }

    docStore.setDocument({
      ...doc,
      pages: doc.pages.map(p => p.id === page.id ? page : p),
    });
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Alignment</h3>
      <div className={styles.radioGroup}>
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            className={styles.radioButton}
            data-action={mode}
            onClick={() => handleAlign(mode)}
            title={mode}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

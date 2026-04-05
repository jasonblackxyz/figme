import type { Layer, AutoLayoutConfig } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import styles from './PropertiesPanel.module.css';

interface Props {
  layer: Layer;
}

function applyAutoLayoutUpdate(layerId: string, updates: Partial<AutoLayoutConfig>) {
  const docStore = useDocumentStore.getState();
  const doc = docStore.document;
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;
  const existing = page.layers[layerId];
  if (!existing || !existing.autoLayout) return;
  docStore.pushUndo();
  const updatedPage = updateLayer(page, layerId, {
    autoLayout: { ...existing.autoLayout, ...updates },
  });
  docStore.setDocument({
    ...doc,
    pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
  });
}

export function AutoLayoutControls({ layer }: Props) {
  const config = layer.autoLayout;
  if (!config) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Auto Layout</h3>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Direction</label>
          <div className={styles.radioGroup}>
            {(['vertical', 'horizontal'] as const).map(d => (
              <button
                key={d}
                className={`${styles.radioButton} ${config.direction === d ? styles.radioActive : ''}`}
                data-property="direction"
                onClick={() => applyAutoLayoutUpdate(layer.id, { direction: d })}
              >
                {d === 'vertical' ? 'V' : 'H'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Gap</label>
          <input
            className={styles.smallInput}
            type="number"
            value={config.gap}
            data-property="gap"
            onChange={(e) => applyAutoLayoutUpdate(layer.id, { gap: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Align</label>
          <div className={styles.radioGroup}>
            {(['start', 'center', 'end'] as const).map(a => (
              <button
                key={a}
                className={`${styles.radioButton} ${config.alignment === a ? styles.radioActive : ''}`}
                data-property="autoLayoutAlign"
                onClick={() => applyAutoLayoutUpdate(layer.id, { alignment: a })}
              >
                {a[0]!.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Sizing</label>
          <div className={styles.radioGroup}>
            {(['hug-contents', 'fixed'] as const).map(s => (
              <button
                key={s}
                className={`${styles.radioButton} ${config.sizing === s ? styles.radioActive : ''}`}
                data-property="sizing"
                onClick={() => applyAutoLayoutUpdate(layer.id, { sizing: s })}
              >
                {s === 'hug-contents' ? 'Hug' : 'Fix'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Layer } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import { STYLE_KEYS } from '@primitives/style-system/palette.ts';
import styles from './PropertiesPanel.module.css';

interface Props {
  layer: Layer;
}

function applyUpdate(layerId: string, updates: Partial<Layer>) {
  const docStore = useDocumentStore.getState();
  const doc = docStore.document;
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;
  docStore.pushUndo();
  const updatedPage = updateLayer(page, layerId, updates);
  docStore.setDocument({
    ...doc,
    pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
  });
}

export function CommonProperties({ layer }: Props) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Common</h3>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Name</label>
          <input
            className={styles.fieldInput}
            name="name"
            data-property="name"
            value={layer.name}
            onChange={(e) => applyUpdate(layer.id, { name: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Position</label>
          <div className={styles.inlineGroup}>
            <input
              className={styles.smallInput}
              name="col"
              data-property="col"
              type="number"
              value={layer.rect.col}
              onChange={(e) => applyUpdate(layer.id, { rect: { ...layer.rect, col: parseInt(e.target.value) || 0 } })}
            />
            <input
              className={styles.smallInput}
              name="row"
              data-property="row"
              type="number"
              value={layer.rect.row}
              onChange={(e) => applyUpdate(layer.id, { rect: { ...layer.rect, row: parseInt(e.target.value) || 0 } })}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Size</label>
          <div className={styles.inlineGroup}>
            <input
              className={styles.smallInput}
              name="width"
              data-property="width"
              type="number"
              value={layer.rect.width}
              onChange={(e) => applyUpdate(layer.id, { rect: { ...layer.rect, width: Math.max(1, parseInt(e.target.value) || 1) } })}
            />
            <input
              className={styles.smallInput}
              name="height"
              data-property="height"
              type="number"
              value={layer.rect.height}
              onChange={(e) => applyUpdate(layer.id, { rect: { ...layer.rect, height: Math.max(1, parseInt(e.target.value) || 1) } })}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Style</label>
          <select
            className={styles.fieldSelect}
            name="styleKey"
            data-property="styleKey"
            value={layer.styleKey}
            onChange={(e) => applyUpdate(layer.id, { styleKey: e.target.value as typeof layer.styleKey })}
          >
            {STYLE_KEYS.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Opacity</label>
          <input
            className={styles.fieldInput}
            name="opacity"
            data-property="opacity"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={layer.opacity}
            onChange={(e) => applyUpdate(layer.id, { opacity: parseFloat(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

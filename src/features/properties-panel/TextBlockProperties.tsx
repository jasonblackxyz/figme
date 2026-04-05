import type { Layer, TextBlockProperties as TBProps, LayerProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import styles from './PropertiesPanel.module.css';

interface Props {
  layer: Layer;
}

function applyPropsUpdate(layerId: string, propUpdates: Partial<TBProps>) {
  const docStore = useDocumentStore.getState();
  const doc = docStore.document;
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;
  const existing = page.layers[layerId];
  if (!existing) return;
  docStore.pushUndo();
  const updatedPage = updateLayer(page, layerId, {
    properties: { ...existing.properties, ...propUpdates } as LayerProperties,
  });
  docStore.setDocument({
    ...doc,
    pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
  });
}

export function TextBlockProperties({ layer }: Props) {
  const props = layer.properties as TBProps;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Text Block</h3>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Content</label>
        </div>
        <textarea
          className={styles.textArea}
          name="content"
          data-property="content"
          value={props.content}
          onChange={(e) => applyPropsUpdate(layer.id, { content: e.target.value })}
        />
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Kerning</label>
          <div className={styles.radioGroup}>
            {([0, 1, 2] as const).map(k => (
              <button
                key={k}
                className={`${styles.radioButton} ${props.kerning === k ? styles.radioActive : ''}`}
                data-property="kerning"
                onClick={() => applyPropsUpdate(layer.id, { kerning: k })}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Line Space</label>
          <div className={styles.radioGroup}>
            {([0, 1] as const).map(ls => (
              <button
                key={ls}
                className={`${styles.radioButton} ${props.lineSpacing === ls ? styles.radioActive : ''}`}
                data-property="lineSpacing"
                onClick={() => applyPropsUpdate(layer.id, { lineSpacing: ls })}
              >
                {ls === 0 ? 'Single' : 'Double'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Align</label>
          <div className={styles.radioGroup}>
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                className={`${styles.radioButton} ${props.alignment === a ? styles.radioActive : ''}`}
                data-property="alignment"
                onClick={() => applyPropsUpdate(layer.id, { alignment: a })}
              >
                {a[0]!.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

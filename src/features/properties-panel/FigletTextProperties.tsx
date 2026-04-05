import type { Layer, FigletTextProperties as FTProps, LayerProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import { AVAILABLE_FONTS } from '@primitives/figlet-engine/fonts/index.ts';
import styles from './PropertiesPanel.module.css';

interface Props {
  layer: Layer;
}

function applyPropsUpdate(layerId: string, propUpdates: Partial<FTProps>) {
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

export function FigletTextProperties({ layer }: Props) {
  const props = layer.properties as FTProps;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>FIGlet Text</h3>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Content</label>
          <input
            className={styles.fieldInput}
            name="content"
            data-property="figlet-content"
            value={props.content}
            onChange={(e) => applyPropsUpdate(layer.id, { content: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Font</label>
          <select
            className={styles.fieldSelect}
            name="fontName"
            data-property="fontName"
            value={props.fontName}
            onChange={(e) => applyPropsUpdate(layer.id, { fontName: e.target.value })}
          >
            {AVAILABLE_FONTS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Align</label>
          <div className={styles.radioGroup}>
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                className={`${styles.radioButton} ${props.alignment === a ? styles.radioActive : ''}`}
                data-property="figlet-alignment"
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

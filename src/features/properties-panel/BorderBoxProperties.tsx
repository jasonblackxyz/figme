import type { Layer, BorderBoxProperties as BBProps, LayerProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import { ColorSwatchField } from '@features/color-picker/ColorSwatchField.tsx';
import styles from './PropertiesPanel.module.css';

interface Props {
  layer: Layer;
}

function applyPropsUpdate(layerId: string, propUpdates: Partial<BBProps>) {
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

export function BorderBoxProperties({ layer }: Props) {
  const props = layer.properties as BBProps;
  const doc = useDocumentStore(s => s.document);
  const STYLES = ['rounded', 'double', 'section', 'custom'] as const;

  const bgStyleKey = props.bgStyleKey ?? 'nodeBg';
  const bgStyleDef = doc.palette[bgStyleKey];
  const fillColor = bgStyleDef?.bg ?? '#000000';

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Border Box</h3>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Border</label>
          <div className={styles.radioGroup}>
            {STYLES.map(s => (
              <button
                key={s}
                className={`${styles.radioButton} ${props.borderStyle === s ? styles.radioActive : ''}`}
                data-property="borderStyle"
                onClick={() => applyPropsUpdate(layer.id, { borderStyle: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Title</label>
          <input
            className={styles.fieldInput}
            name="title"
            data-property="title"
            value={props.title ?? ''}
            onChange={(e) => applyPropsUpdate(layer.id, { title: e.target.value || undefined })}
          />
        </div>
        <ColorSwatchField
          label="Fill"
          color={fillColor}
          pickerId={`fill-${layer.id}`}
          onChange={(hex) => {
            // For fill, we update the layer's customColors bg since bgStyleKey controls the palette key
            useDocumentStore.getState().updateLayerColors(layer.id, {
              ...layer.customColors,
              bg: hex,
            });
          }}
          onReset={() => {
            const cc = layer.customColors;
            useDocumentStore.getState().updateLayerColors(layer.id, cc?.color ? { color: cc.color } : undefined);
          }}
          isOverride={!!layer.customColors?.bg}
        />
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Padding</label>
          <div className={styles.inlineGroup}>
            <input className={styles.smallInput} type="number" value={props.padding.top} data-property="padding-top"
              onChange={(e) => applyPropsUpdate(layer.id, { padding: { ...props.padding, top: parseInt(e.target.value) || 0 } })} />
            <input className={styles.smallInput} type="number" value={props.padding.right} data-property="padding-right"
              onChange={(e) => applyPropsUpdate(layer.id, { padding: { ...props.padding, right: parseInt(e.target.value) || 0 } })} />
            <input className={styles.smallInput} type="number" value={props.padding.bottom} data-property="padding-bottom"
              onChange={(e) => applyPropsUpdate(layer.id, { padding: { ...props.padding, bottom: parseInt(e.target.value) || 0 } })} />
            <input className={styles.smallInput} type="number" value={props.padding.left} data-property="padding-left"
              onChange={(e) => applyPropsUpdate(layer.id, { padding: { ...props.padding, left: parseInt(e.target.value) || 0 } })} />
          </div>
        </div>
      </div>
    </div>
  );
}

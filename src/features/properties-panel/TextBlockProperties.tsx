import type { Layer, TextBlockProperties as TBProps, LayerProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import { ColorSwatchField } from '@features/color-picker/ColorSwatchField.tsx';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import styles from './PropertiesPanel.module.css';

const ALIGN_OPTIONS = {
  left: { Icon: AlignLeft, label: 'Align left' },
  center: { Icon: AlignCenter, label: 'Align center' },
  right: { Icon: AlignRight, label: 'Align right' },
} as const;

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
  const doc = useDocumentStore(s => s.document);

  const textStyleDef = doc.palette[props.styleKey];
  const textColor = textStyleDef?.color ?? '#ffffff';

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Text Block</h3>
      <div className={styles.fieldGroup}>
        <ColorSwatchField
          label="Text Color"
          color={layer.customColors?.color ?? textColor}
          pickerId={`text-color-${layer.id}`}
          onChange={(hex) => {
            useDocumentStore.getState().updateLayerColors(layer.id, {
              ...layer.customColors,
              color: hex,
            });
          }}
          onReset={() => {
            const cc = layer.customColors;
            useDocumentStore.getState().updateLayerColors(layer.id, cc?.bg ? { bg: cc.bg } : undefined);
          }}
          isOverride={!!layer.customColors?.color}
        />
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
            {(['left', 'center', 'right'] as const).map(a => {
              const { Icon, label } = ALIGN_OPTIONS[a];
              return (
                <button
                  key={a}
                  type="button"
                  className={`${styles.radioButton} ${props.alignment === a ? styles.radioActive : ''}`}
                  data-property="alignment"
                  aria-label={label}
                  title={label}
                  onClick={() => applyPropsUpdate(layer.id, { alignment: a })}
                >
                  <Icon size={12} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

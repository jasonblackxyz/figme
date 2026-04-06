import type { Layer, LayerKind } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import { ColorSwatchField } from '@features/color-picker/ColorSwatchField.tsx';
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

function colorLabel(kind: LayerKind): string {
  switch (kind) {
    case 'border-box': return 'Border';
    case 'text-block': return 'Text';
    case 'figlet-text': return 'Text';
    case 'divider': return 'Stroke';
    case 'edge-path': return 'Line';
    default: return 'Color';
  }
}

export function CommonProperties({ layer }: Props) {
  const doc = useDocumentStore(s => s.document);
  const updateLayerColors = useDocumentStore(s => s.updateLayerColors);

  const styleDef = doc.palette[layer.styleKey];
  const fgColor = layer.customColors?.color ?? styleDef?.color ?? '#ffffff';
  const bgColor = layer.customColors?.bg ?? styleDef?.bg ?? '#000000';

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
        <ColorSwatchField
          label={colorLabel(layer.kind)}
          color={fgColor}
          pickerId={`fg-${layer.id}`}
          onChange={(hex) => updateLayerColors(layer.id, { ...layer.customColors, color: hex })}
          onReset={() => {
            const cc = layer.customColors;
            updateLayerColors(layer.id, cc?.bg ? { bg: cc.bg } : undefined);
          }}
          isOverride={!!layer.customColors?.color}
        />
        <ColorSwatchField
          label="Background"
          color={bgColor}
          pickerId={`bg-${layer.id}`}
          onChange={(hex) => updateLayerColors(layer.id, { ...layer.customColors, bg: hex })}
          onReset={() => {
            const cc = layer.customColors;
            updateLayerColors(layer.id, cc?.color ? { color: cc.color } : undefined);
          }}
          isOverride={!!layer.customColors?.bg}
        />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Opacity</label>
          <input
            className={styles.opacitySlider}
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

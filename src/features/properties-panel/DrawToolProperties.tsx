import { useUiStore } from '@stores/uiStore.ts';
import { ColorSwatchField } from '@features/color-picker/ColorSwatchField.tsx';
import { SwatchPanel } from '@features/color-picker/SwatchPanel.tsx';
import styles from './PropertiesPanel.module.css';

const BRUSH_SIZES = [1, 2, 3] as const;

export function DrawToolProperties() {
  const activeColor = useUiStore(s => s.activeColor);
  const setActiveColor = useUiStore(s => s.setActiveColor);
  const brushSize = useUiStore(s => s.brushSize);
  const setBrushSize = useUiStore(s => s.setBrushSize);
  const eraserMode = useUiStore(s => s.eraserMode);
  const setEraserMode = useUiStore(s => s.setEraserMode);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Draw Tool</h3>
      <div className={styles.fieldGroup}>
        <ColorSwatchField
          label="Color"
          color={activeColor}
          pickerId="draw-color"
          onChange={setActiveColor}
        />

        <SwatchPanel currentColor={activeColor} onSelect={setActiveColor} />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Brush</label>
          <div className={styles.radioGroup}>
            {BRUSH_SIZES.map(size => (
              <button
                key={size}
                className={`${styles.radioButton} ${brushSize === size ? styles.radioActive : ''}`}
                onClick={() => setBrushSize(size)}
                data-property="brushSize"
              >
                {size}x{size}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Mode</label>
          <div className={styles.radioGroup}>
            <button
              className={`${styles.radioButton} ${!eraserMode ? styles.radioActive : ''}`}
              onClick={() => setEraserMode(false)}
              data-property="paintMode"
            >
              Paint
            </button>
            <button
              className={`${styles.radioButton} ${eraserMode ? styles.radioActive : ''}`}
              onClick={() => setEraserMode(true)}
              data-property="eraseMode"
            >
              Erase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

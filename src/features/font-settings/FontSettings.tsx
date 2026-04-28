import { useState, useCallback, useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { measureCellDimensions } from '@primitives/grid-engine/measurement.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import styles from './FontSettings.module.css';

interface FontSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export function FontSettings({ visible, onClose }: FontSettingsProps) {
  const doc = useDocumentStore(s => s.document);
  const pushUndo = useDocumentStore(s => s.pushUndo);
  const setDocument = useDocumentStore(s => s.setDocument);

  const gridConfig = doc.gridConfig;

  const [fontFamily, setFontFamily] = useState(gridConfig.fontFamily);
  const [fontSize, setFontSize] = useState(gridConfig.fontSize);
  const [lineHeight, setLineHeight] = useState(gridConfig.lineHeight);

  // Sync local state when doc changes externally (e.g. undo/redo)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- This mirrors external store changes into editable form state.
    setFontFamily(gridConfig.fontFamily);
    setFontSize(gridConfig.fontSize);
    setLineHeight(gridConfig.lineHeight);
  }, [gridConfig.fontFamily, gridConfig.fontSize, gridConfig.lineHeight]);

  const applyChanges = useCallback(
    (family: string, size: number, lh: number) => {
      const { cellWidth, cellHeight } = measureCellDimensions(family, size, lh);
      const newConfig: GridConfig = {
        fontFamily: family,
        fontSize: size,
        lineHeight: lh,
        cellWidth,
        cellHeight,
        canvasCols: Math.floor(1920 / cellWidth),
        canvasRows: Math.floor(1080 / cellHeight),
      };
      pushUndo();
      setDocument({ ...doc, gridConfig: newConfig });
    },
    [doc, pushUndo, setDocument],
  );

  const handleFontFamilyChange = useCallback(
    (value: string) => {
      setFontFamily(value);
      applyChanges(value, fontSize, lineHeight);
    },
    [fontSize, lineHeight, applyChanges],
  );

  const handleFontSizeChange = useCallback(
    (value: number) => {
      const clamped = Math.max(8, Math.min(32, value));
      setFontSize(clamped);
      applyChanges(fontFamily, clamped, lineHeight);
    },
    [fontFamily, lineHeight, applyChanges],
  );

  const handleLineHeightChange = useCallback(
    (value: number) => {
      const clamped = Math.max(1, Math.min(2, value));
      setLineHeight(clamped);
      applyChanges(fontFamily, fontSize, clamped);
    },
    [fontFamily, fontSize, applyChanges],
  );

  if (!visible) return null;

  return (
    <div className={styles.panel} data-component="font-settings">
      <div className={styles.header}>
        <h2 className={styles.title}>Font Settings</h2>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close font settings"
        >
          x
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.field}>
          <label className={styles.label}>Font Family</label>
          <input
            className={styles.input}
            type="text"
            value={fontFamily}
            onChange={e => handleFontFamilyChange(e.target.value)}
            data-field="font-family"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Font Size</label>
          <input
            className={styles.input}
            type="number"
            min={8}
            max={32}
            step={1}
            value={fontSize}
            onChange={e => handleFontSizeChange(Number(e.target.value))}
            data-field="font-size"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Line Height</label>
          <input
            className={styles.input}
            type="number"
            min={1}
            max={2}
            step={0.05}
            value={lineHeight}
            onChange={e => handleLineHeightChange(Number(e.target.value))}
            data-field="line-height"
          />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Cell Size</span>
          <span className={styles.readOnly} data-field="cell-size">
            {gridConfig.cellWidth.toFixed(1)} x {gridConfig.cellHeight.toFixed(1)} px
          </span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Canvas Dimensions</span>
          <span className={styles.readOnly} data-field="canvas-dims">
            {gridConfig.canvasCols} cols x {gridConfig.canvasRows} rows
          </span>
        </div>
      </div>
    </div>
  );
}

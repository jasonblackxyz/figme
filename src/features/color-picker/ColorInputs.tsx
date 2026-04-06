import { useState, useEffect } from 'react';
import type { RGB } from '@primitives/color-utils/types.ts';
import { isValidHex } from '@primitives/color-utils/conversions.ts';
import styles from './ColorPicker.module.css';

interface Props {
  hex: string;
  rgb: RGB;
  onHexChange: (hex: string) => void;
  onRgbChange: (rgb: RGB) => void;
}

export function ColorInputs({ hex, rgb, onHexChange, onRgbChange }: Props) {
  const [hexDraft, setHexDraft] = useState(hex);

  useEffect(() => {
    setHexDraft(hex);
  }, [hex]);

  const commitHex = () => {
    if (isValidHex(hexDraft)) {
      onHexChange(hexDraft.toLowerCase());
    } else {
      setHexDraft(hex);
    }
  };

  const changeChannel = (channel: keyof RGB, value: string) => {
    const n = Math.max(0, Math.min(255, parseInt(value) || 0));
    onRgbChange({ ...rgb, [channel]: n });
  };

  return (
    <div className={styles.colorInputs}>
      <div className={styles.hexField}>
        <label className={styles.inputLabel}>Hex</label>
        <input
          className={styles.hexInput}
          value={hexDraft}
          onChange={(e) => setHexDraft(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => { if (e.key === 'Enter') commitHex(); }}
          spellCheck={false}
        />
      </div>
      <div className={styles.rgbFields}>
        <div className={styles.rgbField}>
          <label className={styles.inputLabel}>R</label>
          <input
            className={styles.rgbInput}
            type="number"
            min={0}
            max={255}
            value={rgb.r}
            onChange={(e) => changeChannel('r', e.target.value)}
          />
        </div>
        <div className={styles.rgbField}>
          <label className={styles.inputLabel}>G</label>
          <input
            className={styles.rgbInput}
            type="number"
            min={0}
            max={255}
            value={rgb.g}
            onChange={(e) => changeChannel('g', e.target.value)}
          />
        </div>
        <div className={styles.rgbField}>
          <label className={styles.inputLabel}>B</label>
          <input
            className={styles.rgbInput}
            type="number"
            min={0}
            max={255}
            value={rgb.b}
            onChange={(e) => changeChannel('b', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { hexToHsv, hsvToHex, hexToRgb, rgbToHex } from '@primitives/color-utils/conversions.ts';
import type { HSV } from '@primitives/color-utils/types.ts';
import { HsvGradient } from './HsvGradient.tsx';
import { HueSlider } from './HueSlider.tsx';
import { ColorInputs } from './ColorInputs.tsx';
import { SwatchPanel } from './SwatchPanel.tsx';
import styles from './ColorPicker.module.css';

interface Props {
  currentColor: string;
  onColorChange: (hex: string) => void;
  onClose: () => void;
}

export function ColorPicker({ currentColor, onColorChange, onClose }: Props) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(currentColor));
  const [syncedColor, setSyncedColor] = useState(currentColor);

  // Sync HSV when external color changes (e.g., undo, swatch click)
  if (syncedColor !== currentColor && hsvToHex(hsv) !== currentColor) {
    setSyncedColor(currentColor);
    setHsv(hexToHsv(currentColor));
  }

  const emitColor = useCallback(
    (newHsv: HSV) => {
      setHsv(newHsv);
      onColorChange(hsvToHex(newHsv));
    },
    [onColorChange],
  );

  const handleSvChange = useCallback(
    (s: number, v: number) => emitColor({ ...hsv, s, v }),
    [hsv, emitColor],
  );

  const handleHueChange = useCallback(
    (h: number) => emitColor({ ...hsv, h }),
    [hsv, emitColor],
  );

  const handleHexChange = useCallback(
    (hex: string) => {
      setHsv(hexToHsv(hex));
      onColorChange(hex);
    },
    [onColorChange],
  );

  const handleRgbChange = useCallback(
    (rgb: { r: number; g: number; b: number }) => {
      const hex = rgbToHex(rgb);
      setHsv(hexToHsv(hex));
      onColorChange(hex);
    },
    [onColorChange],
  );

  const hex = hsvToHex(hsv);
  const rgb = hexToRgb(hex);

  return (
    <div className={styles.picker} data-component="color-picker">
      <div className={styles.header}>
        <h3 className={styles.title}>Color</h3>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>
      <div className={styles.body}>
        <HsvGradient hsv={hsv} onChange={handleSvChange} />
        <HueSlider hue={hsv.h} onChange={handleHueChange} />
        <ColorInputs
          hex={hex}
          rgb={rgb}
          onHexChange={handleHexChange}
          onRgbChange={handleRgbChange}
        />
        <SwatchPanel currentColor={hex} onSelect={handleHexChange} />
      </div>
    </div>
  );
}

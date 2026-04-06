import { useRef } from 'react';
import { useUiStore } from '@stores/uiStore.ts';
import { ColorPicker } from './ColorPicker.tsx';
import styles from './ColorPicker.module.css';

interface Props {
  label: string;
  color: string;
  pickerId: string;
  onChange: (hex: string) => void;
  onReset?: () => void;
  isOverride?: boolean;
}

export function ColorSwatchField({ label, color, pickerId, onChange, onReset, isOverride }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const openId = useUiStore((s) => s.openColorPickerId);
  const setOpenId = useUiStore((s) => s.setOpenColorPickerId);
  const isOpen = openId === pickerId;

  return (
    <div className={styles.swatchField} ref={anchorRef}>
      <label className={styles.swatchFieldLabel}>{label}</label>
      <button
        className={styles.swatchFieldButton}
        style={{ backgroundColor: color }}
        onClick={() => setOpenId(isOpen ? null : pickerId)}
        aria-label={`Pick ${label} color`}
        data-property={`color-${pickerId}`}
      />
      {isOverride && onReset && (
        <button
          className={styles.swatchFieldReset}
          onClick={onReset}
          title="Reset to palette default"
          aria-label="Reset color"
        >
          &times;
        </button>
      )}
      {isOpen && (
        <ColorPicker
          currentColor={color}
          onColorChange={onChange}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

import styles from './ColorPicker.module.css';

interface Props {
  hue: number;
  onChange: (hue: number) => void;
}

export function HueSlider({ hue, onChange }: Props) {
  return (
    <input
      type="range"
      className={styles.hueSlider}
      min={0}
      max={360}
      step={1}
      value={hue}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Hue"
    />
  );
}

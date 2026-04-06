import { useCallback } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { createAsciiPalette } from '@primitives/style-system/palette.ts';
import { STYLE_KEYS } from '@primitives/style-system/palette.ts';
import type { Theme } from '@primitives/style-system/types.ts';
import styles from './ThemePreview.module.css';

interface ThemePreviewProps {
  visible: boolean;
  onClose: () => void;
}

const THEMES: Theme[] = [
  {
    name: 'dark',
    colors: {
      background: '#1a1a2e',
      foreground: '#e0e0e0',
      accent: '#2563eb',
      accentForeground: '#ffffff',
      muted: '#333355',
      mutedForeground: '#666688',
      border: '#444466',
      card: '#252540',
      cardForeground: '#c0c0d0',
      error: '#dc2626',
      success: '#16a34a',
    },
  },
  {
    name: 'midnight',
    colors: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      accent: '#58a6ff',
      accentForeground: '#ffffff',
      muted: '#21262d',
      mutedForeground: '#8b949e',
      border: '#30363d',
      card: '#161b22',
      cardForeground: '#c9d1d9',
      error: '#f85149',
      success: '#3fb950',
    },
  },
  {
    name: 'warm',
    colors: {
      background: '#1c1917',
      foreground: '#e7e5e4',
      accent: '#f59e0b',
      accentForeground: '#1c1917',
      muted: '#292524',
      mutedForeground: '#a8a29e',
      border: '#44403c',
      card: '#292524',
      cardForeground: '#d6d3d1',
      error: '#ef4444',
      success: '#22c55e',
    },
  },
];

/** Number of style key swatches to display in the preview */
const SWATCH_COUNT = 20;

export function ThemePreview({ visible, onClose }: ThemePreviewProps) {
  const doc = useDocumentStore(s => s.document);
  const pushUndo = useDocumentStore(s => s.pushUndo);
  const setDocument = useDocumentStore(s => s.setDocument);
  const palette = doc.palette;

  const applyTheme = useCallback(
    (theme: Theme) => {
      const newPalette = createAsciiPalette(theme);
      pushUndo();
      setDocument({ ...doc, palette: newPalette });
    },
    [doc, pushUndo, setDocument],
  );

  if (!visible) return null;

  const previewKeys = STYLE_KEYS.slice(0, SWATCH_COUNT);

  return (
    <div className={styles.panel} data-component="theme-preview">
      <div className={styles.header}>
        <h2 className={styles.title}>Theme Preview</h2>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close theme preview"
        >
          x
        </button>
      </div>
      <div className={styles.body}>
        <span className={styles.sectionLabel}>Themes</span>
        <div className={styles.themeButtons}>
          {THEMES.map(theme => (
            <button
              key={theme.name}
              className={styles.themeButton}
              onClick={() => applyTheme(theme)}
              data-theme={theme.name}
            >
              {theme.name}
            </button>
          ))}
        </div>
        <span className={styles.sectionLabel}>Palette Swatches</span>
        <div className={styles.swatchGrid}>
          {previewKeys.map(key => {
            const styleDef = palette[key];
            return (
              <div key={key} className={styles.swatch} data-style-key={key}>
                <div
                  className={styles.swatchColor}
                  style={{
                    backgroundColor: styleDef.bg,
                    color: styleDef.color,
                  }}
                >
                  Aa
                </div>
                <span className={styles.swatchName} title={key}>
                  {key}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

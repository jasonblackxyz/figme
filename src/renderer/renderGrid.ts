import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette, StyleKey } from '@primitives/style-system/types.ts';
import type { ColorOverrideMap } from '@primitives/document-model/colorOverrides.ts';

/**
 * A span segment: consecutive cells with the same style, merged into one element.
 * `startCol` is the first column, `text` is the concatenated characters.
 */
export interface GridSpan {
  key: string;
  text: string;
  color: string;
  bg: string;
  fontWeight?: number;
  startCol: number;
  endCol: number; // exclusive
  row: number;
}

export interface GridRowElements {
  row: number;
  spans: GridSpan[];
}

function resolveCell(
  r: number,
  c: number,
  styleKey: StyleKey,
  palette: Palette,
  colorOverrides?: ColorOverrideMap,
): { color: string; bg: string; fontWeight?: number; overrideKey: string } {
  const styleDef = palette[styleKey];
  const override = colorOverrides?.[`${r},${c}`];
  return {
    color: override?.color ?? styleDef?.color ?? '#ffffff',
    bg: override?.bg ?? styleDef?.bg ?? '#000000',
    fontWeight: styleDef?.fontWeight,
    overrideKey: override ? `${override.color ?? ''}_${override.bg ?? ''}` : '',
  };
}

/**
 * Render a StampBuffer into an array of row/span data suitable for React rendering.
 *
 * Groups consecutive cells with the same StyleKey and resolved colors into single
 * GridSpan objects. Color overrides break span coalescing when they change the
 * resolved color for a cell.
 */
export function renderGridToElements(
  buffer: StampBuffer,
  palette: Palette,
  colorOverrides?: ColorOverrideMap,
): GridRowElements[] {
  const result: GridRowElements[] = [];

  for (let r = 0; r < buffer.height; r++) {
    const charRow = buffer.chars[r];
    const styleRow = buffer.styles[r];
    if (!charRow || !styleRow) continue;

    // Find the rightmost non-bg column so we stop before trailing background
    // cells. Interior bg cells (holes between content) are still included.
    let lastContentCol = -1;
    for (let c = 0; c < buffer.width; c++) {
      if (styleRow[c] !== 'bg') lastContentCol = c;
    }

    // All-bg row — emit empty spans, skip cell resolution entirely
    if (lastContentCol < 0) {
      result.push({ row: r, spans: [] });
      continue;
    }

    const spans: GridSpan[] = [];
    let spanStart = 0;
    let spanChars = '';
    let currentStyleKey: StyleKey | undefined = styleRow[0];
    let currentResolved = currentStyleKey !== undefined
      ? resolveCell(r, 0, currentStyleKey, palette, colorOverrides)
      : undefined;

    for (let c = 0; c <= lastContentCol; c++) {
      const styleKey = styleRow[c];
      const char = charRow[c] ?? ' ';

      if (styleKey === currentStyleKey) {
        // Same style key — but check if override changes the resolved color
        const resolved = styleKey !== undefined
          ? resolveCell(r, c, styleKey, palette, colorOverrides)
          : undefined;
        if (resolved && currentResolved && resolved.overrideKey === currentResolved.overrideKey) {
          spanChars += char;
          continue;
        }
      }

      // Flush current span
      if (currentStyleKey !== undefined && currentResolved && spanChars.length > 0) {
        spans.push({
          key: `${r}-${spanStart}`,
          text: spanChars,
          color: currentResolved.color,
          bg: currentResolved.bg,
          fontWeight: currentResolved.fontWeight,
          startCol: spanStart,
          endCol: spanStart + spanChars.length,
          row: r,
        });
      }
      spanStart = c;
      spanChars = char;
      currentStyleKey = styleKey;
      currentResolved = styleKey !== undefined
        ? resolveCell(r, c, styleKey, palette, colorOverrides)
        : undefined;
    }

    // Flush final span
    if (currentStyleKey !== undefined && currentResolved && spanChars.length > 0) {
      spans.push({
        key: `${r}-${spanStart}`,
        text: spanChars,
        color: currentResolved.color,
        bg: currentResolved.bg,
        fontWeight: currentResolved.fontWeight,
        startCol: spanStart,
        endCol: spanStart + spanChars.length,
        row: r,
      });
    }

    result.push({ row: r, spans });
  }

  return result;
}

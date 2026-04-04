import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette, StyleKey } from '@primitives/style-system/types.ts';

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

/**
 * Render a StampBuffer into an array of row/span data suitable for React rendering.
 *
 * Groups consecutive cells with the same StyleKey into single GridSpan objects.
 * This reduces DOM element count from (cols × rows) to a much smaller number.
 */
export function renderGridToElements(
  buffer: StampBuffer,
  palette: Palette,
): GridRowElements[] {
  const result: GridRowElements[] = [];

  for (let r = 0; r < buffer.height; r++) {
    const charRow = buffer.chars[r];
    const styleRow = buffer.styles[r];
    if (!charRow || !styleRow) continue;

    const spans: GridSpan[] = [];
    let spanStart = 0;
    let spanChars = '';
    let currentStyleKey: StyleKey | undefined = styleRow[0];

    for (let c = 0; c < buffer.width; c++) {
      const styleKey = styleRow[c];
      const char = charRow[c] ?? ' ';

      if (styleKey === currentStyleKey) {
        spanChars += char;
      } else {
        // Flush current span
        if (currentStyleKey !== undefined && spanChars.length > 0) {
          const styleDef = palette[currentStyleKey];
          spans.push({
            key: `${r}-${spanStart}`,
            text: spanChars,
            color: styleDef?.color ?? '#ffffff',
            bg: styleDef?.bg ?? '#000000',
            fontWeight: styleDef?.fontWeight,
            startCol: spanStart,
            endCol: spanStart + spanChars.length,
            row: r,
          });
        }
        spanStart = c;
        spanChars = char;
        currentStyleKey = styleKey;
      }
    }

    // Flush final span
    if (currentStyleKey !== undefined && spanChars.length > 0) {
      const styleDef = palette[currentStyleKey];
      spans.push({
        key: `${r}-${spanStart}`,
        text: spanChars,
        color: styleDef?.color ?? '#ffffff',
        bg: styleDef?.bg ?? '#000000',
        fontWeight: styleDef?.fontWeight,
        startCol: spanStart,
        endCol: spanStart + spanChars.length,
        row: r,
      });
    }

    result.push({ row: r, spans });
  }

  return result;
}

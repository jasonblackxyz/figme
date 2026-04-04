import type { StyleKey } from '@primitives/style-system/types.ts';
import type { StampBuffer } from './types.ts';

/**
 * Create an empty StampBuffer of the given dimensions.
 * All cells are initialized to space characters with the 'bg' style key.
 */
export function createBuffer(width: number, height: number): StampBuffer {
  const chars: string[][] = [];
  const styles: StyleKey[][] = [];

  for (let row = 0; row < height; row++) {
    const charRow: string[] = [];
    const styleRow: StyleKey[] = [];
    for (let col = 0; col < width; col++) {
      charRow.push(' ');
      styleRow.push('bg');
    }
    chars.push(charRow);
    styles.push(styleRow);
  }

  return { chars, styles, width, height };
}

/**
 * Merge an overlay buffer onto a base buffer at the given position.
 * All cells from the overlay overwrite the base (including spaces).
 * Use `transparent` option to skip cells that match the default style.
 * Returns a new buffer (does not mutate the base).
 */
export function mergeBuffers(
  base: StampBuffer,
  overlay: StampBuffer,
  col: number,
  row: number,
): StampBuffer {
  const result = cloneBuffer(base);

  for (let r = 0; r < overlay.height; r++) {
    const targetRow = row + r;
    if (targetRow < 0 || targetRow >= result.height) continue;

    for (let c = 0; c < overlay.width; c++) {
      const targetCol = col + c;
      if (targetCol < 0 || targetCol >= result.width) continue;

      const overlayChar = overlay.chars[r]?.[c];
      const overlayStyle = overlay.styles[r]?.[c];
      if (overlayChar !== undefined && overlayStyle !== undefined) {
        result.chars[targetRow]![targetCol] = overlayChar;
        result.styles[targetRow]![targetCol] = overlayStyle;
      }
    }
  }

  return result;
}

/**
 * Create a deep clone of a StampBuffer.
 */
export function cloneBuffer(buffer: StampBuffer): StampBuffer {
  return {
    chars: buffer.chars.map((row) => [...row]),
    styles: buffer.styles.map((row) => [...row]),
    width: buffer.width,
    height: buffer.height,
  };
}

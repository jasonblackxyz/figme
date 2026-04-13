import type { StampBuffer } from './types.ts';
import type { CanvasProperties } from '@primitives/document-model/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import { createBuffer } from './buffer.ts';

/**
 * Stamp a canvas layer into a StampBuffer.
 *
 * Renders the content string literally — one character per cell.
 * Spaces are treated as transparent (remain 'bg' style) so lower
 * layers show through, enabling freeform shapes.
 */
export function stampCanvas(
  props: CanvasProperties,
  rect: GridRect,
): StampBuffer {
  const buffer = createBuffer(rect.width, rect.height);

  if (rect.width <= 0 || rect.height <= 0 || props.content.length === 0) {
    return buffer;
  }

  const lines = props.content.split('\n');

  for (let row = 0; row < Math.min(lines.length, rect.height); row++) {
    const line = lines[row] ?? '';
    for (let col = 0; col < Math.min(line.length, rect.width); col++) {
      const ch = line[col];
      if (ch !== undefined && ch !== ' ') {
        buffer.chars[row]![col] = ch;
        buffer.styles[row]![col] = 'text';
      }
    }
  }

  return buffer;
}

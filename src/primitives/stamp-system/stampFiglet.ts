import type { StampBuffer } from './types.ts';
import type { FigletTextProperties } from '@primitives/document-model/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { FigletFont } from '@primitives/figlet-engine/types.ts';
import { createBuffer } from './buffer.ts';
import { renderFiglet } from '@primitives/figlet-engine/renderer.ts';

/**
 * Stamp FIGlet-rendered text into a StampBuffer.
 *
 * Renders the given text using the provided FIGlet font, then positions
 * the result within the rect according to the alignment setting.
 * Characters are clipped to the rect bounds.
 *
 * @param props - FIGlet text properties (content, alignment, styleKey, etc.)
 * @param rect - The grid rectangle defining the text block's position and size
 * @param font - The parsed FIGlet font to use for rendering
 * @returns A StampBuffer with the rendered FIGlet text
 */
export function stampFigletText(
  props: FigletTextProperties,
  rect: GridRect,
  font: FigletFont,
): StampBuffer {
  const buffer = createBuffer(rect.width, rect.height);

  if (rect.width <= 0 || rect.height <= 0 || props.content.length === 0) {
    return buffer;
  }

  // Render the FIGlet text
  const rendered = renderFiglet(props.content, font);

  if (rendered.lines.length === 0 || rendered.width === 0) {
    return buffer;
  }

  // Compute horizontal alignment offset
  let colOffset = 0;
  if (props.alignment === 'center') {
    colOffset = Math.max(0, Math.floor((rect.width - rendered.width) / 2));
  } else if (props.alignment === 'right') {
    colOffset = Math.max(0, rect.width - rendered.width);
  }

  // Compute vertical centering (center the text vertically in the rect)
  const rowOffset = Math.max(0, Math.floor((rect.height - rendered.height) / 2));

  // Write rendered FIGlet lines into the buffer
  for (let r = 0; r < rendered.lines.length; r++) {
    const targetRow = rowOffset + r;
    if (targetRow >= rect.height) break;

    const line = rendered.lines[r];
    if (!line) continue;

    for (let c = 0; c < line.length; c++) {
      const targetCol = colOffset + c;
      if (targetCol >= rect.width) break;

      const ch = line[c];
      if (ch !== undefined && ch !== ' ') {
        buffer.chars[targetRow]![targetCol] = ch;
        buffer.styles[targetRow]![targetCol] = props.styleKey;
      }
    }
  }

  return buffer;
}

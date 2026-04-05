import type { StampBuffer } from './types.ts';
import type { TextBlockProperties } from '@primitives/document-model/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import { createBuffer } from './buffer.ts';
import { computeTextFlow } from '@primitives/text-flow/compute.ts';

/**
 * Stamp a text block into a StampBuffer.
 *
 * Takes text block properties and a grid rect, computes text flow
 * (with word-wrap, alignment, kerning, line-spacing, and markdown parsing),
 * then writes each character into the buffer at the correct position.
 *
 * @param props - Text block properties (content, alignment, kerning, etc.)
 * @param rect - The grid rectangle defining the text block's position and size
 * @returns A StampBuffer with the rendered text
 */
export function stampTextBlock(
  props: TextBlockProperties,
  rect: GridRect,
): StampBuffer {
  const buffer = createBuffer(rect.width, rect.height);

  if (rect.width <= 0 || rect.height <= 0 || props.content.length === 0) {
    return buffer;
  }

  // Compute text flow with default padding (0 all around unless we add padding support)
  const flowResult = computeTextFlow({
    content: props.content,
    boundingRect: { col: 0, row: 0, width: rect.width, height: rect.height },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    kerning: props.kerning,
    lineSpacing: props.lineSpacing,
    alignment: props.alignment,
  });

  // Write each flow line's segments into the buffer
  for (const line of flowResult.lines) {
    if (line.row < 0 || line.row >= rect.height) continue;

    for (const segment of line.segments) {
      for (let i = 0; i < segment.text.length; i++) {
        const col = segment.col + i;
        if (col >= 0 && col < rect.width) {
          const ch = segment.text[i];
          if (ch !== undefined) {
            buffer.chars[line.row]![col] = ch;
            buffer.styles[line.row]![col] = segment.styleKey;
          }
        }
      }
    }
  }

  return buffer;
}

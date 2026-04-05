import type { StampBuffer } from './types.ts';
import type { ImageRenderResult } from '@primitives/image-pipeline/types.ts';
import type { StyleKey } from '@primitives/style-system/types.ts';
import { createBuffer } from './buffer.ts';

/**
 * Default character-to-style mapping for image stamps.
 * Maps ASCII brightness ramp characters to style keys.
 */
const DEFAULT_CHAR_STYLES: Record<string, StyleKey> = {
  ' ': 'bg',
  '.': 'imageDeep',
  ':': 'imageDeep',
  '-': 'imageDeep',
  '=': 'imageMid',
  '+': 'imageMid',
  '*': 'imageMid',
  '#': 'imageLight',
  '%': 'imageLight',
  '@': 'imageEdge',
  // Block/shade characters
  '░': 'imageDeep',
  '▒': 'imageMid',
  '▓': 'imageLight',
  '█': 'imageEdge',
};

/**
 * Determine the default style key for an image character based on
 * its visual density category.
 */
function defaultStyleForChar(char: string): StyleKey {
  return DEFAULT_CHAR_STYLES[char] ?? 'imageMid';
}

/**
 * Convert an ImageRenderResult into a StampBuffer with appropriate style keys.
 *
 * Places result.chars into the buffer and maps each character to a style key.
 * Default mapping categorizes characters by visual density:
 *   space -> 'bg'
 *   '.:- ' -> 'imageDeep' (darkest)
 *   '=+*' -> 'imageMid'
 *   '#%' -> 'imageLight'
 *   '@' -> 'imageEdge' (brightest)
 *
 * A custom styleMapping function can be provided for per-cell brightness-based styling.
 */
export function stampImage(
  result: ImageRenderResult,
  styleMapping?: (brightness: number) => StyleKey,
): StampBuffer {
  const { chars, width, height } = result;

  if (width <= 0 || height <= 0) {
    return createBuffer(0, 0);
  }

  const buffer = createBuffer(width, height);

  for (let r = 0; r < height; r++) {
    const charRow = chars[r];
    if (!charRow) continue;

    for (let c = 0; c < width; c++) {
      const char = charRow[c];
      if (char === undefined) continue;

      buffer.chars[r]![c] = char;

      if (styleMapping) {
        // Use custom mapping based on character brightness index
        // Map character position in ramp to a 0-1 brightness
        const ramp = ' .:-=+*#%@';
        const idx = ramp.indexOf(char);
        const brightness = idx >= 0 ? idx / (ramp.length - 1) : 0.5;
        buffer.styles[r]![c] = styleMapping(brightness);
      } else {
        buffer.styles[r]![c] = defaultStyleForChar(char);
      }
    }
  }

  return buffer;
}

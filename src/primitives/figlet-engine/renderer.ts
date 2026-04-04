import type { FigletFont, FigletRenderResult } from './types.ts';

/**
 * Render a text string using a FIGlet font.
 *
 * Stub: returns the input text as a single line.
 */
export function renderFiglet(
  _text: string,
  _font: FigletFont,
): FigletRenderResult {
  return {
    lines: [],
    width: 0,
    height: 0,
  };
}
